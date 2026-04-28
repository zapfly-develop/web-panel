"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type {
    DeliveryRider,
    StoreDelivery,
} from "@/features/delivery/services/delivery-types";
import { useDeliveryRealtime } from "@/features/delivery/hooks/use-delivery-realtime";
import type {
    OrderPaymentFilter,
    OrderStatusFilter,
    OrderTimeFilter,
    OrdersViewMode,
    StoreOrder,
} from "../services/order-types";
import {
    buildDeliveryMap,
    buildOrderMetrics,
    buildRiderMarkers,
    getDeliveryForOrder,
    matchesOrderFilters,
    sortOrders,
} from "../services/order-utils";
import { OrderDetailsDialog } from "../components/order-details-dialog";
import { OrdersCardView } from "../components/orders-card-view";
import { OrdersFilterBar } from "../components/orders-filter-bar";
import { OrdersKanbanBoard } from "../components/orders-kanban-board";
import { OrdersPerformanceSummary } from "../components/orders-performance-summary";
import { OrdersTableView } from "../components/orders-table-view";
import { RiderOperationsMap } from "../components/rider-operations-map";
import { useOrdersRealtime } from "../hooks/use-orders-realtime";

type StoreOrdersWorkspaceProps = {
    userId: string;
    initialOrders: StoreOrder[];
    initialDeliveries: StoreDelivery[];
    initialAvailableRiders: DeliveryRider[];
};

