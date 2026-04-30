"use client";

import { useEffect, useState } from "react";
import {
    AlertTriangle,
    Bike,
    Clock,
    MapPin,
    ReceiptText,
    UserRound,
    Zap,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { StoreDelivery } from "@/features/delivery/services/delivery-types";
import type { StoreOrder } from "../services/order-types";
import {
    formatDateTime,
    formatMoney,
    getCustomerLabel,
    getPaymentMethodLabel,
    getShortId,
} from "../services/order-utils";
import { OrderStatusBadge } from "./order-status-badge";

type OrderDetailsDialogProps = {
    order: StoreOrder | null;
    delivery: StoreDelivery | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function OrderDetailsDialog({
    order,
    delivery,
    open,
    onOpenChange,
}: OrderDetailsDialogProps) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        if (!open || !delivery?.riderSearchStartedAt) return;

        const interval = setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, [open, delivery?.riderSearchStartedAt]);

    if (!order) {
        return null;
    }

    const searchTimeText = delivery?.riderSearchStartedAt
        ? (() => {
              const start = new Date(delivery.riderSearchStartedAt).getTime();
              const diffMs = now.getTime() - start;
              const diffSec = Math.floor(diffMs / 1000);
              const min = Math.floor(diffSec / 60);
              const sec = diffSec % 60;
              return `${min}m ${sec}s`;
          })()
        : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ReceiptText className="h-5 w-5 text-primary" />
                        Pedido #{getShortId(order.id)}
                    </DialogTitle>
                    <DialogDescription>
                        Atualizado em {formatDateTime(order.updatedAt)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <OrderStatusBadge
                            status={order.status}
                            deliveryStatus={delivery?.status}
                        />
                        <span className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600">
                            {getPaymentMethodLabel(order.paymentMethod)}
                        </span>
                        {delivery?.deliveryBonusApplied && (
                            <span className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                                <Zap className="h-3 w-3 fill-amber-500" />
                                Tarifa Dinâmica Ativa
                            </span>
                        )}
                    </div>

                    {delivery && (
                        <div className="rounded-md border border-slate-200 bg-slate-50/50 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Logística e Entrega
                                </h4>
                                {searchTimeText &&
                                    delivery.status !== "DELIVERED" &&
                                    delivery.status !== "CANCELED" && (
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                            <Clock className="h-3 w-3" />
                                            Em busca há {searchTimeText}
                                        </div>
                                    )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-semibold uppercase text-slate-400">
                                        Status da Entrega
                                    </p>
                                    <p className="text-sm font-medium text-slate-900">
                                        {delivery.status ===
                                        "DELIVERY_STAGNATED"
                                            ? "⚠️ Estagnado (Sem entregadores)"
                                            : delivery.status}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-semibold uppercase text-slate-400">
                                        Repasse p/ Entregador
                                    </p>
                                    <p className="text-sm font-bold text-slate-900">
                                        {formatMoney(delivery.riderPayoutCents)}
                                        {delivery.deliveryBonusApplied && (
                                            <span className="ml-1.5 text-[10px] text-amber-600">
                                                (Bônus aplicado)
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {delivery.status === "DELIVERY_STAGNATED" && (
                                <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-rose-800">
                                            Atenção: Pedido Estagnado
                                        </p>
                                        <p className="text-[11px] leading-relaxed text-rose-700">
                                            O pedido está há muito tempo sem ser
                                            aceito. Recomendamos acionar um
                                            entregador próprio ou frota externa.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-md border border-slate-200 p-3">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                <UserRound className="h-4 w-4 text-slate-500" />
                                Cliente
                            </div>
                            <p className="text-sm text-slate-700">
                                {getCustomerLabel(order)}
                            </p>
                            <p className="text-xs text-slate-500">
                                {order.customerWhatsappId}
                            </p>
                        </div>

                        <div className="rounded-md border border-slate-200 p-3">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                <Bike className="h-4 w-4 text-slate-500" />
                                Entregador
                            </div>
                            {delivery?.rider ? (
                                <>
                                    <p className="text-sm text-slate-700">
                                        {delivery.rider.displayName ||
                                            "Entregador"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {delivery.rider.vehiclePlate ||
                                            delivery.rider.availabilityStatus}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-slate-500">
                                    Nao atribuido
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-md border border-slate-200 p-3">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <MapPin className="h-4 w-4 text-slate-500" />
                            Endereco
                        </div>
                        <p className="text-sm text-slate-700">
                            {order.deliveryAddress}
                        </p>
                    </div>

                    <div>
                        <p className="mb-2 text-sm font-semibold text-slate-900">
                            Itens
                        </p>
                        <div className="divide-y rounded-md border border-slate-200">
                            {order.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-3 p-3"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-900">
                                            {item.quantity}x {item.title}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {item.category || "Sem categoria"}
                                        </p>
                                    </div>
                                    <p className="shrink-0 text-sm font-semibold text-slate-700">
                                        {formatMoney(
                                            item.subtotalCents,
                                            order.currency,
                                        )}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {order.notes ? (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            {order.notes}
                        </div>
                    ) : null}

                    <Separator />

                    <div className="flex items-end justify-between gap-4">
                        <div className="text-sm text-slate-500">
                            {order.deliveryFeeCents > 0 ? (
                                <p>
                                    Taxa:{" "}
                                    {formatMoney(
                                        order.deliveryFeeCents,
                                        order.currency,
                                    )}
                                </p>
                            ) : null}
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                                Total
                            </p>
                            <p className="text-2xl font-bold text-slate-950">
                                {formatMoney(order.totalCents, order.currency)}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
