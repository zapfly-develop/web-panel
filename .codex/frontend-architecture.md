Como o front-end utiliza React, TypeScript, Next16 e TailwindCSS com Shadcn/UI, o front-end deve ser estruturado para consumir os endpoints e eventos que planejamos no back-end.


## Visões Distintas: Loja vs. Entregador
O módulo de Delivery exige duas interfaces completamente diferentes:

A. Painel da Loja (Desktop First)
Focado em gestão e visão macro.

Mapa de Calor/Proximidade: Utilizar a latitude/longitude dos entregadores (que o LocationService do back-end provê via Redis) para mostrar quem está disponível ao redor da loja.

Gestão de Filas: Uma lista de pedidos PREPARING com um botão para "Enviar para Entrega", abrindo o modal de seleção de motoboy (Atribuição Manual).

B. App do Entregador (Mobile First / PWA)
Focado em agilidade e execução.

Toggle de Disponibilidade: Um botão de destaque (Online/Offline).

Card de Entrega Ativa: Exibindo a distância (calculada via Haversine no back-end) e botões de ação rápida para "Coletar" e "Finalizar".

Geolocalização em Background: Implementar o envio periódico da posição para o endpoint de localização enquanto o status for ONLINE.


## Estrutura de Pastas (Espelhamento Modular):
src/
  /features
    /delivery
      /components    # RiderCard, DeliveryMap, StatusBadge
      /hooks         # useRiderLocation, useAvailableDeliveries
      /services      # deliveryApi.ts
      /pages         # RiderDashboard, StoreDeliveryManager
    /wallet
      /components    # BalanceCard, TransactionHistory
      /hooks         # useWalletStatement, useWithdrawal
      /pages         # WalletOverview
  /shared
    /components      # UI do Shadcn, Layouts
    /lib             # socket.io client, api-client (Axios/Fetch)

## Integração Financeira (Wallet UI)
A interface da Carteira deve ser limpa e transmitir confiança, já que lida com o dinheiro do entregador:

Destaque de Saldos: Mostrar o balanceCents (disponível) e o frozenBalanceCents (saques em processamento) formatados para Real (R$).

Extrato de Transações: Uma tabela ou lista simples consumindo o GET /wallet/statement, categorizando créditos de entregas e débitos de saques.

Fluxo de Saque: Um formulário simples onde o entregador define o valor, validando contra o saldo disponível antes de enviar para o back-end.

## Comunicação Real-time e Push
Para o front-end reagir instantaneamente, você precisará conectar os namespaces do Socket.IO:

Socket.io: Escutar o namespace /orders para atualizar o dashboard da loja assim que um pedido for marcado como pronto.

Web Push API: No repositório front-end, você deve implementar o registro do Service Worker para capturar a PushSubscription e enviá-la para o módulo de notificações do back-end que planejamos.


## Estado Atual do Front-end (analisado em 2026-04-26)

Stack real do projeto:

- Next.js 16.1 com App Router.
- React 19.2.
- TypeScript.
- Tailwind CSS 4.
- Shadcn/UI via componentes em `src/components/ui`.
- NextAuth v5 beta com sessao JWT.
- Prisma Client apenas para leitura/escrita do painel atual; as migrations sao responsabilidade do back-end.
- Socket.IO client ja instalado e em uso.

Estrutura atual:

- `src/features/delivery` foi iniciado com services, componentes e pagina modular da loja.
- As telas principais ficam em `src/app/dashboard/*`.
- Componentes de dominio estao em `src/components/dashboard/*`.
- Servicos de borda ficam em `src/lib/*`.
- Proxies/handlers internos do Next ficam em `src/app/api/*`.

Padrao atual para consumir o back-end Nest:

- `src/lib/nest-api.ts` centraliza `NEST_API_URL` para server-side e `NEXT_PUBLIC_NEST_API_URL` para browser.
- Server-side usa `fetchNestApiJson<T>()`.
- Rotas de tenant enviam `x-user-id` com o id da sessao.
- Client-side evita expor o header diretamente quando a acao precisa da sessao: usa uma rota em `src/app/api/...` que chama `auth()` e repassa ao Nest.

