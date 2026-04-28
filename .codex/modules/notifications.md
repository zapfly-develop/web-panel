# Modulo Notifications

## Localizacao

- `src/modules/notifications/notification.module.ts`
- `src/modules/notifications/notification.controller.ts`
- `src/modules/notifications/notification.service.ts`
- `src/modules/notifications/delivery-push-notification.listener.ts`
- `src/modules/notifications/dto/*`
- `src/modules/notifications/notification.types.ts`

## Responsabilidade

Gerenciar assinaturas Web Push do PWA e emitir notificacoes do fluxo logistico.

## Dependencias

- Prisma para persistir `PushSubscription`.
- DeliveryModule para ouvir eventos logisticos via `DELIVERY_EVENT_EMITTER`.
- Biblioteca `web-push` para envio VAPID.

## Dados

Modelo:

- `PushSubscription`

Campos principais:

- `userId`
- `endpoint`
- `p256dh`
- `auth`
- `expirationTime`
- `userAgent`

Regras:

- Uma assinatura pertence a um `User`.
- `endpoint` e unico.
- Um usuario pode ter multiplos dispositivos.
- Endpoints expirados ou inexistentes (`404`/`410`) sao removidos automaticamente.

## Endpoints

- `GET /notifications/vapid-public-key`
- `POST /notifications/push-subscriptions`
- `DELETE /notifications/push-subscriptions`

As rotas usam `x-user-id` como identidade de borda, seguindo o padrao atual do projeto.

## VAPID

Env vars aceitas:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Aliases aceitos:

- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_VAPID_SUBJECT`
- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`

Sem chaves VAPID, o servico registra warning e ignora o envio.

## Eventos Ouvidos

`rider.new_available_delivery`:

- Busca motoboys proximos via `DeliveryService.findNearbyOnlineRiders`.
- Envia:
  - `title`: `Nova Entrega!`
  - `body`: `Ha uma entrega disponivel perto de voce.`
  - `icon`: `/icon.png`
  - `data.url`: `/delivery/available?deliveryId=<id>`

`delivery.status_changed`:

- Notifica a loja em `/delivery/deliveries/<deliveryId>`.
- Tenta notificar o cliente em `/delivery/tracking/<deliveryId>`.
- Cliente final so recebe push quando houver `customerUserId` no evento ou um `User.phone` compativel com `customerWhatsappId`.

## Deep Links

- Motoboy: `/delivery/available?deliveryId=<deliveryId>`
- Loja: `/delivery/deliveries/<deliveryId>`
- Cliente: `/delivery/tracking/<deliveryId>`

## Fora do Escopo

- Service Worker do frontend.
- Email.
- SMS.
- PIX ou liquidacao real de carteira.

