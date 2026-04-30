"use client";

import {
    Columns3,
    LayoutGrid,
    ListFilter,
    RefreshCw,
    Search,
    Table2,
    Wifi,
    WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
    OrderPaymentFilter,
    OrderStatusFilter,
    OrderTimeFilter,
    OrdersViewMode,
} from "../services/order-types";
import { getPaymentMethodLabel } from "../services/order-utils";

type OrdersFilterBarProps = {
    query: string;
    statusFilter: OrderStatusFilter;
    paymentFilter: OrderPaymentFilter;
    timeFilter: OrderTimeFilter;
    viewMode: OrdersViewMode;
    paymentOptions: string[];
    isRefreshing: boolean;
    isRealtimeConnected: boolean;
    realtimeLabel: string;
    onQueryChange: (query: string) => void;
    onStatusFilterChange: (status: OrderStatusFilter) => void;
    onPaymentFilterChange: (payment: OrderPaymentFilter) => void;
    onTimeFilterChange: (time: OrderTimeFilter) => void;
    onViewModeChange: (viewMode: OrdersViewMode) => void;
    onRefresh: () => void;
};

const statusOptions: Array<{ value: OrderStatusFilter; label: string }> = [
    { value: "ALL", label: "Todos" },
    { value: "PENDING", label: "Pendente" },
    { value: "PREPARING", label: "Preparando" },
    { value: "SHIPPED", label: "Em rota" },
    { value: "DELIVERED", label: "Entregue" },
];

const timeOptions: Array<{ value: OrderTimeFilter; label: string }> = [
    { value: "TODAY", label: "Hoje" },
    { value: "LAST_2H", label: "2h" },
    { value: "LAST_6H", label: "6h" },
    { value: "ALL", label: "Tudo" },
];

const viewOptions: Array<{
    value: OrdersViewMode;
    label: string;
    icon: typeof Columns3;
}> = [
    { value: "kanban", label: "Kanban", icon: Columns3 },
    { value: "cards", label: "Cards", icon: LayoutGrid },
    { value: "table", label: "Lista", icon: Table2 },
];

export function OrdersFilterBar({
    query,
    statusFilter,
    paymentFilter,
    timeFilter,
    viewMode,
    paymentOptions,
    isRefreshing,
    isRealtimeConnected,
    realtimeLabel,
    onQueryChange,
    onStatusFilterChange,
    onPaymentFilterChange,
    onTimeFilterChange,
    onViewModeChange,
    onRefresh,
}: OrdersFilterBarProps) {
    return (
        <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 px-3">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <Input
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder="Buscar cliente, ID, endereço ou item"
                        className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div
                        className={cn(
                            "flex h-8 items-center gap-2 rounded-md border px-2 text-xs font-medium",
                            isRealtimeConnected
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-500",
                        )}
                        title={realtimeLabel}
                    >
                        {isRealtimeConnected ? (
                            <Wifi className="h-3.5 w-3.5" />
                        ) : (
                            <WifiOff className="h-3.5 w-3.5" />
                        )}
                        {isRealtimeConnected ? "Realtime" : "Polling"}
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw
                            className={cn(
                                "h-4 w-4",
                                isRefreshing && "animate-spin",
                            )}
                        />
                        Atualizar
                    </Button>

                    <Select
                        value={statusFilter}
                        onValueChange={(value) =>
                            onStatusFilterChange(value as OrderStatusFilter)
                        }
                    >
                        <SelectTrigger size="sm" className="w-full sm:w-36">
                            <ListFilter className="h-4 w-4" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {statusOptions.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={paymentFilter}
                        onValueChange={(value) =>
                            onPaymentFilterChange(value as OrderPaymentFilter)
                        }
                    >
                        <SelectTrigger size="sm" className="w-full sm:w-40">
                            <SelectValue placeholder="Pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Pagamento</SelectItem>
                            {paymentOptions.map((paymentMethod) => (
                                <SelectItem
                                    key={paymentMethod}
                                    value={paymentMethod}
                                >
                                    {getPaymentMethodLabel(paymentMethod)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={timeFilter}
                        onValueChange={(value) =>
                            onTimeFilterChange(value as OrderTimeFilter)
                        }
                    >
                        <SelectTrigger size="sm" className="w-full sm:w-28">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {timeOptions.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {viewOptions.map((option) => {
                    const Icon = option.icon;

                    return (
                        <Button
                            key={option.value}
                            type="button"
                            size="sm"
                            variant={
                                viewMode === option.value ? "default" : "outline"
                            }
                            onClick={() => onViewModeChange(option.value)}
                        >
                            <Icon className="h-4 w-4" />
                            {option.label}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
