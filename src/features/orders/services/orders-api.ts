import { fetchNestApiJson } from "@/lib/nest-api";
import type { StoreOrder } from "./order-types";

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