export function StoreOrdersWorkspace({
    userId,
    initialOrders,
    initialDeliveries,
    initialAvailableRiders,
}: StoreOrdersWorkspaceProps) {
    const [orders, setOrders] = useState(() => sortOrders(initialOrders));
    const [deliveries, setDeliveries] = useState(initialDeliveries);
    const [availableRiders, setAvailableRiders] = useState(
        initialAvailableRiders,
    );
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] =
        useState<OrderStatusFilter>("ALL");
    const [paymentFilter, setPaymentFilter] =
        useState<OrderPaymentFilter>("ALL");
    const [timeFilter, setTimeFilter] = useState<OrderTimeFilter>("TODAY");
    const [viewMode, setViewMode] = useState<OrdersViewMode>("kanban");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [creatingDeliveryOrderId, setCreatingDeliveryOrderId] =
        useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const interval = window.setInterval(() => setNow(new Date()), 30000);
        return () => window.clearInterval(interval);
    }, []);

    const upsertOrder = useCallback((incomingOrder: StoreOrder) => {
        setOrders((currentOrders) => {
            const remainingOrders = currentOrders.filter(
                (order) => order.id !== incomingOrder.id,
            );

            return sortOrders([incomingOrder, ...remainingOrders]);
        });
    }, []);

    const refreshOrders = useCallback(async () => {
        const response = await fetch("/api/dashboard/orders", {
            headers: {
                Accept: "application/json",
            },
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                payload?.error ||
                    payload?.message ||
                    "Nao foi possivel atualizar pedidos.",
            );
        }

        setOrders(sortOrders(Array.isArray(payload) ? payload : []));
    }, []);

    const refreshLogistics = useCallback(async () => {
        const [deliveriesResponse, ridersResponse] = await Promise.all([
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
        ]);
        const deliveriesPayload = await deliveriesResponse
            .json()
            .catch(() => null);
        const ridersPayload = await ridersResponse.json().catch(() => null);

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

        setDeliveries(Array.isArray(deliveriesPayload) ? deliveriesPayload : []);
        setAvailableRiders(Array.isArray(ridersPayload) ? ridersPayload : []);
    }, []);

    const refreshAll = useCallback(async () => {
        try {
            setIsRefreshing(true);
            await Promise.all([refreshOrders(), refreshLogistics()]);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Falha ao atualizar pedidos.",
            );
        } finally {
            setIsRefreshing(false);
        }
    }, [refreshLogistics, refreshOrders]);

    const ordersRealtime = useOrdersRealtime({
        userId,
        onOrderEvent: upsertOrder,
    });
    const deliveryRealtime = useDeliveryRealtime({
        userId,
        onDeliveryAssigned: () => void refreshAll(),
        onDeliveryStatusChanged: () => void refreshAll(),
        onRiderNewAvailableDelivery: () => void refreshLogistics(),
        onRiderStatusChanged: () => void refreshLogistics(),
    });

    useEffect(() => {
        const shouldPoll =
            !ordersRealtime.isConnected || !deliveryRealtime.isConnected;
        const interval = window.setInterval(
            () => void refreshAll(),
            shouldPoll ? 20000 : 60000,
        );

        return () => window.clearInterval(interval);
    }, [
        deliveryRealtime.isConnected,
        ordersRealtime.isConnected,
        refreshAll,
    ]);

    const deliveriesByOrderId = useMemo(
        () => buildDeliveryMap(deliveries),
        [deliveries],
    );
    const paymentOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    orders
                        .map((order) => order.paymentMethod)
                        .filter(
                            (paymentMethod): paymentMethod is string =>
                                typeof paymentMethod === "string" &&
                                paymentMethod.length > 0,
                        ),
                ),
            ),
        [orders],
    );
    const filteredOrders = useMemo(
        () =>
            orders.filter((order) =>
                matchesOrderFilters(
                    order,
                    getDeliveryForOrder(deliveriesByOrderId, order.id),
                    {
                        query,
                        status: statusFilter,
                        payment: paymentFilter,
                        time: timeFilter,
                    },
                    now,
                ),
            ),
        [
            deliveriesByOrderId,
            now,
            orders,
            paymentFilter,
            query,
            statusFilter,
            timeFilter,
        ],
    );
    const metrics = useMemo(
        () => buildOrderMetrics(orders, deliveries, now),
        [deliveries, now, orders],
    );
    const riderMarkers = useMemo(
        () => buildRiderMarkers(deliveries, availableRiders),
        [availableRiders, deliveries],
    );
    const selectedDelivery = selectedOrder
        ? getDeliveryForOrder(deliveriesByOrderId, selectedOrder.id)
        : null;

    async function handleCreateDelivery(order: StoreOrder) {
        try {
            setCreatingDeliveryOrderId(order.id);

            const response = await fetch("/api/dashboard/delivery/deliveries", {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ orderId: order.id }),
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    payload?.error ||
                        payload?.message ||
                        "Nao foi possivel criar a entrega.",
                );
            }

            setDeliveries((currentDeliveries) => {
                const incomingDelivery = payload as StoreDelivery;
                const remainingDeliveries = currentDeliveries.filter(
                    (delivery) => delivery.id !== incomingDelivery.id,
                );

                return [incomingDelivery, ...remainingDeliveries];
            });

            toast.success("Entrega criada. Atribua um rider em Entregas.");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Falha ao chamar rider.",
            );
        } finally {
            setCreatingDeliveryOrderId(null);
        }
    }

    function handlePrint(order: StoreOrder) {
        setSelectedOrder(order);
        toast.info("Abrindo impressao da via de cozinha.");
        window.setTimeout(() => window.print(), 120);
    }

    const isRealtimeConnected =
        ordersRealtime.isConnected && deliveryRealtime.isConnected;
    const realtimeLabel = isRealtimeConnected
        ? "Pedidos e logistica conectados"
        : ordersRealtime.errorMessage ||
          deliveryRealtime.errorMessage ||
          "Reconciliacao por polling";

    return (
        <div className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
                <OrdersPerformanceSummary metrics={metrics} />
                <RiderOperationsMap markers={riderMarkers} />
            </div>

            <OrdersFilterBar
                query={query}
                statusFilter={statusFilter}
                paymentFilter={paymentFilter}
                timeFilter={timeFilter}
                viewMode={viewMode}
                paymentOptions={paymentOptions}
                isRefreshing={isRefreshing}
                isRealtimeConnected={isRealtimeConnected}
                realtimeLabel={realtimeLabel}
                onQueryChange={setQuery}
                onStatusFilterChange={setStatusFilter}
                onPaymentFilterChange={setPaymentFilter}
                onTimeFilterChange={setTimeFilter}
                onViewModeChange={setViewMode}
                onRefresh={() => void refreshAll()}
            />

            {filteredOrders.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
                    <PackageSearch className="h-8 w-8 text-slate-400" />
                    <p className="mt-3 text-lg font-semibold text-slate-900">
                        Nenhum pedido encontrado
                    </p>
                    <p className="mt-1 max-w-md text-sm text-slate-500">
                        Ajuste a busca ou os filtros para voltar a lista
                        operacional.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                            setQuery("");
                            setStatusFilter("ALL");
                            setPaymentFilter("ALL");
                            setTimeFilter("TODAY");
                        }}
                    >
                        Limpar filtros
                    </Button>
                </div>
            ) : viewMode === "kanban" ? (
                <OrdersKanbanBoard
                    orders={filteredOrders}
                    deliveriesByOrderId={deliveriesByOrderId}
                    now={now}
                    creatingDeliveryOrderId={creatingDeliveryOrderId}
                    onCreateDelivery={(order) => void handleCreateDelivery(order)}
                    onOpenDetails={setSelectedOrder}
                    onPrint={handlePrint}
                />
            ) : viewMode === "cards" ? (
                <OrdersCardView
                    orders={filteredOrders}
                    deliveriesByOrderId={deliveriesByOrderId}
                    now={now}
                    creatingDeliveryOrderId={creatingDeliveryOrderId}
                    onCreateDelivery={(order) => void handleCreateDelivery(order)}
                    onOpenDetails={setSelectedOrder}
                    onPrint={handlePrint}
                />
            ) : (
                <OrdersTableView
                    orders={filteredOrders}
                    deliveriesByOrderId={deliveriesByOrderId}
                    now={now}
                    creatingDeliveryOrderId={creatingDeliveryOrderId}
                    onCreateDelivery={(order) => void handleCreateDelivery(order)}
                    onOpenDetails={setSelectedOrder}
                    onPrint={handlePrint}
                />
            )}

            <OrderDetailsDialog
                order={selectedOrder}
                delivery={selectedDelivery}
                open={Boolean(selectedOrder)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedOrder(null);
                    }
                }}
            />
        </div>
    );
}
