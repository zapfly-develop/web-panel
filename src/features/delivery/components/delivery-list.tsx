"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Bike,
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    MapPin,
    PackageCheck,
    Route,
    Star,
    UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type {
    DeliveryRiderPerformanceMetric,
    StoreDelivery,
} from "../services/delivery-types";
import {
    DeliveryStatusBadge,
    getDeliveryStatusLabel,
} from "./delivery-status-badge";

type DeliveryListProps = {
    deliveries: StoreDelivery[];
    riderPerformanceById?: Map<string, DeliveryRiderPerformanceMetric>;
    onAssignClick: (delivery: StoreDelivery) => void;
};

type RatingDisplay = {
    label: string;
    detail: string;
    title?: string;
};

const pageSizeOptions = [10, 20, 50];

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
        delivery.status === "READY_FOR_PICKUP" ||
        delivery.status === "DELIVERY_STAGNATED" ||
        delivery.status === "PENDING_ASSIGNMENT"
    );
}

function getRiderLabel(delivery: StoreDelivery) {
    return (
        delivery.rider?.displayName ||
        delivery.rider?.vehiclePlate ||
        "Sem entregador"
    );
}

function getRatingDisplay(
    delivery: StoreDelivery,
    performance: DeliveryRiderPerformanceMetric | null,
): RatingDisplay | null {
    if (delivery.rating) {
        return {
            label: delivery.rating.score.toFixed(1),
            detail: "Entrega",
            title: delivery.rating.comment ?? undefined,
        };
    }

    if (
        performance &&
        typeof performance.averageRating === "number" &&
        performance.ratingCount > 0
    ) {
        return {
            label: performance.averageRating.toFixed(1),
            detail: `${performance.ratingCount} aval.`,
        };
    }

    return null;
}

function getLastRelevantDate(delivery: StoreDelivery) {
    return (
        delivery.deliveredAt ||
        delivery.pickedUpAt ||
        delivery.acceptedAt ||
        delivery.updatedAt ||
        delivery.createdAt
    );
}

function getDeliveryPhase(delivery: StoreDelivery) {
    if (delivery.deliveredAt) {
        return "Finalizada";
    }

    if (delivery.pickedUpAt) {
        return "Coletada";
    }

    if (delivery.acceptedAt) {
        return "Aceita";
    }

    return "Em busca";
}

