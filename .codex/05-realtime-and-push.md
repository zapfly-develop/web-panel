# 05 - Realtime E Push

## Socket.IO - Como Conectar

Todos os namespaces atuais usam auth leve por `userId`.

```ts
import { io } from "socket.io-client";

const socket = io(`${socketBaseUrl}/delivery`, {
  auth: { userId },
  transports: ["websocket"],
});
```

Tambem aceita `?userId=...`, mas prefira `auth`.

## Namespace `/orders`

Sala: `owner:<userId>`.

Eventos:

- `orders:finalized`
- `orders:updated`

Payload: `OrderDashboardCard`.

```ts
type OrderDashboardCard = {
  id: string;
  ownerUserId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  whatsappInstanceId: string | null;
  whatsappInstanceName: string | null;
  customerWhatsappId: string;
  customerName: string | null;
  status: "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED";
  deliveryFeeCents: number;
  totalCents: number;
  currency: string;
  deliveryAddress: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productId: string | null;
    title: string;
    category: string | null;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
  }>;
};
```

Uso:

- inserir novo pedido em `orders:finalized`;
- substituir pedido por `id` em `orders:updated`;
- refazer fetch se houver conflito visual ou payload inesperado.

## Namespace `/delivery`

Sala: `user:<userId>`.

Eventos:

- `delivery:available`
- `delivery:assigned`
- `delivery:status_changed`
- `delivery:customer_responded`
- `delivery:rider_stalled_warning`
- `delivery:rider_stalled_unassigned`
- `rider:status_changed`

Payload base:

```ts
type DeliverySocketPayload = {
  deliveryId: string;
  orderId: string;
  storeId: string;
  riderId?: string | null;
  previousStatus?: DeliveryStatus | null;
  status?: DeliveryStatus;
  timestamp: string;
};
```

`delivery:available` pode incluir:

```ts
type RiderNewAvailableDeliveryEvent = {
  deliveryId: string;
  orderId: string;
  storeId: string;
  riderUserIds?: string[];
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  destinationAddress?: string;
  quotedPriceCents?: number;
  riderPayoutCents?: number;
  bonusValueCents?: number;
  isHighPriority?: boolean;
  priorityLabel?: string;
  radiusKm?: number;
  limit?: number;
  timestamp: string;
};
```

`delivery:customer_responded`:

```ts
type DeliveryAbsentCustomerRespondedEvent = {
  deliveryId: string;
  orderId: string;
  storeId: string;
  riderId: string;
  customerWhatsappId: string;
  message: string;
  customerMessagePreview?: string | null;
  timestamp: string;
};
```

`rider:status_changed`:

```ts
type RiderStatusChangedEvent = {
  riderId: string;
  status: "OFFLINE" | "ONLINE" | "BUSY";
  timestamp: string;
};
```

Uso recomendado:

- Rider: ao receber `delivery:available`, atualizar lista e tocar aviso discreto.
- Rider: ao receber `delivery:assigned`, refazer `active-delivery`.
- Rider: ao receber `delivery:status_changed`, refazer entrega ativa.
- Merchant: atualizar lista de entregas e mapa.
- Para eventos de alerta, mostrar toast/action sheet e refazer fetch.

## Namespace `/whatsapp-events`

Sala: `owner:<userId>`.

Evento:

- `whatsapp:instance-status`

Payload:

```ts
type WhatsappInstanceStatusEvent = {
  instanceId: string;
  instanceName: string;
  status: string;
  previousStatus: string | null;
  reason?: string | null;
  changedAt: string;
};
```

Uso:

- atualizar card de conexao;
- parar polling de QR quando `CONNECTED`;
- mostrar motivo quando desconectar.

## Regras De Realtime No Front

- Sempre reconectar automaticamente.
- Ao reconectar, refaca fetch da tela atual.
- Trate evento como notificacao de mudanca, nao como unica fonte de verdade.
- Nao assuma ordem perfeita entre HTTP e socket.
- Se receber evento de entidade nao carregada, busque a lista/detalhe.

## Web Push

Endpoints:

- `GET /notifications/vapid-public-key`
- `POST /notifications/push-subscriptions`
- `DELETE /notifications/push-subscriptions`

Payload de subscription:

```ts
type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
};
```

Service Worker:

- precisa escutar `push`;
- mostrar `title`, `body`, `icon`;
- usar `data.url` para deep link no click.

Deep links atuais:

- `/delivery/available?deliveryId=<id>`
- `/delivery/deliveries/<deliveryId>`
- `/delivery/tracking/<deliveryId>` para cliente futuro.

Nao registre Push sem consentimento claro. Para rider, o melhor momento e ao
ficar online; para merchant, ao habilitar monitoramento de delivery.

