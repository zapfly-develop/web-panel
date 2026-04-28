# Modulo Delivery

## Localizacao

- `src/modules/delivery/delivery.module.ts`
- `src/modules/delivery/controllers/rider.controller.ts`
- `src/modules/delivery/controllers/delivery.controller.ts`
- `src/modules/delivery/services/rider.service.ts`
- `src/modules/delivery/services/delivery.service.ts`
- `src/modules/delivery/services/location.service.ts`
- `src/modules/delivery/services/delivery-ready-for-pickup.listener.ts`
- `src/modules/delivery/services/pricing.service.ts`
- `src/modules/delivery/processors/payout.processor.ts`
- `src/modules/delivery/entities/delivery-events.entity.ts`
- `src/modules/delivery/entities/rider-status.entity.ts`
- `src/modules/delivery/dto/*`
- `src/modules/delivery/product.service.ts`
- `src/modules/delivery/tag.service.ts`
- `src/modules/delivery/temporary-cart.service.ts`
- `src/modules/delivery/delivery-order.service.ts`
- `src/modules/delivery/entities/temporary-cart.entity.ts`
- `src/modules/delivery/product-pricing.ts`

## Responsabilidades

- Catalogo, busca de produtos, tags, carrinho temporario, calculo de preco e sincronizacao de pedido WhatsApp.
- Logistica de entrega: entregadores, atribuicao de corrida, localizacao, precificacao por distancia e repasse.
- Eventos internos de logistica para notificacao, payout e integracoes futuras.

## Subdominios Internos

- Catalogo: produtos, tags, estoque e preco promocional.
- Checkout: carrinho temporario e criacao/sincronizacao de `Order`.
- Logistica: `Rider`, `Delivery`, `DeliveryLocation` e `DeliveryPayout`.
- Presenca: status operacional e ultima coordenada do rider no Redis.
- Processamento assincrono: fila `delivery-payout`.

## Catalogo

`ProductService` busca produtos por:

- tenant (`ownerUserId` ou instancia WhatsApp);
- titulo;
- descricao;
- categoria;
- tags;
- disponibilidade de estoque.

Produtos de delivery sao `ProductType.ONE_TIME`.

## Tags

`TagService` controla tags por subscriber/tenant:

- cria tag sem duplicar nome por tenant;
- anexa tags a produto do mesmo tenant;
- remove tags;
- lista tags com contagem de produtos.

Tags tambem entram no contexto de IA para busca semantica e recomendacoes.

## Preco

`getEffectiveProductPriceCents` aplica preco promocional somente se:

- `promotionalPriceCents` for numero finito;
- for maior que zero;
- for menor que `priceCents`.

Caso contrario, vale `priceCents`.

## Carrinho Temporario

`TemporaryCartService` usa Redis.

Chave:

- `delivery:cart:<whatsappId>`

TTL padrao:

- `DELIVERY_CART_TTL_SECONDS`
- fallback: 6 horas

Campos principais:

- `whatsappId`
- `instanceId`
- `ownerUserId`
- `items`
- `subtotalCents`
- `deliveryFeeCents`
- `totalCents`
- `deliveryType`
- `paymentMethod`
- `changeAmount`
- `deliveryAddress`
- `notes`

## Regras de Carrinho

- Quantidade deve ser inteiro positivo.
- Produto sem estoque (`stockQuantity=0`) bloqueia adicao.
- Quantidade acima do estoque bloqueia adicao.
- Carrinho nao pode misturar instancia ou catalog owner.
- Taxa de entrega vem de `User.deliveryFeeCents`.
- Total e subtotal + taxa de entrega quando houver itens.
- `setItemQuantity` com quantidade menor ou igual a zero remove produto.

## Pedido

`DeliveryOrderService` sincroniza carrinho com `Order`.

Fluxos:

- `syncPendingOrderFromCart`: cria/atualiza pedido `PENDING`.
- `saveLocationAndSyncDraftOrder`: converte latitude/longitude em endereco e sincroniza draft.
- `finalizePendingOrder`: muda pedido `PENDING` para `PREPARING`.
- `setPendingOrderPixPayload`: grava copia-e-cola Pix no pedido pendente.

## Localizacao de Checkout

Reverse geocode usa:

- `WHATSAPP_REVERSE_GEOCODE_URL`
- `WHATSAPP_REVERSE_GEOCODE_TIMEOUT_MS`
- `WHATSAPP_REVERSE_GEOCODE_USER_AGENT`

Fallback: texto com coordenadas.

## Presenca e Rastreamento

`LocationService` usa Redis para status operacional e ultima localizacao do entregador.

