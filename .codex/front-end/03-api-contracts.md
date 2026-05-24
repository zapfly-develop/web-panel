# 03 - Contratos De API

Base local padrao:

```text
http://localhost:3001
```

Swagger:

```text
/docs
```

Todos os endpoints nao publicos passam pelo guard global de JWT. Em dev pode
existir fallback `x-user-id`, mas clientes novos devem usar Bearer token ou BFF.

## Auth

| Metodo | Path | Auth | Uso |
| --- | --- | --- | --- |
| POST | `/auth/login` | publico | login por email/senha |
| POST | `/auth/refresh` | publico | rotacao de refresh token |
| POST | `/auth/logout` | Bearer | revoga refresh token |
| POST | `/auth/internal/access-token` | Bearer | token curto server-to-server |

## Billing

| Metodo | Path | Auth | Body/Query |
| --- | --- | --- | --- |
| GET | `/billing/plans` | publico | sem body |
| POST | `/billing/activate-free` | merchant | sem body |
| POST | `/billing/checkout` | merchant | `{ planType }` |
| POST | `/api/syncpay/webhook` | publico webhook | payload SyncPay |
| POST | `/webhook/syncpay` | publico webhook | alias |

`planType`: `FREE`, `BASIC`, `PRO`, `ENTERPRISE`.

Checkout pago retorna:

```ts
type BillingCheckout = {
  subscription: Subscription;
  transaction: Transaction;
  pixCode: string;
  gatewayReference: string;
};
```

## WhatsApp

| Metodo | Path | Auth | Uso |
| --- | --- | --- | --- |
| POST | `/whatsapp/connect` | merchant + assinatura ativa | cria/reconcilia instancia gerenciada |
| GET | `/whatsapp/qr-code` | merchant + assinatura ativa | retorna QR/status |
| POST | `/whatsapp` | merchant | cria instancia manual |
| GET | `/whatsapp` | merchant | lista instancias do tenant |
| GET | `/whatsapp/:id` | merchant | detalhe |
| PATCH | `/whatsapp/:id` | merchant | atualiza metadados |
| DELETE | `/whatsapp/:id` | merchant | remove |
| POST | `/webhooks/evolution` | publico webhook | entrada Evolution |

Create instance:

```ts
type CreateWhatsappDto = {
  instanceName: string;
  status?: string;
  webhookUrl?: string | null;
};
```

QR response comum:

```ts
type WhatsappQrCode = {
  instanceId: string;
  instanceName: string;
  status: string;
  qrCodeBase64?: string | null;
  pairingCode?: string | null;
};
```

## Orders Merchant

| Metodo | Path | Auth | Body/Query |
| --- | --- | --- | --- |
| GET | `/delivery/orders/dashboard` | merchant | retorna `{ orders }` |
| GET | `/delivery/orders/heatmap` | merchant | `from`, `to`, `gridSizeMeters` |
| POST | `/delivery/orders/:orderId/send-to-delivery` | merchant | sem body |
| PATCH | `/delivery/orders/:orderId/status` | merchant | `UpdateOrderStatusDto` |

Update order status:

```ts
type UpdateOrderStatusDto = {
  status:
    | "PREPARING"
    | "READY_FOR_SHIPPING"
    | "READY_FOR_DELIVERY"
    | "SHIPPED"
    | "DELIVERED";
  notifyCustomer?: boolean;
  paymentHandledBy?: "RIDER" | "STORE_MACHINE";
};
```

Regras:

- `PENDING` nao deve aparecer como alvo no kanban.
- `DELIVERED` nao volta para outro status.
- `SHIPPED` cria/notifica delivery quando aplicavel.
- `DELIVERED` com entrega ativa so e permitido depois de `PICKED_UP`.

## Store Address

| Metodo | Path | Auth | Uso |
| --- | --- | --- | --- |
| GET | `/delivery/store-address` | merchant | busca endereco operacional |
| PUT | `/delivery/store-address` | merchant | cria/atualiza e geocodifica |

Payload:

```ts
type UpsertStoreAddressDto = {
  street: string;
  number: string;
  neighborhood?: string;
  complement?: string;
  city: string;
  state: string;
  postalCode?: string;
  country?: string;
};
```