Rotas ja existentes relacionadas a pedidos/delivery:

- `src/app/dashboard/orders/page.tsx`: tela desktop-first de pedidos do delivery.
- `src/components/dashboard/order-cards-dashboard.tsx`: cards em tempo real via namespace Socket.IO `/orders`.
- `src/lib/orders-dashboard.ts`: consome `/delivery/orders/dashboard` e `/delivery/orders/:orderId/send-to-delivery`.
- `src/app/api/dashboard/orders/[orderId]/send-to-delivery/route.ts`: proxy Next autenticado para acao de enviar pedido para entrega.

Eventos Socket.IO ja consumidos:

- Namespace: `/orders`.
- Eventos:
  - `orders:finalized`
  - `orders:updated`

Tipo atual de card de pedido:

- `DeliveryOrderCard` em `src/lib/orders-dashboard.types.ts`.
- Estados de pedido suportados na UI: `PENDING`, `PREPARING`, `SHIPPED`, `DELIVERED`.
- O card contem itens, endereco, taxa de entrega, total, cliente, instancia WhatsApp e timestamps.

Limite importante do que ja existe:

- A tela atual de `/dashboard/orders` gerencia o pedido operacional da loja e o aviso de saida.
- A tela `/dashboard/delivery` gerencia a entidade logistica `Delivery` do novo modulo.
- O botao atual "Enviar para Entrega" chama `/delivery/orders/:orderId/send-to-delivery`, nao `/delivery/deliveries/:deliveryId/assign`.
- Ja existe modal de selecao de entregador online para atribuicao manual em `/dashboard/delivery`.
- Ainda nao ha app mobile do entregador, carteira, Service Worker ou assinatura Web Push.


## Implementacao Front-end Delivery (2026-04-26)

Arquivos criados:

- `src/app/dashboard/delivery/page.tsx`
- `src/app/api/dashboard/delivery/riders/available/route.ts`
- `src/app/api/dashboard/delivery/deliveries/[deliveryId]/assign/route.ts`
- `src/features/delivery/services/delivery-types.ts`
- `src/features/delivery/services/delivery-api.ts`
- `src/features/delivery/pages/store-delivery-manager.tsx`
- `src/features/delivery/components/delivery-list.tsx`
- `src/features/delivery/components/delivery-status-badge.tsx`
- `src/features/delivery/components/rider-assignment-dialog.tsx`
- `src/features/delivery/components/rider-card.tsx`

Arquivos alterados:

- `src/app/dashboard/layout.tsx`: adiciona item de navegacao "Entregas" para `/dashboard/delivery`.

Comportamento entregue:

- `/dashboard/delivery` e uma tela desktop-first para gestao logistica da loja.
- Server component busca `GET /delivery/deliveries` usando `x-user-id` da sessao.
- UI mostra metricas por estado, busca local e filtros por status.
- Lista renderiza entregas com status, cliente, pedido, destino, rider, frete e repasse.
- Entregas em `WAITING_RIDER` ou `PENDING_ASSIGNMENT` abrem dialog de atribuicao.
- Dialog busca riders online via proxy Next `GET /api/dashboard/delivery/riders/available`.
- Atribuicao usa proxy Next `POST /api/dashboard/delivery/deliveries/:deliveryId/assign`, que chama o Nest com `x-user-id`.
- Apos atribuir, a tela atualiza estado local para mostrar rider e status novo.

Validacoes feitas:

- `npx eslint src/features/delivery src/app/dashboard/delivery src/app/api/dashboard/delivery src/app/dashboard/layout.tsx` passou.
- `npx tsc --noEmit --pretty false` passou.
- `npm run build` passou.

Observacoes de validacao:

- `npm run lint` completo ainda falha por debitos antigos fora do delivery, principalmente `no-explicit-any` e textos nao escapados em telas/admin/componentes legados.
- `npm run build` emitiu warnings/erros Prisma durante geracao estatica de paginas antigas, mas terminou com exit code 0.


## Implementacao Realtime e Rider PWA (2026-04-26)

