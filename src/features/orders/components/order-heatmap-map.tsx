"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, MapPin, WifiOff } from "lucide-react";
import type { OrderHeatmapPoint } from "../services/order-types";
import type {
    GoogleMapsCircle,
    GoogleMapsGlobal,
    GoogleMapsLatLngLiteral,
    GoogleMapsMap,
} from "../services/google-maps-loader";
import { loadGoogleMaps } from "../services/google-maps-loader";

type OrderHeatmapMapProps = {
    points: OrderHeatmapPoint[];
};

type MapStatus = "idle" | "missing-key" | "empty" | "loading" | "ready" | "error";

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function OrderHeatmapMap({ points }: OrderHeatmapMapProps) {
    const mapElementRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<GoogleMapsMap | null>(null);
    const circleRefs = useRef<Map<string, GoogleMapsCircle>>(new Map());
    const [status, setStatus] = useState<MapStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const validPoints = useMemo(
        () =>
            points.filter(
                (point) =>
                    Number.isFinite(point.lat) &&
                    Number.isFinite(point.lng) &&
                    Number.isFinite(point.weight) &&
                    point.weight > 0,
            ),
        [points],
    );
    const topPoints = useMemo(
        () => [...validPoints].sort((a, b) => b.weight - a.weight).slice(0, 3),
        [validPoints],
    );
    const totalWeight = useMemo(
        () => validPoints.reduce((total, point) => total + point.weight, 0),
        [validPoints],
    );
    const effectiveStatus: MapStatus = !googleMapsApiKey
        ? "missing-key"
        : validPoints.length === 0
          ? "empty"
          : status;

    useEffect(() => {
        const apiKey = googleMapsApiKey;

        if (!apiKey || validPoints.length === 0) {
            clearHeatmapCircles(circleRefs.current);
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
                        center: toLatLng(validPoints[0]),
                        zoom: 14,
                        clickableIcons: false,
                        disableDefaultUI: true,
                        fullscreenControl: true,
                        gestureHandling: "greedy",
                        mapTypeControl: false,
                        streetViewControl: false,
                        zoomControl: true,
                    });
                }

                const map = mapRef.current;

                syncHeatmapCircles(google, map, circleRefs.current, validPoints);
                fitMapToPoints(google, map, validPoints);
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
    }, [validPoints]);

    useEffect(() => {
        const circleMap = circleRefs.current;

        return () => clearHeatmapCircles(circleMap);
    }, []);

    return (
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-950">
                        Mapa de calor
                    </p>
                    <p className="text-xs text-slate-500">
                        {validPoints.length} area
                        {validPoints.length === 1 ? "" : "s"} com {totalWeight} pedido
                        {totalWeight === 1 ? "" : "s"}
                    </p>
                </div>
                <div className="rounded-md border border-orange-100 bg-orange-50 p-2 text-orange-600">
                    <Flame className="h-4 w-4" />
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

            <div className="mt-3 grid gap-2">
                {topPoints.length > 0 ? (
                    topPoints.map((point) => (
                        <div
                            key={getPointKey(point)}
                            className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-slate-100 px-2 py-2 text-xs"
                        >
                            <span className="inline-flex min-w-0 items-center gap-2 text-slate-600">
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                                <span className="truncate">
                                    {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                                </span>
                            </span>
                            <span className="rounded-md bg-orange-50 px-2 py-1 font-semibold text-orange-700">
                                peso {point.weight}
                            </span>
                        </div>
                    ))
                ) : (
                    <p className="rounded-md border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500">
                        Os pontos aparecem quando as entregas possuem coordenadas
                        de destino.
                    </p>
                )}
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
                <Flame className="h-5 w-5 animate-pulse" />
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
            title: "Sem pontos de calor",
            description:
                "Pedidos com coordenadas de destino formam as areas quentes.",
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
        description: "Preparando recorrencia geografica dos pedidos.",
    };
}

function syncHeatmapCircles(
    google: GoogleMapsGlobal,
    map: GoogleMapsMap,
    currentCircles: Map<string, GoogleMapsCircle>,
    points: OrderHeatmapPoint[],
) {
    const maxWeight = Math.max(...points.map((point) => point.weight), 1);
    const activePointIds = new Set(points.map(getPointKey));

    for (const [pointId, circle] of currentCircles.entries()) {
        if (!activePointIds.has(pointId)) {
            circle.setMap(null);
            currentCircles.delete(pointId);
        }
    }

    for (const point of points) {
        const pointId = getPointKey(point);
        const existingCircle = currentCircles.get(pointId);
        const options = buildCircleOptions(point, maxWeight);

        if (existingCircle) {
            existingCircle.setCenter(options.center);
            existingCircle.setRadius(options.radius);
            existingCircle.setOptions(options);
            continue;
        }

        currentCircles.set(
            pointId,
            new google.maps.Circle({
                ...options,
                map,
            }),
        );
    }
}

function buildCircleOptions(point: OrderHeatmapPoint, maxWeight: number) {
    const intensity = point.weight / maxWeight;
    const radius = 120 + intensity * 360;

    return {
        center: toLatLng(point),
        radius,
        clickable: false,
        strokeColor: intensity >= 0.66 ? "#dc2626" : "#f97316",
        strokeOpacity: 0.35,
        strokeWeight: 1,
        fillColor:
            intensity >= 0.66
                ? "#dc2626"
                : intensity >= 0.33
                  ? "#f97316"
                  : "#f59e0b",
        fillOpacity: 0.22 + intensity * 0.28,
    };
}

function fitMapToPoints(
    google: GoogleMapsGlobal,
    map: GoogleMapsMap,
    points: OrderHeatmapPoint[],
) {
    if (points.length === 1) {
        map.setCenter(toLatLng(points[0]));
        map.setZoom(15);
        return;
    }

    const bounds = new google.maps.LatLngBounds();

    for (const point of points) {
        bounds.extend(toLatLng(point));
    }

    map.fitBounds(bounds, {
        top: 32,
        right: 32,
        bottom: 32,
        left: 32,
    });
}

function clearHeatmapCircles(currentCircles: Map<string, GoogleMapsCircle>) {
    for (const circle of currentCircles.values()) {
        circle.setMap(null);
    }

    currentCircles.clear();
}

function toLatLng(point: OrderHeatmapPoint): GoogleMapsLatLngLiteral {
    return {
        lat: point.lat,
        lng: point.lng,
    };
}

function getPointKey(point: OrderHeatmapPoint) {
    return `${point.lat.toFixed(6)}:${point.lng.toFixed(6)}`;
}
