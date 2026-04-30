"use client";

import {
    Bike,
    CalendarClock,
    CircleDollarSign,
    MapPin,
    PackageCheck,
    Route,
    UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { StoreDelivery } from "../services/delivery-types";
import {
    DeliveryStatusBadge,
    getDeliveryStatusLabel,
} from "./delivery-status-badge";

type DeliveryListProps = {
    deliveries: StoreDelivery[];
    onAssignClick: (delivery: StoreDelivery) => void;
};

function formatMoney(valueCents: number, currency = "BRL") {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency,
    }).format(valueCents / 100);
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatDistance(distanceMeters: number | null) {
    if (!distanceMeters || distanceMeters <= 0) {
        return "Sem distancia";
    }

    if (distanceMeters < 1000) {
        return `${distanceMeters} m`;
    }

    return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function canAssignDelivery(delivery: StoreDelivery) {
    return (
        delivery.status === "WAITING_RIDER" ||
        delivery.status === "PENDING_ASSIGNMENT"
    );
}

export function DeliveryList({
    deliveries,
    onAssignClick,
}: DeliveryListProps) {
    if (deliveries.length === 0) {
        return (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-white text-center">
                <PackageCheck className="mb-3 h-7 w-7 text-slate-400" />
                <p className="text-lg font-semibold text-slate-900">
                    Nenhuma entrega neste filtro
                </p>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                    As entregas criadas pelo backend aparecem aqui para
                    atribuicao, coleta e acompanhamento.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {deliveries.map((delivery) => {
                const customerLabel =
                    delivery.order.customerName ||
                    delivery.order.customerWhatsappId;
                const riderLabel =
                    delivery.rider?.displayName ||
                    delivery.rider?.vehiclePlate ||
                    "Sem entregador";

                return (
                    <Card key={delivery.id} className="border-slate-200 shadow-sm">
                        <CardHeader className="gap-4 pb-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <DeliveryStatusBadge
                                            status={delivery.status}
                                        />
                                        <Badge
                                            variant="outline"
                                            className="border-slate-200 bg-slate-50 text-slate-600"
                                        >
                                            Pedido {delivery.orderId.slice(-6)}
                                        </Badge>
                                    </div>
                                    <CardTitle className="truncate text-lg text-slate-900">
                                        {customerLabel}
                                    </CardTitle>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                                        <span className="inline-flex items-center gap-1.5">
                                            <CalendarClock className="h-4 w-4" />
                                            {formatDate(delivery.updatedAt)}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <Route className="h-4 w-4" />
                                            {formatDistance(
                                                delivery.distanceMeters,
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {canAssignDelivery(delivery) ? (
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                onAssignClick(delivery)
                                            }
                                        >
                                            <Bike className="h-4 w-4" />
                                            Atribuir rider
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled
                                        >
                                            {getDeliveryStatusLabel(
                                                delivery.status,
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[1.4fr_0.9fr_0.9fr]">
                            <div className="min-w-0 space-y-2">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                                    <MapPin className="h-3.5 w-3.5" />
                                    Destino
                                </p>
                                <p className="text-sm text-slate-700">
                                    {delivery.destinationAddress ||
                                        delivery.order.deliveryAddress}
                                </p>
                            </div>

                            <div className="min-w-0 space-y-2">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                                    <UserRound className="h-3.5 w-3.5" />
                                    Entregador
                                </p>
                                <p className="truncate text-sm font-medium text-slate-800">
                                    {riderLabel}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                                    <CircleDollarSign className="h-3.5 w-3.5" />
                                    Valores
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-slate-400">Frete</p>
                                        <p className="font-semibold text-slate-900">
                                            {formatMoney(
                                                delivery.quotedPriceCents,
                                                delivery.currency,
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400">
                                            Repasse
                                        </p>
                                        <p className="font-semibold text-slate-900">
                                            {formatMoney(
                                                delivery.riderPayoutCents,
                                                delivery.currency,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

