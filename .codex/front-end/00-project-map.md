# 00 - Mapa Do Projeto

## Produto

Floovi e um SaaS multitenant para atendimento, vendas e logistica em negocios
locais e digitais. O produto automatiza conversas via WhatsApp e Telegram,
mantem catalogo, gera pedidos, opera entregas com motoboys, envia notificacoes
PWA, cobra assinaturas e registra carteira financeira dos riders.

## Repositorios No Workspace

- `back-end`: NestJS, Prisma, PostgreSQL, Redis, BullMQ, Socket.IO, SyncPay,
  Evolution/WhatsApp, Telegram e regras de negocio.
- `web-panel`: Next.js 16, React 19, NextAuth, shadcn/ui, dashboard de loja,
  admin, billing, pedidos, delivery, rider PWA e wallet.
- `rider-app`: Expo/React Native, app dedicado do entregador com JWT, localizacao
  e APIs de rider.

## Backend Como Fonte De Verdade

Dados duraveis ficam no PostgreSQL via Prisma. Estado volatil fica no Redis:

- carrinho temporario;
- filas BullMQ;
- presenca e ultima localizacao do rider;
- debounce WhatsApp;
- locks de cron;
- cache runtime Telegram;
- rate limit WhatsApp.

O front nao deve gravar diretamente no banco do backend. Use HTTP/Socket.IO.
No `web-panel`, consultas diretas via Prisma ainda existem para auth/session e
legado interno; novas features de dominio devem preferir a API Nest.

## Dominios Que Importam Para O Front

- Auth: login, refresh token, logout, role efetiva e status de acesso.
- Merchant dashboard: WhatsApp, billing, pedidos, entregas, store address e mapa.
- Rider: onboarding, disponibilidade, localizacao, corridas, incidentes, carteira.
- WMS/logistics: packing, dispatch, DeliveryRun, clusterizacao e expedicao.
- Admin: metricas, usuarios, acesso, monitoramento financeiro e instancias.
- Notifications: Web Push com VAPID e Expo Push nativo via `UserDeviceToken`.
- Realtime: namespaces `/orders`, `/delivery` e `/whatsapp-events`.
- Integrations: webhooks Tray/Nuvemshop/Olist/Uappi. Atualmente e mais backend,
  mas qualquer tela futura deve tratar segredos e credenciais apenas no servidor.

## Stack Front-End Existente

Web panel:

- Next.js 16 App Router.
- React 19.
- NextAuth v5 beta.
- shadcn/ui e Radix.
- Tailwind.
- `socket.io-client`.
- `@react-google-maps/api`.
- Server Components + Client Components.
- Next API routes como BFF para algumas chamadas sensiveis.

Rider app:

- Expo 54.
- React Native 0.81.
- Secure Store para sessao.
- `socket.io-client`.
- `expo-location` e `expo-notifications`.
- API client com refresh automatico.

## Portas E URLs

- Backend local: `http://localhost:3001`
- Swagger backend: `http://localhost:3001/docs`
- Web panel local: normalmente `http://localhost:3000`
- Env web: `NEXT_PUBLIC_NEST_API_URL`
- Env rider app: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SOCKET_URL`

## Estado Atual Importante

- Auth JWT no backend existe e deve ser o padrao para clientes novos.
- `ALLOW_LEGACY_USER_ID_HEADER` permite legado em dev, mas em producao o front
  deve depender de Bearer token ou BFF seguro.
- Riders devem entrar no fluxo `/delivery/rider`, nao no dashboard de loja.
- Riders nao devem acessar dashboard, billing, admin ou APIs de loja.
- Wallet do rider ja tem API e UI no front.
- Store address geocodificado e base para distancia/preco de delivery.
- Delivery usa H3 no backend para clusterizacao e matchmaking quente, mas o
  front deve tratar `h3Index` como metadado de diagnostico, nao como regra.
- Integrations seguem Strategy Pattern: adapter traduz payload externo para
  `FlooviOrder`; `IntegrationsService` persiste pedido. Mercado Livre usa
  webhook indireto: `resource` + `user_id` resolvem credencial interna antes da
  traducao.
