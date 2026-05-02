# Modulo Delivery

## Localizacao

- `src/modules/delivery/delivery.module.ts`
- `src/modules/delivery/controllers/rider.controller.ts`
- `src/modules/delivery/controllers/delivery.controller.ts`
- `src/modules/delivery/services/rider.service.ts`
- `src/modules/delivery/services/delivery.service.ts`
- `src/modules/delivery/services/delivery-incident.service.ts`
- `src/modules/delivery/services/location.service.ts`
- `src/modules/delivery/services/delivery-ready-for-pickup.listener.ts`
- `src/modules/delivery/services/stalled-rider-monitor.service.ts`
- `src/modules/delivery/services/pricing.service.ts`
- `src/modules/delivery/processors/payout.processor.ts`
- `src/modules/delivery/processors/stalled-rider-monitor.processor.ts`
- `src/modules/delivery/entities/delivery-events.entity.ts`
- `src/modules/delivery/entities/rider-status.entity.ts`
- `src/modules/delivery/dto/*`

Documento de integracao front-end:

- `.codex/modules/delivery-contingency-plans.md`
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
- Logistica: `Rider`, `Delivery`, `DeliveryEvent`, `DeliveryLocation` e `DeliveryPayout`.
- Presenca: status operacional e ultima coordenada do rider no Redis.
- Processamento assincrono: filas `delivery-payout`, `delivery-no-rider-timeout`, `delivery-client-absence` e `delivery-stalled-rider-monitor`.

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

## Endereco Operacional da Loja

- `StoreAddress` guarda endereco estruturado e geocodificado da loja por tenant.
- `PUT /delivery/store-address` cadastra/atualiza rua, numero, bairro, complemento, cidade, estado, CEP e coordenadas via Google Maps.
- `GET /delivery/store-address` retorna o endereco operacional da loja.
- `User.storeAddress` continua como espelho textual para compatibilidade com checkout e exibicao.
- Criacao de `Delivery` usa `StoreAddress` como origem, geocodifica o endereco do cliente com a cidade/estado da loja e calcula distancia/preco quando coordenadas nao forem informadas manualmente.

## Presenca e Rastreamento

`LocationService` usa Redis para status operacional e ultima localizacao do entregador.

Chaves:

- `delivery:riders:geo`
- `delivery:rider:location:<riderId>`
- `delivery:rider:status:<riderId>`
- `delivery:stalled-rider:<deliveryId>`

TTL de localizacao/status:

- `DELIVERY_RIDER_LOCATION_TTL_SECONDS`
- fallback: 120 segundos

TTL de ancora do monitor de rider parado:

- 24 horas

Regras:

