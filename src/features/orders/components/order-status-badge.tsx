import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "../services/order-types";
import { getOrderStatusLabel } from "../services/order-utils";

type OrderStatusBadgeProps = {
    status: OrderStatus;
};

const statusClassName: Record<OrderStatus | "DELIVERY_STAGNATED", string> = {
    PENDING: "border-slate-200 bg-slate-50 text-slate-700",
    PREPARING: "border-amber-200 bg-amber-50 text-amber-700",
    SHIPPED: "border-sky-200 bg-sky-50 text-sky-700",
    DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    DELIVERY_STAGNATED: "border-rose-200 bg-rose-50 text-rose-700 animate-pulse shadow-[0_0_12px_rgba(225,29,72,0.3)]",
};

export function OrderStatusBadge({ status, deliveryStatus }: OrderStatusBadgeProps & { deliveryStatus?: string }) {
    const isStagnated = deliveryStatus === "DELIVERY_STAGNATED";

    return (
        <Badge
            variant="outline"
            className={cn("rounded-md", statusClassName[isStagnated ? "DELIVERY_STAGNATED" : status])}
        >
            {isStagnated ? "Entrega Estagnada" : getOrderStatusLabel(status)}
        </Badge>
    );
}