Chaves:

- `delivery:riders:geo`
- `delivery:rider:location:<riderId>`
- `delivery:rider:status:<riderId>`

TTL padrao:

- `DELIVERY_RIDER_LOCATION_TTL_SECONDS`
- fallback: 120 segundos

Regras:

- Status operacional interno usa `OFFLINE`, `ONLINE` e `BUSY`.
- No Prisma, `RiderAvailabilityStatus.AVAILABLE` representa o mesmo estado operacional que `RiderStatus.ONLINE`.
- Ao ficar `OFFLINE`, o rider e removido do GEO e das chaves de status/localizacao.
- Localizacao de rastreio nao deve ser persistida em `DeliveryLocation`; o historico persistido fica reservado para uso futuro/baixa frequencia.
- Busca por proximidade usa `GEOSEARCH`, com fallback para `GEORADIUS`.
- Atribuicao valida rider `ACTIVE` no Prisma e `ONLINE` no Redis.

## Eventos

Quando pedido e finalizado, `OrderEventsService.emitOrderFinalized` notifica o namespace `/orders`.

Eventos internos do delivery:

- `order.ready_for_pickup`: cria entrega a partir de `orderId` e `storeId`.
- `rider.status_changed`: emitido quando o rider alterna presenca.
- `rider.new_available_delivery`: emitido quando uma entrega fica `WAITING_RIDER`.
- `delivery.assigned`: emitido quando uma entrega e atribuida a rider.
- `delivery.status_changed`: emitido nas transicoes principais.
- `payout.processed`: emitido apos processamento do repasse interno.

## Realtime

Namespace Socket.IO:

- `/delivery`

Auth leve:

- `userId` no `handshake.auth.userId` ou query `userId`.

Eventos enviados:

- `delivery:available`: loja e entregadores proximos quando ha entrega aguardando motoboy.
- `delivery:assigned`: loja e entregador atribuido.
- `delivery:status_changed`: loja, entregador atribuido e cliente identificavel quando houver `customerUserId`.
- `rider:status_changed`: entregador e loja dona quando houver `ownerUserId`.

## Entregadores

`RiderService` gerencia o perfil logistico do entregador.

Campos principais:

- `userId`
- `ownerUserId`
- `isStoreOwned`
- `documentNumber`
- `cnhNumber`
- `vehicleType`
- `vehiclePlate`
- `status`
- `availabilityStatus` (campo Prisma de compatibilidade: `OFFLINE`, `AVAILABLE`, `BUSY`)
- `currentLatitude` e `currentLongitude` existem no schema, mas o rastreio atual usa Redis e nao deve atualizar esses campos a cada ping.

Regras atuais:

- `userId` vem do header `x-user-id` nas rotas do entregador.
- Marketplace rider inicia `PENDING_REVIEW`.
- Entregador proprio de loja inicia `ACTIVE`.
- Apenas rider `ACTIVE` pode mudar disponibilidade.
- Para atribuicao, o rider precisa estar cadastralmente `ACTIVE` e operacionalmente `ONLINE`.
- Ao receber entrega, o rider passa para `BUSY`; ao concluir, volta para `ONLINE`.
- `updateLocation` grava a coordenada efemera no Redis e pode validar uma entrega ativa do proprio rider.

## Entregas Logisticas

`DeliveryService` cria e orquestra a entrega vinculada a um pedido.

Estados:

- `WAITING_RIDER`
- `ASSIGNED`
- `PICKED_UP`
- `DELIVERED`
- `CANCELED`

Estados legados ainda existem no enum por compatibilidade:

- `PENDING_ASSIGNMENT`
- `ACCEPTED`
- `IN_TRANSIT`

Regras atuais:

- `ownerUserId` vem do header `x-user-id` nas rotas da loja.
- O pedido precisa pertencer ao tenant da loja.
- Um pedido so pode ter uma `Delivery`.
- Entrega criada sem rider nasce `WAITING_RIDER`.
- Entrega criada por `order.ready_for_pickup` usa `createDeliveryFromReadyForPickup`.
- Entrega com `riderId` nasce `ASSIGNED`.
- Atribuicao manual usa `assignRider` e valida rider disponivel para o tenant.
- Ao atribuir, o rider fica operacionalmente `BUSY` para evitar dupla atribuicao.
- Aceite do motoboy grava `acceptedAt`, sem mudar o estado principal.
- Ao coletar, a entrega vai para `PICKED_UP` e o pedido vai para `SHIPPED`.
- Ao finalizar, a entrega e o pedido vao para `DELIVERED`, o rider volta para `ONLINE` e um job de payout e enfileirado.
- `paymentHandledBy` pode ser `RIDER` ou `STORE_MACHINE`.
- `orderTotalCollectedByStore=true` quando `paymentHandledBy=STORE_MACHINE`.

