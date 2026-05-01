// ===================================================================
// COMPONENTES OPCIONAIS PARA MELHORAR O RIDER DASHBOARD
// ===================================================================

// 1. COMPONENTE DE ESTATÍSTICAS DO DIA
// Mostra métricas do dia atual do rider
// ===================================================================

import { TrendingUp, Package, Clock, DollarSign, Bike } from "lucide-react";

type DailyStatsProps = {
    deliveriesCompleted: number;
    totalEarnings: number;
    hoursActive: number;
    averageRating: number;
};

export function DailyStats({
    deliveriesCompleted,
    totalEarnings,
    hoursActive,
    averageRating,
}: DailyStatsProps) {
    const formatMoney = (cents: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(cents / 100);
    };

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="text-sm font-semibold tracking-wide text-slate-700">
                    ESTATÍSTICAS DE HOJE
                </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Entregas concluídas</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{deliveriesCompleted}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Ganhos no dia</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{formatMoney(totalEarnings)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Horas online</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{hoursActive.toFixed(1)}h</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Avaliação média</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{averageRating.toFixed(1)}</p>
                </div>
            </div>
        </div>
    );
}

// ===================================================================
// 2. COMPONENTE DE MAPA SIMPLIFICADO
// Placeholder para quando integrar Google Maps/Mapbox
// ===================================================================

import { useMemo } from "react";
import {
    GoogleMap,
    Marker,
    Polyline,
    useJsApiLoader,
} from "@react-google-maps/api";
import { MapPin, Navigation } from "lucide-react";

type DeliveryMapProps = {
    pickupLat?: number | null;
    pickupLng?: number | null;
    destLat?: number | null;
    destLng?: number | null;
    distanceKm?: number | null;
};

const containerStyle = {
    width: "100%",
    height: "100%",
};

export function DeliveryMap({
    pickupLat,
    pickupLng,
    destLat,
    destLng,
    distanceKm,
}: DeliveryMapProps) {
    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    });

    const center = useMemo(() => {
        if (pickupLat && pickupLng) {
            return { lat: pickupLat, lng: pickupLng };
        }

        if (destLat && destLng) {
            return { lat: destLat, lng: destLng };
        }

        return { lat: -23.55052, lng: -46.633308 };
    }, [pickupLat, pickupLng, destLat, destLng]);

    const path = useMemo(() => {
        if (!pickupLat || !pickupLng || !destLat || !destLng) return [];

        return [
            { lat: pickupLat, lng: pickupLng },
            { lat: destLat, lng: destLng },
        ];
    }, [pickupLat, pickupLng, destLat, destLng]);

    if (!isLoaded) {
        return (
            <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
                <div className="relative aspect-[16/10] bg-gradient-to-br from-slate-100 to-slate-200">
                    <div className="absolute inset-0 flex items-center justify-center">
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
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
            <div className="relative aspect-[16/10]">
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={center}
                    zoom={13}
                    options={{
                        disableDefaultUI: true,
                        zoomControl: false,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                        clickableIcons: false,
                        keyboardShortcuts: false,
                        gestureHandling: "greedy",
                    }}
                >
                    {pickupLat && pickupLng && (
                        <Marker
                            position={{ lat: pickupLat, lng: pickupLng }}
                            icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: "#0ea5e9",
                                fillOpacity: 1,
                                strokeColor: "#ffffff",
                                strokeWeight: 2,
                            }}
                        />
                    )}

                    {destLat && destLng && (
                        <Marker
                            position={{ lat: destLat, lng: destLng }}
                            icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: "#10b981",
                                fillOpacity: 1,
                                strokeColor: "#ffffff",
                                strokeWeight: 2,
                            }}
                        />
                    )}

                    {path.length === 2 && (
                        <Polyline
                            path={path}
                            options={{
                                strokeColor: "#0f172a",
                                strokeOpacity: 0.8,
                                strokeWeight: 4,
                            }}
                        />
                    )}
                </GoogleMap>
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

