import { AlertTriangle, Clock3, DollarSign, ReceiptText } from "lucide-react";
import type { OrderMetricSummary } from "../services/order-utils";
import { formatDuration, formatMoney } from "../services/order-utils";

type OrdersPerformanceSummaryProps = {
    metrics: OrderMetricSummary;
};

export function OrdersPerformanceSummary({
    metrics,
}: OrdersPerformanceSummaryProps) {
    const cards = [
        {
            label: "Vendas hoje",
            value: formatMoney(metrics.todaySalesCents),
            detail: `${metrics.todayOrdersCount} pedido${
                metrics.todayOrdersCount === 1 ? "" : "s"
            }`,
            icon: DollarSign,
            className: "border-emerald-100 bg-emerald-50 text-emerald-700",
        },
        {
            label: "Tempo medio",
            value:
                metrics.averageDeliveryMinutes === null
                    ? "--"
                    : formatDuration(metrics.averageDeliveryMinutes),
            detail: "entrega concluida",
            icon: Clock3,
            className: "border-sky-100 bg-sky-50 text-sky-700",
        },
        {
            label: "Ticket medio",
            value: formatMoney(metrics.averageTicketCents),
            detail: "pedidos de hoje",
            icon: ReceiptText,
            className: "border-violet-100 bg-violet-50 text-violet-700",
        },
        {
            label: "Atrasos",
            value: String(metrics.preparingLateCount),
            detail: "em preparo",
            icon: AlertTriangle,
            className: "border-amber-100 bg-amber-50 text-amber-700",
        },
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon;

                return (
                    <div
                        key={card.label}
                        className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                    >
                        <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium uppercase text-slate-500">
                                    {card.label}
                                </p>
                                <p className="mt-1 break-words text-xl font-bold leading-tight text-slate-950 sm:text-2xl">
                                    {card.value}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {card.detail}
                                </p>
                            </div>
                            <div
                                className={`shrink-0 rounded-md border p-2 ${card.className}`}
                            >
                                <Icon className="h-4 w-4" />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