## Precificacao

`PricingService` calcula valor da entrega e repasse do entregador.

Env vars:

- `DELIVERY_BASE_FEE_CENTS`
- `DELIVERY_PRICE_PER_KM_CENTS`
- `DELIVERY_RIDER_PAYOUT_PERCENT`

Formula atual:

- distancia = Haversine em linha reta entre coordenadas da loja e do cliente;
- taxa de entrega = taxa base + distancia em km * preco por km;
- repasse = taxa de entrega * percentual de repasse.

Configuracao:

- `User.deliveryFeeCents` pode atuar como taxa base do tenant.
- Env vars sao fallback quando nao houver configuracao do tenant.

## Variaveis de Ambiente

Obrigatorias para delivery:

- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`

Opcionais:

- `REDIS_URL`
- `REDIS_PASSWORD`
- `REDIS_DB`
- `DELIVERY_CART_TTL_SECONDS` fallback: 21600
- `DELIVERY_RIDER_LOCATION_TTL_SECONDS` fallback: 120
- `DELIVERY_BASE_FEE_CENTS` fallback: 500
- `DELIVERY_PRICE_PER_KM_CENTS` fallback: 250
- `DELIVERY_RIDER_PAYOUT_PERCENT` fallback: 100
- `WHATSAPP_REVERSE_GEOCODE_URL`
- `WHATSAPP_REVERSE_GEOCODE_TIMEOUT_MS` fallback: 8000
- `WHATSAPP_REVERSE_GEOCODE_USER_AGENT`

Nota: o `BullModule.forRoot` atual usa `REDIS_HOST` e `REDIS_PORT`; services diretos tambem aceitam `REDIS_URL`.

## Repasse

`PayoutProcessor` consome a fila `delivery-payout`.

Job:

- fila: `delivery-payout`
- nome: `process-delivery-payout`
- payload preferencial: `{ deliveryId }`
- payload legado aceito: `{ payoutId }`

O processamento atual:

- valida que a entrega esta `DELIVERED`;
- recalcula distancia/preco/repasse;
- cria ou atualiza `DeliveryPayout`;
- marca `PROCESSING` e depois `PAID`;
- emite `payout.processed`.

Tipos de acerto:

- `STORE_DEBIT`: pagamento ficou com a loja; ledger registra debito interno da loja.
- `RIDER_RETAINED`: pagamento ficou com o motoboy; ledger registra valor retido.

A liquidacao financeira real deve ser integrada futuramente com Wallet, conta bancaria ou provedor de pagamento.

Fronteira com Wallet:

- Delivery calcula repasse e contexto logistico.
- Wallet registra saldo e lancamentos auditaveis.
- Delivery nao deve atualizar saldo de usuario diretamente.
- `payout.processed` deve ser a ponte futura para criar lancamentos no Wallet.

## Endpoints

Entregadores:

- `POST /delivery/riders`
- `GET /delivery/riders/me`
- `GET /delivery/riders/me/active-delivery`
- `GET /delivery/riders/available`
- `PATCH /delivery/riders/me/availability`
- `POST /delivery/riders/me/location`
- `POST /delivery/riders/me/deliveries/:deliveryId/accept`
- `POST /delivery/riders/me/deliveries/:deliveryId/pick-up`
- `POST /delivery/riders/me/deliveries/:deliveryId/complete`

Entregas:

- `POST /delivery/deliveries`
- `GET /delivery/deliveries`
- `POST /delivery/deliveries/:deliveryId/assign`
- `POST /delivery/deliveries/:deliveryId/pick-up`
- `POST /delivery/deliveries/:deliveryId/complete`

## Riscos

- Carrinho e volatil: Redis perdido significa carrinho perdido.
- Draft order depende de endereco para delivery.
- Taxa de entrega e recalculada a partir do owner do carrinho.
- Rotas novas ainda confiam em `x-user-id`; autenticacao/autorizacao forte precisa ser aplicada na borda.
- `ownerUserId` em cadastro de rider proprio precisa de regra de permissao mais forte antes de abrir publicamente.
- Calculo de km e Haversine em linha reta; nao ha roteirizacao por mapa.
- Repasse financeiro real ainda nao esta conectado a carteira/provedor externo.
- Event bus atual e interno ao processo; em multi-instancia sera preciso broker persistente ou barramento externo.
