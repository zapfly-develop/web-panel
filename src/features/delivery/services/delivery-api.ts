import { fetchNestApiJson } from "@/lib/nest-api";
import type {
    DeliveryRider,
    DeliveryStatus,
    DeliveryStatusFilter,
    RiderAvailabilityStatus,
    RiderLocationPayload,
    StoreAddress,
    StoreAddressPayload,
    StoreDelivery,
} from "./delivery-types";

function buildTenantHeaders(userId: string): HeadersInit {
    return {
        "x-user-id": userId,
    };
}

function buildJsonTenantHeaders(userId: string): HeadersInit {
    return {
        ...buildTenantHeaders(userId),
        "Content-Type": "application/json",
    };
}

function buildDeliveryStatusQuery(status?: DeliveryStatusFilter): string {
    if (!status || status === "ALL") {
        return "";
    }

    return `?status=${encodeURIComponent(status)}`;
}

export async function listStoreDeliveries(
    userId: string,
    status?: DeliveryStatusFilter,
): Promise<StoreDelivery[]> {
    return fetchNestApiJson<StoreDelivery[]>(
        `/delivery/deliveries${buildDeliveryStatusQuery(status)}`,
        {
            headers: buildTenantHeaders(userId),
        },
    );
}

export async function getStoreDeliveryById(
    userId: string,
    deliveryId: string,
): Promise<StoreDelivery> {
    return fetchNestApiJson<StoreDelivery>(`/delivery/deliveries/${deliveryId}`, {
        headers: buildTenantHeaders(userId),
    });
}

export async function createStoreDelivery(
    userId: string,
    orderId: string,
): Promise<StoreDelivery> {
    return fetchNestApiJson<StoreDelivery>("/delivery/deliveries", {
        method: "POST",
        headers: buildJsonTenantHeaders(userId),
        body: JSON.stringify({ orderId }),
    });
}

export async function listAvailableDeliveryRiders(
    userId: string,
): Promise<DeliveryRider[]> {
    return fetchNestApiJson<DeliveryRider[]>("/delivery/riders/available", {
        headers: buildTenantHeaders(userId),
    });
}

export async function updateStoreAddress(
    userId: string,
    payload: StoreAddressPayload,
): Promise<StoreAddress> {
    return fetchNestApiJson<StoreAddress>("/delivery/store-address", {
        method: "PUT",
        headers: buildJsonTenantHeaders(userId),
        body: JSON.stringify(payload),
    });
}

export async function assignDeliveryRider(
    userId: string,
    deliveryId: string,
    riderId: string,
): Promise<Partial<StoreDelivery> & { id: string; status: DeliveryStatus }> {
    return fetchNestApiJson<
        Partial<StoreDelivery> & { id: string; status: DeliveryStatus }
    >(`/delivery/deliveries/${deliveryId}/assign`, {
        method: "POST",
        headers: buildJsonTenantHeaders(userId),
        body: JSON.stringify({ riderId }),
    });
}

export async function getMyRiderProfile(userId: string): Promise<DeliveryRider> {
    return fetchNestApiJson<DeliveryRider>("/delivery/riders/me", {
        headers: buildTenantHeaders(userId),
    });
}

export async function getMyActiveDelivery(
    userId: string,
): Promise<StoreDelivery | null> {
    return fetchNestApiJson<StoreDelivery | null>(
        "/delivery/riders/me/active-delivery",
        {
            headers: buildTenantHeaders(userId),
        },
    );
}

export async function updateMyRiderAvailability(
    userId: string,
    availabilityStatus: RiderAvailabilityStatus | "ONLINE",
): Promise<DeliveryRider> {
    return fetchNestApiJson<DeliveryRider>("/delivery/riders/me/availability", {
        method: "PATCH",
        headers: buildJsonTenantHeaders(userId),
        body: JSON.stringify({ availabilityStatus }),
    });
}

export async function updateMyRiderLocation(
    userId: string,
    location: RiderLocationPayload,
): Promise<DeliveryRider> {
    return fetchNestApiJson<DeliveryRider>("/delivery/riders/me/location", {
        method: "POST",
        headers: buildJsonTenantHeaders(userId),
        body: JSON.stringify(location),
    });
}

export async function acceptMyDelivery(
    userId: string,
    deliveryId: string,
): Promise<Partial<StoreDelivery> & { id: string; status: DeliveryStatus }> {
    return fetchNestApiJson<
        Partial<StoreDelivery> & { id: string; status: DeliveryStatus }
    >(`/delivery/riders/me/deliveries/${deliveryId}/accept`, {
        method: "POST",
        headers: buildJsonTenantHeaders(userId),
        body: JSON.stringify({ acceptedAt: new Date().toISOString() }),
    });
}

export async function pickUpMyDelivery(
    userId: string,
    deliveryId: string,
): Promise<Partial<StoreDelivery> & { id: string; status: DeliveryStatus }> {
    return fetchNestApiJson<
        Partial<StoreDelivery> & { id: string; status: DeliveryStatus }
    >(`/delivery/riders/me/deliveries/${deliveryId}/pick-up`, {
        method: "POST",
        headers: buildTenantHeaders(userId),
    });
}

export async function completeMyDelivery(
    userId: string,
    deliveryId: string,
): Promise<Partial<StoreDelivery> & { id: string; status: DeliveryStatus }> {
    return fetchNestApiJson<
        Partial<StoreDelivery> & { id: string; status: DeliveryStatus }
    >(`/delivery/riders/me/deliveries/${deliveryId}/complete`, {
        method: "POST",
        headers: buildTenantHeaders(userId),
    });
}
