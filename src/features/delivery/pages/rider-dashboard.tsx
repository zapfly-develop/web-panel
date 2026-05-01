"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    Bike,
    Home,
    Loader2,
    Menu,
    RefreshCw,
    Route,
    User,
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

async function ensurePushSubscription() {
    if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator)
    ) {
        return { ensured: false, reason: "unsupported" as const };
    }

    const permission = Notification.permission;
    if (permission === "denied") {
        return { ensured: false, reason: "denied" as const };
    }

    const registration = await navigator.serviceWorker.ready;
    let nextPermission = permission;

    if (nextPermission !== "granted") {
        nextPermission = await Notification.requestPermission();
    }

    if (nextPermission !== "granted") {
        return { ensured: false, reason: "not-granted" as const };
    }

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
        return { ensured: true, reason: "already-subscribed" as const };
    }

    const { publicKey } = await fetchJson<{ publicKey: string }>(
        "/api/notifications/vapid-public-key",
    );

    if (!publicKey) {
        return { ensured: false, reason: "missing-key" as const };
    }

    const createdSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetchJson("/api/notifications/push-subscriptions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(createdSubscription.toJSON() as PushSubscriptionPayload),
    });

    return { ensured: true, reason: "subscribed" as const };
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
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
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
            window.localStorage.setItem(getTodayStatsKey(userId), JSON.stringify(dailyStats));
        }
    }, [dailyStats, userId]);

    useEffect(() => {
        if (isOnline && onlineStartedAtRef.current == null) {
            onlineStartedAtRef.current = Date.now();
        }

        if (!isOnline && onlineStartedAtRef.current != null) {
            const elapsed = Math.max(0, Math.floor((Date.now() - onlineStartedAtRef.current) / 1000));
            setDailyStats((current) => ({ ...current, onlineSeconds: current.onlineSeconds + elapsed }));
            onlineStartedAtRef.current = null;
        }
    }, [isOnline]);

    useEffect(() => {
        if (!activeDelivery || activeDelivery.status !== "DELIVERED") {
            return;
        }

        setDailyStats((current) => ({
            deliveriesCompleted: current.deliveriesCompleted + 1,
            totalEarnings: current.totalEarnings + (activeDelivery.riderPayoutCents || 0),
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
                const pushResult = await ensurePushSubscription();

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

            if (action === "accept") {
                setJustAccepted(true);
                window.setTimeout(() => setJustAccepted(false), 1800);
            }

            if (action === "pick-up") {
                setJustPickedUp(true);
                window.setTimeout(() => setJustPickedUp(false), 1800);
            }

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
            <div className="mx-auto max-w-md px-3 py-3">
                <div className="relative h-[calc(100dvh-172px)] overflow-hidden rounded-xl bg-slate-200 shadow-lg">
                    {activeDelivery ? (
                        <>
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
                            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                                <Badge className="bg-slate-900/90 text-white shadow">#{activeDelivery.orderId.slice(-6)}</Badge>
                                <Badge className="bg-sky-600/90 text-white shadow">{activeDelivery.status.replaceAll("_", " ")}</Badge>
                            </div>
                            <div className="absolute inset-x-3 bottom-3 space-y-2">
                                <div className="rounded-xl bg-white/95 p-3 shadow backdrop-blur">
                                    <p className="text-xs text-slate-500">Cliente</p>
                                    <p className="font-semibold text-slate-900">{customerLabel}</p>
                                    <p className="line-clamp-2 text-sm text-slate-600">{activeDelivery.destinationAddress}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {canAccept ? <Button className={cn("h-12 bg-sky-600 hover:bg-sky-700", justAccepted && "animate-pulse")} onClick={() => runDeliveryAction("accept")} disabled={!!runningAction}>Aceitar</Button> : null}
                                    {canPickUp ? <Button className={cn("h-12 bg-amber-600 hover:bg-amber-700", justPickedUp && "animate-pulse")} onClick={() => runDeliveryAction("pick-up")} disabled={!!runningAction}>Coletar</Button> : null}
                                    {canComplete ? <Button className="h-12 bg-emerald-600 hover:bg-emerald-700" onClick={() => runDeliveryAction("complete")} disabled={!!runningAction || activeDelivery.status === "ABSENT_WAITING"}>Finalizar</Button> : null}
                                    <Button variant="outline" className="h-12 border-slate-300 bg-white/90" onClick={() => setIsActionsMenuOpen(true)}>Mais opções</Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center">
                            <div>
                                <Route className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-3 font-semibold text-slate-800">Aguardando nova corrida</p>
                                <p className="text-sm text-slate-500">Fique online para receber chamadas.</p>
                                {!activeDelivery ? (
                                    <div className="mt-4 rounded-xl bg-white/90 p-3 text-left shadow">
                                        <DailyStats deliveriesCompleted={dailyStats.deliveriesCompleted} totalEarnings={dailyStats.totalEarnings} hoursActive={(dailyStats.onlineSeconds + (isOnline && onlineStartedAtRef.current ? Math.floor((Date.now() - onlineStartedAtRef.current) / 1000) : 0)) / 3600} averageRating={4.9} />
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isActionsMenuOpen} onOpenChange={setIsActionsMenuOpen}>
                <DialogContent className="rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Opções da corrida</DialogTitle>
                        <DialogDescription>Ações rápidas para esta entrega.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        {canReportAbsent ? <Button variant="outline" className="w-full justify-start" onClick={() => { setIsActionsMenuOpen(false); runDeliveryAction("absent"); }}>Cliente ausente</Button> : null}
                        {canReportIncident ? <Button variant="outline" className="w-full justify-start" onClick={() => { setIsActionsMenuOpen(false); setIsIncidentDialogOpen(true); }}>Reportar incidente</Button> : null}
                    </div>
                </DialogContent>
            </Dialog>
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