Achado no back-end:

- Existem gateways Socket.IO para `/orders` e `/whatsapp-events`.
- Ainda nao existe gateway publico no Nest para os eventos internos do delivery.
- Os eventos internos ja existem no back-end via EventEmitter:
  - `delivery.assigned`
  - `delivery.status_changed`
  - `rider.new_available_delivery`
  - `rider.status_changed`

Realtime no front:

- `src/features/delivery/hooks/use-delivery-realtime.ts` conecta no namespace esperado `/delivery`.
- O hook escuta os quatro eventos logisticos acima.
- Enquanto o gateway `/delivery` nao existir no back-end, a tela usa fallback de polling.
- `/dashboard/delivery` agora refresca a lista quando recebe evento logistico ou, sem socket, a cada 20s.
- Com socket conectado, mantem polling leve a cada 60s como reconciliacao.
- Foi criado o proxy `GET /api/dashboard/delivery/deliveries` para permitir refresh client-side com sessao NextAuth.

App mobile/PWA do entregador:

- Rota criada: `/delivery/rider`.
- Arquivo principal: `src/app/delivery/rider/page.tsx`.
- UI client: `src/features/delivery/pages/rider-dashboard.tsx`.
- Manifest PWA criado em `src/app/manifest.ts`, com `start_url` em `/delivery/rider`.

Contratos usados pelo app do rider:

- `GET /delivery/riders/me` via proxy `GET /api/delivery/rider/me`.
- `PATCH /delivery/riders/me/availability` via proxy `PATCH /api/delivery/rider/availability`.
- `POST /delivery/riders/me/location` via proxy `POST /api/delivery/rider/location`.

Comportamento entregue no rider:

- Tela mobile-first sem layout do dashboard.
- Mostra perfil, veiculo, status cadastral e disponibilidade.
- Toggle online/offline envia `AVAILABLE` ou `OFFLINE`.
- Enquanto o rider esta `ACTIVE` e `AVAILABLE`, `use-rider-location.ts` inicia `navigator.geolocation.watchPosition`.
- Localizacao e enviada para o back-end com throttle minimo de 15s.
- Card de entrega ativa reage a eventos futuros `delivery.assigned` e `delivery.status_changed`.
- Botoes `Coletar` e `Finalizar` ficam desabilitados por enquanto, porque o back-end atual ainda escopa `pick-up` e `complete` pela loja, nao pelo rider.

Endpoints/front adicionados nesta etapa:

- `src/app/api/dashboard/delivery/deliveries/route.ts`
- `src/app/api/delivery/rider/me/route.ts`
- `src/app/api/delivery/rider/availability/route.ts`
- `src/app/api/delivery/rider/location/route.ts`
- `src/app/delivery/rider/page.tsx`
- `src/app/manifest.ts`
- `src/features/delivery/hooks/use-delivery-realtime.ts`
- `src/features/delivery/hooks/use-rider-location.ts`
- `src/features/delivery/pages/rider-dashboard.tsx`

Proximo encaixe necessario no back-end:

- Criar gateway `/delivery` que republique os eventos internos para rooms de loja/rider.
- Para o app do rider ficar completo, criar endpoint de entrega ativa/listagem escopado ao rider.
- Criar endpoints `pick-up` e `complete` escopados ao rider, ou ajustar o controller atual para aceitar a identidade do rider com validacao correta.


## Integracao Final com Back-end Realtime/Rider (2026-04-27)

Back-end informado como disponivel:

- Gateway Socket.IO `/delivery`.
- Eventos socket publicos:
  - `delivery:available`
  - `delivery:assigned`
  - `delivery:status_changed`
  - `rider:status_changed`
- Rotas do rider:
  - `GET /delivery/riders/me/active-delivery`
  - `POST /delivery/riders/me/deliveries/:deliveryId/accept`
  - `POST /delivery/riders/me/deliveries/:deliveryId/pick-up`
  - `POST /delivery/riders/me/deliveries/:deliveryId/complete`

Alteracoes no front:

- `delivery-types.ts` passou a usar os eventos `delivery:*` e `rider:*`.
- `delivery-api.ts` adicionou:
  - `createStoreDelivery`
  - `getMyActiveDelivery`
  - `acceptMyDelivery`
  - `pickUpMyDelivery`
  - `completeMyDelivery`
- Proxies Next adicionados:
  - `GET /api/delivery/rider/active-delivery`
  - `POST /api/delivery/rider/deliveries/:deliveryId/accept`
  - `POST /api/delivery/rider/deliveries/:deliveryId/pick-up`
  - `POST /api/delivery/rider/deliveries/:deliveryId/complete`
- `RiderDashboard` agora carrega entrega ativa real no SSR e faz refresh pelo proxy.
- Card mobile do rider mostra cliente, destino, telefone/WhatsApp, distancia e repasse.
- Acoes do rider ficaram funcionais:
  - Aceitar entrega quando `ASSIGNED` sem `acceptedAt`.
  - Coletar depois de aceitar.
  - Finalizar quando `PICKED_UP`.
- Apos cada acao, o front reconcilia perfil e entrega ativa.
- `/dashboard/orders` deixou de chamar o endpoint legado `send-to-delivery` para iniciar logistica.
- O botao de pedido agora cria/garante uma `Delivery` via `POST /delivery/deliveries`, mantendo o fluxo correto:
  1. Pedido `PREPARING`.
  2. Loja cria/garante entrega.
  3. Loja atribui rider em `/dashboard/delivery`.
  4. Rider aceita/coleta/finaliza em `/delivery/rider`.
  5. Back-end muda pedido para `SHIPPED` na coleta e `DELIVERED` na finalizacao.

Validacoes desta etapa:

- ESLint focado nos arquivos de delivery/pedidos passou.
- `npx tsc --noEmit --pretty false` passou.


## Variaveis de Ambiente Front-end (2026-04-27)

Padrao consolidado para URL do back-end Nest:

- `NEST_API_URL`: URL interna/server-side usada por rotas Next, server components e cron handlers.
- `NEXT_PUBLIC_NEST_API_URL`: URL publica/browser usada por client components e Socket.IO.
- `API_URL` foi removida do codigo do front para evitar ambiguidade.

Regras praticas:

- Desenvolvimento local no mesmo computador:
  - `NEST_API_URL=http://localhost:3001`
  - `NEXT_PUBLIC_NEST_API_URL=http://localhost:3001`
- Teste PWA em celular/rede local:
  - `NEST_API_URL=http://localhost:3001`
  - `NEXT_PUBLIC_NEST_API_URL=http://<IP_DA_MAQUINA>:3001`
- Docker:
  - `NEST_API_URL` do container Next e sobrescrito no `docker-compose.yml` para `http://nest:3001`.
  - `NEXT_PUBLIC_NEST_API_URL` entra como build arg do `Dockerfile.next`, pois `NEXT_PUBLIC_*` e embutido no bundle do browser.

Arquivos atualizados:

- `src/lib/nest-api.ts`: helper central para URLs do Nest.
- `src/app/admin/scraping/_lib/api.ts`: usa `NEXT_PUBLIC_NEST_API_URL` via helper.
- `src/components/BotConnectionManager.tsx`: usa helper publico, sem acesso direto a `process.env`.
- `src/components/BotTokenEditor.tsx`: usa helper publico, sem acesso direto a `process.env`.
- `src/app/api/cron/process-scheduled/route.ts`: usa `NEST_API_URL` via helper.
- `src/app/api/cron/process-schedules/route.ts`: usa `NEST_API_URL` via helper.
- `Dockerfile.next`: remove URL hardcoded e aceita `NEXT_PUBLIC_NEST_API_URL` como build arg.
- `docker-compose.yml`: passa build arg publico e sobrescreve `NEST_API_URL` interno do container Next.
- `.env.example`: criado com placeholders seguros.
- `.env.local`: corrigido para apontar o Nest em `3001`.
- `install.md`: removeu segredos de exemplo e passou a referenciar `.env.example`.

Observacao:

