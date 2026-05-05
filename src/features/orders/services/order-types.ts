export const ORDER_FINALIZED_EVENT = "orders:finalized";
export const ORDER_UPDATED_EVENT = "orders:updated";

export const ORDER_FINALIZED_EVENT_NAMES = [
    ORDER_FINALIZED_EVENT,
    "order:finalized",
] as const;

export const ORDER_UPDATED_EVENT_NAMES = [
    ORDER_UPDATED_EVENT,
    "order:updated",
] as const;

export type OrderStatus = "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED";

export type OrderPaymentMethod =
    | "PIX_ONLINE"
    | "PIX_DELIVERY"
    | "CARD_DELIVERY"
    | "CASH"
    | string;

export type OrderDeliveryType = "DELIVERY" | "PICKUP" | string;

export type StoreOrderItem = {
    id: string;
    productId: string;
    title: string;
    category: string | null;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
};

export type StoreOrder = {
    id: string;
    ownerUserId: string | null;
    ownerName: string | null;
    ownerEmail: string | null;
    whatsappInstanceId: string | null;
    whatsappInstanceName: string | null;
    customerWhatsappId: string;
    customerName: string | null;
    status: OrderStatus;
    paymentMethod?: OrderPaymentMethod | null;
    paymentStatus?: string | null;
    deliveryType?: OrderDeliveryType | null;
    deliveryFeeCents: number;
    totalCents: number;
    currency: string;
    deliveryAddress: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    items: StoreOrderItem[];
};

export type OrderHeatmapPoint = {
    lat: number;
    lng: number;
    weight: number;
};

export type DeliveryOrderItem = StoreOrderItem;
export type DeliveryOrderCard = StoreOrder;

export type OrdersViewMode = "kanban" | "cards" | "table";

export type OrderStatusFilter = "ALL" | OrderStatus;

export type OrderPaymentFilter = "ALL" | OrderPaymentMethod;

export type OrderTimeFilter = "TODAY" | "LAST_2H" | "LAST_6H" | "ALL";

export type OrderSlaLevel = "normal" | "warning" | "critical";
