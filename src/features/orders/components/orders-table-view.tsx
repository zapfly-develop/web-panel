"use client";

import Link from "next/link";
import {
    Bike,
    ExternalLink,
    Loader2,
    Printer,
    ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { StoreDelivery } from "@/features/delivery/services/delivery-types";
import type { StoreOrder } from "../services/order-types";
import {
    formatClock,
    formatMoney,
    getCustomerLabel,
    getDeliveryForOrder,
    getOrderItemSummary,
    getPaymentMethodLabel,
    getShortId,
} from "../services/order-utils";
import { OrderSlaIndicator } from "./order-sla-indicator";
import { OrderStatusBadge } from "./order-status-badge";

type OrdersTableViewProps = {
    orders: StoreOrder[];
    deliveriesByOrderId: Map<string, StoreDelivery>;
    now: Date;
    creatingDeliveryOrderId: string | null;
    onCreateDelivery: (order: StoreOrder) => void;
    onAssignRider: (delivery: StoreDelivery) => void;
    onOpenDetails: (order: StoreOrder) => void;
    onPrint: (order: StoreOrder) => void;
};

export function OrdersTableView({
    orders,
    deliveriesByOrderId,
    now,
    creatingDeliveryOrderId,
    onCreateDelivery,
    onAssignRider,
    onOpenDetails,
    onPrint,
}: OrdersTableViewProps) {
    return (
        <div className="rounded-md border border-slate-200 bg-white shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Resumo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Rider</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map((order) => {
                        const delivery = getDeliveryForOrder(
                            deliveriesByOrderId,
                            order.id,
                        );
                        const canCreateDelivery =
                            order.status === "PREPARING" && !delivery;
                        const canAssignRider =
                            delivery?.status === "WAITING_RIDER" ||
                            delivery?.status === "READY_FOR_PICKUP" ||
                            delivery?.status === "DELIVERY_STAGNATED" ||
                            delivery?.status === "PENDING_ASSIGNMENT";

                        return (
                            <TableRow key={order.id}>
                                <TableCell>
                                    <div className="space-y-1">
                                        <p className="font-semibold text-slate-900">
                                            #{getShortId(order.id)}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {formatClock(order.updatedAt)}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="max-w-40">
                                        <p className="truncate font-medium text-slate-900">
                                            {getCustomerLabel(order)}
                                        </p>
                                        <p className="truncate text-xs text-slate-500">
                                            {getPaymentMethodLabel(
                                                order.paymentMethod,
                                            )}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <p className="max-w-56 truncate text-slate-700">
                                        {getOrderItemSummary(order)}
                                    </p>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col items-start gap-1">
                                        <OrderStatusBadge
                                            status={order.status}
                                        />
                                        <OrderSlaIndicator
                                            order={order}
                                            now={now}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {delivery?.rider ? (
                                        <div className="max-w-36">
                                            <p className="truncate text-sm font-medium text-slate-800">
                                                {delivery.rider.displayName ||
                                                    "Entregador"}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">
                                                {delivery.rider.vehiclePlate ||
                                                    delivery.rider
                                                        .availabilityStatus}
                                            </p>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400">
                                            Nao atribuido
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-slate-900">
                                    {formatMoney(
                                        order.totalCents,
                                        order.currency,
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="outline"
                                            title="Ver detalhes"
                                            onClick={() =>
                                                onOpenDetails(order)
                                            }
                                        >
                                            <ReceiptText className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="outline"
                                            title="Imprimir via"
                                            onClick={() => onPrint(order)}
                                        >
                                            <Printer className="h-4 w-4" />
                                        </Button>
                                        {canCreateDelivery ? (
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                title="Chamar rider"
                                                onClick={() =>
                                                    onCreateDelivery(order)
                                                }
                                                disabled={
                                                    creatingDeliveryOrderId ===
                                                    order.id
                                                }
                                            >
                                                {creatingDeliveryOrderId ===
                                                order.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Bike className="h-4 w-4" />
                                                )}
                                            </Button>
                                        ) : canAssignRider ? (
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="outline"
                                                title="Atribuir rider"
                                                onClick={() =>
                                                    delivery &&
                                                    onAssignRider(delivery)
                                                }
                                            >
                                                <Bike className="h-4 w-4" />
                                            </Button>
                                        ) : delivery ? (
                                            <Button
                                                asChild
                                                size="icon-sm"
                                                variant="outline"
                                                title="Acompanhar entrega"
                                            >
                                                <Link href="/dashboard/delivery">
                                                    <ExternalLink className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        ) : null}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