- `.env.local` tem precedencia sobre `.env` no Next. Se o realtime aparecer como `Polling`, conferir primeiro `NEXT_PUBLIC_NEST_API_URL` no `.env.local`.


## Refatoracao UX/UI de Pedidos da Loja (2026-04-27)

Objetivo:

- Trocar a tela vertical de cards longos por uma tela operacional de alta densidade.
- Espelhar a organizacao modular usada em `features/delivery`.
- Manter o fluxo logistico correto: pedido `PREPARING` cria/garante `Delivery`; `SHIPPED` e `DELIVERED` continuam vindo do rider ao coletar/finalizar.

Arquivos criados:

- `src/features/orders/services/order-types.ts`
- `src/features/orders/services/orders-api.ts`
- `src/features/orders/services/order-utils.ts`
- `src/features/orders/hooks/use-orders-realtime.ts`
- `src/features/orders/pages/store-orders-workspace.tsx`
- `src/features/orders/components/order-card.tsx`
- `src/features/orders/components/order-details-dialog.tsx`
- `src/features/orders/components/order-sla-indicator.tsx`
- `src/features/orders/components/order-status-badge.tsx`
- `src/features/orders/components/orders-card-view.tsx`
- `src/features/orders/components/orders-filter-bar.tsx`
- `src/features/orders/components/orders-kanban-board.tsx`
- `src/features/orders/components/orders-performance-summary.tsx`
- `src/features/orders/components/orders-table-view.tsx`
- `src/features/orders/components/rider-operations-map.tsx`
- `src/app/api/dashboard/orders/route.ts`

Arquivos alterados:

- `src/app/dashboard/orders/page.tsx`: virou uma casca server-side que carrega pedidos, entregas e riders iniciais.
- `src/lib/orders-dashboard.ts`: passou a reexportar o service novo de `features/orders`.
- `src/lib/orders-dashboard.types.ts`: passou a reexportar os tipos/eventos novos.
- `src/components/dashboard/order-cards-dashboard.tsx`: removido para evitar manter a UX antiga duplicada.

Comportamento entregue:

- A tela `/dashboard/orders` agora tem tres visualizacoes:
  - Kanban por status: `PENDING`, `PREPARING`, `SHIPPED`, `DELIVERED`.
  - Cards compactos.
  - Lista/tabela compacta para operacao com muitos pedidos.
- Barra de filtros:
  - Busca global por cliente, ID, endereco, item, rider e placa.
  - Filtro por status.
  - Filtro por forma de pagamento.
  - Filtro por horario: hoje, ultimas 2h, ultimas 6h ou tudo.
- Cabecalho operacional:
  - Vendas hoje.
  - Tempo medio de entrega.
  - Ticket medio.
  - Quantidade de pedidos atrasados.
- O status realtime foi reduzido para um indicador pequeno no filtro.
- A tela escuta:
  - Namespace `/orders`, com compatibilidade para `orders:*` e `order:*`.
  - Namespace `/delivery`, para reconciliar entregas/riders quando a logistica muda.
- Se algum socket cair, a tela mantem polling de reconciliacao.
- Cards mostram:
  - Resumo de itens em uma linha.
  - SLA do preparo com alerta aos 20 min e critico aos 35 min.
  - Forma de pagamento.
  - Estado da entrega logistica.
  - Rider atribuido quando existir. Como o contrato atual de `Rider` nao possui foto, a UI usa iniciais e aceita campos futuros `avatarUrl`, `photoUrl` ou `profileImageUrl` se o back-end passar.
- Acoes rapidas:
  - Ver detalhes em modal.
  - Imprimir via de cozinha via `window.print()`.
  - Chamar rider cria/garante uma `Delivery` via proxy `POST /api/dashboard/delivery/deliveries`.
  - Atribuir/acompanhamento direciona para `/dashboard/delivery`.
