export type DeliveryStatus =
    | "WAITING_RIDER"
    | "READY_FOR_PICKUP"
    | "INCIDENT_REPORTED"
    | "DELIVERY_STAGNATED"
    | "PENDING_ASSIGNMENT"
    | "ASSIGNED"
    | "ACCEPTED"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "ARRIVED_AT_DESTINATION"
    | "ABSENT_WAITING"
    | "RETURNING_TO_MERCHANT"
    | "DELIVERED"
    | "CANCELED";

export type DeliveryStatusFilter = "ALL" | DeliveryStatus;

export type DeliveryAssignmentType = "MARKETPLACE" | "STORE_OWNED" | "MANUAL";

export type DeliveryPaymentHandledBy = "RIDER" | "STORE_MACHINE";

export type RiderAvailabilityStatus = "OFFLINE" | "AVAILABLE" | "BUSY";

export type RiderPresenceStatus = "OFFLINE" | "ONLINE" | "BUSY";

export type RiderRegistrationStatus =
    | "PENDING_REVIEW"
    | "ACTIVE"
    | "SUSPENDED"
    | "REJECTED";

export type RiderVehicleType = "MOTORCYCLE" | "BICYCLE" | "CAR" | "OTHER";

export type DeliveryPayoutStatus =
    | "PENDING"
    | "PROCESSING"
    | "PAID"
    | "FAILED"
    | "CANCELED";

export type DeliveryRiderLocation = {
    riderId: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
    recordedAt: string;
    status: RiderPresenceStatus;
    updatedAt: string;
};

export type DeliveryRider = {
    id: string;
    userId: string;
    ownerUserId: string | null;
    displayName: string | null;
    documentNumber: string | null;
    cnhNumber: string | null;
    vehicleType: RiderVehicleType;
    vehiclePlate: string | null;
    status: RiderRegistrationStatus;
    availabilityStatus: RiderAvailabilityStatus;
    isStoreOwned: boolean;
    currentLatitude: number | null;
    currentLongitude: number | null;
    lastLocationAt: string | null;
    incidentBlockedUntil: string | null;
    createdAt: string;
    updatedAt: string;
    distanceKm?: number;
    location?: DeliveryRiderLocation | null;
};

export type DeliveryOrderSummary = {
    id: string;
    ownerUserId: string | null;
    whatsappInstanceId: string | null;
    customerWhatsappId: string;
    customerName: string | null;
    status: "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED";
    paymentMethod: string | null;
    deliveryType: string | null;
    deliveryFeeCents: number;
    totalCents: number;
    currency: string;
    deliveryAddress: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
};

export type DeliveryPayoutSummary = {
    id: string;
    deliveryId: string;
    riderId: string;
    ownerUserId: string;
    amountCents: number;
    deliveryFeeCents: number;
    riderProfitCents: number;
    storeDebitCents: number;
    riderRetainedCents: number;
    settlementType: "STORE_DEBIT" | "RIDER_RETAINED" | "FLOOVI_SAFETY_FUND";
    currency: string;
    status: DeliveryPayoutStatus;
    processedAt: string | null;
    failureReason: string | null;
    createdAt: string;
    updatedAt: string;
};

export type DeliveryOwnerSummary = {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    storeAddress: string | null;
    deliveryFeeCents: number;
};

export type StoreAddressPayload = {
    postalCode: string;
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    city: string;
    state: string;
};

export type StoreAddress = {
    id: string;
    ownerUserId: string;
    street: string;
    number: string;
    neighborhood: string | null;
    complement: string | null;
    city: string;
    state: string;
    postalCode: string | null;
    country: string;
    formattedAddress: string;
    latitude: number;
    longitude: number;
    geocodedAt: string;
    createdAt: string;
    updatedAt: string;
};

