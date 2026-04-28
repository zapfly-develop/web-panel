"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Navigation, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
    GoogleMapsGlobal,
    GoogleMapsMap,
    GoogleMapsMarker,
    GoogleMapsLatLngLiteral,
} from "../services/google-maps-loader";
import { loadGoogleMaps } from "../services/google-maps-loader";
import type { RiderMapMarker } from "../services/order-utils";
import { formatClock } from "../services/order-utils";

type RiderOperationsMapProps = {
    markers: RiderMapMarker[];
};

type MapStatus = "idle" | "missing-key" | "empty" | "loading" | "ready" | "error";

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function RiderOperationsMap({ markers }: RiderOperationsMapProps) {
    const mapElementRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<GoogleMapsMap | null>(null);
    const markerRefs = useRef<Map<string, GoogleMapsMarker>>(new Map());
    const [status, setStatus] = useState<MapStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const markersWithLocation = useMemo(
        () =>
            markers.filter(
                (marker) =>
                    typeof marker.latitude === "number" &&
                    Number.isFinite(marker.latitude) &&
                    typeof marker.longitude === "number" &&
                    Number.isFinite(marker.longitude),
            ),
        [markers],
    );
    const effectiveStatus: MapStatus = !googleMapsApiKey
        ? "missing-key"
        : markersWithLocation.length === 0
          ? "empty"
          : status;

    useEffect(() => {
        const apiKey = googleMapsApiKey;

        if (!apiKey) {
            clearGoogleMarkers(markerRefs.current);
            return;
        }

        if (markersWithLocation.length === 0) {
            clearGoogleMarkers(markerRefs.current);
            return;
        }

        let isCurrent = true;

        async function renderMap(apiKey: string) {
            try {
                setStatus((currentStatus) =>
                    currentStatus === "ready" ? "ready" : "loading",
                );
                setErrorMessage(null);

                const google = await loadGoogleMaps(apiKey);

                if (!isCurrent || !mapElementRef.current) {
                    return;
                }

                if (!mapRef.current) {
                    mapRef.current = new google.maps.Map(mapElementRef.current, {
                        center: toLatLng(markersWithLocation[0]),
                        zoom: 13,
                        clickableIcons: false,
                        disableDefaultUI: true,
                        fullscreenControl: true,
                        gestureHandling: "greedy",
                        mapTypeControl: false,
                        streetViewControl: false,
                        zoomControl: true,
                    });
                }

                syncMarkers(
                    google,
                    mapRef.current,
                    markerRefs.current,
                    markersWithLocation,
                );
                fitMapToMarkers(google, mapRef.current, markersWithLocation);
                setStatus("ready");
            } catch (error) {
                if (!isCurrent) {
                    return;
                }

                setStatus("error");
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel carregar Google Maps.",
                );
            }
        }

        void renderMap(apiKey);

        return () => {
            isCurrent = false;
        };
    }, [markersWithLocation]);

    useEffect(() => {
        const markerMap = markerRefs.current;

        return () => clearGoogleMarkers(markerMap);
    }, []);

    return (
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-950">
                        Mapa operacional
                    </p>
                    <p className="text-xs text-slate-500">
                        {markers.length} rider{markers.length === 1 ? "" : "s"} ativo
                        {markers.length === 1 ? "" : "s"}
                    </p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-500">
                    <Navigation className="h-4 w-4" />
                </div>
            </div>

            <div className="relative h-56 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                <div ref={mapElementRef} className="h-full w-full" />
                {effectiveStatus !== "ready" ? (
                    <MapOverlay
                        status={effectiveStatus}
                        errorMessage={errorMessage}
                        hasApiKey={Boolean(googleMapsApiKey)}
                    />
                ) : null}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {markers.slice(0, 4).map((marker) => (
                    <div
                        key={marker.id}
                        className="flex min-w-0 items-center gap-2 rounded-md border border-slate-100 px-2 py-2"
                    >
                        <span
                            className={cn(
                                "h-2.5 w-2.5 shrink-0 rounded-full",
                                marker.activeDeliveryId
                                    ? "bg-sky-500"
                                    : "bg-emerald-500",
                            )}
                        />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-slate-800">
                                {marker.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                                {marker.vehiclePlate ||
                                    marker.locationStatus ||
                                    marker.availabilityStatus}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                            <MapPin className="h-3 w-3" />
                            {marker.lastLocationAt
                                ? formatClock(marker.lastLocationAt)
                                : "--"}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MapOverlay({
    status,
    errorMessage,
    hasApiKey,
}: {
    status: MapStatus;
    errorMessage: string | null;
    hasApiKey: boolean;
}) {
    const copy = getOverlayCopy(status, errorMessage, hasApiKey);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 p-4 text-center text-slate-100">
            {status === "loading" ? (
                <Navigation className="h-5 w-5 animate-pulse" />
            ) : (
                <WifiOff className="h-5 w-5" />
            )}
            <p className="text-sm font-medium">{copy.title}</p>
            <p className="max-w-xs text-xs text-slate-300">
                {copy.description}
            </p>
        </div>
    );
}

function getOverlayCopy(
    status: MapStatus,
    errorMessage: string | null,
    hasApiKey: boolean,
) {
    if (!hasApiKey || status === "missing-key") {
        return {
            title: "Google Maps sem chave",
            description:
                "Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY e reinicie o Next.",
        };
    }

    if (status === "empty") {
        return {
            title: "Sem coordenadas recentes",
            description:
                "Assim que o rider enviar localizacao, o marcador aparece aqui.",
        };
    }

    if (status === "error") {
        return {
            title: "Mapa indisponivel",
            description: errorMessage || "Nao foi possivel carregar o mapa.",
        };
    }

    return {
        title: "Carregando mapa",
        description: "Preparando posicoes dos riders ativos.",
    };
}

function syncMarkers(
    google: GoogleMapsGlobal,
    map: GoogleMapsMap,
    currentMarkers: Map<string, GoogleMapsMarker>,
    markers: RiderMapMarker[],
) {
    const activeMarkerIds = new Set(markers.map((marker) => marker.id));

    for (const [markerId, markerInstance] of currentMarkers.entries()) {
        if (!activeMarkerIds.has(markerId)) {
            markerInstance.setMap(null);
            currentMarkers.delete(markerId);
        }
    }

    for (const marker of markers) {
        const position = toLatLng(marker);
        const title = buildMarkerTitle(marker);
        const icon = buildMarkerIcon(google, marker);
        const existingMarker = currentMarkers.get(marker.id);

        if (existingMarker) {
            existingMarker.setPosition(position);
            existingMarker.setTitle(title);
            existingMarker.setIcon(icon);
            continue;
        }

        currentMarkers.set(
            marker.id,
            new google.maps.Marker({
                map,
                position,
                title,
                icon,
                zIndex: marker.activeDeliveryId ? 2 : 1,
            }),
        );
    }
}

function fitMapToMarkers(
    google: GoogleMapsGlobal,
    map: GoogleMapsMap,
    markers: RiderMapMarker[],
) {
    if (markers.length === 1) {
        map.setCenter(toLatLng(markers[0]));
        map.setZoom(15);
        return;
    }

    const bounds = new google.maps.LatLngBounds();

    for (const marker of markers) {
        bounds.extend(toLatLng(marker));
    }

    map.fitBounds(bounds, {
        top: 32,
        right: 32,
        bottom: 32,
        left: 32,
    });
}

function clearGoogleMarkers(currentMarkers: Map<string, GoogleMapsMarker>) {
    for (const marker of currentMarkers.values()) {
        marker.setMap(null);
    }

    currentMarkers.clear();
}

function toLatLng(marker: RiderMapMarker): GoogleMapsLatLngLiteral {
    return {
        lat: marker.latitude ?? 0,
        lng: marker.longitude ?? 0,
    };
}

function buildMarkerTitle(marker: RiderMapMarker) {
    const status = marker.activeDeliveryId ? "em entrega" : "disponivel";
    const accuracy =
        typeof marker.accuracyMeters === "number"
            ? ` - precisao ${formatAccuracy(marker.accuracyMeters)}`
            : "";

    return `${marker.name} (${status})${accuracy}`;
}

function buildMarkerIcon(google: GoogleMapsGlobal, marker: RiderMapMarker) {
    const color = marker.activeDeliveryId ? "#0ea5e9" : "#10b981";
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="${color}" stroke="#ffffff" stroke-width="4"/>
            <path d="M13 23.5h2.3l1.9-5.2h5.1l1.2 2.2h2.4c1.7 0 3.1 1.3 3.1 3s-1.4 3-3.1 3c-1.3 0-2.5-.8-2.9-2h-6c-.4 1.2-1.6 2-2.9 2-1.7 0-3.1-1.3-3.1-3 0-.9.4-1.7 1-2.2l1-2.8h-2v-2h4.8l-.9 2.5h2.9l-1.1 3h5.3l-2.4-4.5h-2.3v-2h3.5l3.7 6.8h1.4c.6 0 1.1.5 1.1 1.1s-.5 1.1-1.1 1.1h-3.1c-.4-1.2-1.6-2-2.9-2h-4.2c-1.3 0-2.5.8-2.9 2H13v-1z" fill="#ffffff"/>
        </svg>
    `;

    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20),
    };
}

function formatAccuracy(accuracyMeters: number) {
    if (accuracyMeters >= 1000) {
        return `${(accuracyMeters / 1000).toFixed(1)} km`;
    }

    return `${Math.round(accuracyMeters)} m`;
}
