"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    Bike,
    CheckCircle2,
    Clock3,
    Loader2,
    LocateFixed,
    MapPin,
    PackageCheck,
    Phone,
    Radio,
    RefreshCw,
    Route,
    WalletCards,
    WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useDeliveryRealtime } from "../hooks/use-delivery-realtime";
import { useRiderLocation } from "../hooks/use-rider-location";
import type {
    DeliveryRider,
    DeliveryStatusChangedEvent,
    StoreDelivery,
} from "../services/delivery-types";

type RiderDashboardProps = {
    userId: string;
    initialProfile: DeliveryRider | null;
    initialActiveDelivery: StoreDelivery | null;
    loadError: string | null;
};

type DeliveryAction = "accept" | "pick-up" | "complete";

function formatTime(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        timeStyle: "short",
    }).format(new Date(value));
}

function formatMoney(valueCents: number, currency = "BRL") {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency,
    }).format(valueCents / 100);
}

function formatDistance(distanceMeters: number | null) {
    if (!distanceMeters || distanceMeters <= 0) {
        return "Sem distancia";
    }

    if (distanceMeters < 1000) {
        return `${distanceMeters} m`;
    }

    return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function isOperationallyOnline(profile: DeliveryRider | null) {
    return profile?.availabilityStatus === "AVAILABLE";
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            payload?.error ||
                payload?.message ||
                "Nao foi possivel concluir a operacao.",
        );
    }

    return payload as T;
}

