"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    Bike,
    ChevronLeft,
    Clock3,
    Loader2,
    MapPin,
    MessageCircle,
    MoreHorizontal,
    Navigation2,
    Phone,
    RefreshCw,
    Route,
    Store,
    User,
    WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { DeliveryMap } from "../components/delivery-map";
import { ensureRiderPushSubscription } from "../services/push-notification";

type PushSubscriptionPayload = {
    endpoint: string;
    expirationTime: number | null;
    keys: {
        p256dh: string;
        auth: string;
    };
};

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const normalized = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(normalized);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i += 1) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

type NavigationApp = "google" | "waze" | "apple";

function openExternalNavigation(
    app: NavigationApp,
    latitude: number,
    longitude: number,
) {
    const destination = `${latitude},${longitude}`;

    const urls: Record<NavigationApp, string> = {
        google: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`,
        waze: `https://waze.com/ul?ll=${encodeURIComponent(destination)}&navigate=yes`,
        apple: `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`,
    };

    window.open(urls[app], "_blank", "noopener,noreferrer");
}

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

type RiderDailyStats = {
    deliveriesCompleted: number;
    totalEarnings: number;
    onlineSeconds: number;
};

function getTodayStatsKey(userId: string) {
    const dayKey = new Date().toISOString().slice(0, 10);
    return `rider-daily-stats:${userId}:${dayKey}`;
}

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

