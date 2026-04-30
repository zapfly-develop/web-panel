"use client";

import { Bike, MapPin, ReceiptText, UserRound } from "lucide-react";
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
    if (!order) {
        return null;
    }

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
                        <OrderStatusBadge status={order.status} />
                        <span className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600">
                            {getPaymentMethodLabel(order.paymentMethod)}
                        </span>
                    </div>

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
