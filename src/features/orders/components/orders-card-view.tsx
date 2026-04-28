"use client";

import type { StoreDelivery } from "@/features/delivery/services/delivery-types";
import type { StoreOrder } from "../services/order-types";
import { getDeliveryForOrder } from "../services/order-utils";
import { OrderCard } from "./order-card";

type OrdersCardViewProps = {
    orders: StoreOrder[];
    deliveriesByOrderId: Map<string, StoreDelivery>;
    now: Date;
    creatingDeliveryOrderId: string | null;
    onCreateDelivery: (order: StoreOrder) => void;
    onOpenDetails: (order: StoreOrder) => void;
    onPrint: (order: StoreOrder) => void;
};

export function OrdersCardView({
    orders,
    deliveriesByOrderId,
    now,
    creatingDeliveryOrderId,
    onCreateDelivery,
    onOpenDetails,
    onPrint,
}: OrdersCardViewProps) {
    return (
        <div className="grid gap-3 lg:grid-cols-2">
            {orders.map((order) => (
                <OrderCard
                    key={order.id}
                    order={order}
                    delivery={getDeliveryForOrder(deliveriesByOrderId, order.id)}
                    now={now}
                    isCreatingDelivery={creatingDeliveryOrderId === order.id}
                    onCreateDelivery={onCreateDelivery}
                    onOpenDetails={onOpenDetails}
                    onPrint={onPrint}
                />
            ))}
        </div>
    );
}