Resposta inclui `formattedAddress`, `latitude`, `longitude`, `h3Index` e
`geocodedAt`. `h3Index` e gerado pelo backend para logistica; nao recalcule no
front.

## Delivery Merchant

| Metodo | Path | Auth | Body/Query |
| --- | --- | --- | --- |
| POST | `/delivery/deliveries` | merchant | `CreateDeliveryDto` |
| GET | `/delivery/deliveries` | merchant | `status?` |
| POST | `/delivery/deliveries/:deliveryId/assign` | merchant | `{ riderId }` |
| POST | `/delivery/deliveries/:deliveryId/report-incident` | merchant | `{ reason, description? }` |
| POST | `/delivery/deliveries/:deliveryId/report-absence` | merchant | `{ description? }` |
| POST | `/delivery/deliveries/:deliveryId/client-absent` | merchant | alias |
| POST | `/delivery/deliveries/:deliveryId/pick-up` | merchant | sem body |
| POST | `/delivery/deliveries/:deliveryId/complete` | merchant | sem body |
| GET | `/delivery/riders/available` | merchant | sem query |
| GET | `/delivery/riders/performance` | merchant | `sortBy`, `limit` |
| POST | `/delivery/deliveries/:deliveryId/rating` | merchant | `{ score, comment? }` |

`CreateDeliveryDto`:

```ts
type CreateDeliveryDto = {
  orderId: string;
  riderId?: string;
  assignmentType?: "MARKETPLACE" | "STORE_OWNED" | "MANUAL";
  paymentHandledBy?: "RIDER" | "STORE_MACHINE";
  distanceMeters?: number;
  pickupAddress?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  destinationAddress?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
};
```

## Rider

| Metodo | Path | Auth | Body/Query |
| --- | --- | --- | --- |
| POST | `/delivery/riders/register` | rider | `CreateRiderDto` |
| POST | `/delivery/riders` | rider | alias para cadastro |
| GET | `/delivery/riders/me` | rider | perfil + localizacao Redis |
| GET | `/delivery/riders/me/analytics` | rider | `dateFrom`, `dateTo`, `groupBy`, `take`, `hotzoneLimit` |
| GET | `/delivery/riders/me/active-delivery` | rider | entrega ativa ou `null` |
| GET | `/delivery/riders/me/available-deliveries` | rider | `radiusKm`, `limit` |
| PATCH | `/delivery/riders/me/availability` | rider | `{ availabilityStatus }` |
| POST | `/delivery/riders/me/location` | rider | `UpdateLocationDto` |
| POST | `/delivery/riders/me/deliveries/:deliveryId/accept` | rider | `{ acceptedAt? }` |
| POST | `/delivery/riders/me/deliveries/:deliveryId/incidents` | rider | `{ reason, description? }` |
| POST | `/delivery/riders/me/deliveries/:deliveryId/report-absence` | rider | `{ description? }` |
| POST | `/delivery/riders/me/deliveries/:deliveryId/client-absent` | rider | alias |
| POST | `/delivery/riders/me/deliveries/:deliveryId/pick-up` | rider | sem body |
| POST | `/delivery/riders/me/deliveries/:deliveryId/complete` | rider | sem body |

`/delivery/riders/me/analytics` inclui `spatial.hotzones[]`, uma lista de
hexagonos H3 ranqueados por volume, lucro do rider e lucro por minuto em rota.
Use `boundary` para desenhar o poligono no mapa e `efficiencyScore` para
intensidade visual.

`availabilityStatus` aceita:

- Persistido: `OFFLINE`, `AVAILABLE`, `BUSY`
- Operacional: `OFFLINE`, `ONLINE`, `BUSY`

Para a UI, mostre `ONLINE` como "Disponivel" e envie `AVAILABLE` ou `ONLINE`.

Localizacao:

```ts
type UpdateLocationDto = {
  deliveryId?: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  recordedAt?: string;
};
```

## Wallet Rider

| Metodo | Path | Auth | Body/Query |
| --- | --- | --- | --- |
| GET | `/wallet/me` | rider | retorna/cria carteira |
| GET | `/wallet/transactions` | rider | `type`, `category`, `status`, `take` |
| GET | `/wallet/statement` | rider | `dateFrom`, `dateTo`, `type`, `category`, `status`, `take` |
| POST | `/wallet/withdrawals` | rider | `RequestWithdrawalDto` |

