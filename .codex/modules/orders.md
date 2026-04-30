# Modulos Orders e Order Events

## Localizacao

- `src/modules/orders/*`
- `src/modules/order-events/*`

## Responsabilidade

Fornecer dashboard operacional de pedidos e eventos realtime para a loja.

## Endpoints

- `GET /delivery/orders/dashboard`
- `POST /delivery/orders/:orderId/send-to-delivery`

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
8. emite evento realtime.

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