- Mini-mapa operacional:
  - Usa riders disponiveis e riders vinculados a entregas.
  - Usa Google Maps quando `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` estiver configurado.
  - Fonte preferencial de coordenadas: `rider.location.latitude/longitude`, enriquecida por `GET /delivery/riders/available`.
  - Fallback de coordenadas: `currentLatitude/currentLongitude`.
  - Sem evento `rider:location_changed`, a posicao e atualizada pela reconciliacao atual de polling/socket da tela.
  - Quando o back-end nao expuser coordenadas recentes, mostra o estado vazio no mapa e os riders sem sinal no painel lateral.

Limite deliberado:

- Nao foi criada movimentacao arbitraria de status por drag/drop, porque o contrato atual nao tem endpoint seguro para trocar qualquer status do pedido. O Kanban e visual/operacional; as transicoes seguem o fluxo real de logistica.

Validacoes:

- `npx eslint src/features/orders src/app/dashboard/orders/page.tsx src/app/api/dashboard/orders/route.ts src/lib/orders-dashboard.ts src/lib/orders-dashboard.types.ts` passou.
- `npx tsc --noEmit --pretty false` passou.


## Contratos do Back-end Relevantes para o Delivery Logistico

Identidade:

- As rotas atuais usam `x-user-id` como identidade de borda.
- Loja usa o `user.id` da sessao do painel.
- Entregador tambem usa `x-user-id`, mas com usuario que possui perfil `Rider`.

Entregadores:

- `POST /delivery/riders`
  - Cria perfil de entregador para o usuario logado.
  - Marketplace rider inicia `PENDING_REVIEW`.
  - Rider proprio da loja (`ownerUserId` ou `isStoreOwned`) inicia `ACTIVE`.
- `GET /delivery/riders/me`
  - Retorna o perfil `Rider` do usuario logado.
- `GET /delivery/riders/available`
  - Para a loja, retorna riders `ACTIVE` e operacionalmente online no Redis.
  - Inclui entregadores proprios da loja e marketplace (`ownerUserId = null`).
- `PATCH /delivery/riders/me/availability`
  - Body: `{ availabilityStatus: "AVAILABLE" | "OFFLINE" | "BUSY" | "ONLINE" }`.
  - `AVAILABLE` no Prisma equivale a `ONLINE` na presenca Redis.
- `POST /delivery/riders/me/location`
  - Body: `{ deliveryId?, latitude, longitude, accuracyMeters?, recordedAt? }`.
  - Grava localizacao efemera no Redis.
  - Se `deliveryId` for enviado, valida que a entrega pertence ao rider.

Entregas logisticas:

- `POST /delivery/deliveries`
  - Cria uma entrega para um `orderId`.
  - Pode receber `riderId`, `assignmentType`, `paymentHandledBy`, distancia e coordenadas.
- `GET /delivery/deliveries`
  - Lista ate 100 entregas da loja.
  - Query opcional: `status`.
  - Retorna `Delivery` com `rider`, `payout` e `order`.
- `POST /delivery/deliveries/:deliveryId/assign`
  - Body: `{ riderId }`.
  - Exige entrega em `WAITING_RIDER` ou legado `PENDING_ASSIGNMENT`.
  - Valida rider `ACTIVE` e `ONLINE`; ao atribuir, rider fica `BUSY`.
- `POST /delivery/deliveries/:deliveryId/pick-up`
  - Hoje o controller espera `x-user-id` da loja.
  - Exige entrega `ASSIGNED`; muda para `PICKED_UP` e pedido para `SHIPPED`.
- `POST /delivery/deliveries/:deliveryId/complete`
  - Hoje o controller espera `x-user-id` da loja.
  - Exige entrega `PICKED_UP`; muda entrega/pedido para `DELIVERED`, volta rider para `ONLINE` e enfileira payout.

Estados de entrega:

- Atuais principais: `WAITING_RIDER`, `ASSIGNED`, `PICKED_UP`, `DELIVERED`, `CANCELED`.
- Legados ainda existem no enum: `PENDING_ASSIGNMENT`, `ACCEPTED`, `IN_TRANSIT`.

Campos uteis de `Delivery` na UI:

- `id`, `orderId`, `ownerUserId`, `riderId`, `status`.
- `assignmentType`, `paymentHandledBy`, `orderTotalCollectedByStore`.
- `distanceMeters`, `quotedPriceCents`, `riderPayoutCents`, `currency`.
- `pickupAddress`, `destinationAddress`, coordenadas de origem/destino.
- `acceptedAt`, `pickedUpAt`, `deliveredAt`, `canceledAt`, `createdAt`, `updatedAt`.
- Relacoes retornadas na listagem: `rider`, `payout`, `order`.

Wallet:

- `GET /wallet/me`: retorna/cria carteira do usuario logado.
- `GET /wallet/statement`: retorna `{ items, filters }`.
- `POST /wallet/withdrawals`: body com `amountCents`, `currency?`, `idempotencyKey`, `pixKey?`, `pixKeyType?`, `description?`, `metadata?`.

Notifications/Web Push:

- `GET /notifications/vapid-public-key`.
- `POST /notifications/push-subscriptions`.
- `DELETE /notifications/push-subscriptions`.
- O front ainda precisa registrar Service Worker, converter VAPID key, capturar `PushSubscription` e salvar no back-end.


## Direcao Recomendada para o Modulo Delivery no Front-end

Criar a estrutura modular sem mover tudo de uma vez:

```txt
src/features/delivery/
  components/
    delivery-status-badge.tsx
    delivery-list.tsx
    rider-card.tsx
    rider-assignment-dialog.tsx
    rider-availability-toggle.tsx
    active-delivery-card.tsx
  hooks/
    use-rider-location.ts
    use-rider-availability.ts
    use-delivery-realtime.ts
  services/
    delivery-api.ts
    delivery-types.ts
  pages/
    store-delivery-manager.tsx
    rider-dashboard.tsx
```

Criar tambem, quando necessario:

```txt
src/features/wallet/
  components/
  services/
  pages/

src/shared/lib/
  api-client.ts
  socket-client.ts
  push-subscriptions.ts
```

Primeira evolucao segura:

1. Manter `/dashboard/orders` como tela de pedidos confirmados.
2. Criar uma area de gestao logistica da loja, por exemplo `/dashboard/delivery`, consumindo `GET /delivery/deliveries`.
3. Nessa area, mostrar entregas por estado e abrir modal de atribuicao com `GET /delivery/riders/available`.
4. Atribuir com `POST /delivery/deliveries/:deliveryId/assign`.
5. Reutilizar o visual atual do dashboard, mas reduzir cards informativos estaticos e priorizar listas densas, status e acoes operacionais.

Segunda evolucao:

1. Criar `/delivery/rider` ou `/rider` como app mobile-first para entregador.
2. Buscar perfil com `GET /delivery/riders/me`.
3. Alternar disponibilidade com `PATCH /delivery/riders/me/availability`.
4. Enviar localizacao em background enquanto estiver online usando `navigator.geolocation.watchPosition`.
5. Exibir card de entrega ativa e acoes `Coletar`/`Finalizar` quando houver endpoint/contrato adequado para acao do rider.

Observacao importante:

- No back-end atual, `pick-up` e `complete` em `DeliveryController` usam o `ownerUserId` da loja para escopo. Para um app de entregador real, sera melhor confirmar ou adicionar endpoints escopados ao rider antes de liberar esses botoes diretamente para usuarios entregadores.


## Referencia UX/UI para Delivery

Painel da loja:

- Desktop first.
- Denso, operacional e escaneavel.
- Evitar hero/marketing; usar cabecalho curto, filtros, metricas pequenas e lista/tabela de trabalho.
- Estados devem ser visiveis por cor e texto: aguardando rider, atribuido, coletado, entregue, cancelado.
- Atribuicao manual deve ser um dialog/sheet com busca/lista de riders online.
- Cards devem representar itens repetidos reais, nao secoes inteiras.

App do entregador:

- Mobile first / PWA.
- A primeira tela deve mostrar disponibilidade, entrega ativa e acoes principais.
- Botoes de acao precisam ser grandes, claros e resistentes a toque.
- Mostrar dinheiro e distancia com destaque, mas sem poluir a execucao.
- Enquanto online, comunicar claramente quando a localizacao estiver ativa, bloqueada ou com erro.
