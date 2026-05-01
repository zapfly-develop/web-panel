"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    Bike,
    CheckCircle2,
    Clock3,
    Home,
    Loader2,
    LocateFixed,
    MapPin,
    Menu,
    MessageSquare,
    PackageCheck,
    Phone,
    Radio,
    RefreshCw,
    Route,
    User,
    WalletCards,
    WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useDeliveryRealtime } from "../hooks/use-delivery-realtime";
import { useRiderLocation } from "../hooks/use-rider-location";
import { useDeliveryContingencies } from "../hooks/use-delivery-contingencies";
import type {
    DeliveryAssignedEvent,
    DeliveryRider,
    RiderNewAvailableDeliveryEvent,
    DeliveryStatusChangedEvent,
    StoreDelivery,
} from "../services/delivery-types";
import {
    reportClientAbsent,
    reportRiderIncident,
} from "../services/delivery-api";
import { DailyStats } from "../components/optional-components";
import { DeliveryMap } from "../components/delivery-map";

type RiderDashboardProps = {
    userId: string;
    initialProfile: DeliveryRider | null;
    initialActiveDelivery: StoreDelivery | null;
    loadError: string | null;
};

type DeliveryAction = "accept" | "pick-up" | "complete" | "incident" | "absent";
type DeliveryActionPayload = {
    reason?: string;
    description?: string;
};

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

