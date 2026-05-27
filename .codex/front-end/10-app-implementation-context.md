# 10 - Contexto De Implantacao Do App Floovi

Este documento e o roteiro de implementacao para um futuro app Floovi, cobrindo
web mobile/PWA e app nativo. Ele deve ser lido depois dos contratos de API.

## Decisao De Plataforma

Existem duas superficies possiveis:

- Rider PWA no `web-panel`: reaproveita Next.js, Web Push e rotas existentes.
- Rider app Expo: experiencia nativa, Secure Store, `expo-location` e futura
  notificacao nativa.

Para primeira versao operacional, a rota de menor risco e consolidar o Rider PWA
e depois portar a experiencia para Expo mantendo os mesmos contratos. A regra
nao muda: backend continua sendo a fonte de verdade.

## Ambientes

Backend local:

```text
http://localhost:3001
```

Web panel:

```text
NEXT_PUBLIC_NEST_API_URL=http://localhost:3001
```

Rider app:

```text
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_SOCKET_URL=http://localhost:3001
```

Producao deve ter:

- HTTPS obrigatorio para Web Push e geolocation;
- Redis ativo para carrinho, filas, presence, H3 e realtime logistico;
- VAPID configurado para PWA;
- `expo-server-sdk` instalado no backend para Expo Push;
- Postgres migrado antes de liberar telas que dependem de novos campos;
- CORS liberado apenas para dominios oficiais.

## Boot Do App

Sequencia minima:

1. Restaurar sessao local.
2. Validar access token ou renovar com `POST /auth/refresh`.
3. Resolver `user.role`, `merchantId`, `riderId` e `accessStatus`.
4. Redirecionar por papel.
5. Inicializar Socket.IO apenas depois de usuario autenticado.
6. Inicializar push/geolocation somente por consentimento.
7. Em `401`, tentar refresh uma vez; em falha, limpar sessao.

Nao inicialize sockets, tracking ou push em tela publica.

## Armazenamento De Sessao

Web:

- preferir cookie httpOnly via BFF para refresh token;
- access token pode ficar em memoria ou ser trocado por chamada server-side;
- nao guardar segredo em `NEXT_PUBLIC_*`.

Expo:

- usar Secure Store para refresh/access token;
- manter access token tambem em memoria para reduzir I/O;
- limpar Secure Store no logout e em refresh invalido.

## Roteamento Por Papel

Rotas finais esperadas:

- Admin: `/admin/dashboard`
- Merchant: `/dashboard`
- Merchant sem assinatura ativa: `/billing`
- Rider: `/delivery/rider`
- Publico: `/login`, `/register`, `/delivery/rider/register`

Bloqueios:

- rider nao acessa merchant/admin;
- merchant nao acessa rider;
- admin nao cai no dashboard de loja;
- rotas mobile devem devolver tela de login em sessao expirada, nao erro cru.

## Modulos Do App

### Auth

Telas:

- login;
- refresh silencioso;
- logout;
- estado banido.

Contratos:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### Merchant

Telas:

- dashboard;
- orders;
- delivery;
- WhatsApp;
- billing;
- produtos quando contratos estiverem estabilizados.

Dependencias:

- store address precisa estar configurado antes de fluxo logistico completo;
- Socket.IO `/orders` e `/delivery` sao reconciliacao, nao banco local.

### Rider

Telas:

- onboarding;
- home operacional;
- lista de entregas disponiveis;
- entrega ativa;
- incidente;
- cliente ausente;
- wallet.

Sequencia para ficar online:

1. Validar perfil `ACTIVE`.
2. Pedir permissao de localizacao.
3. `PATCH /delivery/riders/me/availability`.
4. `POST /delivery/riders/me/location`.
5. Conectar `/delivery`.
6. Registrar push se o usuario consentir.

O backend usa Redis/H3 para matchmaking; o app so envia coordenada precisa.

### Wallet

Telas:

- saldo;
- extrato;
- saque.
- zonas de calor financeiras/operacionais do rider, quando o app tiver mapa.

Regras:

