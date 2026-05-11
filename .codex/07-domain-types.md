# 07 - Tipos De Dominio Para O Front

Use este arquivo como base para tipos compartilhados. Ao gerar SDK, valide contra
Swagger e DTOs.

## Enums

```ts
export type UserRole =
  | "SUPER_ADMIN"
  | "CUSTOMER"
  | "MERCHANT"
  | "RIDER"
  | "ADMIN";

export type UserAccessStatus = "ACTIVE" | "BANNED";

export type PlanType = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
export type SubscriptionStatus = "ACTIVE" | "CANCELED" | "PAST_DUE";
export type TransactionStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELED"
  | "REFUNDED";

export type BusinessProfile = "GROCERY" | "RESTAURANT" | "SNACK_BAR" | "EVENT";

export type PaymentMethod =
  | "PIX_ONLINE"
  | "PIX_DELIVERY"
  | "CARD_DELIVERY"
  | "CASH";

export type DeliveryType = "DELIVERY" | "PICKUP";

export type OrderStatus = "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED";

export type OrderSource =
  | "FLOOVI_WHATSAPP"
  | "TRAY"
  | "NUVEMSHOP"
  | "UAPPI"
  | "OLIST";

export type RiderStatus =
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED";

export type RiderAvailabilityStatus = "OFFLINE" | "AVAILABLE" | "BUSY";
export type RiderPresenceStatus = "OFFLINE" | "ONLINE" | "BUSY";

export type RiderVehicleType = "MOTORCYCLE" | "BICYCLE" | "CAR" | "OTHER";

export type DeliveryStatus =
  | "WAITING_RIDER"
  | "READY_FOR_PICKUP"
  | "INCIDENT_REPORTED"
  | "DELIVERY_STAGNATED"
  | "ARRIVED_AT_DESTINATION"
  | "ABSENT_WAITING"
  | "RETURNING_TO_MERCHANT"
  | "PENDING_ASSIGNMENT"
  | "ASSIGNED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELED";

export type DeliveryPaymentHandledBy = "RIDER" | "STORE_MACHINE";
export type DeliveryAssignmentType = "MARKETPLACE" | "STORE_OWNED" | "MANUAL";

export type WalletTransactionType = "CREDIT" | "DEBIT";
export type WalletTransactionCategory =
  | "DELIVERY_PAYOUT"
  | "DELIVERY_ESCROW"
  | "WITHDRAWAL"
  | "REFUND";
export type WalletTransactionStatus = "COMPLETED" | "PENDING" | "FAILED";
```

## Money E Datas

```ts
export type MoneyCents = number;
export type IsoDateString = string;

export function formatMoney(valueCents: MoneyCents, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(valueCents / 100);
}
```

## Auth

```ts
export type AuthUser = {
  id: string;
  email?: string | null;
  role: UserRole;
  accessStatus: UserAccessStatus;
  merchantId?: string | null;
  riderId?: string | null;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
  refreshExpiresAt: IsoDateString;
  user: AuthUser;
};
```

## Orders

```ts
export type OrderDashboardItem = {
  id: string;
  productId: string | null;
  title: string;
  category: string | null;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
};

export type OrderDashboardCard = {
  id: string;
  ownerUserId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  whatsappInstanceId: string | null;
  whatsappInstanceName: string | null;
  customerWhatsappId: string;
  customerName: string | null;
  status: OrderStatus;
  paymentMethod?: PaymentMethod | null;
  paymentStatus?: string | null;
  deliveryType?: DeliveryType | null;
  deliveryFeeCents: number;
  totalCents: number;
  currency: string;
  deliveryAddress: string;
  notes: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  items: OrderDashboardItem[];
};

export type OrderHeatmapPoint = {
  lat: number;
  lng: number;
  weight: number;
};
```

## Delivery

```ts
export type RiderLocationSnapshot = {
  riderId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  recordedAt: IsoDateString | null;
  status: RiderPresenceStatus;
  updatedAt: IsoDateString;
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
  status: RiderStatus;
  availabilityStatus: RiderAvailabilityStatus;
  isStoreOwned: boolean;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  lastLocationAt?: IsoDateString | null;
  incidentBlockedUntil?: IsoDateString | null;
  location?: RiderLocationSnapshot | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
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
  isHighPriority: boolean;
  deliveryBonusApplied: boolean;
  bonusValueCents: number;
  currency: string;
  pickupAddress: string | null;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  destinationAddress: string;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  acceptedAt: IsoDateString | null;
  pickedUpAt: IsoDateString | null;
  absentClientAt: IsoDateString | null;
  deliveredAt: IsoDateString | null;
  canceledAt: IsoDateString | null;
  cancellationReason: string | null;
  riderSearchStartedAt: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  rider?: DeliveryRider | null;
  order?: Partial<OrderDashboardCard> | null;
};
```

## Wallet

```ts
export type RiderWallet = {
  id: string;
  userId: string;
  balanceCents: number;
  frozenBalanceCents: number;
  currency: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type WalletTransaction = {
  id: string;
  walletId: string;
  userId: string;
  type: WalletTransactionType;
  category: WalletTransactionCategory;
  status: WalletTransactionStatus;
  amountCents: number;
  currency: string;
  balanceBeforeCents: number;
  balanceAfterCents: number;
  frozenBalanceBeforeCents: number;
  frozenBalanceAfterCents: number;
  sourceModule: string | null;
  sourceEvent: string | null;
  sourceReferenceId: string | null;
  idempotencyKey: string | null;
  description: string | null;
  metadata: unknown;
  processedAt: IsoDateString | null;
  failedAt: IsoDateString | null;
  failureReason: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type WalletStatement = {
  items: WalletTransaction[];
  filters: {
    dateFrom?: string;
    dateTo?: string;
    type?: WalletTransactionType;
    category?: WalletTransactionCategory;
    status?: WalletTransactionStatus;
    take?: number;
  };
};
```

## Labels Recomendados

```ts
export const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  WAITING_RIDER: "Aguardando motoboy",
  READY_FOR_PICKUP: "Pronta para coleta",
  INCIDENT_REPORTED: "Ocorrencia",
  DELIVERY_STAGNATED: "Sem motoboy",
  ARRIVED_AT_DESTINATION: "No destino",
  ABSENT_WAITING: "Cliente ausente",
  RETURNING_TO_MERCHANT: "Retornando",
  PENDING_ASSIGNMENT: "Pendente",
  ASSIGNED: "Atribuida",
  ACCEPTED: "Aceita",
  PICKED_UP: "Coletada",
  IN_TRANSIT: "Em rota",
  DELIVERED: "Entregue",
  CANCELED: "Cancelada",
};
```

