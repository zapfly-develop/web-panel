import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DeliveryStatus } from "../services/delivery-types";

const DELIVERY_STATUS_COPY: Record<
    DeliveryStatus,
    { label: string; className: string }
> = {
    WAITING_RIDER: {
        label: "Aguardando rider",
        className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    READY_FOR_PICKUP: {
        label: "Pronta para coleta",
        className: "border-violet-200 bg-violet-50 text-violet-700",
    },
    INCIDENT_REPORTED: {
        label: "Incidente",
        className: "border-rose-200 bg-rose-50 text-rose-700",
    },
    PENDING_ASSIGNMENT: {
        label: "Aguardando rider",
        className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    ASSIGNED: {
        label: "Atribuida",
        className: "border-sky-200 bg-sky-50 text-sky-700",
    },
    ACCEPTED: {
        label: "Aceita",
        className: "border-blue-200 bg-blue-50 text-blue-700",
    },
    PICKED_UP: {
        label: "Coletada",
        className: "border-teal-200 bg-teal-50 text-teal-700",
    },
    IN_TRANSIT: {
        label: "Em rota",
        className: "border-cyan-200 bg-cyan-50 text-cyan-700",
    },
    ARRIVED_AT_DESTINATION: {
        label: "No local",
        className: "border-indigo-200 bg-indigo-50 text-indigo-700",
    },
    ABSENT_WAITING: {
        label: "Cliente ausente",
        className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    RETURNING_TO_MERCHANT: {
        label: "Retornando",
        className: "border-orange-200 bg-orange-50 text-orange-700",
    },
    DELIVERY_STAGNATED: {
        label: "Estagnada",
        className: "border-red-200 bg-red-50 text-red-700",
    },
    DELIVERED: {
        label: "Entregue",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    CANCELED: {
        label: "Cancelada",
        className: "border-rose-200 bg-rose-50 text-rose-700",
    },
};

type DeliveryStatusBadgeProps = {
    status: DeliveryStatus;
    className?: string;
};

export function getDeliveryStatusLabel(status: DeliveryStatus): string {
    return DELIVERY_STATUS_COPY[status]?.label ?? status;
}

export function DeliveryStatusBadge({
    status,
    className,
}: DeliveryStatusBadgeProps) {
    const statusCopy = DELIVERY_STATUS_COPY[status] ?? {
        label: status,
        className: "border-slate-200 bg-slate-50 text-slate-700",
    };

    return (
        <Badge
            variant="outline"
            className={cn(statusCopy.className, className)}
        >
            {statusCopy.label}
        </Badge>
    );
}