export type StoreDelivery = {
    id: string;
    ownerUserId: string;
    orderId: string;
    riderId: string | null;
    status: DeliveryStatus;
    assignmentType: DeliveryAssignmentType;
    paymentHandledBy: DeliveryPaymentHandledBy;
    orderTotalCollectedByStore: boolean;
    distanceMeters: number | null;
    quotedPriceCents: number;
    riderPayoutCents: number;
    bonusValueCents: number;
    isHighPriority: boolean;
    currency: string;
    pickupAddress: string | null;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
    destinationAddress: string;
    destinationLatitude: number | null;
    destinationLongitude: number | null;
    deliveryBonusApplied: boolean;
    riderSearchStartedAt: string | null;
    acceptedAt: string | null;
    pickedUpAt: string | null;
    absentClientAt: string | null;
    deliveredAt: string | null;
    canceledAt: string | null;
    cancellationReason: string | null;
    createdAt: string;
    updatedAt: string;
    ownerUser?: DeliveryOwnerSummary | null;
    rider: DeliveryRider | null;
    payout: DeliveryPayoutSummary | null;
    order: DeliveryOrderSummary;
};

export type RiderLocationPayload = {
    deliveryId?: string;
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
    recordedAt?: string;
};

export const DELIVERY_AVAILABLE_EVENT = "delivery:available";
export const DELIVERY_ASSIGNED_EVENT = "delivery:assigned";
export const DELIVERY_STATUS_CHANGED_EVENT = "delivery:status_changed";
export const DELIVERY_CUSTOMER_RESPONDED_EVENT = "delivery:customer_responded";
export const DELIVERY_RIDER_STALLED_WARNING_EVENT = "delivery:rider_stalled_warning";
export const DELIVERY_RIDER_STALLED_UNASSIGNED_EVENT = "delivery:rider_stalled_unassigned";
export const RIDER_NEW_AVAILABLE_DELIVERY_EVENT =
    DELIVERY_AVAILABLE_EVENT;
export const RIDER_STATUS_CHANGED_EVENT = "rider:status_changed";

export type DeliveryAssignedEvent = {
    deliveryId: string;
    orderId: string;
    storeId: string;
    riderId: string;
    timestamp: string;
};

export type DeliveryStatusChangedEvent = {
    deliveryId: string;
    orderId: string;
    storeId: string;
    riderId: string | null;
    customerUserId?: string | null;
    customerWhatsappId?: string | null;
    previousStatus: DeliveryStatus | null;
    status: DeliveryStatus;
    timestamp: string;
};

export type RiderNewAvailableDeliveryEvent = {
    deliveryId: string;
    orderId: string;
    storeId: string;
    riderUserIds?: string[];
    pickupLatitude?: number | null;
    pickupLongitude?: number | null;
    quotedPriceCents?: number;
    riderPayoutCents?: number;
    bonusValueCents?: number;
    isHighPriority?: boolean;
    priorityLabel?: string;
    radiusKm?: number;
    limit?: number;
    timestamp: string;
};

export type RiderStatusChangedEvent = {
    riderId: string;
    status: RiderPresenceStatus;
    timestamp: string;
};

export type DeliveryCustomerRespondedEvent = {
    deliveryId: string;
    orderId: string;
    storeId: string;
    riderId: string;
    customerWhatsappId: string;
    message: string;
    customerMessagePreview?: string;
    timestamp: string;
};

export type DeliveryRiderStalledWarningEvent = {
    deliveryId: string;
    orderId: string;
    storeId: string;
    riderId: string;
    distanceMeters: number;
    elapsedMinutes: number;
    thresholdMeters: number;
    warningMinutes: number;
    timestamp: string;
};

export type DeliveryRiderStalledUnassignedEvent = {
    deliveryId: string;
    orderId: string;
    storeId: string;
    riderId: string;
    previousStatus: DeliveryStatus;
    status: DeliveryStatus;
    distanceMeters: number;
    elapsedMinutes: number;
    thresholdMeters: number;
    unassignMinutes: number;
    riderCooldownMinutes?: number;
    riderBlockedUntil?: string;
    timestamp: string;
};

export type DeliveryRealtimeEvent =
    | DeliveryAssignedEvent
    | DeliveryStatusChangedEvent
    | RiderNewAvailableDeliveryEvent
    | RiderStatusChangedEvent
    | DeliveryCustomerRespondedEvent
    | DeliveryRiderStalledWarningEvent
    | DeliveryRiderStalledUnassignedEvent;
