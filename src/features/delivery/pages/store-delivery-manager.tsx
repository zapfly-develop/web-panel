"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Bike,
    CheckCircle2,
    ListFilter,
    PackageCheck,
    Radio,
    RefreshCw,
    Search,
    Star,
    Timer,
    WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
    DeliveryRiderPerformanceMetric,
    DeliveryRider,
    DeliveryStatusFilter,
    StoreDelivery,
} from "../services/delivery-types";
import { RiderOperationsMap } from "@/features/orders/components/rider-operations-map";
import { buildRiderMarkers } from "@/features/orders/services/order-utils";
import { DeliveryList } from "../components/delivery-list";
import { RiderAssignmentDialog } from "../components/rider-assignment-dialog";
import { useDeliveryRealtime } from "../hooks/use-delivery-realtime";

type StoreDeliveryManagerProps = {
    userId: string;
    initialDeliveries: StoreDelivery[];
    initialAvailableRiders: DeliveryRider[];
    initialRiderPerformance: DeliveryRiderPerformanceMetric[];
};

type FilterOption = {
    value: DeliveryStatusFilter;
    label: string;
};

const filterOptions: FilterOption[] = [
    { value: "ALL", label: "Todas" },
    { value: "WAITING_RIDER", label: "Aguardando" },
    { value: "READY_FOR_PICKUP", label: "Prontas" },
    { value: "DELIVERY_STAGNATED", label: "Estagnadas" },
    { value: "ASSIGNED", label: "Atribuidas" },
    { value: "PICKED_UP", label: "Coletadas" },
    { value: "DELIVERED", label: "Entregues" },
    { value: "CANCELED", label: "Canceladas" },
];

function matchesStatusFilter(
    delivery: StoreDelivery,
    statusFilter: DeliveryStatusFilter,
) {
    if (statusFilter === "ALL") {
        return true;
    }

    if (statusFilter === "WAITING_RIDER") {
        return (
            delivery.status === "WAITING_RIDER" ||
            delivery.status === "READY_FOR_PICKUP" ||
            delivery.status === "DELIVERY_STAGNATED" ||
            delivery.status === "PENDING_ASSIGNMENT"
        );
    }

    return delivery.status === statusFilter;
}

function deliveryMatchesQuery(delivery: StoreDelivery, query: string) {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
        return true;
    }

    const searchable = [
        delivery.id,
        delivery.orderId,
        delivery.order.customerName,
        delivery.order.customerWhatsappId,
        delivery.destinationAddress,
        delivery.order.deliveryAddress,
        delivery.rider?.displayName,
        delivery.rider?.vehiclePlate,
        delivery.rating?.score ? String(delivery.rating.score) : null,
        delivery.rating?.comment,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    return searchable.includes(normalizedQuery);
}

function buildMetrics(
    deliveries: StoreDelivery[],
    riderPerformance: DeliveryRiderPerformanceMetric[],
) {
    const ratingTotals = riderPerformance.reduce(
        (totals, metric) => {
            if (
                typeof metric.averageRating !== "number" ||
                metric.ratingCount <= 0
            ) {
                return totals;
            }

            return {
                score: totals.score + metric.averageRating * metric.ratingCount,
                count: totals.count + metric.ratingCount,
            };
        },
        { score: 0, count: 0 },
    );

    return {
        waiting: deliveries.filter((delivery) =>
            matchesStatusFilter(delivery, "WAITING_RIDER"),
        ).length,
        highPriority: deliveries.filter((delivery) => delivery.isHighPriority)
            .length,
        assigned: deliveries.filter((delivery) => delivery.status === "ASSIGNED")
            .length,
        pickedUp: deliveries.filter((delivery) => delivery.status === "PICKED_UP")
            .length,
        delivered: deliveries.filter((delivery) => delivery.status === "DELIVERED")
            .length,
        averageRating:
            ratingTotals.count > 0
                ? ratingTotals.score / ratingTotals.count
                : null,
        ratingCount: ratingTotals.count,
    };
}