Saque:

```ts
type RequestWithdrawalDto = {
  amountCents: number;
  currency?: string;
  idempotencyKey: string;
  pixKey?: string;
  pixKeyType?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};
```

## Notifications

| Metodo | Path | Auth | Body/Query |
| --- | --- | --- | --- |
| GET | `/notifications/vapid-public-key` | publico | retorna `{ publicKey }` |
| POST | `/notifications/push-subscriptions` | autenticado | browser subscription |
| DELETE | `/notifications/push-subscriptions` | autenticado | `endpoint` query ou body |
| POST | `/notifications/expo-push-tokens` | autenticado | token Expo nativo |
| DELETE | `/notifications/expo-push-tokens` | autenticado | `token` query ou body |

Observacoes atuais:

- Clientes novos devem mandar `Authorization: Bearer <accessToken>`.
- O controller usa `@CurrentUser()`. `x-user-id` e legado de borda, nao contrato
  publico do NotificationModule.
- Os endpoints `DELETE` aceitam query string ou body opcional.
- Tokens ficam em `UserDeviceToken` com `type = WEB_PUSH` ou `type = EXPO`.

Save subscription:

```ts
type SavePushSubscriptionDto = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
};
```

Save Expo token:

```ts
type SaveExpoPushTokenDto = {
  token: string; // ExponentPushToken[...]
  platform?: "ios" | "android" | string;
  deviceId?: string;
};
```

Payload de push recebido pelo service worker:

```ts
type WebPushPayload = {
  title: string;
  body: string;
  icon: string;
  data: {
    url: string;
    deliveryId?: string;
    orderId?: string;
    status?: DeliveryStatus;
    event?: string;
    [key: string]: unknown;
  };
};
```

## Admin

Admin exige `ADMIN` ou `SUPER_ADMIN`.

| Metodo | Path | Query/Body |
| --- | --- | --- |
| GET | `/admin/dashboard` | sem query |
| GET | `/admin/monitoring/messages` | `planType`, `from`, `to` |
| GET | `/admin/monitoring/instances/health` | sem query |
| GET | `/admin/monitoring/financial` | `period`, `planType`, `from`, `to` |
| GET | `/admin/users` | `accessStatus`, `subscriptionStatus` |
| PATCH | `/admin/users/:userId/access` | `{ accessStatus }` |
| GET | `/admin/balance` | `period`, `planType`, `from`, `to` |
| GET | `/admin/openapi.json` | legado |
| GET | `/admin/docs` | legado HTML |

## Telegram E Campaigns

Estes endpoints existem, mas sao area sensivel/legada. Priorize telas existentes
e nao exponha secrets no browser.

Telegram:

- `POST /telegram/send`
- `POST /telegram/send-code`
- `POST /telegram/verify-code`
- `POST /telegram/verify-password`
- `POST /telegram/register-business-bot`
- `POST /telegram/create-sale-checkout`
- `GET /telegram/bot-status`
- `POST /telegram/confirm-payment`

Scraper:

- `POST /telegram/scraper/start`
- `GET /telegram/scraper/jobs`
- `GET /telegram/scraper/progress/:jobId`
- `POST /telegram/scraper/retry/:jobId`

Campaigns:

- `POST /templates/send`
- `POST /templates/schedule`
- `POST /templates/process-jobs` com `x-cron-secret` quando configurado.

## Integrations

Webhooks externos:

- `POST /integrations/webhooks/tray`
- `POST /integrations/webhooks/nuvemshop`
- `POST /integrations/webhooks/olist`
- `POST /integrations/webhooks/uappi`
- `POST /integrations/webhooks/mercadolivre`

O front nao deve chamar estes endpoints como usuario final. Uma tela futura de
integracoes deve apenas mostrar status, URLs de webhook e configuracoes seguras
vindas de endpoints administrativos ainda nao existentes. Para Mercado Livre, o
front nunca deve receber o `accessToken`; o backend resolve o lojista por
`IntegrationConfig.externalUserId` a partir do `user_id` enviado no webhook.
