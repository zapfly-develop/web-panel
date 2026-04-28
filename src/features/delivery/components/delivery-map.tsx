"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Navigation } from "lucide-react";
import { loadGoogleMaps } from "../../orders/services/google-maps-loader";

type DeliveryMapProps = {
    pickupLat?: number | null;
    pickupLng?: number | null;
    destLat?: number | null;
    destLng?: number | null;
    distanceKm?: number | null;
};

export function DeliveryMap({
    pickupLat,
    pickupLng,
    destLat,
    destLng,
    distanceKm,
}: DeliveryMapProps) {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
    const destMarkerRef = useRef<google.maps.Marker | null>(null);
    const polylineRef = useRef<google.maps.Polyline | null>(null);

    const [isLoaded, setIsLoaded] = useState(false);

    const center = useMemo(() => {
        if (pickupLat && pickupLng) {
            return { lat: pickupLat, lng: pickupLng };
        }

        if (destLat && destLng) {
            return { lat: destLat, lng: destLng };
        }

        return { lat: -23.55052, lng: -46.633308 };
    }, [pickupLat, pickupLng, destLat, destLng]);

    useEffect(() => {
        let mounted = true;

        async function initMap() {
            if (!mapRef.current) return;

            try {
                const google = await loadGoogleMaps(
                    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
                );

                if (!mounted || !mapRef.current) return;

                const map = new google.maps.Map(mapRef.current, {
                    center,
                    zoom: 13,
                    disableDefaultUI: true,
                    zoomControl: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    clickableIcons: false,
                    keyboardShortcuts: false,
                    gestureHandling: "greedy",
                });

                mapInstanceRef.current = map;
                setIsLoaded(true);
            } catch (error) {
                console.error("Erro ao carregar Google Maps:", error);
            }
        }

        initMap();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !window.google?.maps) return;

        const google = window.google;

        map.setCenter(center);

        if (pickupMarkerRef.current) pickupMarkerRef.current.setMap(null);
        if (destMarkerRef.current) destMarkerRef.current.setMap(null);
        if (polylineRef.current) polylineRef.current.setMap(null);

        if (pickupLat && pickupLng) {
            pickupMarkerRef.current = new google.maps.Marker({
                position: { lat: pickupLat, lng: pickupLng },
                map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: "#0ea5e9",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2,
                },
            });
        }

        if (destLat && destLng) {
            destMarkerRef.current = new google.maps.Marker({
                position: { lat: destLat, lng: destLng },
                map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: "#10b981",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2,
                },
            });
        }

        if (pickupLat && pickupLng && destLat && destLng) {
            const path = [
                { lat: pickupLat, lng: pickupLng },
                { lat: destLat, lng: destLng },
            ];

            polylineRef.current = new google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: "#0f172a",
                strokeOpacity: 0.8,
                strokeWeight: 4,
            });

            polylineRef.current.setMap(map);

            const bounds = new google.maps.LatLngBounds();
            bounds.extend(path[0]);
            bounds.extend(path[1]);
            map.fitBounds(bounds, 80);
        }
    }, [center, pickupLat, pickupLng, destLat, destLng]);

    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
            <div className="relative aspect-[16/10] bg-slate-100">
                {!isLoaded && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                        <div className="text-center">
                            <Navigation className="mx-auto h-12 w-12 text-slate-400" />
                            <p className="mt-2 text-sm font-medium text-slate-600">
                                Carregando mapa
                            </p>
                            <p className="text-xs text-slate-500">
                                {distanceKm
                                    ? `${distanceKm.toFixed(1)} km`
                                    : "Calculando..."}
                            </p>
                        </div>
                    </div>
                )}

                <div ref={mapRef} className="h-full w-full" />
            </div>

            <div className="p-4">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-sky-500" />
                        <span className="text-slate-600">Origem</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-600">Destino</span>
                        <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    </div>
                </div>
            </div>
        </div>
    );
}