export function DeliveryList({
    deliveries,
    riderPerformanceById,
    onAssignClick,
}: DeliveryListProps) {
    const [pageSize, setPageSize] = useState(pageSizeOptions[0]);
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(deliveries.length / pageSize));

    useEffect(() => {
        setCurrentPage(1);
    }, [deliveries.length, pageSize]);

    useEffect(() => {
        setCurrentPage((page) => Math.min(page, totalPages));
    }, [totalPages]);

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, deliveries.length);
    const paginatedDeliveries = useMemo(
        () => deliveries.slice(startIndex, endIndex),
        [deliveries, endIndex, startIndex],
    );
    const firstVisible = deliveries.length === 0 ? 0 : startIndex + 1;
    const lastVisible = deliveries.length === 0 ? 0 : endIndex;

    if (deliveries.length === 0) {
        return (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-white p-8 text-center">
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
        <div className="rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-900">
                        Entregas filtradas
                    </p>
                    <p className="text-xs text-slate-500">
                        Exibindo {firstVisible}-{lastVisible} de{" "}
                        {deliveries.length}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">
                        Linhas
                    </span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(value) => {
                            setPageSize(Number(value));
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger size="sm" className="w-20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {pageSizeOptions.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        title="Pagina anterior"
                        disabled={currentPage <= 1}
                        onClick={() =>
                            setCurrentPage((page) => Math.max(1, page - 1))
                        }
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-16 text-center text-xs font-medium text-slate-600">
                        {currentPage}/{totalPages}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        title="Proxima pagina"
                        disabled={currentPage >= totalPages}
                        onClick={() =>
                            setCurrentPage((page) =>
                                Math.min(totalPages, page + 1),
                            )
                        }
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Table className="min-w-[980px] table-fixed">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[190px]">Entrega</TableHead>
                        <TableHead className="w-[320px]">
                            Cliente e destino
                        </TableHead>
                        <TableHead className="w-[220px]">
                            Entregador
                        </TableHead>
                        <TableHead className="w-[150px]">Rota</TableHead>
                        <TableHead className="w-[160px]">Valores</TableHead>
                        <TableHead className="w-[140px] text-right">
                            Acao
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedDeliveries.map((delivery) => {
                        const customerLabel =
                            delivery.order.customerName ||
                            delivery.order.customerWhatsappId;
                        const riderId = delivery.rider?.id ?? delivery.riderId;
                        const performance = riderId
                            ? riderPerformanceById?.get(riderId) ?? null
                            : null;
                        const rating = getRatingDisplay(delivery, performance);

                        return (
                            <TableRow key={delivery.id}>
                                <TableCell className="whitespace-normal align-top">
                                    <div className="space-y-2">
                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                            <DeliveryStatusBadge
                                                status={delivery.status}
                                            />
                                            {delivery.isHighPriority ? (
                                                <Badge
                                                    variant="outline"
                                                    className="border-violet-200 bg-violet-50 text-violet-700"
                                                >
                                                    Prioritaria
                                                </Badge>
                                            ) : null}
                                        </div>
                                        <p className="text-xs font-medium text-slate-500">
                                            Pedido{" "}
                                            {delivery.orderId
                                                .slice(-6)
                                                .toUpperCase()}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {formatDate(
                                                getLastRelevantDate(delivery),
                                            )}
                                        </p>
                                    </div>
                                </TableCell>

                                <TableCell className="whitespace-normal align-top">
                                    <div className="min-w-0 space-y-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-slate-900">
                                                {customerLabel}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">
                                                {delivery.order.customerWhatsappId}
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                Destino
                                            </p>
                                            <p className="mt-1 line-clamp-2 text-sm leading-snug text-slate-700">
                                                {delivery.destinationAddress ||
                                                    delivery.order.deliveryAddress}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>

                                <TableCell className="whitespace-normal align-top">
                                    <div className="min-w-0 space-y-2">
                                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                                            <UserRound className="h-3.5 w-3.5 shrink-0" />
                                            Rider
                                        </p>
                                        <p className="truncate text-sm font-medium text-slate-800">
                                            {getRiderLabel(delivery)}
                                        </p>
                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                            <span className="truncate text-xs text-slate-500">
                                                {delivery.rider?.vehiclePlate ||
                                                    delivery.assignmentType}
                                            </span>
                                            {rating ? (
                                                <span
                                                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-100 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
                                                    title={rating.title}
                                                >
                                                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                                    {rating.label}
                                                    <span className="font-medium text-amber-600/80">
                                                        {rating.detail}
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">
                                                    Sem nota
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>

                                <TableCell className="whitespace-normal align-top">
                                    <div className="space-y-1 text-sm">
                                        <p className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                                            <Route className="h-4 w-4 shrink-0 text-slate-400" />
                                            {formatDistance(
                                                delivery.distanceMeters,
                                            )}
                                        </p>
                                        <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                                            {getDeliveryPhase(delivery)}
                                        </p>
                                    </div>
                                </TableCell>

                                <TableCell className="whitespace-normal align-top">
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <p className="flex items-center gap-1 text-xs text-slate-400">
                                                <CircleDollarSign className="h-3.5 w-3.5 shrink-0" />
                                                Frete
                                            </p>
                                            <p className="font-semibold text-slate-900">
                                                {formatMoney(
                                                    delivery.quotedPriceCents,
                                                    delivery.currency,
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">
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
                                </TableCell>

                                <TableCell className="whitespace-normal text-right align-top">
                                    {canAssignDelivery(delivery) ? (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() =>
                                                onAssignClick(delivery)
                                            }
                                        >
                                            <Bike className="h-4 w-4" />
                                            Atribuir
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled
                                            className="max-w-full"
                                        >
                                            <span className="truncate">
                                                {getDeliveryStatusLabel(
                                                    delivery.status,
                                                )}
                                            </span>
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
