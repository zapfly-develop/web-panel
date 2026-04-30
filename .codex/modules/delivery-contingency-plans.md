# Planos de Contingencia de Delivery

Documento de integracao para front-end do painel da loja e PWA do entregador.

## Escopo

Este documento cobre os 4 planos de contingencia implementados no backend:

1. No-Rider Timeout: bonus dinamico e entrega estagnada.
2. Incidente reportado pelo entregador: recolocar entrega com alta prioridade.
3. Cliente ausente: espera de 5 minutos, retorno para loja e compensacao.
4. Rider parado apos aceite: aviso, desvinculacao automatica e cooldown punitivo.

## Regras Comuns

Autenticacao atual:

- REST usa header `x-user-id`.
- Socket.io usa `auth.userId` ou query string `userId`.

Namespaces Socket.io:

- `/orders`: eventos do kanban da loja.
- `/delivery`: eventos logisticos para loja e entregador.

Exemplo de conexao Socket.io:

```ts
import { io } from "socket.io-client";

const ordersSocket = io(`${API_URL}/orders`, {
    auth: { userId },
});

const deliverySocket = io(`${API_URL}/delivery`, {
    auth: { userId },
});
```

Convencoes:

- Valores monetarios trafegam em centavos. Exemplo: `200` = R$ 2,00.
- Datas trafegam como ISO string.
- A loja usa seu `ownerUserId` como `x-user-id`.
- O entregador usa o `userId` do usuario vinculado ao perfil `Rider`.

## Push Web

O front deve registrar push subscription para receber alertas dos planos de contingencia.

### Buscar chave publica VAPID

`GET /notifications/vapid-public-key`

Resposta:

```json
{
  "publicKey": "BEl..."
}
```

### Salvar subscription

`POST /notifications/push-subscriptions`

Headers:

```http
x-user-id: user_rider_123
```

