import { AlertTriangle, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StoreOrder } from "../services/order-types";
import {
    formatDuration,
    getOrderSlaLevel,
    getPreparingAgeMinutes,
    SLA_CRITICAL_MINUTES,
    SLA_WARNING_MINUTES,
} from "../services/order-utils";

type OrderSlaIndicatorProps = {
    order: StoreOrder;
    now: Date;
};

export function OrderSlaIndicator({ order, now }: OrderSlaIndicatorProps) {
    if (order.status !== "PREPARING") {
        return null;
    }

    const ageMinutes = getPreparingAgeMinutes(order, now);
    const level = getOrderSlaLevel(order, now);
    const isLate = level !== "normal";

    return (
        <Badge
            variant="outline"
            className={cn(
                "rounded-md",
                level === "normal" &&
                    "border-slate-200 bg-slate-50 text-slate-600",
                level === "warning" &&
                    "border-amber-300 bg-amber-50 text-amber-800",
                level === "critical" &&
                    "border-rose-300 bg-rose-50 text-rose-800",
            )}
            title={`Alerta em ${SLA_WARNING_MINUTES} min, critico em ${SLA_CRITICAL_MINUTES} min`}
        >
            {isLate ? (
                <AlertTriangle className="h-3 w-3" />
            ) : (
                <Timer className="h-3 w-3" />
            )}
            {formatDuration(ageMinutes)}
        </Badge>
    );
}
