import { fetchNestApiJson } from "@/lib/nest-api";
import type {
    OrderHeatmapPoint,
    OrderStatus,
    StoreOrder,
} from "./order-types";

export type OrderHeatmapQuery = {
    from?: string;
    to?: string;
    gridSizeMeters?: number;
};

function buildTenantHeaders(userId: string): HeadersInit {
    return {
        "x-user-id": userId,
    };
}

export async function listStoreOrders(userId: string): Promise<StoreOrder[]> {
    const payload = await fetchNestApiJson<{ orders: StoreOrder[] }>(
        "/delivery/orders/dashboard",
        {
            headers: buildTenantHeaders(userId),
        },
    );

    return payload.orders;
}

export async function listStoreOrderHeatmap(
    userId: string,
    query: OrderHeatmapQuery = {},
): Promise<OrderHeatmapPoint[]> {
    const searchParams = new URLSearchParams();

    if (query.from) {
        searchParams.set("from", query.from);
    }

    if (query.to) {
        searchParams.set("to", query.to);
    }

    if (typeof query.gridSizeMeters === "number") {
        searchParams.set("gridSizeMeters", String(query.gridSizeMeters));
    }

    const queryString = searchParams.toString();

    return fetchNestApiJson<OrderHeatmapPoint[]>(
        `/delivery/orders/heatmap${queryString ? `?${queryString}` : ""}`,
        {
            headers: buildTenantHeaders(userId),
        },
    );
}

export async function sendDeliveryOrderToDelivery(
    orderId: string,
    userId: string,
): Promise<StoreOrder> {
    return fetchNestApiJson<StoreOrder>(
        `/delivery/orders/${orderId}/send-to-delivery`,
        {
            method: "POST",
            headers: buildTenantHeaders(userId),
        },
    );
}

export async function updateOrderStatus(
    orderId: string,
    userId: string,
    payload: {
        status: OrderStatus;
        notifyCustomer?: boolean;
        paymentHandledBy?: "RIDER" | "STORE_MACHINE";
    },
): Promise<StoreOrder> {
    return fetchNestApiJson<StoreOrder>(`/delivery/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
            ...buildTenantHeaders(userId),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
}