- valores em centavos;
- `idempotencyKey` por tentativa real;
- nunca calcular saldo final no front.
- hotzones vem de `GET /delivery/riders/me/analytics?hotzoneLimit=12`; use
  `spatial.hotzones[].boundary` para desenhar hexagonos e
  `efficiencyScore`/`totalRiderProfitCents` para intensidade visual.

### Notifications

PWA/Web Push:

- pedir permissao apos acao contextual;
- buscar VAPID;
- registrar service worker;
- salvar subscription;
- remover subscription no logout quando possivel.

Expo nativo:

- pedir permissao com `expo-notifications`;
- registrar `ExponentPushToken[...]` em `POST /notifications/expo-push-tokens`;
- remover token no logout com `DELETE /notifications/expo-push-tokens`;
- usar deep links autenticados no payload de notificacao.

O backend guarda os dois canais em `UserDeviceToken`, com `WEB_PUSH` para PWA e
`EXPO` para app nativo.

## Estado E Cache

Use cache por tela, mas invalide em:

- status de pedido;
- status de delivery;
- wallet apos saque/payout;
- reconnect Socket.IO;
- retorno do app do background;
- erro `409` ou `403`.

Evite cache persistente para:

- saldo;
- delivery ativa;
- permissao de acesso;
- status de assinatura.

## Geolocation

Rider:

- enviar coordenada enquanto `ONLINE` e durante entrega ativa;
- usar intervalo adaptativo;
- pausar quando `OFFLINE`;
- incluir `accuracyMeters` quando disponivel;
- incluir `deliveryId` quando estiver rastreando entrega ativa.
- nao calcular H3 no app; o backend converte coordenada em `h3Index` e usa Redis
  para matchmaking.

Merchant:

- mapa e apenas visualizacao;
- endereco oficial da loja vem de `PUT /delivery/store-address`.

## Realtime

Conectar:

- `/orders` para merchant;
- `/delivery` para merchant e rider;
- `/whatsapp-events` para merchant.

Politica:

- socket informa mudanca;
- HTTP confirma estado;
- reconnect sempre refaz fetch da tela atual.

## Push E Deep Link

Service worker deve:

- fazer parse seguro de JSON;
- exibir `title`, `body`, `icon`;
- abrir `payload.data.url`;
- focar aba existente se houver;
- usar fallback por papel.

Rotas de push precisam ser normalizadas:

- `/delivery/available?deliveryId=` -> rider home com entrega destacada;
- `/delivery/active?deliveryId=` -> entrega ativa do rider;
- `/delivery/deliveries/:id` -> detalhe da loja;
- `/delivery/tracking/:id` -> reservado para cliente futuro.

## Observabilidade Front-End

Logar de forma estruturada:

- falha de refresh;
- falha de push registration;
- permission denied de geolocation;
- reconnect Socket.IO;
- eventos desconhecidos;
- erro 409 em mutacao operacional.

Nao logar:

- token;
- refresh token;
- VAPID private key;
- chaves Pix sensiveis;
- payload completo de cliente quando tiver documento/telefone.

## Checklist De Release

Backend:

- migrations aplicadas;
- Redis e Postgres saudaveis;
- VAPID configurado se PWA push estiver habilitado;
- Expo Push validado se o app nativo estiver habilitado;
- Swagger abre;
- `npm run build` passa.

Web:

- `npm run build`;
- rotas protegidas por role;
- service worker em HTTPS;
- push testado com permissao concedida e negada;
- geolocation testado com permissao concedida e negada.

Mobile/Expo:

- `npm run typecheck`;
- login/refresh/logout;
- Secure Store limpo no logout;
- foreground/background location conforme decisao;
- push nativo registrado em `POST /notifications/expo-push-tokens`.

## Criterios Para MVP Do App Rider

MVP aceitavel:

- login JWT;
- perfil rider;
- ficar online/offline;
- envio de localizacao;
- lista de entregas disponiveis;
- aceitar entrega;
- ver entrega ativa;
- coletar;
- concluir;
- reportar incidente;
- reportar cliente ausente;
- wallet read-only.

Fora do MVP:

- tracking publico de cliente;
- background location agressivo;
- roteirizacao visual avancada;
- edicao de dados financeiros.
