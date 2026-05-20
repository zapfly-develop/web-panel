import Link from "next/link";
import {
    Activity,
    ArrowUpRight,
    Bike,
    CircleDollarSign,
    Clock3,
    Gauge,
    MessageCircle,
    PackageCheck,
    RadioTower,
    ShoppingBag,
    Store,
    WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DeliveryStatus, OrderStatus, RiderAvailabilityStatus, RiderStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DashboardActivityChart,
    DashboardChannelChart,
    type DashboardActivityPoint,
    type DashboardChannelPoint,
} from "@/components/dashboard/dashboard-charts";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { requireStoreUser } from "@/lib/server-session";

export const runtime = "nodejs";

type OperationalStatus =
    | "PENDING"
    | "PREPARING"
    | "ON_THE_WAY"
    | "DELIVERED"
    | "CANCELED";

type ChannelKey = "WhatsApp" | "Tray" | "Nuvemshop" | "Manual";

type RecentOrder = {
    id: string;
    customerName: string | null;
    customerWhatsappId: string;
    status: OrderStatus;
    totalCents: number;
    currency: string;
    createdAt: Date;
    whatsappInstanceId: string | null;
    whatsappInstance: {
        instanceName: string;
    } | null;
    delivery: {
        status: DeliveryStatus;
    } | null;
};

type ActivityOrder = {
    createdAt: Date;
    totalCents: number;
};

type ChannelOrder = {
    whatsappInstanceId: string | null;
    whatsappInstance: {
        instanceName: string;
    } | null;
};

const inRouteDeliveryStatuses: DeliveryStatus[] = [
    DeliveryStatus.PICKED_UP,
    DeliveryStatus.IN_TRANSIT,
    DeliveryStatus.ARRIVED_AT_DESTINATION,
    DeliveryStatus.ABSENT_WAITING,
    DeliveryStatus.RETURNING_TO_MERCHANT,
];

const statusMeta: Record<
    OperationalStatus,
    {
        label: string;
        className: string;
    }
> = {
    PENDING: {
        label: "Pendente",
        className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    PREPARING: {
        label: "Preparando",
        className: "border-orange-200 bg-orange-50 text-orange-700",
    },
    ON_THE_WAY: {
        label: "Em rota",
        className: "border-sky-200 bg-sky-50 text-sky-700",
    },
    DELIVERED: {
        label: "Entregue",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    CANCELED: {
        label: "Cancelado",
        className: "border-rose-200 bg-rose-50 text-rose-700",
    },
};

const channelMeta: Record<
    ChannelKey,
    {
        label: string;
        color: string;
        icon: LucideIcon;
        className: string;
    }
> = {
    WhatsApp: {
        label: "WhatsApp",
        color: "#0ea5e9",
        icon: MessageCircle,
        className: "bg-sky-50 text-sky-700 ring-sky-100",
    },
    Tray: {
        label: "Tray",
        color: "#6366f1",
        icon: ShoppingBag,
        className: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    },
    Nuvemshop: {
        label: "Nuvemshop",
        color: "#10b981",
        icon: Store,
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
    Manual: {
        label: "Manual",
        color: "#94a3b8",
        icon: RadioTower,
        className: "bg-slate-100 text-slate-700 ring-slate-200",
    },
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
});

const clockFormatter = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
});

const compactNumberFormatter = new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
});

function formatMoney(valueCents: number, currency = "BRL") {
    if (currency !== "BRL") {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency,
        }).format(valueCents / 100);
    }

    return currencyFormatter.format(valueCents / 100);
}