- Status operacional interno usa `OFFLINE`, `ONLINE` e `BUSY`.
- No Prisma, `RiderAvailabilityStatus.AVAILABLE` representa o mesmo estado operacional que `RiderStatus.ONLINE`.
- Ao ficar `OFFLINE`, o rider e removido do GEO e das chaves de status/localizacao.
- Localizacao de rastreio nao deve ser persistida em `DeliveryLocation`; o historico persistido fica reservado para uso futuro/baixa frequencia.
- Respostas de `GET /delivery/riders/me`, `POST /delivery/riders/me/location` e listas de disponiveis podem enriquecer `currentLatitude`, `currentLongitude`, `lastLocationAt` e `location` a partir do Redis para compatibilidade com o front.
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
- `delivery.incident_reported`: emitido quando motoboy reporta incidente e a entrega volta como prioridade.
- `delivery.client_absent_reported`: emitido quando motoboy reporta cliente ausente; listener do AiAgent envia WhatsApp urgente ao cliente.
- `delivery.absent_customer_responded`: emitido quando o webhook WhatsApp recebe resposta do cliente durante `ABSENT_WAITING`.
- `delivery.rider_stalled_warning`: emitido quando motoboy atribuido fica parado por mais de 7 minutos.
- `delivery.rider_stalled_unassigned`: emitido quando motoboy atribuido fica parado por mais de 10 minutos e e removido da entrega.
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
- `delivery:customer_responded`: entregador vinculado quando cliente responde durante espera de ausencia.
- `delivery:rider_stalled_warning`: loja e entregador atribuido.
- `delivery:rider_stalled_unassigned`: loja e entregador removido.
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
- `READY_FOR_PICKUP`
- `INCIDENT_REPORTED`
- `DELIVERY_STAGNATED`
- `ASSIGNED`
- `PICKED_UP`
- `ARRIVED_AT_DESTINATION`
- `ABSENT_WAITING`
- `RETURNING_TO_MERCHANT`
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
- `NoRiderTimeoutMonitorService` agenda job recorrente a cada 1 minuto na fila `delivery-no-rider-timeout`.
- `StalledRiderMonitorService` agenda job recorrente a cada 1 minuto na fila `delivery-stalled-rider-monitor`.
- Apos 10 minutos desde `Delivery.riderSearchStartedAt`, aplica bonus de `User.dynamicFareBonusCents` em `Delivery.bonusValueCents`, marca `deliveryBonusApplied=true`, incrementa `riderPayoutCents` e republica a oferta para motoboys.
- Apos `User.stagnatedTimeoutMinutes` minutos desde `Delivery.riderSearchStartedAt` sem motoboy (padrao 15), muda a entrega para `DELIVERY_STAGNATED`, emite `delivery.status_changed` e enfileira WhatsApp para a loja.
- Ao atribuir ou aceitar uma entrega, o sistema grava `acceptedAt`, `acceptedLatitude` e `acceptedLongitude` a partir da ultima coordenada Redis do rider quando disponivel.
- Para entregas `ASSIGNED`, o monitor compara via Haversine a coordenada atual em `delivery:rider:location:<riderId>` com a ancora de movimento em `delivery:stalled-rider:<deliveryId>`.
- Se o rider se move 100m ou mais, a ancora Redis e atualizada para a nova posicao e o cronometro recomeça.
- Se o rider fica a menos de 100m da ancora por mais de 7 minutos, registra `DeliveryEvent.RIDER_STALLED_WARNING`, emite `delivery.rider_stalled_warning` e o modulo de notificacoes envia Web Push ao entregador.
- Se o rider fica a menos de 100m da ancora por mais de 10 minutos, registra `DeliveryEvent.RIDER_STALLED_UNASSIGNED`, remove o `riderId`, volta a entrega para `WAITING_RIDER`, reseta `riderSearchStartedAt`, bloqueia o rider em `Rider.incidentBlockedUntil`, derruba a presenca para `OFFLINE` e republica a corrida.
- `DeliveryIncidentService.handleRiderIncident` registra incidente reportado pelo motoboy, remove o `riderId`, muda a entrega para `READY_FOR_PICKUP`, marca `isHighPriority=true` e reseta `riderSearchStartedAt`/`updatedAt`.
- Incidente so e aceito quando a entrega esta `PICKED_UP` ou `IN_TRANSIT`.
- Ao reportar incidente ou ser removido por inatividade, o rider recebe bloqueio temporario em `Rider.incidentBlockedUntil`; a duracao e configurada em `User.riderIncidentCooldownMinutes`.
- Apos concluir a transaction de incidente, emite `delivery.incident_reported`.
- O listener de realtime transforma `delivery.incident_reported` em broadcast `delivery:available` para riders proximos com `isHighPriority=true` e `priorityLabel=ALTA_PRIORIDADE`.
- Motoboy pode reportar cliente ausente via `POST /delivery/riders/me/deliveries/:deliveryId/client-absent` ou alias `POST /delivery/deliveries/:deliveryId/client-absent`; as rotas antigas `report-absence` continuam como compatibilidade.
- Ausencia do cliente so e aceita quando a entrega esta `ARRIVED_AT_DESTINATION`; a entrega passa para `ABSENT_WAITING`, grava `absentClientAt`, registra `DeliveryEvent` com tipo `CLIENT_ABSENT_REPORTED` e congela em escrow a taxa de entrega da carteira da loja quando ainda nao houver reserva.
- Ao entrar em `ABSENT_WAITING`, o sistema agenda job BullMQ na fila `delivery-client-absence` com delay de 5 minutos.
- O worker `ClientAbsenceTimeoutProcessor` ignora o job se a entrega ja mudou de status; se ainda estiver `ABSENT_WAITING`, muda para `RETURNING_TO_MERCHANT`, emite `delivery.status_changed`, enfileira payout na fila `delivery-payout` e o PWA do motoboy recebe push orientando retorno para a loja.
- No mesmo acionamento, `delivery.client_absent_reported` dispara WhatsApp de alta prioridade para o cliente avisando que o entregador esta no endereco e que ha 5 minutos de espera.
- Se qualquer mensagem do cliente chegar pelo webhook WhatsApp enquanto a entrega estiver `ABSENT_WAITING` dentro da janela de 5 minutos, `delivery.absent_customer_responded` envia Socket.io ao PWA do motoboy com "O cliente respondeu! Aguarde mais um momento.".
- Atribuicao manual usa `assignRider`, valida rider disponivel para o tenant e tambem pode recuperar entrega `DELIVERY_STAGNATED` ou `READY_FOR_PICKUP`.
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
- `User.dynamicFareBonusCents` define o bonus aplicado quando uma entrega fica sem motoboy por 10 minutos.
- `User.stagnatedTimeoutMinutes` define quando a entrega vira `DELIVERY_STAGNATED`.
- `User.riderIncidentCooldownMinutes` define o tempo de bloqueio do rider apos reportar incidente ou ser removido por inatividade.
- Env vars sao fallback quando nao houver configuracao do tenant.
- `Delivery.deliveryBonusApplied` e `Delivery.bonusValueCents` auditam a contingencia aplicada.
- `Delivery.isHighPriority` prioriza entregas recolocadas na fila por incidente.
- `Delivery.acceptedLatitude` e `Delivery.acceptedLongitude` guardam a coordenada-base do aceite/atribuicao para monitoramento de rota.
- `Delivery.absentClientAt` marca quando o motoboy reportou cliente ausente.
- `Delivery.deliveryFeeEscrowedAt`, `Delivery.deliveryFeeEscrowCents` e `Delivery.deliveryFeeEscrowTransactionId` auditam a reserva financeira da taxa de entrega em escrow.
- `DeliverySafetyFundCoverage` audita a primeira cobertura mensal por loja do Fundo de Seguranca Floovi.
- `Delivery.riderSearchStartedAt` marca o inicio da busca por motoboy e e resetado quando uma entrega volta para a fila.
- `Rider.incidentBlockedUntil` impede atribuicao, aceite, disponibilidade online e notificacao de novas corridas ate expirar.
- `DeliveryIncident` guarda historico auditavel com `deliveryId`, `riderId`, `reason`, `description` e `createdAt`.
- `DeliveryEvent` registra eventos logisticos auditaveis; tipos atuais incluem `CLIENT_ABSENT_REPORTED`, `RIDER_STALLED_WARNING` e `RIDER_STALLED_UNASSIGNED`.

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

