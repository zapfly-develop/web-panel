"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Navigation } from "lucide-react";
import type { DeliveryStatus } from "../services/delivery-types";
import { loadGoogleMaps } from "../../orders/services/google-maps-loader";
import { cn } from "@/lib/utils";

type DeliveryMapProps = {
    pickupLat?: number | null;
    pickupLng?: number | null;
    destLat?: number | null;
    destLng?: number | null;
    riderLat?: number | null;
    riderLng?: number | null;
    status?: DeliveryStatus | null;
    distanceKm?: number | null;
    className?: string;
};

type LatLng = {
    lat: number;
    lng: number;
};

type RouteSegment = {
    id: string;
    origin: LatLng;
    destination: LatLng;
    color: string;
    label: string;
};

type MapStatus = "idle" | "missing-key" | "loading" | "ready" | "error";

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const BEFORE_PICKUP_STATUSES = new Set<DeliveryStatus>([
    "ASSIGNED",
    "ACCEPTED",
]);

const AFTER_PICKUP_STATUSES = new Set<DeliveryStatus>([
    "PICKED_UP",
    "IN_TRANSIT",
    "ARRIVED_AT_DESTINATION",
    "ABSENT_WAITING",
]);

export function DeliveryMap({
    pickupLat,
    pickupLng,
    destLat,
    destLng,
    riderLat,
    riderLng,
    status,
    distanceKm,
    className,
}: DeliveryMapProps) {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markerRefs = useRef<google.maps.Marker[]>([]);
    const rendererRefs = useRef<google.maps.DirectionsRenderer[]>([]);
    const fallbackPolylineRefs = useRef<google.maps.Polyline[]>([]);
    const [mapStatus, setMapStatus] = useState<MapStatus>(
        googleMapsApiKey ? "idle" : "missing-key",
    );
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const pickup = useMemo(
        () => toLatLng(pickupLat, pickupLng),
        [pickupLat, pickupLng],
    );
    const destination = useMemo(
        () => toLatLng(destLat, destLng),
        [destLat, destLng],
    );
    const rider = useMemo(
        () => toLatLng(riderLat, riderLng),
        [riderLat, riderLng],
    );
    const center = useMemo(
        () =>
            pickup ??
            destination ??
            rider ?? {
                lat: -23.55052,
                lng: -46.633308,
            },
        [destination, pickup, rider],
    );
    const routeSegments = useMemo(
        () => buildRouteSegments({ pickup, destination, rider, status }),
        [destination, pickup, rider, status],
    );

    useEffect(() => {
        const apiKey = googleMapsApiKey;

        if (!apiKey) {
            return;
        }

        let mounted = true;

        async function initMap(apiKeyForRequest: string) {
            if (!mapRef.current) {
                return;
            }

            try {
                setMapStatus((current) =>
                    current === "ready" ? "ready" : "loading",
                );
                setErrorMessage(null);

                const google = await loadGoogleMaps(apiKeyForRequest);

                if (!mounted || !mapRef.current) {
                    return;
                }

                if (!mapInstanceRef.current) {
                    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
                        center,
                        zoom: 13,
                        disableDefaultUI: true,
                        zoomControl: true,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                        clickableIcons: false,
                        keyboardShortcuts: false,
                        gestureHandling: "greedy",
                    });
                }

                setMapStatus("ready");
            } catch (error) {
                if (!mounted) {
                    return;
                }

                setMapStatus("error");
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel carregar Google Maps.",
                );
            }
        }

        void initMap(apiKey);

        return () => {
            mounted = false;
        };
    }, [center]);

    useEffect(() => {
        const map = mapInstanceRef.current;
        const google = window.google;
        const markers = markerRefs.current;
        const renderers = rendererRefs.current;
        const fallbackPolylines = fallbackPolylineRefs.current;

        if (!map || !google?.maps) {
            return;
        }

        clearMapElements(markers, renderers, fallbackPolylines);
        map.setCenter(center);

        const visiblePoints = [rider, pickup, destination].filter(
            (point): point is LatLng => Boolean(point),
        );

        if (rider) {
            markers.push(
                createMarker(google, map, rider, "Você", "#0f172a", 3),
            );
        }

        if (pickup) {
            markers.push(
                createMarker(google, map, pickup, "Loja", "#0ea5e9", 2),
            );
        }

        if (destination) {
            markers.push(
                createMarker(google, map, destination, "Cliente", "#10b981", 1),
            );
        }

        if (routeSegments.length > 0) {
            void renderRouteSegments(
                google,
                map,
                routeSegments,
                renderers,
                fallbackPolylines,
            );
        }

        fitMap(google, map, visiblePoints);

        return () => clearMapElements(markers, renderers, fallbackPolylines);
    }, [center, destination, pickup, rider, routeSegments]);

    return (
        <div
            className={cn(
                "h-full overflow-hidden rounded-xl bg-white shadow-lg",
                className,
            )}
        >
            <div className="relative h-full min-h-[56dvh] bg-slate-100">
                <div ref={mapRef} className="h-full w-full" />
                {mapStatus !== "ready" ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4 text-center">
                        <div>
                            <Navigation className="mx-auto h-12 w-12 text-slate-400" />
                            <p className="mt-2 text-sm font-medium text-slate-700">
                                {getOverlayTitle(mapStatus)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {errorMessage ||
                                    (distanceKm
                                        ? `${distanceKm.toFixed(1)} km estimados`
                                        : "Preparando rota")}
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>

        </div>
    );
}

function toLatLng(
    latitude?: number | null,
    longitude?: number | null,
): LatLng | null {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    return { lat, lng };
}

function buildRouteSegments(input: {
    pickup: LatLng | null;
    destination: LatLng | null;
    rider: LatLng | null;
    status?: DeliveryStatus | null;
}): RouteSegment[] {
    const { pickup, destination, rider, status } = input;
    const segments: RouteSegment[] = [];

    if (rider && pickup && status === "RETURNING_TO_MERCHANT") {
        return [
            {
                id: "return-to-store",
                origin: rider,
                destination: pickup,
                color: "#f97316",
                label: "Retorno para loja",
            },
        ];
    }

    if (rider && pickup && (!status || BEFORE_PICKUP_STATUSES.has(status))) {
        segments.push({
            id: "rider-to-store",
            origin: rider,
            destination: pickup,
            color: "#0ea5e9",
            label: "Rider ate a loja",
        });
    }

    if (rider && destination && status && AFTER_PICKUP_STATUSES.has(status)) {
        segments.push({
            id: "rider-to-customer",
            origin: rider,
            destination,
            color: "#10b981",
            label: "Rider ate o cliente",
        });
    } else if (pickup && destination) {
        segments.push({
            id: "store-to-customer",
            origin: pickup,
            destination,
            color: "#10b981",
            label: "Loja ate o cliente",
        });
    }

    return segments;
}

async function renderRouteSegments(
    google: typeof window.google,
    map: google.maps.Map,
    segments: RouteSegment[],
    renderers: google.maps.DirectionsRenderer[],
    fallbackPolylines: google.maps.Polyline[],
) {
    const directionsService = new google.maps.DirectionsService();

    await Promise.all(
        segments.map(async (segment) => {
            try {
                const result = await directionsService.route({
                    origin: segment.origin,
                    destination: segment.destination,
                    travelMode: google.maps.TravelMode.DRIVING,
                });
                const renderer = new google.maps.DirectionsRenderer({
                    map,
                    directions: result,
                    suppressMarkers: true,
                    preserveViewport: true,
                    polylineOptions: {
                        strokeColor: segment.color,
                        strokeOpacity: 0.9,
                        strokeWeight: 5,
                    },
                });

                renderers.push(renderer);
            } catch {
                fallbackPolylines.push(
                    new google.maps.Polyline({
                        map,
                        path: [segment.origin, segment.destination],
                        geodesic: true,
                        strokeColor: segment.color,
                        strokeOpacity: 0.75,
                        strokeWeight: 4,
                    }),
                );
            }
        }),
    );
}

function createMarker(
    google: typeof window.google,
    map: google.maps.Map,
    position: LatLng,
    title: string,
    color: string,
    zIndex: number,
) {
    return new google.maps.Marker({
        map,
        position,
        title,
        zIndex,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
        },
    });
}

function fitMap(
    google: typeof window.google,
    map: google.maps.Map,
    points: LatLng[],
) {
    if (points.length === 0) {
        return;
    }

    if (points.length === 1) {
        map.setCenter(points[0]);
        map.setZoom(15);
        return;
    }

    const bounds = new google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, 64);
}

function clearMapElements(
    markers: google.maps.Marker[],
    renderers: google.maps.DirectionsRenderer[],
    fallbackPolylines: google.maps.Polyline[],
) {
    markers.forEach((marker) => marker.setMap(null));
    markers.length = 0;

    renderers.forEach((renderer) => renderer.setMap(null));
    renderers.length = 0;

    fallbackPolylines.forEach((polyline) => polyline.setMap(null));
    fallbackPolylines.length = 0;
}

function getOverlayTitle(status: MapStatus) {
    if (status === "missing-key") {
        return "Google Maps sem chave";
    }

    if (status === "error") {
        return "Mapa indisponivel";
    }

    return "Carregando mapa";
}
