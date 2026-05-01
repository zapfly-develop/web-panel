"use client";

import { useEffect, useRef, useState } from "react";
import type { RiderLocationPayload } from "../services/delivery-types";

type RiderLocationState = "idle" | "requesting" | "active" | "error";

type UseRiderLocationOptions = {
    enabled: boolean;
    deliveryId?: string | null;
    minIntervalMs?: number;
};

type LastLocation = {
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
    sentAt: string;
};

export function useRiderLocation({
    enabled,
    deliveryId,
    minIntervalMs = 15000,
}: UseRiderLocationOptions) {
    const [state, setState] = useState<RiderLocationState>("idle");
    const [lastLocation, setLastLocation] = useState<LastLocation | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const lastSentAtRef = useRef(0);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        if (!("geolocation" in navigator)) {
            const unsupportedTimer = window.setTimeout(() => {
                setState("error");
                setErrorMessage(
                    "Geolocalizacao nao suportada neste dispositivo.",
                );
            }, 0);

            return () => window.clearTimeout(unsupportedTimer);
        }

        const requestingTimer = window.setTimeout(() => {
            setState("requesting");
            setErrorMessage(null);
        }, 0);

        return () => {
            window.clearTimeout(requestingTimer);
        };
    }, [enabled]);

    useEffect(() => {
        if (!enabled || !("geolocation" in navigator)) {
            return;
        }

        let isMounted = true;
        let lastPosition: GeolocationPosition | null = null;

        async function sendLocation(payload: RiderLocationPayload) {
            const response = await fetch("/api/delivery/rider/location", {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            const responsePayload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    responsePayload?.error ||
                        responsePayload?.message ||
                        "Nao foi possivel enviar sua localizacao.",
                );
            }
        }

        const handlePositionUpdate = (position: GeolocationPosition) => {
            lastPosition = position;
            const now = Date.now();

            if (now - lastSentAtRef.current < minIntervalMs) {
                return;
            }

            lastSentAtRef.current = now;
            const recordedAt = new Date().toISOString();
            const payload: RiderLocationPayload = {
                ...(deliveryId ? { deliveryId } : {}),
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracyMeters: Number.isFinite(position.coords.accuracy)
                    ? position.coords.accuracy
                    : null,
                recordedAt,
            };

            void sendLocation(payload)
                .then(() => {
                    if (!isMounted) {
                        return;
                    }

                    setState("active");
                    setErrorMessage(null);
                    setLastLocation({
                        latitude: payload.latitude,
                        longitude: payload.longitude,
                        accuracyMeters: payload.accuracyMeters ?? null,
                        sentAt: recordedAt,
                    });
                })
                .catch((error) => {
                    if (!isMounted) {
                        return;
                    }

                    setState("error");
                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : "Falha ao enviar localizacao.",
                    );
                });
        };

        const watchId = navigator.geolocation.watchPosition(
            handlePositionUpdate,
            (error) => {
                if (!isMounted) {
                    return;
                }

                setState("error");
                setErrorMessage(error.message || "Localizacao bloqueada.");
            },
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 20000,
            },
        );

        // Periodic update fallback - ensures location is sent even if rider is stationary
        const intervalId = window.setInterval(() => {
            if (lastPosition && isMounted) {
                handlePositionUpdate(lastPosition);
            }
        }, Math.max(minIntervalMs, 30000));

        return () => {
            isMounted = false;
            navigator.geolocation.clearWatch(watchId);
            window.clearInterval(intervalId);
        };
    }, [deliveryId, enabled, minIntervalMs]);

    const effectiveState = enabled ? state : "idle";
    const effectiveErrorMessage = enabled ? errorMessage : null;

    return {
        state: effectiveState,
        lastLocation,
        errorMessage: effectiveErrorMessage,
        isActive: effectiveState === "active",
    };
}
