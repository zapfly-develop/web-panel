"use client";

import type { StoreDelivery } from "@/features/delivery/services/delivery-types";
import type { OrderStatus, StoreOrder } from "../services/order-types";
import {
    buildOrdersByStatus,
    getDeliveryForOrder,
    getOrderStatusLabel,
} from "../services/order-utils";
import { OrderCard } from "./order-card";

type OrdersKanbanBoardProps = {
    orders: StoreOrder[];
    deliveriesByOrderId: Map<string, StoreDelivery>;
    now: Date;
    creatingDeliveryOrderId: string | null;
    onCreateDelivery: (order: StoreOrder) => void;
    onOpenDetails: (order: StoreOrder) => void;
    onPrint: (order: StoreOrder) => void;
};

const columns: OrderStatus[] = [
    "PENDING",
    "PREPARING",
    "SHIPPED",
    "DELIVERED",
];

export function OrdersKanbanBoard({
    orders,
    deliveriesByOrderId,
    now,
    creatingDeliveryOrderId,
    onCreateDelivery,
    onOpenDetails,
    onPrint,
}: OrdersKanbanBoardProps) {
    const ordersByStatus = buildOrdersByStatus(orders);

    return (
        <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[1080px] grid-cols-4 gap-3">
                {columns.map((status) => {
                    const columnOrders = ordersByStatus[status];

                    return (
                        <section
                            key={status}
                            className="min-h-72 rounded-md border border-slate-200 bg-slate-50 p-3"
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-slate-900">
                                    {getOrderStatusLabel(status)}
                                </h2>
                                <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-500">
                                    {columnOrders.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {columnOrders.length === 0 ? (
                                    <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-8 text-center text-xs text-slate-400">
                                        Sem pedidos
                                    </div>
                                ) : (
                                    columnOrders.map((order) => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            delivery={getDeliveryForOrder(
                                                deliveriesByOrderId,
                                                order.id,
                                            )}
                                            now={now}
                                            compact
                                            isCreatingDelivery={
                                                creatingDeliveryOrderId ===
                                                order.id
                                            }
                                            onCreateDelivery={onCreateDelivery}
                                            onOpenDetails={onOpenDetails}
                                            onPrint={onPrint}
                                        />
                                    ))
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