function formatPercentChange(value: number) {
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${percentFormatter.format(value)}%`;
}

function getPercentChange(current: number, previous: number) {
    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }

    return ((current - previous) / previous) * 100;
}

function getOperationalStatus(order: RecentOrder): OperationalStatus {
    if (order.delivery?.status === DeliveryStatus.CANCELED) {
        return "CANCELED";
    }

    if (
        order.delivery?.status &&
        inRouteDeliveryStatuses.includes(order.delivery.status)
    ) {
        return "ON_THE_WAY";
    }

    if (order.status === OrderStatus.SHIPPED) {
        return "ON_THE_WAY";
    }

    if (order.status === OrderStatus.DELIVERED) {
        return "DELIVERED";
    }

    if (order.status === OrderStatus.PREPARING) {
        return "PREPARING";
    }

    return "PENDING";
}

function getOrderChannel(order: ChannelOrder): ChannelKey {
    const instanceName = order.whatsappInstance?.instanceName.toLowerCase() ?? "";

    if (instanceName.includes("tray")) {
        return "Tray";
    }

    if (instanceName.includes("nuvem")) {
        return "Nuvemshop";
    }

    if (order.whatsappInstanceId) {
        return "WhatsApp";
    }

    return "Manual";
}

function buildActivityData(
    orders: ActivityOrder[],
    now: Date,
): DashboardActivityPoint[] {
    const bucketCount = 12;
    const bucketSizeMs = 2 * 60 * 60 * 1000;
    const start = new Date(now.getTime() - bucketCount * bucketSizeMs);
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
        const bucketStart = new Date(start.getTime() + index * bucketSizeMs);

        return {
            label: `${clockFormatter.format(bucketStart).slice(0, 2)}h`,
            orders: 0,
            salesCents: 0,
        };
    });

    for (const order of orders) {
        const bucketIndex = Math.floor(
            (order.createdAt.getTime() - start.getTime()) / bucketSizeMs,
        );

        if (bucketIndex >= 0 && bucketIndex < bucketCount) {
            buckets[bucketIndex].orders += 1;
            buckets[bucketIndex].salesCents += order.totalCents;
        }
    }

    return buckets;
}

function buildChannelData(orders: ChannelOrder[]) {
    const totals: Record<ChannelKey, number> = {
        WhatsApp: 0,
        Tray: 0,
        Nuvemshop: 0,
        Manual: 0,
    };

    for (const order of orders) {
        totals[getOrderChannel(order)] += 1;
    }

    const totalOrders = Object.values(totals).reduce(
        (sum, value) => sum + value,
        0,
    );

    const rows = (Object.keys(channelMeta) as ChannelKey[]).map((key) => ({
        key,
        ...channelMeta[key],
        value: totals[key],
        percentage:
            totalOrders > 0 ? Math.round((totals[key] / totalOrders) * 100) : 0,
    }));

    const chartData: DashboardChannelPoint[] = rows.map((row) => ({
        name: row.label,
        value: row.value,
        color: row.color,
    }));

    return { rows, chartData, totalOrders };
}

function getAveragePreparationMinutes(
    deliveries: Array<{
        pickedUpAt: Date | null;
        order: {
            createdAt: Date;
        };
    }>,
) {
    const durations = deliveries
        .map((delivery) => {
            if (!delivery.pickedUpAt) {
                return null;
            }

            return Math.max(
                1,
                Math.round(
                    (delivery.pickedUpAt.getTime() -
                        delivery.order.createdAt.getTime()) /
                        60000,
                ),
            );
        })
        .filter((duration): duration is number => duration !== null);

    if (durations.length === 0) {
        return null;
    }

    return Math.round(
        durations.reduce((sum, duration) => sum + duration, 0) /
            durations.length,
    );
}

function StatusBadge({ status }: { status: OperationalStatus }) {
    const meta = statusMeta[status];

    return (
        <Badge variant="outline" className={cn("font-semibold", meta.className)}>
            {meta.label}
        </Badge>
    );
}

function MetricCard({
    title,
    value,
    detail,
    icon: Icon,
    iconClassName,
}: {
    title: string;
    value: string;
    detail: string;
    icon: LucideIcon;
    iconClassName: string;
}) {
    return (
        <Card className="rounded-lg border-slate-200 bg-white py-0 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <CardContent className="flex items-start justify-between gap-4 px-5 py-5">
                <div className="min-w-0 space-y-3">
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <div className="space-y-1">
                        <p className="truncate text-2xl font-bold tracking-tight text-slate-950">
                            {value}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                            {detail}
                        </p>
                    </div>
                </div>
                <div className={cn("rounded-lg p-2.5", iconClassName)}>
                    <Icon className="h-5 w-5" />
                </div>
            </CardContent>
        </Card>
    );
}

export default async function UserDashboardPage() {
    const user = await requireStoreUser();
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
        todaySales,
        yesterdaySales,
        last24HourOrders,
        recentOrders,
        inRouteDeliveriesCount,
        activeRidersCount,
        pendingOrdersCount,
        waitingAssignmentCount,
        wallet,
        preparationDeliveries,
    ] = await Promise.all([
        prisma.order.aggregate({
            where: {
                ownerUserId: user.id,
                createdAt: {
                    gte: todayStart,
                    lt: tomorrowStart,
                },
            },
            _count: {
                id: true,
            },
            _sum: {
                totalCents: true,
            },
        }),
        prisma.order.aggregate({
            where: {
                ownerUserId: user.id,
                createdAt: {
                    gte: yesterdayStart,
                    lt: todayStart,
                },
            },
            _sum: {
                totalCents: true,
            },
        }),
        prisma.order.findMany({
            where: {
                ownerUserId: user.id,
                createdAt: {
                    gte: last24Hours,
                },
            },
            select: {
                createdAt: true,
                totalCents: true,
                whatsappInstanceId: true,
                whatsappInstance: {
                    select: {
                        instanceName: true,
                    },
                },
            },
        }),
        prisma.order.findMany({
            where: {
                ownerUserId: user.id,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 8,
            select: {
                id: true,
                customerName: true,
                customerWhatsappId: true,
                status: true,
                totalCents: true,
                currency: true,
                createdAt: true,
                whatsappInstanceId: true,
                whatsappInstance: {
                    select: {
                        instanceName: true,
                    },
                },
                delivery: {
                    select: {
                        status: true,
                    },
                },
            },
        }),
        prisma.delivery.count({
            where: {
                ownerUserId: user.id,
                status: {
                    in: inRouteDeliveryStatuses,
                },
            },
        }),
        prisma.rider.count({
            where: {
                ownerUserId: user.id,
                status: RiderStatus.ACTIVE,
                availabilityStatus: {
                    in: [
                        RiderAvailabilityStatus.AVAILABLE,
                        RiderAvailabilityStatus.BUSY,
                    ],
                },
            },
        }),
        prisma.order.count({
            where: {
                ownerUserId: user.id,
                status: {
                    in: [OrderStatus.PENDING, OrderStatus.PREPARING],
                },
            },
        }),
        prisma.delivery.count({
            where: {
                ownerUserId: user.id,
                status: {
                    in: [
                        DeliveryStatus.WAITING_RIDER,
                        DeliveryStatus.PENDING_ASSIGNMENT,
                        DeliveryStatus.ASSIGNED,
                    ],
                },
            },
        }),
        prisma.wallet.findUnique({
            where: {
                userId: user.id,
            },
            select: {
                balanceCents: true,
                frozenBalanceCents: true,
                currency: true,
            },
        }),
        prisma.delivery.findMany({
            where: {
                ownerUserId: user.id,
                pickedUpAt: {
                    not: null,
                    gte: todayStart,
                },
            },
            select: {
                pickedUpAt: true,
                order: {
                    select: {
                        createdAt: true,
                    },
                },
            },
            take: 50,
        }),
    ]);

    const todaySalesCents = todaySales._sum.totalCents ?? 0;
    const yesterdaySalesCents = yesterdaySales._sum.totalCents ?? 0;
    const salesGrowth = getPercentChange(todaySalesCents, yesterdaySalesCents);
    const activityData = buildActivityData(last24HourOrders, now);
    const channelData = buildChannelData(last24HourOrders);
    const averagePreparationMinutes =
        getAveragePreparationMinutes(preparationDeliveries) ?? 18;
    const isPreparationMocked = preparationDeliveries.length === 0;
    const walletBalanceCents = wallet?.balanceCents ?? 0;
    const frozenBalanceCents = wallet?.frozenBalanceCents ?? 0;
    const healthIsStable =
        activeRidersCount > 0 || pendingOrdersCount + waitingAssignmentCount === 0;
    const healthLabel = healthIsStable ? "Operacao estavel" : "Precisa de cobertura";
    const healthClassName = healthIsStable
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <Badge
                        variant="outline"
                        className="border-slate-200 bg-white text-slate-600"
                    >
                        Control Center
                    </Badge>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                            Operacao em tempo real
                        </h1>
                        <p className="text-sm text-slate-500 md:text-base">
                            {user.name || user.email || "Loja Floovi"} ·{" "}
                            {clockFormatter.format(now)}
                        </p>
                    </div>
                </div>
                <Link
                    href="/dashboard/orders"
                    className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                    Abrir pedidos
                    <ArrowUpRight className="h-4 w-4" />
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    title="Total de vendas hoje"
                    value={formatMoney(todaySalesCents)}
                    detail={`${formatPercentChange(salesGrowth)} face a ontem`}
                    icon={CircleDollarSign}
                    iconClassName="bg-emerald-50 text-emerald-700"
                />
                <MetricCard
                    title="Entregas em rota"
                    value={compactNumberFormatter.format(inRouteDeliveriesCount)}
                    detail={`${pendingOrdersCount} pedidos na fila`}
                    icon={Bike}
                    iconClassName="bg-sky-50 text-sky-700"
                />
                <MetricCard
                    title="Tempo medio de preparo"
                    value={`${averagePreparationMinutes} min`}
                    detail={isPreparationMocked ? "estimativa operacional" : "media de hoje"}
                    icon={Clock3}
                    iconClassName="bg-orange-50 text-orange-700"
                />
                <MetricCard
                    title="Saldo na carteira"
                    value={formatMoney(walletBalanceCents, wallet?.currency ?? "BRL")}
                    detail={`${formatMoney(frozenBalanceCents, wallet?.currency ?? "BRL")} reservado`}
                    icon={WalletCards}
                    iconClassName="bg-indigo-50 text-indigo-700"
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.9fr)]">
                <div className="space-y-5">
                    <Card className="rounded-lg border-slate-200 bg-white py-0 shadow-sm">
                        <CardHeader className="gap-1 px-5 pb-2">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <Activity className="h-4 w-4 text-sky-600" />
                                        Atividade
                                    </CardDescription>
                                    <CardTitle className="mt-2 text-lg text-slate-950">
                                        Pedidos e vendas nas ultimas 24h
                                    </CardTitle>
                                </div>
                                <Badge
                                    variant="outline"
                                    className="border-slate-200 bg-slate-50 text-slate-600"
                                >
                                    {todaySales._count.id} hoje
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-5">
                            <DashboardActivityChart data={activityData} />
                        </CardContent>
                    </Card>

                    <Card className="rounded-lg border-slate-200 bg-white py-0 shadow-sm">
                        <CardHeader className="gap-1 px-5 pb-0">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <PackageCheck className="h-4 w-4 text-emerald-600" />
                                        Pedidos recentes
                                    </CardDescription>
                                    <CardTitle className="mt-2 text-lg text-slate-950">
                                        Fila operacional
                                    </CardTitle>
                                </div>
                                <Link
                                    href="/dashboard/orders"
                                    className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
                                >
                                    Ver todos
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="px-3 text-xs uppercase tracking-wide text-slate-400">
                                            ID
                                        </TableHead>
                                        <TableHead className="px-3 text-xs uppercase tracking-wide text-slate-400">
                                            Cliente
                                        </TableHead>
                                        <TableHead className="px-3 text-xs uppercase tracking-wide text-slate-400">
                                            Status
                                        </TableHead>
                                        <TableHead className="px-3 text-right text-xs uppercase tracking-wide text-slate-400">
                                            Valor
                                        </TableHead>
                                        <TableHead className="px-3 text-right text-xs uppercase tracking-wide text-slate-400">
                                            Hora
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentOrders.map((order) => {
                                        const source = channelMeta[getOrderChannel(order)];
                                        const SourceIcon = source.icon;
                                        const operationalStatus =
                                            getOperationalStatus(order);

                                        return (
                                            <TableRow
                                                key={order.id}
                                                className="group border-slate-100 hover:bg-slate-50"
                                            >
                                                <TableCell className="px-3 py-3">
                                                    <Link
                                                        href="/dashboard/orders"
                                                        className="inline-flex items-center gap-2 font-semibold text-slate-900"
                                                    >
                                                        <span
                                                            className={cn(
                                                                "inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1",
                                                                source.className,
                                                            )}
                                                        >
                                                            <SourceIcon className="h-4 w-4" />
                                                        </span>
                                                        #{order.id.slice(-6).toUpperCase()}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="px-3 py-3">
                                                    <div className="max-w-[220px] truncate font-medium text-slate-700">
                                                        {order.customerName ||
                                                            order.customerWhatsappId ||
                                                            "Cliente"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-3 py-3">
                                                    <StatusBadge
                                                        status={operationalStatus}
                                                    />
                                                </TableCell>
                                                <TableCell className="px-3 py-3 text-right font-semibold text-slate-900">
                                                    {formatMoney(
                                                        order.totalCents,
                                                        order.currency,
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-3 py-3 text-right text-slate-500">
                                                    {clockFormatter.format(
                                                        order.createdAt,
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {recentOrders.length === 0 && (
                                        <TableRow className="hover:bg-transparent">
                                            <TableCell
                                                colSpan={5}
                                                className="px-3 py-8 text-center text-sm text-slate-500"
                                            >
                                                Nenhum pedido recente.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-5">
                    <Card className="rounded-lg border-slate-200 bg-white py-0 shadow-sm">
                        <CardHeader className="gap-1 px-5 pb-1">
                            <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <Gauge className="h-4 w-4 text-indigo-600" />
                                Hub omnichannel
                            </CardDescription>
                            <CardTitle className="text-lg text-slate-950">
                                Distribuicao por canal
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 px-5 pb-5">
                            <DashboardChannelChart data={channelData.chartData} />
                            <div className="space-y-3">
                                {channelData.rows.map((channel) => {
                                    const ChannelIcon = channel.icon;

                                    return (
                                        <div
                                            key={channel.key}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 transition hover:border-slate-200 hover:bg-slate-50"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span
                                                    className={cn(
                                                        "inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1",
                                                        channel.className,
                                                    )}
                                                >
                                                    <ChannelIcon className="h-4 w-4" />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-slate-800">
                                                        {channel.label}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {channel.percentage}% do volume
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900">
                                                {channel.value}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-lg border-slate-200 bg-white py-0 shadow-sm">
                        <CardHeader className="gap-1 px-5 pb-1">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <RadioTower className="h-4 w-4 text-emerald-600" />
                                        Saude da operacao
                                    </CardDescription>
                                    <CardTitle className="mt-2 text-lg text-slate-950">
                                        Sistema
                                    </CardTitle>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn("font-semibold", healthClassName)}
                                >
                                    {healthLabel}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 px-5 pb-5">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                    <p className="text-xs font-medium text-slate-500">
                                        Estafetas ativos
                                    </p>
                                    <p className="mt-2 text-2xl font-bold text-slate-950">
                                        {activeRidersCount}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                    <p className="text-xs font-medium text-slate-500">
                                        Pendentes
                                    </p>
                                    <p className="mt-2 text-2xl font-bold text-slate-950">
                                        {pendingOrdersCount}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                                    <span className="text-sm font-medium text-slate-600">
                                        Aguardando atribuicao
                                    </span>
                                    <span className="font-bold text-slate-900">
                                        {waitingAssignmentCount}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                                    <span className="text-sm font-medium text-slate-600">
                                        Pedidos 24h
                                    </span>
                                    <span className="font-bold text-slate-900">
                                        {channelData.totalOrders}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                                    <span className="text-sm font-medium text-slate-600">
                                        Carteira reservada
                                    </span>
                                    <span className="font-bold text-slate-900">
                                        {formatMoney(
                                            frozenBalanceCents,
                                            wallet?.currency ?? "BRL",
                                        )}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