O processamento de entrega concluida:

- valida que a entrega esta `DELIVERED`;
- recalcula distancia/preco/repasse;
- cria ou atualiza `DeliveryPayout`;
- marca `PROCESSING` e depois `PAID`;
- emite `payout.processed`.

O processamento de retorno por cliente ausente:

- aceita entrega em `RETURNING_TO_MERCHANT`;
- paga 100% da taxa/repasse reservado ao motoboy;
- usa `DeliverySafetyFundCoverage` para cobrir a primeira ocorrencia mensal por loja com `FLOOVI_SAFETY_FUND`;
- quando coberto pelo fundo, libera o escrow da loja de volta para saldo disponivel;
- nas ocorrencias seguintes do mesmo mes, liquida o escrow da loja como `STORE_DEBIT`;
- marca o `DeliveryPayout` como `PAID` e emite `payout.processed` para credito na carteira do rider.

Tipos de acerto:

- `STORE_DEBIT`: pagamento ficou com a loja; ledger registra debito interno da loja.
- `RIDER_RETAINED`: pagamento ficou com o motoboy; ledger registra valor retido.
- `FLOOVI_SAFETY_FUND`: Floovi cobre a ocorrencia de retencao; o escrow da loja e liberado.

Fronteira com Wallet:

- Delivery calcula repasse e contexto logistico.
- Wallet registra saldo e lancamentos auditaveis.
- Delivery nao deve atualizar saldo de usuario diretamente.
- `payout.processed` credita `DELIVERY_PAYOUT` na carteira do entregador.
- Escrow de cliente ausente usa `DELIVERY_ESCROW/PENDING`; retorno para loja liquida ou libera esse escrow conforme a estrategia de custo.

## Endpoints

Entregadores:

- `POST /delivery/riders`
- `GET /delivery/riders/me`
- `GET /delivery/riders/me/active-delivery`
- `GET /delivery/riders/available`
- `PATCH /delivery/riders/me/availability`
- `POST /delivery/riders/me/location`
- `POST /delivery/riders/me/deliveries/:deliveryId/accept`
- `POST /delivery/riders/me/deliveries/:deliveryId/incidents`
- `POST /delivery/riders/me/deliveries/:deliveryId/pick-up`
- `POST /delivery/riders/me/deliveries/:deliveryId/complete`

Entregas:

- `POST /delivery/deliveries`
- `GET /delivery/deliveries`
- `POST /delivery/deliveries/:deliveryId/assign`
- `POST /delivery/deliveries/:deliveryId/report-incident`
- `POST /delivery/deliveries/:deliveryId/pick-up`
- `POST /delivery/deliveries/:deliveryId/complete`

## Riscos

- Carrinho e volatil: Redis perdido significa carrinho perdido.
- Draft order depende de endereco para delivery.
- Taxa de entrega e recalculada a partir do owner do carrinho.
- Rotas novas ainda confiam em `x-user-id`; autenticacao/autorizacao forte precisa ser aplicada na borda.
- `ownerUserId` em cadastro de rider proprio precisa de regra de permissao mais forte antes de abrir publicamente.
- Calculo de km e Haversine em linha reta; nao ha roteirizacao por mapa.
- Transferencia bancaria/PIX externa ainda nao esta conectada; o ledger interno ja credita a Wallet do rider.
- Event bus atual e interno ao processo; em multi-instancia sera preciso broker persistente ou barramento externo.