async function showRiderAssignmentNotification(deliveryId: string) {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
        return;
    }

    if (Notification.permission !== "granted") {
        return;
    }

    const title = "Nova corrida atribuída";
    const body = "Uma entrega foi atribuída para você. Toque para abrir.";
    const url = `/delivery/rider?deliveryId=${encodeURIComponent(deliveryId)}`;

    try {
        const registration = await navigator.serviceWorker?.getRegistration();

        if (registration) {
            await registration.showNotification(title, {
                body,
                icon: "/icon.png",
                badge: "/icon.png",
                data: { url },
            });
            return;
        }
    } catch {
        // fallback abaixo
    }

    const notification = new Notification(title, {
        body,
        icon: "/icon.png",
    });
    notification.onclick = () => {
        window.focus();
        window.location.href = url;
    };
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
    const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
    const [isNavigationDialogOpen, setIsNavigationDialogOpen] = useState(false);
    const [incidentReason, setIncidentReason] = useState("");
    const [incidentDescription, setIncidentDescription] = useState("");
    const [availableOffer, setAvailableOffer] =
        useState<RiderNewAvailableDeliveryEvent | null>(null);
    const [dailyStats, setDailyStats] = useState<RiderDailyStats>({
        deliveriesCompleted: 0,
        totalEarnings: 0,
        onlineSeconds: 0,
    });
    const [justAccepted, setJustAccepted] = useState(false);
    const [justPickedUp, setJustPickedUp] = useState(false);
    const [isAcceptingOffer, setIsAcceptingOffer] = useState(false);
    const onlineStartedAtRef = useRef<number | null>(null);

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
            void showRiderAssignmentNotification(event.deliveryId);
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
        if (typeof window === "undefined") {
            return;
        }

        const raw = window.localStorage.getItem(getTodayStatsKey(userId));
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw) as RiderDailyStats;
            setDailyStats({
                deliveriesCompleted: parsed.deliveriesCompleted || 0,
                totalEarnings: parsed.totalEarnings || 0,
                onlineSeconds: parsed.onlineSeconds || 0,
            });
        } catch {
            window.localStorage.removeItem(getTodayStatsKey(userId));
        }
    }, [userId]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(
                getTodayStatsKey(userId),
                JSON.stringify(dailyStats),
            );
        }
    }, [dailyStats, userId]);

    useEffect(() => {
        if (isOnline && onlineStartedAtRef.current == null) {
            onlineStartedAtRef.current = Date.now();
        }

        if (!isOnline && onlineStartedAtRef.current != null) {
            const elapsed = Math.max(
                0,
                Math.floor((Date.now() - onlineStartedAtRef.current) / 1000),
            );
            setDailyStats((current) => ({
                ...current,
                onlineSeconds: current.onlineSeconds + elapsed,
            }));
            onlineStartedAtRef.current = null;
        }
    }, [isOnline]);

    useEffect(() => {
        if (!activeDelivery || activeDelivery.status !== "DELIVERED") {
            return;
        }

        setDailyStats((current) => ({
            deliveriesCompleted: current.deliveriesCompleted + 1,
            totalEarnings:
                current.totalEarnings + (activeDelivery.riderPayoutCents || 0),
            onlineSeconds: current.onlineSeconds,
        }));
    }, [activeDelivery?.id, activeDelivery?.status]);

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

            if (nextChecked) {
                const pushResult = await ensureRiderPushSubscription(
                    fetchJson,
                    userId,
                );

                if (pushResult.reason === "denied") {
                    toast.warning(
                        "Notificações bloqueadas no navegador. Ative para receber novas corridas.",
                    );
                } else if (pushResult.reason === "not-granted") {
                    toast.info(
                        "Permissão de notificações não concedida. Sem isso você pode perder novas entregas.",
                    );
                } else if (pushResult.reason === "unsupported") {
                    toast.info(
                        "Este dispositivo não suporta notificações push no PWA.",
                    );
                }
            }
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

            const endpoint =
                action === "incident"
                    ? "incidents"
                    : action === "absent"
                      ? "client-absent"
                      : action;
            const requestInit: RequestInit =
                action === "incident" || action === "absent"
                    ? {
                          method: "POST",
                          headers: {
                              "Content-Type": "application/json",
                          },
                          body: JSON.stringify(payload ?? {}),
                      }
                    : {
                          method: "POST",
                      };

            await fetchJson(
                `/api/delivery/rider/deliveries/${activeDelivery.id}/${endpoint}`,
                requestInit,
            );

            await Promise.all([refreshActiveDelivery(), refreshProfile()]);

            if (action === "accept") {
                setJustAccepted(true);
                window.setTimeout(() => setJustAccepted(false), 1800);
            }

            if (action === "pick-up") {
                setJustPickedUp(true);
                window.setTimeout(() => setJustPickedUp(false), 1800);
            }

            toast.success(`Operação ${actionCopy[action]} concluída.`);

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

    const canStartNavigation =
        activeDelivery?.status === "PICKED_UP" ||
        activeDelivery?.status === "IN_TRANSIT";

    const canReportIncident =
        activeDelivery?.status === "PICKED_UP" ||
        activeDelivery?.status === "IN_TRANSIT" ||
        activeDelivery?.status === "ARRIVED_AT_DESTINATION";

    const canReportAbsent = activeDelivery?.status === "ARRIVED_AT_DESTINATION";
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
    const statusLabel =
        activeDelivery?.status.replaceAll("_", " ") ?? statusCopy.label;
    const shortOrderId = activeDelivery?.orderId.slice(-6) ?? null;
    const pickupLabel =
        activeDelivery?.pickupAddress ||
        activeDelivery?.ownerUser?.storeAddress ||
        "Retirada na loja";
    const destinationLabel =
        activeDelivery?.destinationAddress ||
        activeDelivery?.order.deliveryAddress ||
        "Destino do cliente";
    const storeLabel = activeDelivery?.ownerUser?.name || "Loja parceira";
    const vehicleLabel =
        profile.vehiclePlate ||
        (profile.vehicleType === "MOTORCYCLE"
            ? "Moto"
            : profile.vehicleType === "BICYCLE"
              ? "Bicicleta"
              : profile.vehicleType === "CAR"
                ? "Carro"
                : "Veiculo");
    const whatsappDigits =
        activeDelivery?.order.customerWhatsappId?.replace(/\D/g, "") ?? "";
    const customerWhatsappUrl = whatsappDigits
        ? `https://wa.me/${whatsappDigits}`
        : null;
    const storePhoneDigits =
        activeDelivery?.ownerUser?.phone?.replace(/[^\d+]/g, "") ?? "";
    const storePhoneHref = storePhoneDigits ? `tel:${storePhoneDigits}` : null;
    const estimatedMinutes = activeDelivery?.distanceMeters
        ? Math.max(8, Math.round((activeDelivery.distanceMeters / 1000) * 4))
        : null;
    const deliveryTimeLabel = estimatedMinutes
        ? `${estimatedMinutes} min`
        : activeDelivery
          ? "Em andamento"
          : isOnline
            ? "Aguardando"
            : "Offline";
    const onlineSecondsToday =
        dailyStats.onlineSeconds +
        (isOnline && onlineStartedAtRef.current
            ? Math.floor((Date.now() - onlineStartedAtRef.current) / 1000)
            : 0);
    const activeHoursLabel = `${(onlineSecondsToday / 3600).toFixed(1)}h`;

    return (
        <main className="min-h-dvh bg-slate-950 text-white md:bg-slate-900">
            <div className="relative mx-auto min-h-dvh max-w-md overflow-hidden bg-slate-950 shadow-2xl md:my-6 md:min-h-[860px]">
                <div className="absolute inset-0">
                    <DeliveryMap
                        pickupLat={activeDelivery?.pickupLatitude}
                        pickupLng={activeDelivery?.pickupLongitude}
                        destLat={activeDelivery?.destinationLatitude}
                        destLng={activeDelivery?.destinationLongitude}
                        riderLat={riderLatitude}
                        riderLng={riderLongitude}
                        status={activeDelivery?.status}
                        distanceKm={
                            activeDelivery?.distanceMeters
                                ? activeDelivery.distanceMeters / 1000
                                : undefined
                        }
                        className="rounded-none bg-slate-900 shadow-none"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.48)_0%,rgba(2,6,23,0.12)_34%,rgba(2,6,23,0)_48%,rgba(2,6,23,0.86)_100%)]" />
                </div>

                <header className="absolute inset-x-0 top-0 z-20 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
                    <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => window.history.back()}
                            className="h-11 w-11 rounded-full bg-slate-950/55 text-white backdrop-blur hover:bg-slate-950/70 hover:text-white"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="min-w-0 text-center">
                            <p className="truncate text-sm font-semibold text-white">
                                {activeDelivery
                                    ? "Acompanhar corrida"
                                    : "Zaply Rider"}
                            </p>
                            <p className="truncate text-xs text-white/70">
                                {profile.displayName || "Entregador"}
                            </p>
                        </div>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                                activeDelivery
                                    ? setIsActionsMenuOpen(true)
                                    : void refreshRiderState()
                            }
                            disabled={!activeDelivery && isRefreshing}
                            className="h-11 w-11 rounded-full bg-slate-950/55 text-white backdrop-blur hover:bg-slate-950/70 hover:text-white"
                        >
                            {activeDelivery ? (
                                <MoreHorizontal className="h-5 w-5" />
                            ) : (
                                <RefreshCw
                                    className={cn(
                                        "h-5 w-5",
                                        isRefreshing && "animate-spin",
                                    )}
                                />
                            )}
                        </Button>
                    </div>
                </header>

                {activeDelivery ? (
                    <div className="pointer-events-none absolute left-4 top-[calc(env(safe-area-inset-top)+5.5rem)] z-10 flex flex-wrap gap-2">
                        {shortOrderId ? (
                            <Badge className="border border-white/10 bg-slate-950/65 text-white shadow-lg backdrop-blur">
                                #{shortOrderId}
                            </Badge>
                        ) : null}
                        <Badge className="border border-sky-200/20 bg-primary/90 text-white shadow-lg shadow-primary/20 backdrop-blur">
                            {statusLabel}
                        </Badge>
                    </div>
                ) : null}

                <section className="absolute inset-x-0 bottom-0 z-20 max-h-[68dvh] overflow-y-auto rounded-t-[2rem] bg-slate-950/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
                    <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-white/20" />

                    {activeDelivery ? (
                        <>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-2xl font-semibold tracking-tight text-white">
                                        Detalhes da corrida
                                    </p>
                                    <p className="mt-1 truncate text-sm text-white/55">
                                        {storeLabel}
                                    </p>
                                </div>
                                <div className="rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold text-sky-100">
                                    {deliveryTimeLabel}
                                </div>
                            </div>

                            <div className="mt-5 flex items-center gap-3">
                                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-slate-800">
                                    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(14,165,233,0.25),rgba(15,23,42,0.9))]">
                                        <User className="h-7 w-7 text-sky-100" />
                                    </div>
                                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-base font-semibold text-white">
                                        {customerLabel}
                                    </p>
                                    <p className="truncate text-xs text-white/45">
                                        {vehicleLabel}
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        disabled={!storePhoneHref}
                                        onClick={() => {
                                            if (storePhoneHref) {
                                                window.location.href =
                                                    storePhoneHref;
                                            }
                                        }}
                                        className="h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/15 hover:text-white disabled:opacity-40"
                                    >
                                        <Phone className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        disabled={!customerWhatsappUrl}
                                        onClick={() => {
                                            if (customerWhatsappUrl) {
                                                window.open(
                                                    customerWhatsappUrl,
                                                    "_blank",
                                                    "noopener,noreferrer",
                                                );
                                            }
                                        }}
                                        className="relative h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/15 hover:text-white disabled:opacity-40"
                                    >
                                        <MessageCircle className="h-5 w-5" />
                                        {customerWhatsappUrl ? (
                                            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-slate-950" />
                                        ) : null}
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3 rounded-lg bg-white/[0.045] p-4 ring-1 ring-white/10">
                                <div className="flex gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sky-100">
                                        <Clock3 className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-white/45">
                                            Tempo de entrega
                                        </p>
                                        <p className="text-sm font-medium text-white">
                                            {deliveryTimeLabel}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sky-100">
                                        <Store className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-white/45">
                                            Retirada
                                        </p>
                                        <p className="line-clamp-2 text-sm font-medium text-white">
                                            {pickupLabel}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sky-100">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-white/45">
                                            Destino
                                        </p>
                                        <p className="line-clamp-2 text-sm font-medium text-white">
                                            {destinationLabel}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2">
                                {canAccept ? (
                                    <Button
                                        className={cn(
                                            "col-span-2 h-12 bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90",
                                            justAccepted && "animate-pulse",
                                        )}
                                        onClick={() =>
                                            void runDeliveryAction("accept")
                                        }
                                        disabled={!!runningAction}
                                    >
                                        {runningAction === "accept" ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Aceitar corrida
                                    </Button>
                                ) : null}
                                {canPickUp ? (
                                    <Button
                                        className={cn(
                                            "h-12 bg-amber-500 text-slate-950 hover:bg-amber-400",
                                            justPickedUp && "animate-pulse",
                                        )}
                                        onClick={() =>
                                            void runDeliveryAction("pick-up")
                                        }
                                        disabled={!!runningAction}
                                    >
                                        {runningAction === "pick-up" ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Coletar
                                    </Button>
                                ) : null}
                                {canStartNavigation ? (
                                    <Button
                                        variant="outline"
                                        className="h-12 border-primary/25 bg-primary/15 text-sky-50 hover:bg-primary/25 hover:text-white"
                                        onClick={() =>
                                            setIsNavigationDialogOpen(true)
                                        }
                                    >
                                        <Navigation2 className="mr-2 h-4 w-4" />
                                        Navegar
                                    </Button>
                                ) : null}
                                {canComplete ? (
                                    <Button
                                        className="h-12 bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                                        onClick={() =>
                                            void runDeliveryAction("complete")
                                        }
                                        disabled={
                                            !!runningAction ||
                                            activeDelivery.status ===
                                                "ABSENT_WAITING"
                                        }
                                    >
                                        {runningAction === "complete" ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Finalizar
                                    </Button>
                                ) : null}
                                <Button
                                    variant="outline"
                                    className="h-12 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                                    onClick={() => setIsActionsMenuOpen(true)}
                                >
                                    Mais opções
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sky-100 ring-1 ring-primary/25">
                                    <Bike className="h-7 w-7" />
                                    <span
                                        className={cn(
                                            "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-slate-950",
                                            statusCopy.dotColor,
                                        )}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xl font-semibold text-white">
                                        {profile.displayName || "Zaply Rider"}
                                    </p>
                                    <p className="truncate text-sm text-white/50">
                                        {vehicleLabel}
                                    </p>
                                </div>
                                <Badge className={cn("border", statusCopy.className)}>
                                    {statusCopy.label}
                                </Badge>
                            </div>

                            <div className="mt-5 rounded-lg bg-white/[0.045] p-4 ring-1 ring-white/10">
                                <p className="text-xs font-semibold uppercase text-white/45">
                                    Status operacional
                                </p>
                                <div className="mt-2 flex items-end justify-between gap-3">
                                    <div>
                                        <p className="text-3xl font-semibold text-white">
                                            {isOnline ? "Online" : "Offline"}
                                        </p>
                                        <p className="mt-1 text-sm text-white/55">
                                            {isOnline
                                                ? "Você está disponível para novas corridas."
                                                : "Ative para receber chamadas em tempo real."}
                                        </p>
                                    </div>
                                    <Route className="h-9 w-9 shrink-0 text-primary" />
                                </div>
                                <Button
                                    type="button"
                                    className={cn(
                                        "mt-4 h-12 w-full",
                                        isOnline
                                            ? "bg-white/10 text-white hover:bg-white/15"
                                            : "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90",
                                    )}
                                    disabled={
                                        !isActiveRider || isChangingAvailability
                                    }
                                    onClick={() =>
                                        void handleAvailabilityChange(!isOnline)
                                    }
                                >
                                    {isChangingAvailability ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : null}
                                    {isOnline
                                        ? "Ficar offline"
                                        : "Ficar online"}
                                </Button>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                                <div className="rounded-lg bg-white/[0.045] p-3 ring-1 ring-white/10">
                                    <p className="text-xs text-white/45">
                                        Entregas
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-white">
                                        {dailyStats.deliveriesCompleted}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-white/[0.045] p-3 ring-1 ring-white/10">
                                    <p className="text-xs text-white/45">
                                        Ganhos
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-white">
                                        {formatMoney(dailyStats.totalEarnings)}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-white/[0.045] p-3 ring-1 ring-white/10">
                                    <p className="text-xs text-white/45">
                                        Online
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-white">
                                        {activeHoursLabel}
                                    </p>
                                </div>
                            </div>

                            {availableOffer ? (
                                <div className="mt-3 rounded-lg border border-primary/25 bg-primary/10 p-4 text-left shadow-lg shadow-primary/10">
                                    <p className="text-xs font-semibold uppercase text-sky-100">
                                        Nova entrega disponível
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-white">
                                        Pedido #{availableOffer.orderId.slice(-6)}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-sm text-white/60">
                                        {availableOffer.destinationAddress}
                                    </p>
                                    {typeof availableOffer.riderPayoutCents ===
                                    "number" ? (
                                        <p className="mt-2 text-sm font-semibold text-emerald-300">
                                            Repasse previsto:{" "}
                                            {formatMoney(
                                                availableOffer.riderPayoutCents,
                                            )}
                                        </p>
                                    ) : null}
                                    <Button
                                        className="mt-3 h-11 w-full bg-primary text-white hover:bg-primary/90"
                                        onClick={() =>
                                            void (async () => {
                                                try {
                                                    setIsAcceptingOffer(true);
                                                    await fetchJson(
                                                        `/api/delivery/rider/deliveries/${availableOffer.deliveryId}/accept`,
                                                        { method: "POST" },
                                                    );
                                                    await Promise.all([
                                                        refreshActiveDelivery(),
                                                        refreshProfile(),
                                                    ]);
                                                    setAvailableOffer(null);
                                                    toast.success(
                                                        "Entrega aceita com sucesso.",
                                                    );
                                                } catch (error) {
                                                    toast.error(
                                                        error instanceof Error
                                                            ? error.message
                                                            : "Nao foi possivel aceitar a corrida.",
                                                    );
                                                } finally {
                                                    setIsAcceptingOffer(false);
                                                }
                                            })()
                                        }
                                        disabled={
                                            !!runningAction || isAcceptingOffer
                                        }
                                    >
                                        {isAcceptingOffer ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : null}
                                        Aceitar corrida
                                    </Button>
                                </div>
                            ) : (
                                <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-center">
                                    <Route className="mx-auto h-8 w-8 text-white/35" />
                                    <p className="mt-2 font-semibold text-white">
                                        Aguardando nova corrida
                                    </p>
                                    <p className="text-sm text-white/50">
                                        Quando uma entrega chegar, o mapa entra
                                        em foco total.
                                    </p>
                                </div>
                            )}

                            <Button
                                asChild
                                variant="outline"
                                className="mt-3 h-11 w-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                            >
                                <Link href="/delivery/rider/wallet">
                                    <WalletCards className="mr-2 h-4 w-4" />
                                    Carteira
                                </Link>
                            </Button>
                        </>
                    )}
                </section>
            </div>

            <Dialog
                open={isNavigationDialogOpen}
                onOpenChange={setIsNavigationDialogOpen}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Iniciar navegação</DialogTitle>
                        <DialogDescription>
                            Escolha o aplicativo de GPS para ir até o destino.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (
                                    activeDelivery?.destinationLatitude !=
                                        null &&
                                    activeDelivery?.destinationLongitude != null
                                ) {
                                    openExternalNavigation(
                                        "waze",
                                        activeDelivery.destinationLatitude,
                                        activeDelivery.destinationLongitude,
                                    );
                                    setIsNavigationDialogOpen(false);
                                }
                            }}
                        >
                            Abrir no Waze
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (
                                    activeDelivery?.destinationLatitude !=
                                        null &&
                                    activeDelivery?.destinationLongitude != null
                                ) {
                                    openExternalNavigation(
                                        "google",
                                        activeDelivery.destinationLatitude,
                                        activeDelivery.destinationLongitude,
                                    );
                                    setIsNavigationDialogOpen(false);
                                }
                            }}
                        >
                            Abrir no Google Maps
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (
                                    activeDelivery?.destinationLatitude !=
                                        null &&
                                    activeDelivery?.destinationLongitude != null
                                ) {
                                    openExternalNavigation(
                                        "apple",
                                        activeDelivery.destinationLatitude,
                                        activeDelivery.destinationLongitude,
                                    );
                                    setIsNavigationDialogOpen(false);
                                }
                            }}
                        >
                            Abrir no Mapas (iOS)
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isActionsMenuOpen}
                onOpenChange={setIsActionsMenuOpen}
            >
                <DialogContent className="rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Opções da corrida</DialogTitle>
                        <DialogDescription>
                            Ações rápidas para esta entrega.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        {canReportAbsent ? (
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => {
                                    setIsActionsMenuOpen(false);
                                    runDeliveryAction("absent");
                                }}
                            >
                                Cliente ausente
                            </Button>
                        ) : null}
                        {canReportIncident ? (
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => {
                                    setIsActionsMenuOpen(false);
                                    setIsIncidentDialogOpen(true);
                                }}
                            >
                                Reportar incidente
                            </Button>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
            {/* Incident Dialog */}
            <Dialog
                open={isIncidentDialogOpen}
                onOpenChange={setIsIncidentDialogOpen}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reportar Incidente</DialogTitle>
                        <DialogDescription>
                            Use esta opção apenas para problemas graves (ex:
                            pneu furado, acidente). A entrega será redistribuída
                            e você ficará temporariamente offline.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason">Motivo</Label>
                            <select
                                id="reason"
                                className="w-full rounded-md border border-slate-200 p-2"
                                value={incidentReason}
                                onChange={(e) =>
                                    setIncidentReason(e.target.value)
                                }
                            >
                                <option value="">Selecione um motivo</option>
                                <option value="VEHICLE_ISSUE">
                                    Problema no veículo
                                </option>
                                <option value="ACCIDENT">Acidente</option>
                                <option value="HEALTH_ISSUE">
                                    Problema de saúde
                                </option>
                                <option value="OTHER">Outro</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">
                                Descrição (Opcional)
                            </Label>
                            <Textarea
                                id="description"
                                placeholder="Descreva o que aconteceu..."
                                value={incidentDescription}
                                onChange={(e) =>
                                    setIncidentDescription(e.target.value)
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsIncidentDialogOpen(false)}
                        >
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