export function RiderDashboard({
    userId,
    initialProfile,
    initialActiveDelivery,
    loadError,
}: RiderDashboardProps) {
    const [profile, setProfile] = useState(initialProfile);
    const [activeDelivery, setActiveDelivery] = useState(initialActiveDelivery);
    const [isChangingAvailability, setIsChangingAvailability] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [runningAction, setRunningAction] = useState<DeliveryAction | null>(
        null,
    );

    const isActiveRider = profile?.status === "ACTIVE";
    const isOnline = isOperationallyOnline(profile);
    const activeDeliveryId = activeDelivery?.id ?? null;

    const refreshProfile = useCallback(async () => {
        const nextProfile = await fetchJson<DeliveryRider>(
            "/api/delivery/rider/me",
        );
        setProfile(nextProfile);
        return nextProfile;
    }, []);

    const refreshActiveDelivery = useCallback(async () => {
        const nextDelivery = await fetchJson<StoreDelivery | null>(
            "/api/delivery/rider/active-delivery",
        );
        setActiveDelivery(nextDelivery);
        return nextDelivery;
    }, []);

    const refreshRiderState = useCallback(async () => {
        try {
            setIsRefreshing(true);
            await Promise.all([refreshProfile(), refreshActiveDelivery()]);
        } finally {
            setIsRefreshing(false);
        }
    }, [refreshActiveDelivery, refreshProfile]);

    const handleDeliveryStatusChanged = useCallback(
        (event: DeliveryStatusChangedEvent) => {
            if (!profile || event.riderId !== profile.id) {
                return;
            }

            void refreshActiveDelivery();

            if (event.status === "DELIVERED" || event.status === "CANCELED") {
                void refreshProfile();
            }
        },
        [profile, refreshActiveDelivery, refreshProfile],
    );

    const realtime = useDeliveryRealtime({
        userId,
        enabled: Boolean(profile),
        onDeliveryAssigned: () => void refreshActiveDelivery(),
        onDeliveryStatusChanged: handleDeliveryStatusChanged,
        onRiderStatusChanged: () => void refreshProfile(),
    });

    useEffect(() => {
        const interval = window.setInterval(
            () => void refreshActiveDelivery(),
            realtime.isConnected ? 60000 : 20000,
        );

        return () => window.clearInterval(interval);
    }, [realtime.isConnected, refreshActiveDelivery]);

    const location = useRiderLocation({
        enabled: Boolean(isOnline && isActiveRider),
        deliveryId: activeDeliveryId,
    });

    const statusCopy = useMemo(() => {
        if (!profile) {
            return {
                label: "Sem perfil",
                className: "border-slate-200 bg-slate-50 text-slate-600",
            };
        }

        if (profile.status !== "ACTIVE") {
            return {
                label: "Em analise",
                className: "border-amber-200 bg-amber-50 text-amber-700",
            };
        }

        if (profile.availabilityStatus === "BUSY") {
            return {
                label: "Em entrega",
                className: "border-sky-200 bg-sky-50 text-sky-700",
            };
        }

        if (isOnline) {
            return {
                label: "Online",
                className:
                    "border-emerald-200 bg-emerald-50 text-emerald-700",
            };
        }

        return {
            label: "Offline",
            className: "border-slate-200 bg-slate-50 text-slate-600",
        };
    }, [isOnline, profile]);

    async function handleAvailabilityChange(nextChecked: boolean) {
        try {
            setIsChangingAvailability(true);

            const nextProfile = await fetchJson<DeliveryRider>(
                "/api/delivery/rider/availability",
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        availabilityStatus: nextChecked
                            ? "AVAILABLE"
                            : "OFFLINE",
                    }),
                },
            );

            setProfile(nextProfile);
            toast.success(nextChecked ? "Voce esta online." : "Voce esta offline.");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Falha ao alterar disponibilidade.",
            );
        } finally {
            setIsChangingAvailability(false);
        }
    }

    async function runDeliveryAction(action: DeliveryAction) {
        if (!activeDelivery) {
            return;
        }

        const actionCopy: Record<DeliveryAction, string> = {
            accept: "aceitar",
            "pick-up": "coletar",
            complete: "finalizar",
        };

        try {
            setRunningAction(action);

            await fetchJson(
                `/api/delivery/rider/deliveries/${activeDelivery.id}/${action}`,
                {
                    method: "POST",
                },
            );
            await Promise.all([refreshActiveDelivery(), refreshProfile()]);

            toast.success(`Entrega ${actionCopy[action]} concluida.`);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : `Falha ao ${actionCopy[action]} entrega.`,
            );
        } finally {
            setRunningAction(null);
        }
    }

    if (!profile) {
        return (
            <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-slate-50 px-4 py-6">
                <div className="mb-6">
                    <p className="text-sm font-medium text-sky-700">
                        Zaply Rider
                    </p>
                    <h1 className="mt-2 text-3xl font-bold text-slate-950">
                        App do entregador
                    </h1>
                </div>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Perfil indisponivel</AlertTitle>
                    <AlertDescription>
                        {loadError ||
                            "Crie ou aprove um perfil de entregador antes de entrar em operacao."}
                    </AlertDescription>
                </Alert>
            </main>
        );
    }

    const canAccept =
        activeDelivery?.status === "ASSIGNED" && !activeDelivery.acceptedAt;
    const canPickUp =
        activeDelivery?.status === "ASSIGNED" && Boolean(activeDelivery.acceptedAt);
    const canComplete = activeDelivery?.status === "PICKED_UP";
    const customerLabel =
        activeDelivery?.order.customerName ||
        activeDelivery?.order.customerWhatsappId ||
        "Cliente";

    return (
        <main className="mx-auto min-h-dvh max-w-md bg-slate-50">
            <section className="bg-white px-4 pb-5 pt-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-sky-700">
                            Zaply Rider
                        </p>
                        <h1 className="mt-1 truncate text-2xl font-bold text-slate-950">
                            {profile.displayName || "Entregador"}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {profile.vehiclePlate || "Veiculo sem placa"}
                        </p>
                    </div>
                    <Badge variant="outline" className={statusCopy.className}>
                        {statusCopy.label}
                    </Badge>
                </div>

                <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-semibold text-slate-950">
                                Disponibilidade
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                {isOnline
                                    ? "Recebendo chamadas de entrega."
                                    : "Fora da fila de entrega."}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {isChangingAvailability ? (
                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                            ) : null}
                            <Switch
                                checked={isOnline}
                                disabled={!isActiveRider || isChangingAvailability}
                                onCheckedChange={handleAvailabilityChange}
                                className="data-[state=checked]:bg-emerald-600"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-4 px-4 py-5">
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <Radio
                                className={cn(
                                    "h-4 w-4",
                                    realtime.isConnected
                                        ? "text-emerald-600"
                                        : "text-slate-400",
                                )}
                            />
                            {!realtime.isConnected ? (
                                <WifiOff className="h-4 w-4 text-slate-400" />
                            ) : null}
                        </div>
                        <p className="mt-3 text-sm text-slate-500">
                            Tempo real
                        </p>
                        <p className="font-semibold text-slate-950">
                            {realtime.isConnected ? "Conectado" : "Polling"}
                        </p>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-white p-4">
                        <LocateFixed
                            className={cn(
                                "h-4 w-4",
                                location.isActive
                                    ? "text-emerald-600"
                                    : "text-slate-400",
                            )}
                        />
                        <p className="mt-3 text-sm text-slate-500">
                            Localizacao
                        </p>
                        <p className="font-semibold text-slate-950">
                            {location.isActive ? "Ativa" : "Inativa"}
                        </p>
                    </div>
                </div>

                {location.errorMessage ? (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Localizacao pausada</AlertTitle>
                        <AlertDescription>
                            {location.errorMessage}
                        </AlertDescription>
                    </Alert>
                ) : null}

                <div className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-500">
                                Entrega ativa
                            </p>
                            <h2 className="mt-1 truncate text-xl font-bold text-slate-950">
                                {activeDelivery
                                    ? `Pedido ${activeDelivery.orderId.slice(-6)}`
                                    : "Aguardando chamada"}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                size="icon-sm"
                                variant="outline"
                                onClick={() => void refreshRiderState()}
                                disabled={isRefreshing}
                                aria-label="Atualizar"
                            >
                                <RefreshCw
                                    className={cn(
                                        "h-4 w-4",
                                        isRefreshing && "animate-spin",
                                    )}
                                />
                            </Button>
                            <div className="rounded-md bg-slate-100 p-3 text-slate-500">
                                <Bike className="h-5 w-5" />
                            </div>
                        </div>
                    </div>

                    {activeDelivery ? (
                        <div className="mt-4 space-y-4">
                            <div className="rounded-md bg-slate-50 p-3">
                                <p className="font-semibold text-slate-950">
                                    {customerLabel}
                                </p>
                                <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                    {activeDelivery.destinationAddress ||
                                        activeDelivery.order.deliveryAddress}
                                </p>
                                {activeDelivery.order.customerWhatsappId ? (
                                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                                        <Phone className="h-4 w-4 text-slate-400" />
                                        {activeDelivery.order.customerWhatsappId}
                                    </p>
                                ) : null}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-md bg-sky-50 p-3">
                                    <Route className="h-4 w-4 text-sky-600" />
                                    <p className="mt-2 text-xs text-sky-700">
                                        Distancia
                                    </p>
                                    <p className="font-semibold text-sky-950">
                                        {formatDistance(
                                            activeDelivery.distanceMeters,
                                        )}
                                    </p>
                                </div>
                                <div className="rounded-md bg-emerald-50 p-3">
                                    <WalletCards className="h-4 w-4 text-emerald-600" />
                                    <p className="mt-2 text-xs text-emerald-700">
                                        Repasse
                                    </p>
                                    <p className="font-semibold text-emerald-950">
                                        {formatMoney(
                                            activeDelivery.riderPayoutCents,
                                            activeDelivery.currency,
                                        )}
                                    </p>
                                </div>
                            </div>

                            <p className="flex items-center gap-2 text-sm text-slate-500">
                                <Clock3 className="h-4 w-4" />
                                Atualizada as {formatTime(activeDelivery.updatedAt)}
                            </p>

                            <div className="space-y-2">
                                <Button
                                    type="button"
                                    className="h-11 w-full"
                                    disabled={!canAccept || runningAction !== null}
                                    onClick={() => void runDeliveryAction("accept")}
                                >
                                    {runningAction === "accept" ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                    )}
                                    {activeDelivery.acceptedAt
                                        ? "Entrega aceita"
                                        : "Aceitar entrega"}
                                </Button>

                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        type="button"
                                        className="h-11"
                                        disabled={
                                            !canPickUp || runningAction !== null
                                        }
                                        onClick={() =>
                                            void runDeliveryAction("pick-up")
                                        }
                                    >
                                        {runningAction === "pick-up" ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <PackageCheck className="h-4 w-4" />
                                        )}
                                        Coletar
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-11"
                                        disabled={
                                            !canComplete ||
                                            runningAction !== null
                                        }
                                        onClick={() =>
                                            void runDeliveryAction("complete")
                                        }
                                    >
                                        {runningAction === "complete" ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4" />
                                        )}
                                        Finalizar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-md border border-dashed border-slate-200 p-5 text-center">
                            <MapPin className="mx-auto h-6 w-6 text-slate-400" />
                            <p className="mt-3 font-medium text-slate-900">
                                Fique online para receber uma corrida.
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Quando a loja atribuir uma entrega, ela aparece
                                aqui automaticamente.
                            </p>
                        </div>
                    )}
                </div>

                {location.lastLocation ? (
                    <p className="text-center text-xs text-slate-400">
                        Ultimo ping as {formatTime(location.lastLocation.sentAt)}
                    </p>
                ) : null}
            </section>
        </main>
    );
}
