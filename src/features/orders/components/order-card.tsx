"use client";

import Link from "next/link";
import {
    Bike,
    CheckCircle2,
    ExternalLink,
    Loader2,
    MapPin,
    Printer,
    ReceiptText,
    UserRound,
    Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
    DeliveryRider,
    StoreDelivery,
} from "@/features/delivery/services/delivery-types";
import type { StoreOrder } from "../services/order-types";
import {
    formatClock,
    formatMoney,
    getCustomerLabel,
    getOrderItemSummary,
    getOrderSlaLevel,
    getPaymentMethodLabel,
    getShortId,
} from "../services/order-utils";
import { OrderSlaIndicator } from "./order-sla-indicator";
import { OrderStatusBadge } from "./order-status-badge";

type OrderCardProps = {
    order: StoreOrder;
    delivery: StoreDelivery | null;
    now: Date;
    compact?: boolean;
    isCreatingDelivery: boolean;
    onCreateDelivery: (order: StoreOrder) => void;
    onOpenDetails: (order: StoreOrder) => void;
    onPrint: (order: StoreOrder) => void;
};

export function OrderCard({
    order,
    delivery,
    now,
    compact = false,
    isCreatingDelivery,
    onCreateDelivery,
    onOpenDetails,
    onPrint,
}: OrderCardProps) {
    const slaLevel =
        delivery?.status === "DELIVERY_STAGNATED"
            ? "critical"
            : getOrderSlaLevel(order, now);
    const canCreateDelivery = order.status === "PREPARING" && !delivery;
    const canAssignRider =
        delivery?.status === "WAITING_RIDER" ||
        delivery?.status === "PENDING_ASSIGNMENT";
    const rider = delivery?.rider ?? null;

    return (
        <article
            className={cn(
                "rounded-md border bg-white p-3 shadow-sm transition-colors select-none",
                order.status !== "DELIVERED" && "cursor-grab active:cursor-grabbing",
                slaLevel === "warning" && "border-amber-300",
                slaLevel === "critical" && "border-rose-300",
                slaLevel === "normal" && "border-slate-200",
                delivery?.status === "DELIVERY_STAGNATED" &&
                    "border-rose-500 ring-1 ring-rose-500 bg-rose-50/30",
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                        <h3 className="truncate text-sm font-semibold text-slate-950">
                            {getCustomerLabel(order)}
                        </h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                        #{getShortId(order.id)} - {formatClock(order.updatedAt)}
                    </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                    <OrderStatusBadge
                        status={order.status}
                        deliveryStatus={delivery?.status}
                    />
                    <OrderSlaIndicator order={order} now={now} />
                </div>
            </div>

            <div className={cn("mt-3 space-y-2", compact && "mt-2 space-y-1.5")}>
                <p className="line-clamp-1 text-sm font-medium text-slate-800">
                    {getOrderItemSummary(order)}
                </p>
                <div className="flex items-start gap-2 text-xs text-slate-500">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <p className="line-clamp-2">{order.deliveryAddress}</p>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600">
                    {getPaymentMethodLabel(order.paymentMethod)}
                </span>
                {delivery ? (
                    <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-700">
                        Entrega criada
                    </span>
                ) : null}
                {delivery?.deliveryBonusApplied && (
                    <span className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 animate-pulse">
                        <Zap className="h-3 w-3 fill-amber-500" />
                        Tarifa Dinâmica Ativa
                    </span>
                )}
            </div>

            {rider ? <OrderRiderSummary rider={rider} /> : null}

            <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                <div>
                    <p className="text-xs font-medium uppercase text-slate-500">
                        {delivery?.deliveryBonusApplied ? "Total c/ Bônus" : "Total"}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                        <p className="text-lg font-bold text-slate-950">
                            {formatMoney(order.totalCents, order.currency)}
                        </p>
                        {delivery?.deliveryBonusApplied && (
                            <p className="text-[10px] font-medium text-amber-600">
                                (Rider: {formatMoney(delivery.riderPayoutCents)})
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                    <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        title="Ver detalhes"
                        onClick={() => onOpenDetails(order)}
                    >
                        <ReceiptText className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        title="Imprimir via de cozinha"
                        onClick={() => onPrint(order)}
                    >
                        <Printer className="h-4 w-4" />
                    </Button>

                    {canCreateDelivery ? (
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => onCreateDelivery(order)}
                            disabled={isCreatingDelivery}
                        >
                            {isCreatingDelivery ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Bike className="h-4 w-4" />
                            )}
                            Chamar rider
                        </Button>
                    ) : canAssignRider ? (
                        <Button asChild size="sm" variant="outline">
                            <Link href="/dashboard/delivery">
                                <Bike className="h-4 w-4" />
                                Atribuir
                            </Link>
                        </Button>
                    ) : delivery ? (
                        <Button asChild size="sm" variant="outline">
                            <Link href="/dashboard/delivery">
                                <ExternalLink className="h-4 w-4" />
                                Acompanhar
                            </Link>
                        </Button>
                    ) : order.status === "DELIVERED" ? (
                        <span className="flex h-8 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Finalizado
                        </span>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

function OrderRiderSummary({ rider }: { rider: DeliveryRider }) {
    const photoUrl = getRiderPhotoUrl(rider);
    const riderName = rider.displayName || "Entregador";
    const initials = riderName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 p-2">
            {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={photoUrl}
                    alt={riderName}
                    className="h-8 w-8 rounded-full object-cover"
                />
            ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {initials || "R"}
                </div>
            )}
            <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">
                    {riderName}
                </p>
                <p className="truncate text-xs text-slate-500">
                    {rider.vehiclePlate || rider.availabilityStatus}
                </p>
            </div>
        </div>
    );
}

function getRiderPhotoUrl(rider: DeliveryRider) {
    const riderWithPhoto = rider as DeliveryRider & {
        avatarUrl?: string | null;
        photoUrl?: string | null;
        profileImageUrl?: string | null;
    };

    return (
        riderWithPhoto.avatarUrl ||
        riderWithPhoto.photoUrl ||
        riderWithPhoto.profileImageUrl ||
        null
    );
}