export function StoreDeliveryManager({
    userId,
    initialDeliveries,
    initialAvailableRiders,
    initialRiderPerformance,
}: StoreDeliveryManagerProps) {
    const [deliveries, setDeliveries] = useState(initialDeliveries);
    const [availableRiders, setAvailableRiders] = useState(
        initialAvailableRiders,
    );
    const [riderPerformance, setRiderPerformance] = useState(
        initialRiderPerformance,
    );
    const [statusFilter, setStatusFilter] =
        useState<DeliveryStatusFilter>("ALL");
    const [query, setQuery] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
    const [selectedDelivery, setSelectedDelivery] =
        useState<StoreDelivery | null>(null);

    useEffect(() => {
        setDeliveries(initialDeliveries);
    }, [initialDeliveries]);

    useEffect(() => {
        setAvailableRiders(initialAvailableRiders);
    }, [initialAvailableRiders]);

    useEffect(() => {
        setRiderPerformance(initialRiderPerformance);
    }, [initialRiderPerformance]);

    const refreshDeliveries = useCallback(async () => {
        try {
            setIsRefreshing(true);

            const [deliveriesResponse, ridersResponse, performanceResponse] =
                await Promise.all([
                    fetch("/api/dashboard/delivery/deliveries", {
                        headers: {
                            Accept: "application/json",
                        },
                    }),
                    fetch("/api/dashboard/delivery/riders/available", {
                        headers: {
                            Accept: "application/json",
                        },
                    }),
                    fetch(
                        "/api/dashboard/delivery/riders/performance?sortBy=rating&limit=100",
                        {
                            headers: {
                                Accept: "application/json",
                            },
                        },
                    ),
                ]);
            const deliveriesPayload = await deliveriesResponse
                .json()
                .catch(() => null);
            const ridersPayload = await ridersResponse.json().catch(() => null);
            const performancePayload = await performanceResponse
                .json()
                .catch(() => null);

            if (!deliveriesResponse.ok) {
                throw new Error(
                    deliveriesPayload?.error ||
                        deliveriesPayload?.message ||
                        "Nao foi possivel atualizar entregas.",
                );
            }

            if (!ridersResponse.ok) {
                throw new Error(
                    ridersPayload?.error ||
                        ridersPayload?.message ||
                        "Nao foi possivel atualizar riders.",
                );
            }

            if (!performanceResponse.ok) {
                throw new Error(
                    performancePayload?.error ||
                        performancePayload?.message ||
                        "Nao foi possivel atualizar performance dos riders.",
                );
            }

            setDeliveries(
                Array.isArray(deliveriesPayload) ? deliveriesPayload : [],
            );
            setAvailableRiders(Array.isArray(ridersPayload) ? ridersPayload : []);
            setRiderPerformance(
                Array.isArray(performancePayload) ? performancePayload : [],
            );
            setLastSyncAt(new Date().toISOString());
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    const realtime = useDeliveryRealtime({
        userId,
        onDeliveryAssigned: refreshDeliveries,
        onDeliveryStatusChanged: refreshDeliveries,
        onRiderNewAvailableDelivery: refreshDeliveries,
    });

    useEffect(() => {
        const interval = window.setInterval(
            () => void refreshDeliveries(),
            realtime.isConnected ? 60000 : 20000,
        );

        return () => window.clearInterval(interval);
    }, [realtime.isConnected, refreshDeliveries]);

    const metrics = useMemo(
        () => buildMetrics(deliveries, riderPerformance),
        [deliveries, riderPerformance],
    );
    const riderPerformanceById = useMemo(
        () =>
            new Map(
                riderPerformance.map((metric) => [metric.riderId, metric]),
            ),
        [riderPerformance],
    );
    const riderMarkers = useMemo(
        () => buildRiderMarkers(deliveries, availableRiders),
        [availableRiders, deliveries],
    );
    const filteredDeliveries = useMemo(
        () =>
            deliveries.filter(
                (delivery) =>
                    matchesStatusFilter(delivery, statusFilter) &&
                    deliveryMatchesQuery(delivery, query),
            ),
        [deliveries, query, statusFilter],
    );

    function handleAssigned(
        updatedDelivery: Partial<StoreDelivery> & { id: string },
        rider: DeliveryRider,
    ) {
        setDeliveries((currentDeliveries) =>
            currentDeliveries.map((delivery) => {
                if (delivery.id !== updatedDelivery.id) {
                    return delivery;
                }

                return {
                    ...delivery,
                    ...updatedDelivery,
                    status: updatedDelivery.status ?? "ASSIGNED",
                    riderId: updatedDelivery.riderId ?? rider.id,
                    rider: updatedDelivery.rider ?? rider,
                    updatedAt:
                        updatedDelivery.updatedAt ?? new Date().toISOString(),
                };
            }),
        );
    }

    return (
        <div className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                    <div className="rounded-md border border-amber-100 bg-amber-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-amber-700">
                                Aguardando
                            </p>
                            <Timer className="h-4 w-4 text-amber-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-amber-900">
                            {metrics.waiting}
                        </p>
                    </div>

                    <div className="rounded-md border border-violet-100 bg-violet-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-violet-700">
                                Prioritarias
                            </p>
                            <Radio className="h-4 w-4 text-violet-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-violet-900">
                            {metrics.highPriority}
                        </p>
                    </div>

                    <div className="rounded-md border border-sky-100 bg-sky-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-sky-700">
                                Atribuidas
                            </p>
                            <Bike className="h-4 w-4 text-sky-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-sky-900">
                            {metrics.assigned}
                        </p>
                    </div>

                    <div className="rounded-md border border-teal-100 bg-teal-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-teal-700">
                                Coletadas
                            </p>
                            <PackageCheck className="h-4 w-4 text-teal-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-teal-900">
                            {metrics.pickedUp}
                        </p>
                    </div>

                    <div className="rounded-md border border-emerald-100 bg-emerald-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-emerald-700">
                                Entregues
                            </p>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-emerald-900">
                            {metrics.delivered}
                        </p>
                    </div>

                    <div className="rounded-md border border-rose-100 bg-rose-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-rose-700">
                                Nota media
                            </p>
                            <Star className="h-4 w-4 text-rose-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-rose-900">
                            {metrics.averageRating === null
                                ? "--"
                                : metrics.averageRating.toFixed(1)}
                        </p>
                        <p className="mt-1 text-xs text-rose-700">
                            {metrics.ratingCount === 1
                                ? "1 avaliacao"
                                : `${metrics.ratingCount} avaliacoes`}
                        </p>
                    </div>
                </div>

                <RiderOperationsMap markers={riderMarkers} />
            </div>

            <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 px-3">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por cliente, endereco, pedido ou rider"
                        className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div
                        className={cn(
                            "flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium",
                            realtime.isConnected
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-500",
                        )}
                        title={realtime.errorMessage ?? undefined}
                    >
                        {realtime.isConnected ? (
                            <Radio className="h-3.5 w-3.5" />
                        ) : (
                            <WifiOff className="h-3.5 w-3.5" />
                        )}
                        {realtime.isConnected ? "Realtime" : "Polling"}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void refreshDeliveries()}
                        disabled={isRefreshing}
                    >
                        <RefreshCw
                            className={cn(
                                "h-4 w-4",
                                isRefreshing && "animate-spin",
                            )}
                        />
                        Atualizar
                    </Button>
                    {filterOptions.map((option) => (
                        <Button
                            key={option.value}
                            type="button"
                            size="sm"
                            variant={
                                statusFilter === option.value
                                    ? "default"
                                    : "outline"
                            }
                            onClick={() => setStatusFilter(option.value)}
                            className={cn(
                                "min-w-24",
                                statusFilter !== option.value &&
                                    "bg-white text-slate-600",
                            )}
                        >
                            {option.value === "ALL" ? (
                                <ListFilter className="h-4 w-4" />
                            ) : null}
                            {option.label}
                        </Button>
                    ))}
                </div>
            </div>

            {lastSyncAt ? (
                <p className="text-xs text-slate-400">
                    Ultima sincronizacao:{" "}
                    {new Intl.DateTimeFormat("pt-BR", {
                        timeStyle: "medium",
                    }).format(new Date(lastSyncAt))}
                </p>
            ) : null}

            <DeliveryList
                deliveries={filteredDeliveries}
                riderPerformanceById={riderPerformanceById}
                onAssignClick={setSelectedDelivery}
            />

            <RiderAssignmentDialog
                delivery={selectedDelivery}
                open={Boolean(selectedDelivery)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedDelivery(null);
                    }
                }}
                onAssigned={handleAssigned}
            />
        </div>
    );
}