export function DeliveryMapPlaceholder({
    pickupLat,
    pickupLng,
    destLat,
    destLng,
    distanceKm,
}: DeliveryMapProps) {
    // Este é um placeholder - substitua por integração real de mapa
    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
            <div className="relative aspect-[16/10] bg-gradient-to-br from-slate-100 to-slate-200">
                {/* Placeholder de mapa - substitua por <GoogleMap> ou <Mapbox> */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <Navigation className="mx-auto h-12 w-12 text-slate-400" />
                        <p className="mt-2 text-sm font-medium text-slate-600">
                            Mapa da rota
                        </p>
                        <p className="text-xs text-slate-500">
                            {distanceKm
                                ? `${distanceKm.toFixed(1)} km`
                                : "Calculando..."}
                        </p>
                    </div>
                </div>

                {/* Pins de origem e destino */}
                {pickupLat && pickupLng && (
                    <div className="absolute left-8 top-8 rounded-full bg-sky-500 p-2 shadow-lg">
                        <MapPin className="h-4 w-4 text-white" />
                    </div>
                )}
                {destLat && destLng && (
                    <div className="absolute bottom-8 right-8 rounded-full bg-emerald-500 p-2 shadow-lg">
                        <MapPin className="h-4 w-4 text-white" />
                    </div>
                )}
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

// ===================================================================
// 3. COMPONENTE DE TIMELINE DE STATUS
// Mostra progresso da entrega visualmente
// ===================================================================

import { CheckCircle2, Circle } from "lucide-react";
import { DeliveryStatus } from "../services/delivery-types";

type DeliveryTimelineProps = {
    currentStatus: DeliveryStatus;
    acceptedAt?: string | null;
    pickedUpAt?: string | null;
    deliveredAt?: string | null;
};

export function DeliveryTimeline({
    currentStatus,
    acceptedAt,
    pickedUpAt,
    deliveredAt,
}: DeliveryTimelineProps) {
    const steps = [
        {
            key: "assigned",
            label: "Atribuída",
            time: null,
            completed: [
                "ASSIGNED",
                "ACCEPTED",
                "PICKED_UP",
                "IN_TRANSIT",
                "DELIVERED",
            ].includes(currentStatus),
        },
        {
            key: "accepted",
            label: "Aceita",
            time: acceptedAt,
            completed: [
                "ACCEPTED",
                "PICKED_UP",
                "IN_TRANSIT",
                "DELIVERED",
            ].includes(currentStatus),
        },
        {
            key: "picked_up",
            label: "Coletada",
            time: pickedUpAt,
            completed: ["PICKED_UP", "IN_TRANSIT", "DELIVERED"].includes(
                currentStatus,
            ),
        },
        {
            key: "delivered",
            label: "Entregue",
            time: deliveredAt,
            completed: currentStatus === "DELIVERED",
        },
    ];

    return (
        <div className="overflow-hidden rounded-2xl bg-white p-4 shadow-lg">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Progresso da Entrega
            </h3>
            <div className="space-y-4">
                {steps.map((step, index) => (
                    <div key={step.key} className="flex items-start gap-3">
                        <div className="relative">
                            {step.completed ? (
                                <div className="rounded-full bg-emerald-500 p-1 shadow-md">
                                    <CheckCircle2 className="h-4 w-4 text-white" />
                                </div>
                            ) : (
                                <Circle className="h-6 w-6 text-slate-300" />
                            )}
                            {index < steps.length - 1 && (
                                <div
                                    className={`absolute left-3 top-6 h-8 w-0.5 ${
                                        step.completed
                                            ? "bg-emerald-500"
                                            : "bg-slate-200"
                                    }`}
                                />
                            )}
                        </div>
                        <div className="flex-1">
                            <p
                                className={`text-sm font-medium ${
                                    step.completed
                                        ? "text-slate-900"
                                        : "text-slate-400"
                                }`}
                            >
                                {step.label}
                            </p>
                            {step.time && (
                                <p className="text-xs text-slate-500">
                                    {new Intl.DateTimeFormat("pt-BR", {
                                        timeStyle: "short",
                                    }).format(new Date(step.time))}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ===================================================================
// 4. COMPONENTE DE NOTIFICAÇÃO IN-APP
// Toast customizado para feedback visual
// ===================================================================

import { Bell, X } from "lucide-react";
import { useState, useEffect } from "react";

type NotificationProps = {
    title: string;
    message: string;
    type?: "info" | "success" | "warning" | "error";
    duration?: number;
    onClose?: () => void;
};

export function InAppNotification({
    title,
    message,
    type = "info",
    duration = 5000,
    onClose,
}: NotificationProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            onClose?.();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!isVisible) return null;

    const colors = {
        info: "from-sky-500 to-sky-600",
        success: "from-emerald-500 to-emerald-600",
        warning: "from-amber-500 to-amber-600",
        error: "from-rose-500 to-rose-600",
    };

    return (
        <div className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-md animate-slide-down">
            <div
                className={`rounded-2xl bg-gradient-to-r ${colors[type]} p-4 text-white shadow-2xl`}
            >
                <div className="flex items-start gap-3">
                    <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                        <Bell className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold">{title}</h4>
                        <p className="mt-1 text-sm opacity-90">{message}</p>
                    </div>
                    <button
                        onClick={() => {
                            setIsVisible(false);
                            onClose?.();
                        }}
                        className="rounded-full p-1 hover:bg-white/20"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ===================================================================
// 5. COMPONENTE DE GANHOS DO DIA (EARNINGS CARD)
// Card focado em mostrar ganhos de forma atrativa
// ===================================================================

type EarningsCardProps = {
    todayEarnings: number;
    weekEarnings: number;
    monthEarnings: number;
    currency?: string;
};

export function EarningsCard({
    todayEarnings,
    weekEarnings,
    monthEarnings,
    currency = "BRL",
}: EarningsCardProps) {
    const formatMoney = (cents: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency,
        }).format(cents / 100);
    };

    return (
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
            <div className="p-6 text-white">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium opacity-90">
                            Seus Ganhos
                        </p>
                        <h2 className="mt-1 text-3xl font-bold">
                            {formatMoney(todayEarnings)}
                        </h2>
                        <p className="mt-1 text-sm opacity-75">Hoje</p>
                    </div>
                    <div className="rounded-full bg-white/20 p-4 backdrop-blur-sm">
                        <DollarSign className="h-8 w-8" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                    <div>
                        <p className="text-xs opacity-75">Esta Semana</p>
                        <p className="mt-1 text-lg font-bold">
                            {formatMoney(weekEarnings)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs opacity-75">Este Mês</p>
                        <p className="mt-1 text-lg font-bold">
                            {formatMoney(monthEarnings)}
                        </p>
                    </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    <span className="opacity-90">+23% vs. semana passada</span>
                </div>
            </div>
        </div>
    );
}

// ===================================================================
// 6. ANIMAÇÃO DE LOADING PERSONALIZADA
// Spinner customizado com a identidade visual
// ===================================================================

export function RiderLoadingSpinner() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="text-center">
                <div className="relative mx-auto h-20 w-20">
                    <div className="absolute inset-0 rounded-full border-4 border-sky-200"></div>
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-sky-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Bike className="h-8 w-8 text-sky-600" />
                    </div>
                </div>
                <p className="mt-4 font-semibold text-slate-900">
                    Carregando...
                </p>
                <p className="mt-1 text-sm text-slate-600">
                    Preparando sua dashboard
                </p>
            </div>
        </div>
    );
}

// ===================================================================
// 7. EXEMPLO DE USO NO RIDER DASHBOARD
// Como integrar os componentes opcionais
// ===================================================================

/*
// No rider-dashboard.tsx, você pode adicionar:

// 1. Estatísticas do dia (após o card de disponibilidade):
<DailyStats
    deliveriesCompleted={5}
    totalEarnings={8500} // em centavos
    hoursActive={4.5}
    averageRating={4.8}
/>

// 2. Mapa da rota (quando há entrega ativa):
{activeDelivery && (
    <DeliveryMapPlaceholder
        pickupLat={activeDelivery.pickupLatitude}
        pickupLng={activeDelivery.pickupLongitude}
        destLat={activeDelivery.destinationLatitude}
        destLng={activeDelivery.destinationLongitude}
        distanceKm={
            activeDelivery.distanceMeters
                ? activeDelivery.distanceMeters / 1000
                : undefined
        }
    />
)}

// 3. Timeline de status (dentro do card de entrega):
<DeliveryTimeline
    currentStatus={activeDelivery.status}
    acceptedAt={activeDelivery.acceptedAt}
    pickedUpAt={activeDelivery.pickedUpAt}
    deliveredAt={activeDelivery.deliveredAt}
/>

// 4. Card de ganhos (nova seção):
<EarningsCard
    todayEarnings={8500}
    weekEarnings={42000}
    monthEarnings={185000}
/>

// 5. Loading state:
if (isLoading) {
    return <RiderLoadingSpinner />;
}
*/

// ===================================================================
// 8. TAILWIND CONFIG ADDITIONS
// Adicione ao seu tailwind.config.js
// ===================================================================

/*
module.exports = {
  theme: {
    extend: {
      animation: {
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
}
*/
