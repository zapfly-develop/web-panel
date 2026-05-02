# Modulos Orders e Order Events

## Localizacao

- `src/modules/orders/*`
- `src/modules/order-events/*`

## Responsabilidade

Fornecer dashboard operacional de pedidos e eventos realtime para a loja.

## Endpoints

- `GET /delivery/orders/dashboard`
- `POST /delivery/orders/:orderId/send-to-delivery`
- `PATCH /delivery/orders/:orderId/status`

Ambos usam `x-user-id` para escopo de tenant.

## Status de Pedido

Enum `OrderStatus`:

- `PENDING`: pedido ainda em montagem/sincronizacao.
- `PREPARING`: pedido confirmado e enviado para preparo.
- `SHIPPED`: pedido saiu para entrega.
- `DELIVERED`: pedido entregue.

## Dashboard

`OrdersService.listDashboardOrders` lista os ultimos pedidos do tenant com status:

- `PREPARING`
- `SHIPPED`

Inclui itens, produtos e dados formatados via `mapOrderToDashboardCard`.

## Enviar Para Entrega

`OrdersService.sendOrderToDelivery`:

1. valida tenant;
2. busca pedido;
3. bloqueia pedido `DELIVERED`;
4. se ja estiver `SHIPPED`, retorna o estado atual;
5. exige `whatsappInstanceId`;
6. enfileira mensagem WhatsApp "Seu pedido saiu para entrega com o motoboy!";
7. muda status para `SHIPPED`;
8. emite evento realtime;
9. dispara `order.ready_for_pickup` quando o pedido e de entrega e ainda nao possui `Delivery`, fazendo o Delivery criar a corrida e notificar motoboys proximos.

## Alteracao de Status Pelo Kanban

`PATCH /delivery/orders/:orderId/status` recebe:

- `status`: `PREPARING`, `SHIPPED` ou `DELIVERED`;
- `notifyCustomer`: opcional; quando `true` e o status alvo e `SHIPPED`, envia a mensagem WhatsApp de saida para entrega;
- `paymentHandledBy`: opcional; repassa `RIDER` ou `STORE_MACHINE` ao evento logistico.

Regras:

- `PENDING` nao pode ser definido pelo kanban.
- `DELIVERED` nao volta para outros status.
- Mover para `SHIPPED` atualiza o pedido, emite realtime e dispara `order.ready_for_pickup` para criar/notificar a entrega quando aplicavel.
- Mover para `DELIVERED` completa a `Delivery` quando ela ja esta `PICKED_UP`, liberando rider e enfileirando payout; se a entrega ainda nao foi coletada, a rota bloqueia.
- Voltar para `PREPARING` e bloqueado quando existe entrega ativa, incluindo `WAITING_RIDER`, `READY_FOR_PICKUP`, `INCIDENT_REPORTED` e `DELIVERY_STAGNATED`.

## Contingencia No-Rider

O modulo Delivery monitora entregas `WAITING_RIDER` pela fila `delivery-no-rider-timeout`.

- Apos 10 minutos sem motoboy, aplica bonus dinamico, republica a oferta e mantem a entrega em `WAITING_RIDER`.
- Apos o timeout configurado do tenant, padrao 15 minutos, muda a entrega para `DELIVERY_STAGNATED` e notifica o lojista.
- Quando um motoboy reporta incidente, a entrega volta para a fila como `READY_FOR_PICKUP` com `isHighPriority=true`.
- O evento `delivery.incident_reported` aciona WhatsApp para o cliente e broadcast Socket.io prioritario para riders proximos.
- O reporte so e aceito apos coleta (`PICKED_UP` ou `IN_TRANSIT`) e bloqueia temporariamente o rider conforme configuracao do tenant.

## Serviço de Geocoding

`GeocodingService`:

1. Obtém coordenadas a partir de um endereço, enriquecendo com cidade, estado e país.
   Usa cache Redis para evitar chamadas repetidas à API do Google Maps.t;

2. Calcula a distância em quilômetros entre dois pontos usando a fórmula de Haversine.
   Útil para cálculos logísticos e de precificação;
3. Integração com Google Maps API;
4. Cache Redis com TTL de 30 dias;
5. Enriquecimento automático de endereços;
6. Método Haversine para cálculo de distância;

## Realtime

Namespace:

- `/orders`

Eventos:

- `order:finalized`
- `order:updated`

Sala:

- `owner:<userId>`

Autenticacao atual:

- `userId` em `handshake.auth` ou query string.

## Dados

Modelos principais:

- `Order`
- `OrderItem`
- `Product`
- `WhatsappInstance`
- `User`

## Riscos

- Auth realtime e leve.
- `x-user-id` precisa vir de uma borda confiavel.
- Pedidos `PENDING` nao aparecem no dashboard.