function isOperationallyOnline(profile: DeliveryRider | null) {
    return (
        profile?.availabilityStatus === "AVAILABLE" ||
        profile?.availabilityStatus === "BUSY"
    );
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
                "Não foi possível concluir a operação.",
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
    const [activeTab, setActiveTab] = useState<"home" | "delivery">("home");
    const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);
    const [incidentReason, setIncidentReason] = useState("");
    const [incidentDescription, setIncidentDescription] = useState("");
    const [availableOffer, setAvailableOffer] =
        useState<RiderNewAvailableDeliveryEvent | null>(null);

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

    const handleDeliveryAssigned = useCallback(
        (event: DeliveryAssignedEvent) => {
            setAvailableOffer((currentOffer) =>
                currentOffer?.deliveryId === event.deliveryId
                    ? null
                    : currentOffer,
            );
            void refreshActiveDelivery();
        },
        [refreshActiveDelivery],
    );

    const handleAvailableDelivery = useCallback(
        (event: RiderNewAvailableDeliveryEvent) => {
            if (
                event.riderUserIds?.length &&
                !event.riderUserIds.includes(userId)
            ) {
                return;
            }

            setAvailableOffer(event);

            toast.info(
                event.isHighPriority
                    ? "Entrega prioritária disponível"
                    : "Nova entrega disponível",
                {
                    description: event.riderPayoutCents
                        ? `Repasse previsto: ${formatMoney(event.riderPayoutCents)}`
                        : "A corrida entrou na fila próxima a você.",
                    duration: 10000,
                },
            );
        },
        [userId],
    );

    const realtime = useDeliveryRealtime({
        userId,
        enabled: Boolean(profile),
        onDeliveryAssigned: handleDeliveryAssigned,
        onDeliveryStatusChanged: handleDeliveryStatusChanged,
        onRiderNewAvailableDelivery: handleAvailableDelivery,
        onRiderStatusChanged: () => void refreshProfile(),
        onCustomerResponded: (event) => {
            toast.info(event.message, {
                description: event.customerMessagePreview,
                duration: 10000,
            });
        },
        onRiderStalledWarning: () => {
            toast.warning("Você está a caminho?", {
                description:
                    "Notamos que você não se moveu em direção à loja. Reporte um incidente se houver problemas.",
                duration: 10000,
            });
        },
        onRiderStalledUnassigned: (event) => {
            toast.error("Entrega cancelada por inatividade.", {
                description: `Você foi bloqueado até ${new Intl.DateTimeFormat(
                    "pt-BR",
                    { timeStyle: "short" },
                ).format(new Date(event.riderBlockedUntil || ""))}`,
            });
            void refreshRiderState();
        },
    });

    const contingencies = useDeliveryContingencies(activeDelivery);

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

    useEffect(() => {
        if (activeDelivery) {
            setAvailableOffer(null);
        }
    }, [activeDelivery]);

    const statusCopy = useMemo(() => {
        if (!profile) {
            return {
                label: "Sem perfil",
                className: "border-slate-200 bg-slate-50 text-slate-600",
                dotColor: "bg-slate-400",
            };
        }

        if (profile.status !== "ACTIVE") {
            return {
                label: "Em análise",
                className: "border-amber-200 bg-amber-50 text-amber-700",
                dotColor: "bg-amber-500",
            };
        }

        if (profile.availabilityStatus === "BUSY") {
            return {
                label: "Em entrega",
                className: "border-sky-200 bg-sky-50 text-sky-700",
                dotColor: "bg-sky-500",
            };
        }

        if (isOnline) {
            return {
                label: "Online",
                className: "border-emerald-200 bg-emerald-50 text-emerald-700",
                dotColor: "bg-emerald-500 animate-pulse",
            };
        }

        return {
            label: "Offline",
            className: "border-slate-200 bg-slate-50 text-slate-600",
            dotColor: "bg-slate-400",
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
            toast.success(
                nextChecked ? "Você está online." : "Você está offline.",
            );
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

    async function runDeliveryAction(
        action: DeliveryAction,
        payload?: DeliveryActionPayload,
    ) {
        if (!activeDelivery) {
            return;
        }

        const actionCopy: Record<DeliveryAction, string> = {
            accept: "aceitar",
            "pick-up": "coletar",
            complete: "finalizar",
            incident: "reportar incidente",
            absent: "reportar ausência",
        };

        try {
            setRunningAction(action);

            if (action === "incident") {
                await reportRiderIncident(
                    userId,
                    activeDelivery.id,
                    payload as { reason: string; description?: string },
                );
            } else if (action === "absent") {
                await reportClientAbsent(
                    userId,
                    activeDelivery.id,
                    payload ? { description: payload.description } : undefined,
                );
            } else {
                await fetchJson(
                    `/api/delivery/rider/deliveries/${activeDelivery.id}/${action}`,
                    {
                        method: "POST",
                    },
                );
            }

            await Promise.all([refreshActiveDelivery(), refreshProfile()]);

            toast.success(`Operação ${actionCopy[action]} concluída.`);

            if (action === "incident") {
                setActiveTab("home");
            }
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
            <main className="flex min-h-dvh flex-col bg-gradient-to-b from-slate-50 to-slate-100">
                <div className="mx-auto w-full max-w-md px-4 py-8">
                    <div className="mb-8 text-center">
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
                            <Bike className="h-8 w-8 text-sky-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-950">
                            Zaply Rider
                        </h1>
                        <p className="mt-2 text-slate-600">App do entregador</p>
                    </div>
                    <Alert variant="destructive" className="shadow-lg">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Perfil indisponível</AlertTitle>
                        <AlertDescription>
                            {loadError ||
                                "Crie ou aprove um perfil de entregador antes de entrar em operação."}
                        </AlertDescription>
                    </Alert>
                </div>
            </main>
        );
    }

    const canAccept =
        activeDelivery?.status === "ASSIGNED" && !activeDelivery.acceptedAt;
    const canPickUp =
        activeDelivery?.status === "ASSIGNED" &&
        Boolean(activeDelivery.acceptedAt);
    const canComplete =
        activeDelivery?.status === "PICKED_UP" ||
        activeDelivery?.status === "IN_TRANSIT" ||
        activeDelivery?.status === "ARRIVED_AT_DESTINATION" ||
        activeDelivery?.status === "ABSENT_WAITING";

    const canReportIncident =
        activeDelivery?.status === "PICKED_UP" ||
        activeDelivery?.status === "IN_TRANSIT" ||
        activeDelivery?.status === "ARRIVED_AT_DESTINATION";

    const canReportAbsent =
        activeDelivery?.status === "ARRIVED_AT_DESTINATION";
    const customerLabel =
        activeDelivery?.order.customerName ||
        activeDelivery?.order.customerWhatsappId ||
        "Cliente";
    const riderLatitude =
        location.lastLocation?.latitude ??
        profile.location?.latitude ??
        profile.currentLatitude ??
        null;
    const riderLongitude =
        location.lastLocation?.longitude ??
        profile.location?.longitude ??
        profile.currentLongitude ??
        null;

    return (
        <main className="relative min-h-dvh bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white shadow-sm">
                <div className="mx-auto max-w-md px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-md">
                                    <User className="h-6 w-6" />
                                </div>
                                <div
                                    className={cn(
                                        "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white",
                                        statusCopy.dotColor,
                                    )}
                                />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-sky-600">
                                    Olá, entregador
                                </p>
                                <h1 className="text-lg font-bold text-slate-950">
                                    {profile.displayName || "Zaply Rider"}
                                </h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => void refreshRiderState()}
                                disabled={isRefreshing}
                                className="h-10 w-10 rounded-full"
                            >
                                <RefreshCw
                                    className={cn(
                                        "h-5 w-5 text-slate-600",
                                        isRefreshing && "animate-spin",
                                    )}
                                />
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-10 w-10 rounded-full"
                            >
                                <Menu className="h-5 w-5 text-slate-600" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="mx-auto max-w-md space-y-4 px-4 py-6">
                {/* Availability Card */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
                    <div className="bg-gradient-to-r from-sky-500 to-sky-600 p-4 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium opacity-90">
                                    Status de operação
                                </p>
                                <h2 className="mt-1 text-2xl font-bold">
                                    {statusCopy.label}
                                </h2>
                            </div>
                            <div className="flex items-center gap-3">
                                {isChangingAvailability ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : null}
                                <Switch
                                    checked={isOnline}
                                    disabled={
                                        !isActiveRider || isChangingAvailability
                                    }
                                    onCheckedChange={handleAvailabilityChange}
                                    className="data-[state=checked]:bg-white data-[state=unchecked]:bg-sky-300/50"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-4">
                        <p className="text-sm text-slate-600">
                            {isOnline
                                ? "🎯 Você está recebendo chamadas de entrega"
                                : "⏸️ Você está fora da fila de entregas"}
                        </p>
                        {profile.vehiclePlate ? (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5">
                                <Bike className="h-4 w-4 text-slate-600" />
                                <span className="text-sm font-medium text-slate-700">
                                    {profile.vehiclePlate}
                                </span>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="overflow-hidden rounded-2xl bg-white shadow-md">
                        <div className="p-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className={cn(
                                        "rounded-full p-2.5",
                                        realtime.isConnected
                                            ? "bg-emerald-100"
                                            : "bg-slate-100",
                                    )}
                                >
                                    {realtime.isConnected ? (
                                        <Radio className="h-5 w-5 text-emerald-600" />
                                    ) : (
                                        <WifiOff className="h-5 w-5 text-slate-400" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500">
                                        Conexão
                                    </p>
                                    <p className="text-sm font-bold text-slate-950">
                                        {realtime.isConnected
                                            ? "Ativa"
                                            : "Polling"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl bg-white shadow-md">
                        <div className="p-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className={cn(
                                        "rounded-full p-2.5",
                                        location.isActive
                                            ? "bg-emerald-100"
                                            : "bg-slate-100",
                                    )}
                                >
                                    <LocateFixed
                                        className={cn(
                                            "h-5 w-5",
                                            location.isActive
                                                ? "text-emerald-600"
                                                : "text-slate-400",
                                        )}
                                    />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500">
                                        GPS
                                    </p>
                                    <p className="text-sm font-bold text-slate-950">
                                        {location.isActive
                                            ? "Ativo"
                                            : "Inativo"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DailyStats
                    deliveriesCompleted={5}
                    totalEarnings={8500} // em centavos
                    hoursActive={4.5}
                    averageRating={4.8}
                />

                {/* Location Error */}
                {location.errorMessage ? (
                    <Alert
                        variant="destructive"
                        className="rounded-2xl shadow-md"
                    >
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Localização pausada</AlertTitle>
                        <AlertDescription>
                            {location.errorMessage}
                        </AlertDescription>
                    </Alert>
                ) : null}

                {/* Cooldown Alert */}
                {profile.incidentBlockedUntil &&
                new Date(profile.incidentBlockedUntil) > new Date() ? (
                    <Alert variant="destructive" className="rounded-2xl shadow-md">
                        <Clock3 className="h-4 w-4" />
                        <AlertTitle>Bloqueio Temporário</AlertTitle>
                        <AlertDescription>
                            Você está temporariamente bloqueado para novas
                            entregas até{" "}
                            {new Intl.DateTimeFormat("pt-BR", {
                                timeStyle: "short",
                            }).format(new Date(profile.incidentBlockedUntil))}
                            .
                        </AlertDescription>
                    </Alert>
                ) : null}

                {/* Active Delivery Card */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-4 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium opacity-90">
                                    Entrega ativa
                                </p>
                                <h2 className="mt-1 text-xl font-bold">
                                    {activeDelivery
                                        ? `#${activeDelivery.orderId.slice(-6)}`
                                        : "Aguardando chamada"}
                                </h2>
                            </div>
                            <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                                <Bike className="h-6 w-6" />
                            </div>
                        </div>
                    </div>

                    {activeDelivery ? (
                        <>
                        {activeDelivery.status === "ABSENT_WAITING" && (
                            <div className="bg-amber-50 p-4 border-b border-amber-100">
                                <div className="flex items-center justify-between text-amber-800">
                                    <div className="flex items-center gap-2">
                                        <Clock3 className="h-5 w-5 animate-pulse" />
                                        <span className="font-bold">Aguardando cliente no local</span>
                                    </div>
                                    <span className="text-xl font-mono font-bold">
                                        {contingencies.formattedTimeLeft || "0:00"}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-amber-700">
                                    O cliente foi notificado. Por favor, aguarde o tempo de segurança.
                                </p>
                            </div>
                        )}

                        {activeDelivery.status === "RETURNING_TO_MERCHANT" && (
                            <div className="bg-red-50 p-4 border-b border-red-100">
                                <div className="flex items-center gap-2 text-red-800">
                                    <RefreshCw className="h-5 w-5" />
                                    <span className="font-bold">Retornar para a loja</span>
                                </div>
                                <p className="mt-1 text-xs text-red-700">
                                    Tempo de espera esgotado. Por favor, devolva o pacote na loja.
                                </p>
                            </div>
                        )}

                        <DeliveryMap
                            pickupLat={activeDelivery.pickupLatitude}
                            pickupLng={activeDelivery.pickupLongitude}
                            destLat={activeDelivery.destinationLatitude}
                            destLng={activeDelivery.destinationLongitude}
                            riderLat={riderLatitude}
                            riderLng={riderLongitude}
                            status={activeDelivery.status}
                            distanceKm={
                                activeDelivery.distanceMeters
                                    ? activeDelivery.distanceMeters / 1000
                                    : undefined
                            }
                        />

                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900">{customerLabel}</h3>
                                    <p className="text-sm text-slate-500">{activeDelivery.destinationAddress}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="icon" variant="outline" className="rounded-full">
                                        <Phone className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="outline" className="rounded-full">
                                        <MessageSquare className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="pt-2 flex flex-wrap gap-2">
                                {canAccept && (
                                    <Button
                                        className="flex-1 bg-sky-600 hover:bg-sky-700"
                                        onClick={() => runDeliveryAction("accept")}
                                        disabled={!!runningAction}
                                    >
                                        {runningAction === "accept" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                        Aceitar Corrida
                                    </Button>
                                )}

                                {canPickUp && (
                                    <Button
                                        className="flex-1 bg-amber-600 hover:bg-amber-700"
                                        onClick={() => runDeliveryAction("pick-up")}
                                        disabled={!!runningAction}
                                    >
                                        {runningAction === "pick-up" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                                        Coletar Pedido
                                    </Button>
                                )}

                                {canComplete && (
                                    <Button
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => runDeliveryAction("complete")}
                                        disabled={!!runningAction || activeDelivery.status === "ABSENT_WAITING"}
                                    >
                                        {runningAction === "complete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                        Finalizar Entrega
                                    </Button>
                                )}

                                {canReportAbsent && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50"
                                                disabled={!!runningAction}
                                            >
                                                <Clock3 className="mr-2 h-4 w-4" />
                                                Cliente Ausente
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Reportar Cliente Ausente?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Isso iniciará um cronômetro de 5 minutos. Você deve aguardar no local.
                                                    O cliente será notificado via WhatsApp.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-amber-600 hover:bg-amber-700"
                                                    onClick={() => runDeliveryAction("absent")}
                                                >
                                                    Confirmar Ausência
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}

                                {canReportIncident && (
                                    <Button
                                        variant="ghost"
                                        className="w-full text-slate-500 hover:text-red-600"
                                        onClick={() => setIsIncidentDialogOpen(true)}
                                        disabled={!!runningAction}
                                    >
                                        <AlertCircle className="mr-2 h-4 w-4" />
                                        Reportar Problema
                                    </Button>
                                )}
                            </div>
                        </div>
                        </>
                    ) : availableOffer ? (
                        <div className="p-6">
                            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <Badge className="bg-sky-600 text-white">
                                            {availableOffer.isHighPriority
                                                ? "Alta prioridade"
                                                : "Disponível"}
                                        </Badge>
                                        <h3 className="mt-3 text-lg font-bold text-slate-900">
                                            Corrida #{availableOffer.orderId.slice(-6)}
                                        </h3>
                                        <p className="mt-1 text-sm text-slate-600">
                                            Uma entrega entrou na fila próxima a
                                            você. Aguarde a atribuição da loja
                                            ou atualize sua fila.
                                        </p>
                                    </div>
                                    <div className="rounded-full bg-white p-3 text-sky-600 shadow-sm">
                                        <Route className="h-5 w-5" />
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-xl bg-white p-3">
                                        <p className="text-xs text-slate-500">
                                            Repasse
                                        </p>
                                        <p className="font-bold text-slate-900">
                                            {availableOffer.riderPayoutCents
                                                ? formatMoney(
                                                      availableOffer.riderPayoutCents,
                                                  )
                                                : "A confirmar"}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-white p-3">
                                        <p className="text-xs text-slate-500">
                                            Bônus
                                        </p>
                                        <p className="font-bold text-slate-900">
                                            {availableOffer.bonusValueCents
                                                ? formatMoney(
                                                      availableOffer.bonusValueCents,
                                                  )
                                                : "Sem bônus"}
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    className="mt-4 w-full bg-sky-600 hover:bg-sky-700"
                                    onClick={() => void refreshRiderState()}
                                    disabled={isRefreshing}
                                >
                                    <RefreshCw
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            isRefreshing && "animate-spin",
                                        )}
                                    />
                                    Atualizar minha fila
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6">
                            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                                <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200">
                                    <MapPin className="h-8 w-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Nenhuma entrega ativa
                                </h3>
                                <p className="mt-2 text-sm text-slate-600">
                                    Fique online para receber uma corrida.
                                    Quando a loja atribuir uma entrega, ela
                                    aparece aqui automaticamente.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Last Location Update */}
                {location.lastLocation ? (
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs text-slate-500 shadow-sm">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Último ping às{" "}
                            {formatTime(location.lastLocation.sentAt)}
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white shadow-lg">
                <div className="mx-auto flex max-w-md items-center justify-around py-2">
                    <button
                        onClick={() => setActiveTab("home")}
                        className={cn(
                            "flex flex-col items-center gap-1 rounded-xl px-6 py-2 transition-colors",
                            activeTab === "home"
                                ? "text-sky-600"
                                : "text-slate-400 hover:text-slate-600",
                        )}
                    >
                        <Home
                            className={cn(
                                "h-6 w-6",
                                activeTab === "home" && "fill-current",
                            )}
                        />
                        <span className="text-xs font-medium">Início</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("delivery")}
                        className={cn(
                            "flex flex-col items-center gap-1 rounded-xl px-6 py-2 transition-colors",
                            activeTab === "delivery"
                                ? "text-sky-600"
                                : "text-slate-400 hover:text-slate-600",
                        )}
                    >
                        <Bike
                            className={cn(
                                "h-6 w-6",
                                activeTab === "delivery" && "fill-current",
                            )}
                        />
                        <span className="text-xs font-medium">Entregas</span>
                        {activeDelivery ? (
                            <div className="absolute top-1.5 ml-6 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                        ) : null}
                    </button>
                    <Link
                        href="/delivery/rider/wallet"
                        className="flex flex-col items-center gap-1 rounded-xl px-6 py-2 text-slate-400 transition-colors hover:text-slate-600"
                    >
                        <WalletCards className="h-6 w-6" />
                        <span className="text-xs font-medium">Carteira</span>
                    </Link>
                </div>
            </nav>

            {/* Incident Dialog */}
            <Dialog open={isIncidentDialogOpen} onOpenChange={setIsIncidentDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reportar Incidente</DialogTitle>
                        <DialogDescription>
                            Use esta opção apenas para problemas graves (ex: pneu furado, acidente).
                            A entrega será redistribuída e você ficará temporariamente offline.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason">Motivo</Label>
                            <select
                                id="reason"
                                className="w-full rounded-md border border-slate-200 p-2"
                                value={incidentReason}
                                onChange={(e) => setIncidentReason(e.target.value)}
                            >
                                <option value="">Selecione um motivo</option>
                                <option value="VEHICLE_ISSUE">Problema no veículo</option>
                                <option value="ACCIDENT">Acidente</option>
                                <option value="HEALTH_ISSUE">Problema de saúde</option>
                                <option value="OTHER">Outro</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição (Opcional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Descreva o que aconteceu..."
                                value={incidentDescription}
                                onChange={(e) => setIncidentDescription(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsIncidentDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={!incidentReason || !!runningAction}
                            onClick={() => {
                                setIsIncidentDialogOpen(false);
                                void runDeliveryAction("incident", {
                                    reason: incidentReason,
                                    description: incidentDescription,
                                });
                            }}
                        >
                            Reportar e Sair
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}