Body:

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/abc",
  "expirationTime": null,
  "keys": {
    "p256dh": "BN...",
    "auth": "z9..."
  },
  "userAgent": "Mozilla/5.0"
}
```

Resposta:

```json
{
  "id": "push_123",
  "userId": "user_rider_123",
  "endpoint": "https://fcm.googleapis.com/fcm/send/abc",
  "p256dh": "BN...",
  "auth": "z9...",
  "expirationTime": null,
  "userAgent": "Mozilla/5.0",
  "createdAt": "2026-04-30T18:00:00.000Z",
  "updatedAt": "2026-04-30T18:00:00.000Z"
}
```

### Remover subscription

`DELETE /notifications/push-subscriptions?endpoint=<endpoint>`

Resposta:

```json
{
  "removed": 1
}
```

## Objetos Base

### Delivery resumida

As rotas de entrega retornam o modelo `Delivery` do Prisma. O exemplo abaixo mostra os campos mais relevantes para o front:

```json
{
  "id": "del_123",
  "ownerUserId": "store_123",
  "orderId": "order_123",
  "riderId": "rider_123",
  "status": "WAITING_RIDER",
  "assignmentType": "MARKETPLACE",
  "paymentHandledBy": "RIDER",
  "distanceMeters": 3200,
  "quotedPriceCents": 900,
  "riderPayoutCents": 700,
  "deliveryBonusApplied": false,
  "bonusValueCents": 0,
  "isHighPriority": false,
  "pickupAddress": "Rua da Loja, 10",
  "pickupLatitude": -22.000001,
  "pickupLongitude": -48.000001,
  "destinationAddress": "Rua do Cliente, 20",
  "destinationLatitude": -22.010001,
  "destinationLongitude": -48.010001,
  "acceptedAt": null,
  "acceptedLatitude": null,
  "acceptedLongitude": null,
  "absentClientAt": null,
  "deliveryFeeEscrowedAt": null,
  "deliveryFeeEscrowCents": 0,
  "riderSearchStartedAt": "2026-04-30T18:00:00.000Z",
  "createdAt": "2026-04-30T18:00:00.000Z",
  "updatedAt": "2026-04-30T18:00:00.000Z"
}
```

### OrderDashboardCard

`GET /delivery/orders/dashboard` e `PATCH /delivery/orders/:orderId/status` retornam cards para o kanban:

```json
{
  "id": "order_123",
  "ownerUserId": "store_123",
  "ownerName": "Loja Teste",
  "ownerEmail": "loja@example.com",
  "whatsappInstanceId": "wa_123",
  "whatsappInstanceName": "loja-principal",
  "customerWhatsappId": "5514999999999@s.whatsapp.net",
  "customerName": "Maria",
  "status": "SHIPPED",
  "deliveryFeeCents": 400,
  "totalCents": 1237,
  "currency": "BRL",
  "deliveryAddress": "Rua do Cliente, 20",
  "notes": null,
  "createdAt": "2026-04-30T18:00:00.000Z",
  "updatedAt": "2026-04-30T18:02:00.000Z",
  "items": [
    {
      "id": "item_123",
      "productId": "prod_123",
      "title": "Antartica BOA 300ML",
      "category": "Cervejas",
      "quantity": 3,
      "unitPriceCents": 279,
      "subtotalCents": 837
    }
  ]
}
```

## Endpoints de Apoio

### Kanban da loja

Listar pedidos do painel:

`GET /delivery/orders/dashboard`

Headers:

```http
x-user-id: store_123
```

Resposta:

```json
{
  "orders": [
    {
      "id": "order_123",
      "status": "PREPARING",
      "customerName": "Maria",
      "totalCents": 1237,
      "deliveryAddress": "Rua do Cliente, 20",
      "items": []
    }
  ]
}
```

Alterar status pelo kanban:

`PATCH /delivery/orders/:orderId/status`

Body para enviar para entrega:

```json
{
  "status": "SHIPPED",
  "notifyCustomer": true,
  "paymentHandledBy": "RIDER"
}
```

Body para concluir pedido:

```json
{
  "status": "DELIVERED"
}
```

Regras importantes:

- `PENDING` nao pode ser definido pelo kanban.
- `DELIVERED` nao volta para outro status.
- `SHIPPED` dispara `order.ready_for_pickup` quando o pedido e delivery e ainda nao tem `Delivery`.
- `DELIVERED` exige entrega coletada (`PICKED_UP`) quando ha delivery ativa.

### Entregas da loja

Listar entregas:

`GET /delivery/deliveries`

Filtrar por status:

`GET /delivery/deliveries?status=DELIVERY_STAGNATED`

Headers:

```http
x-user-id: store_123
```

Atribuir motoboy:

`POST /delivery/deliveries/:deliveryId/assign`

Body:

```json
{
  "riderId": "rider_123"
}
```

Resposta:

```json
{
  "id": "del_123",
  "riderId": "rider_123",
  "status": "ASSIGNED",
  "acceptedAt": "2026-04-30T18:03:00.000Z",
  "acceptedLatitude": -22.000001,
  "acceptedLongitude": -48.000001,
  "isHighPriority": false
}
```

### PWA do entregador

Atualizar localizacao:

`POST /delivery/riders/me/location`

Body:

```json
{
  "deliveryId": "del_123",
  "latitude": -22.000001,
  "longitude": -48.000001,
  "accuracyMeters": 12,
  "recordedAt": "2026-04-30T18:03:00.000Z"
}
```

Buscar entrega ativa:

`GET /delivery/riders/me/active-delivery`

Aceitar entrega atribuida:

`POST /delivery/riders/me/deliveries/:deliveryId/accept`

Body opcional:

```json
{
  "acceptedAt": "2026-04-30T18:03:00.000Z"
}
```

Coletar:

`POST /delivery/riders/me/deliveries/:deliveryId/pick-up`

Concluir:

`POST /delivery/riders/me/deliveries/:deliveryId/complete`

## Plano 1: No-Rider Timeout

Objetivo:

- Evitar que uma entrega fique esquecida em `WAITING_RIDER`.
- Aumentar o repasse apos 10 minutos sem aceite.
- Alertar a loja quando passar do limite de estagnacao.

Configuracoes usadas:

- `User.dynamicFareBonusCents`: bonus somado ao repasse do rider. Padrao atual: `200`.
- `User.stagnatedTimeoutMinutes`: limite para marcar como estagnada. Padrao atual: `15`.

Gatilho:

- Worker BullMQ `delivery-no-rider-timeout`.
- Job recorrente `process-no-rider-timeouts`.
- Frequencia: a cada 1 minuto.

Estados monitorados:

- `WAITING_RIDER`
- `READY_FOR_PICKUP`

### Nivel 1: 10 minutos sem rider

Acao backend:

- `deliveryBonusApplied = true`
- `bonusValueCents += dynamicFareBonusCents`
- `riderPayoutCents += dynamicFareBonusCents`
- Emite `rider.new_available_delivery`.

Socket.io recebido no namespace `/delivery`:

Evento:

`delivery:available`

Payload:

```json
{
  "deliveryId": "del_123",
  "orderId": "order_123",
  "storeId": "store_123",
  "pickupLatitude": -22.000001,
  "pickupLongitude": -48.000001,
  "quotedPriceCents": 900,
  "riderPayoutCents": 900,
  "bonusValueCents": 200,
  "isHighPriority": false,
  "timestamp": "2026-04-30T18:10:00.000Z"
}
```

Web Push para riders proximos:

```json
{
  "title": "Nova Entrega!",
  "body": "Ha uma entrega disponivel perto de voce.",
  "icon": "/icon.png",
  "data": {
    "url": "/delivery/available?deliveryId=del_123",
    "deliveryId": "del_123"
  }
}
```

### Nivel 2: limite de estagnacao

Acao backend:

- `Delivery.status = DELIVERY_STAGNATED`
- Emite `delivery.status_changed`.
- Enfileira WhatsApp para a loja:
  `"Atenção [Loja]: O pedido #[ID] está sem entregador há mais de [X] minutos. Considere acionar uma frota externa."`

Socket.io recebido no namespace `/delivery`:

Evento:

`delivery:status_changed`

Payload:

```json
{
  "deliveryId": "del_123",
  "orderId": "order_123",
  "storeId": "store_123",
  "riderId": null,
  "customerUserId": null,
  "customerWhatsappId": "5514999999999@s.whatsapp.net",
  "previousStatus": "WAITING_RIDER",
  "status": "DELIVERY_STAGNATED",
  "timestamp": "2026-04-30T18:15:00.000Z"
}
```

Web Push para loja:

```json
{
  "title": "Entrega atualizada",
  "body": "Pedido sem motoboy ha mais tempo que o limite configurado.",
  "icon": "/icon.png",
  "data": {
    "url": "/delivery/deliveries/del_123",
    "deliveryId": "del_123",
    "status": "DELIVERY_STAGNATED"
  }
}
```

Uso esperado no front:

- Loja: criar coluna/estado visual para `DELIVERY_STAGNATED`.
- Loja: permitir atribuir manualmente via `POST /delivery/deliveries/:deliveryId/assign`.
- Rider: exibir bonus em `bonusValueCents` e repasse atualizado em `riderPayoutCents`.

## Plano 2: Incidente Reportado Pelo Entregador

Objetivo:

- Permitir que o entregador reporte um problema real apos coleta.
- Remover o rider atual.
- Recolocar a entrega na fila como alta prioridade.
- Bloquear temporariamente o rider que reportou.

Endpoint principal do PWA:

`POST /delivery/riders/me/deliveries/:deliveryId/incidents`

Headers:

```http
x-user-id: user_rider_123
```

Body:

```json
{
  "reason": "Pneu furado",
  "description": "Consegui parar em seguranca, mas nao consigo seguir com a entrega."
}
```

Pre-condicoes:

- Rider precisa estar `ACTIVE`.
- Entrega precisa pertencer ao rider autenticado.
- Status aceitos: `PICKED_UP` ou `IN_TRANSIT`.

Acao backend em transaction:

- Cria `DeliveryIncident`.
- Atualiza `Rider.incidentBlockedUntil`.
- Atualiza `Rider.availabilityStatus = OFFLINE`.
- Remove `Delivery.riderId`.
- Muda `Delivery.status = READY_FOR_PICKUP`.
- Define `Delivery.isHighPriority = true`.
- Reseta `Delivery.riderSearchStartedAt`.
- Emite `delivery.status_changed`.
- Emite `delivery.incident_reported`.

Resposta:

```json
{
  "id": "del_123",
  "ownerUserId": "store_123",
  "orderId": "order_123",
  "riderId": null,
  "status": "READY_FOR_PICKUP",
  "isHighPriority": true,
  "acceptedAt": null,
  "pickedUpAt": null,
  "riderSearchStartedAt": "2026-04-30T18:20:00.000Z",
  "updatedAt": "2026-04-30T18:20:00.000Z"
}
```

Socket.io para loja e riders proximos:

Evento:

`delivery:available`

Payload:

```json
{
  "deliveryId": "del_123",
  "orderId": "order_123",
  "storeId": "store_123",
  "pickupLatitude": -22.000001,
  "pickupLongitude": -48.000001,
  "quotedPriceCents": 900,
  "riderPayoutCents": 700,
  "bonusValueCents": 0,
  "isHighPriority": true,
  "priorityLabel": "ALTA_PRIORIDADE",
  "timestamp": "2026-04-30T18:20:00.000Z"
}
```

WhatsApp automatico para cliente:

```text
Olá! Tivemos um pequeno imprevisto logístico com o seu entregador. Mas não se preocupe: um novo entregador de alta prioridade já foi designado para sua segurança e agilidade! 🚀
```

Erro comum:

```json
{
  "statusCode": 400,
  "message": "Only picked up or in-transit deliveries can receive rider incident reports",
  "error": "Bad Request"
}
```

Uso esperado no front:

- PWA: exibir botao "Reportar incidente" somente apos coleta.
- PWA: apos sucesso, tirar a entrega da tela ativa e mostrar bloqueio/cooldown quando tentar ficar online.
- Loja: destacar entrega `READY_FOR_PICKUP` com `isHighPriority=true`.
- Riders proximos: destacar oferta com selo `ALTA_PRIORIDADE`.

## Plano 3: Cliente Ausente

Objetivo:

- Registrar que o rider chegou ao destino e nao encontrou o cliente.
- Abrir uma janela de espera de 5 minutos.
- Tentar contato automatico via WhatsApp.
- Se o cliente nao aparecer, orientar retorno para loja e pagar o rider.

Endpoint principal do PWA:

`POST /delivery/riders/me/deliveries/:deliveryId/client-absent`

Alias tambem aceito:

`POST /delivery/riders/me/deliveries/:deliveryId/report-absence`

Headers:

```http
x-user-id: user_rider_123
```

Body:

```json
{
  "description": "Interfone sem resposta e telefone nao atende."
}
```

Pre-condicoes:

- Rider precisa estar `ACTIVE`.
- Entrega precisa pertencer ao rider autenticado.
- Status aceito: `ARRIVED_AT_DESTINATION`.

Observacao para o front:

- Atualmente o endpoint publico de chegada ao destino nao esta documentado neste modulo. O botao "Cliente ausente" deve aparecer apenas quando a entrega ja vier do backend com `status = ARRIVED_AT_DESTINATION`.

Acao backend:

- Muda `Delivery.status = ABSENT_WAITING`.
- Grava `Delivery.absentClientAt`.
- Registra `DeliveryEvent.CLIENT_ABSENT_REPORTED`.
- Reserva escrow da taxa de entrega quando aplicavel:
  - `deliveryFeeEscrowedAt`
  - `deliveryFeeEscrowCents`
  - `deliveryFeeEscrowTransactionId`
- Agenda BullMQ `delivery-client-absence` com delay de 5 minutos.
- Emite `delivery.status_changed`.
- Emite `delivery.client_absent_reported`.
- Envia WhatsApp urgente para cliente.

Resposta:

```json
{
  "id": "del_123",
  "riderId": "rider_123",
  "status": "ABSENT_WAITING",
  "absentClientAt": "2026-04-30T18:30:00.000Z",
  "deliveryFeeEscrowedAt": "2026-04-30T18:30:00.000Z",
  "deliveryFeeEscrowCents": 900,
  "deliveryFeeEscrowTransactionId": "wallet_tx_123",
  "updatedAt": "2026-04-30T18:30:00.000Z"
}
```

Socket.io para loja e rider:

Evento:

`delivery:status_changed`

Payload:

```json
{
  "deliveryId": "del_123",
  "orderId": "order_123",
  "storeId": "store_123",
  "riderId": "rider_123",
  "customerUserId": null,
  "customerWhatsappId": "5514999999999@s.whatsapp.net",
  "previousStatus": "ARRIVED_AT_DESTINATION",
  "status": "ABSENT_WAITING",
  "timestamp": "2026-04-30T18:30:00.000Z"
}
```

WhatsApp automatico para cliente:

```text
Oi, Maria! O entregador da Floovi está no seu endereço agora e não conseguiu contato. Temos um prazo de segurança de 5 minutos antes dele precisar retornar à loja. Pode atendê-lo? 🛵
```

### Cliente respondeu dentro da janela

Quando o cliente responde qualquer coisa no WhatsApp dentro dos 5 minutos, o backend emite para o rider:

Namespace:

`/delivery`

Evento:

`delivery:customer_responded`

Payload:

```json
{
  "deliveryId": "del_123",
  "orderId": "order_123",
  "storeId": "store_123",
  "riderId": "rider_123",
  "customerWhatsappId": "5514999999999@s.whatsapp.net",
  "message": "O cliente respondeu! Aguarde mais um momento.",
  "customerMessagePreview": "Estou descendo",
  "timestamp": "2026-04-30T18:32:00.000Z"
}
```

Uso esperado no front:

- PWA: mostrar aviso claro e pausar fluxo de retorno.
- PWA: manter a entrega ativa e permitir concluir se o cliente aparecer.

### Timeout de 5 minutos

Se a entrega continuar em `ABSENT_WAITING`, o job muda para `RETURNING_TO_MERCHANT`.

Socket.io:

`delivery:status_changed`

```json
{
  "deliveryId": "del_123",
  "orderId": "order_123",
  "storeId": "store_123",
  "riderId": "rider_123",
  "previousStatus": "ABSENT_WAITING",
  "status": "RETURNING_TO_MERCHANT",
  "timestamp": "2026-04-30T18:35:00.000Z"
}
```

Web Push para rider:

```json
{
  "title": "Tempo de espera esgotado",
  "body": "Tempo de espera esgotado. Por favor, inicie o retorno para a loja Loja Teste.",
  "icon": "/icon.png",
  "data": {
    "url": "/delivery/active?deliveryId=del_123",
    "deliveryId": "del_123",
    "status": "RETURNING_TO_MERCHANT"
  }
}
```

Financeiro:

- Ao entrar em `RETURNING_TO_MERCHANT`, o backend enfileira payout.
- O rider recebe 100% da taxa reservada.
- A primeira ocorrencia mensal por loja pode usar `FLOOVI_SAFETY_FUND`.
- Ocorrencias seguintes usam debito do escrow da loja.
- O processamento emite `payout.processed`.

Evento interno `payout.processed`:

```json
{
  "payoutId": "payout_123",
  "deliveryId": "del_123",
  "riderId": "rider_123",
  "storeId": "store_123",
  "amountCents": 900,
  "deliveryFeeCents": 900,
  "riderProfitCents": 900,
  "storeDebitCents": 0,
  "riderRetainedCents": 0,
  "settlementType": "FLOOVI_SAFETY_FUND",
  "timestamp": "2026-04-30T18:35:10.000Z"
}
```

Erro comum:

```json
{
  "statusCode": 400,
  "message": "Only deliveries with rider arrival confirmed at destination can be marked as client absent",
  "error": "Bad Request"
}
```

## Plano 4: Rider Parado Apos Atribuicao

Objetivo:

- Detectar entregador designado que nao se move em direcao a loja.
- Avisar o rider apos 7 minutos.
- Remover automaticamente apos 10 minutos e devolver a entrega para a fila.
- Aplicar cooldown punitivo no rider inativo.

Gatilho:

- Worker BullMQ `delivery-stalled-rider-monitor`.
- Job recorrente `process-stalled-rider-monitor`.
- Frequencia: a cada 1 minuto.

Estado monitorado:

- `ASSIGNED`

Dados usados:

- `Delivery.acceptedAt`
- `Delivery.acceptedLatitude`
- `Delivery.acceptedLongitude`
- Redis `delivery:rider:location:<riderId>`
- Redis `delivery:stalled-rider:<deliveryId>` como ancora de movimento.

Regra de movimento:

- Se mover 100m ou mais, o backend atualiza a ancora e reinicia o cronometro.
- Se ficar a menos de 100m por 7 minutos, dispara aviso.
- Se ficar a menos de 100m por 10 minutos, remove o rider.

### Nivel 1: 7 minutos parado

Evento interno:

`delivery.rider_stalled_warning`

Socket.io no namespace `/delivery`:

Evento:

`delivery:rider_stalled_warning`

Payload:

```json
{
  "deliveryId": "del_123",
  "orderId": "order_123",
  "storeId": "store_123",
  "riderId": "rider_123",
  "distanceMeters": 35,
  "elapsedMinutes": 7,
  "thresholdMeters": 100,
  "warningMinutes": 7,
  "timestamp": "2026-04-30T18:07:00.000Z"
}
```

Web Push para rider:

```json
{
  "title": "Você está a caminho?",
  "body": "Notamos que você não se moveu em direção à loja. Se houver algum problema, reporte um incidente no app.",
  "icon": "/icon.png",
  "data": {
    "url": "/delivery/active",
    "deliveryId": "del_123",
    "orderId": "order_123",
    "event": "delivery.rider_stalled_warning"
  }
}
```

Uso esperado no front:

- PWA: exibir alerta nao bloqueante.
- PWA: destacar CTA para atualizar rota ou reportar incidente.

### Nivel 2: 10 minutos parado

Acao backend em transaction:

- Remove `Delivery.riderId`.
- Muda `Delivery.status = WAITING_RIDER`.
- Limpa `acceptedAt`, `acceptedLatitude`, `acceptedLongitude`.
- Reseta `riderSearchStartedAt`.
- Atualiza `Rider.availabilityStatus = OFFLINE`.
- Grava `Rider.incidentBlockedUntil`.
- Registra `DeliveryEvent.RIDER_STALLED_UNASSIGNED`.
- Emite `delivery.status_changed`.
- Emite `delivery.rider_stalled_unassigned`.
- Emite `rider.new_available_delivery`.

Socket.io para loja e rider removido:

Evento:

`delivery:rider_stalled_unassigned`

Payload:

```json
{
  "deliveryId": "del_123",
  "orderId": "order_123",
  "storeId": "store_123",
  "riderId": "rider_123",
  "previousStatus": "ASSIGNED",
  "status": "WAITING_RIDER",
  "distanceMeters": 35,
  "elapsedMinutes": 10,
  "thresholdMeters": 100,
  "unassignMinutes": 10,
  "riderCooldownMinutes": 30,
  "riderBlockedUntil": "2026-04-30T18:40:00.000Z",
  "timestamp": "2026-04-30T18:10:00.000Z"
}
```

Socket.io para loja e riders proximos:

Evento:

`delivery:available`

Payload:

```json
{
  "deliveryId": "del_123",
  "orderId": "order_123",
  "storeId": "store_123",
  "pickupLatitude": -22.000001,
  "pickupLongitude": -48.000001,
  "quotedPriceCents": 900,
  "riderPayoutCents": 700,
  "bonusValueCents": 0,
  "isHighPriority": false,
  "timestamp": "2026-04-30T18:10:00.000Z"
}
```

Web Push para riders proximos:

```json
{
  "title": "Nova Entrega!",
  "body": "Ha uma entrega disponivel perto de voce.",
  "icon": "/icon.png",
  "data": {
    "url": "/delivery/available?deliveryId=del_123",
    "deliveryId": "del_123"
  }
}
```

Erro esperado ao rider bloqueado tentar ficar online ou aceitar novas corridas:

```json
{
  "statusCode": 403,
  "message": "Rider temporarily blocked from new deliveries until 2026-04-30T18:40:00.000Z",
  "error": "Forbidden"
}
```

Uso esperado no front:

- Loja: ao receber `delivery:rider_stalled_unassigned`, mover card para coluna de busca/sem rider.
- PWA rider removido: limpar entrega ativa e mostrar cooldown ate `riderBlockedUntil`.
- Outros riders: receber nova oferta via `delivery:available`.

## Eventos Socket.io Resumidos

Namespace `/orders`:

| Evento | Quem recebe | Quando |
| --- | --- | --- |
| `orders:finalized` | Loja | Pedido finalizado pelo checkout |
| `orders:updated` | Loja | Pedido muda no kanban |

Namespace `/delivery`:

| Evento | Quem recebe | Quando |
| --- | --- | --- |
| `delivery:available` | Loja e riders proximos | Nova entrega, bonus, incidente ou rider desvinculado |
| `delivery:assigned` | Loja e rider atribuido | Loja atribui rider |
| `delivery:status_changed` | Loja, rider vinculado e cliente identificavel | Status da entrega mudou |
| `delivery:customer_responded` | Rider vinculado | Cliente respondeu durante `ABSENT_WAITING` |
| `delivery:rider_stalled_warning` | Loja e rider atribuido | Rider parado por 7 minutos |
| `delivery:rider_stalled_unassigned` | Loja e rider removido | Rider parado por 10 minutos |
| `rider:status_changed` | Rider e loja dona | Presenca operacional mudou |

## Checklist Para o Front

Painel da loja:

- Ouvir `/orders` para `orders:finalized` e `orders:updated`.
- Ouvir `/delivery` para `delivery:status_changed`, `delivery:available`, `delivery:assigned` e `delivery:rider_stalled_unassigned`.
- Exibir status `DELIVERY_STAGNATED`.
- Exibir `isHighPriority` e `priorityLabel`.
- Mostrar bonus com `bonusValueCents` e repasse com `riderPayoutCents`.
- Permitir atribuir rider para `WAITING_RIDER`, `READY_FOR_PICKUP`, `DELIVERY_STAGNATED` e `PENDING_ASSIGNMENT`.

PWA do rider:

- Registrar Web Push.
- Enviar localizacao com frequencia suficiente por `POST /delivery/riders/me/location`.
- Ouvir `/delivery` para `delivery:available`, `delivery:assigned`, `delivery:status_changed`, `delivery:customer_responded`, `delivery:rider_stalled_warning` e `delivery:rider_stalled_unassigned`.
- Mostrar CTA de incidente apenas depois de `PICKED_UP` ou `IN_TRANSIT`.
- Mostrar CTA de cliente ausente apenas em `ARRIVED_AT_DESTINATION`.
- Em `ABSENT_WAITING`, mostrar cronometro de 5 minutos a partir de `absentClientAt`.
- Em `RETURNING_TO_MERCHANT`, orientar retorno para loja.
- Se API retornar bloqueio por `incidentBlockedUntil`, impedir o botao de ficar online ate expirar.

## Exemplos de Tratamento de Erro

Sem header `x-user-id`:

```json
{
  "statusCode": 401,
  "message": "x-user-id header is required",
  "error": "Unauthorized"
}
```

Rider indisponivel ou bloqueado para atribuicao:

```json
{
  "statusCode": 404,
  "message": "Rider not found, unavailable, or not assignable for this store",
  "error": "Not Found"
}
```

Entrega fora do estado esperado:

```json
{
  "statusCode": 400,
  "message": "Only waiting deliveries can be assigned",
  "error": "Bad Request"
}
```
