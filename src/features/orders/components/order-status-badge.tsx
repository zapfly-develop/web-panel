import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "../services/order-types";
import { getOrderStatusLabel } from "../services/order-utils";

type OrderStatusBadgeProps = {
    status: OrderStatus;
};

const statusClassName: Record<OrderStatus, string> = {
    PENDING: "border-slate-200 bg-slate-50 text-slate-700",
    PREPARING: "border-amber-200 bg-amber-50 text-amber-700",
    SHIPPED: "border-sky-200 bg-sky-50 text-sky-700",
    DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
    return (
        <Badge
            variant="outline"
            className={cn("rounded-md", statusClassName[status])}
        >
            {getOrderStatusLabel(status)}
        </Badge>
    );
}
