import type {
    DeliveryRider,
    StoreDelivery,
} from "@/features/delivery/services/delivery-types";
import type {
    OrderPaymentFilter,
    OrderSlaLevel,
    OrderStatus,
    OrderStatusFilter,
    OrderTimeFilter,
    StoreOrder,
} from "./order-types";

export const SLA_WARNING_MINUTES = 20;
export const SLA_CRITICAL_MINUTES = 35;

export type OrderFilters = {
    query: string;
    status: OrderStatusFilter;
    payment: OrderPaymentFilter;
    time: OrderTimeFilter;
};

export type OrderMetricSummary = {
    todaySalesCents: number;
    todayOrdersCount: number;
    averageTicketCents: number;
    averageDeliveryMinutes: number | null;
    preparingLateCount: number;
};

export type RiderMapMarker = {
    id: string;
    name: string;
    vehiclePlate: string | null;
    availabilityStatus: string;
    latitude: number | null;
    longitude: number | null;
    accuracyMeters: number | null;
    locationStatus: string | null;
    lastLocationAt: string | null;
    activeDeliveryId: string | null;
};

export function formatMoney(valueCents: number, currency = "BRL") {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency,
    }).format(valueCents / 100);
}

export function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

export function formatClock(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export function formatDuration(minutes: number) {
    if (minutes < 60) {
        return `${Math.max(1, Math.round(minutes))} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);

    if (remainingMinutes === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}min`;
}

export function getCustomerLabel(order: StoreOrder) {
    return order.customerName || order.customerWhatsappId || "Cliente";
}

export function getShortId(id: string) {
    return id.slice(-6).toUpperCase();
}

export function getPaymentMethodLabel(paymentMethod?: string | null) {
    switch (paymentMethod) {
        case "PIX_ONLINE":
            return "Pix online";
        case "PIX_DELIVERY":
            return "Pix entrega";
        case "CARD_DELIVERY":
            return "Cartao";
        case "CASH":
            return "Dinheiro";
        default:
            return "Nao informado";
    }
}

export function getOrderStatusLabel(status: OrderStatus) {
    switch (status) {
        case "PENDING":
            return "Pendente";
        case "PREPARING":
            return "Preparando";
        case "SHIPPED":
            return "Em rota";
        case "DELIVERED":
            return "Entregue";
        default:
            return status;
    }
}

export function sortOrders(orders: StoreOrder[]) {
    const statusPriority: Record<OrderStatus, number> = {
        PENDING: 0,
        PREPARING: 1,
        SHIPPED: 2,
        DELIVERED: 3,
    };

    return [...orders].sort((left, right) => {
        const leftPriority = statusPriority[left.status] ?? 99;
        const rightPriority = statusPriority[right.status] ?? 99;

        if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
        }

        return (
            new Date(right.updatedAt).getTime() -
            new Date(left.updatedAt).getTime()
        );
    });
}

export function getDeliveryForOrder(
    deliveriesByOrderId: Map<string, StoreDelivery>,
    orderId: string,
) {
    return deliveriesByOrderId.get(orderId) ?? null;
}

export function getOrderItemSummary(order: StoreOrder) {
    const itemCount = order.items.reduce(
        (total, item) => total + item.quantity,
        0,
    );
    const sampleItems = order.items
        .slice(0, 2)
        .map((item) => item.title)
        .join(", ");
    const suffix = order.items.length > 2 ? "..." : "";

    return `${itemCount} ${itemCount === 1 ? "item" : "itens"}${
        sampleItems ? ` (${sampleItems}${suffix})` : ""
    }`;
}

export function getPreparingAgeMinutes(order: StoreOrder, now: Date) {
    if (order.status !== "PREPARING") {
        return 0;
    }

    const startedAt = new Date(order.updatedAt || order.createdAt).getTime();
    return Math.max(0, (now.getTime() - startedAt) / 60000);
}

export function getOrderSlaLevel(
    order: StoreOrder,
    now: Date,
): OrderSlaLevel {
    const ageMinutes = getPreparingAgeMinutes(order, now);

    if (ageMinutes >= SLA_CRITICAL_MINUTES) {
        return "critical";
    }

    if (ageMinutes >= SLA_WARNING_MINUTES) {
        return "warning";
    }

    return "normal";
}

export function matchesOrderFilters(
    order: StoreOrder,
    delivery: StoreDelivery | null,
    filters: OrderFilters,
    now: Date,
) {
    if (filters.status !== "ALL" && order.status !== filters.status) {
        return false;
    }

    if (filters.payment !== "ALL" && order.paymentMethod !== filters.payment) {
        return false;
    }

    if (!matchesTimeFilter(order, filters.time, now)) {
        return false;
    }

    const normalizedQuery = filters.query.trim().toLowerCase();

    if (!normalizedQuery) {
        return true;
    }

    const searchable = [
        order.id,
        order.customerName,
        order.customerWhatsappId,
        order.deliveryAddress,
        order.notes,
        order.whatsappInstanceName,
        order.items.map((item) => item.title).join(" "),
        delivery?.id,
        delivery?.rider?.displayName,
        delivery?.rider?.vehiclePlate,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    return searchable.includes(normalizedQuery);
}

export function buildOrdersByStatus(orders: StoreOrder[]) {
    return orders.reduce<Record<OrderStatus, StoreOrder[]>>(
        (groups, order) => {
            groups[order.status].push(order);
            return groups;
        },
        {
            PENDING: [],
            PREPARING: [],
            SHIPPED: [],
            DELIVERED: [],
        },
    );
}

export function buildOrderMetrics(
    orders: StoreOrder[],
    deliveries: StoreDelivery[],
    now: Date,
): OrderMetricSummary {
    const todayOrders = orders.filter((order) => isToday(order.createdAt, now));
    const todaySalesCents = todayOrders.reduce(
        (total, order) => total + order.totalCents,
        0,
    );
    const averageTicketCents =
        todayOrders.length > 0
            ? Math.round(todaySalesCents / todayOrders.length)
            : 0;
    const deliveredDurations = deliveries
        .map((delivery) => {
            if (!delivery.deliveredAt) {
                return null;
            }

            const start = new Date(
                delivery.pickedUpAt || delivery.createdAt,
            ).getTime();
            const end = new Date(delivery.deliveredAt).getTime();

            if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
                return null;
            }

            return (end - start) / 60000;
        })
        .filter((duration): duration is number => typeof duration === "number");
    const averageDeliveryMinutes =
        deliveredDurations.length > 0
            ? Math.round(
                  deliveredDurations.reduce(
                      (total, duration) => total + duration,
                      0,
                  ) / deliveredDurations.length,
              )
            : null;
    const preparingLateCount = orders.filter(
        (order) => getOrderSlaLevel(order, now) !== "normal",
    ).length;

    return {
        todaySalesCents,
        todayOrdersCount: todayOrders.length,
        averageTicketCents,
        averageDeliveryMinutes,
        preparingLateCount,
    };
}

export function buildDeliveryMap(
    deliveries: StoreDelivery[],
): Map<string, StoreDelivery> {
    return new Map(deliveries.map((delivery) => [delivery.orderId, delivery]));
}

export function buildRiderMarkers(
    deliveries: StoreDelivery[],
    availableRiders: DeliveryRider[],
): RiderMapMarker[] {
    const markers = new Map<string, RiderMapMarker>();

    for (const rider of availableRiders) {
        markers.set(rider.id, buildRiderMarker(rider, null));
    }

    for (const delivery of deliveries) {
        if (!delivery.rider) {
            continue;
        }

        const isActive =
            delivery.status !== "DELIVERED" && delivery.status !== "CANCELED";
        const existing = markers.get(delivery.rider.id);

        markers.set(delivery.rider.id, {
            ...(existing ?? buildRiderMarker(delivery.rider, null)),
            availabilityStatus: isActive
                ? "BUSY"
                : delivery.rider.availabilityStatus,
            activeDeliveryId: isActive
                ? delivery.id
                : (existing?.activeDeliveryId ?? null),
        });
    }

    return [...markers.values()].sort((left, right) =>
        left.name.localeCompare(right.name),
    );
}

function buildRiderMarker(
    rider: DeliveryRider,
    activeDeliveryId: string | null,
): RiderMapMarker {
    const latitude = rider.location?.latitude ?? rider.currentLatitude;
    const longitude = rider.location?.longitude ?? rider.currentLongitude;
    const lastLocationAt =
        rider.location?.updatedAt ??
        rider.location?.recordedAt ??
        rider.lastLocationAt;

    return {
        id: rider.id,
        name: rider.displayName || "Entregador",
        vehiclePlate: rider.vehiclePlate,
        availabilityStatus: rider.availabilityStatus,
        latitude,
        longitude,
        accuracyMeters: rider.location?.accuracyMeters ?? null,
        locationStatus: rider.location?.status ?? null,
        lastLocationAt,
        activeDeliveryId,
    };
}

function matchesTimeFilter(
    order: StoreOrder,
    timeFilter: OrderTimeFilter,
    now: Date,
) {
    if (timeFilter === "ALL") {
        return true;
    }

    const createdAt = new Date(order.createdAt);

    if (timeFilter === "TODAY") {
        return isToday(order.createdAt, now);
    }

    const hours = timeFilter === "LAST_2H" ? 2 : 6;
    return now.getTime() - createdAt.getTime() <= hours * 60 * 60 * 1000;
}

function isToday(value: string, now: Date) {
    const date = new Date(value);

    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
    );
}
