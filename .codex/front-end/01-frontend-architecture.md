# 01 - Arquitetura Front-End

## Objetivo

O front deve ser dividido por experiencia de usuario, nao por tabela:

- Area publica: login, cadastro de loja, cadastro de rider, termos.
- Merchant app: dashboard operacional da loja.
- Rider app/PWA: operacao mobile do motoboy.
- Admin app: monitoramento e gestao interna.
- BFF/API routes: camada server-side para proteger sessao, tokens e headers.

## Regra De Ouro

O front nao decide regra de negocio critica. Ele pode validar para UX, mas o
backend continua decidindo:

- quem pode acessar;
- status permitido;
- saldo suficiente;
- status logistico valido;
- valor de repasse;
- taxa de entrega;
- geocoding e distancia;
- assinatura ativa;
- bloqueio de rider.

## Camadas Recomendadas No Web Panel

Use este desenho para novas features:

```text
src/app/<area>/page.tsx
  -> carrega sessao no server quando possivel
  -> chama service de feature ou route handler

src/features/<domain>/services/*.ts
  -> funcoes de API tipadas
  -> sem JSX

src/features/<domain>/services/*-types.ts
  -> contratos TypeScript do backend

src/features/<domain>/components/*.tsx
  -> UI pura e estados locais

src/features/<domain>/hooks/*.ts
  -> realtime, polling, geolocation, push subscription

src/app/api/<domain>/*
  -> BFF quando precisar esconder token/header ou usar sessao NextAuth
```

## Quando Usar BFF

Use Next API route quando:

- a chamada precisa derivar `userId` da sessao server-side;
- precisa trocar sessao NextAuth por JWT interno;
- precisa proteger segredo;
- precisa adaptar payload do browser;
- precisa impedir que o cliente envie `x-user-id` manualmente.

Pode chamar Nest direto do client quando:

- estiver usando Bearer access token do backend;
- o endpoint for publico;
- nao houver segredo;
- o payload nao precisa de enriquecimento server-side.

## API Client

Padrao do `web-panel`:

- `src/lib/nest-api.ts`
- le `NEXT_PUBLIC_NEST_API_URL`;
- monta `Accept: application/json`;
- quando recebe `x-user-id` server-side e existe `NEST_API_JWT_SECRET`, gera JWT
  interno curto e remove `x-user-id`.

Padrao do `rider-app`:

- `src/services/api-client.ts`
- usa `EXPO_PUBLIC_API_URL`;
- guarda access/refresh token;
- em `401`, tenta `POST /auth/refresh`;
- se refresh falhar, limpa sessao.

## Estado De UI

- Server data inicial para telas principais.
- Client state para filtros, modais, optimistic UI leve e geolocation.
- Realtime deve invalidar/refazer fetch quando payload for parcial.
- Para listas operacionais, mantenha fallback de polling manual ou botao atualizar.

## Realtime

Use `socket.io-client`.

Namespaces:

- `/orders`: dashboard de pedidos da loja.
- `/delivery`: entrega, rider e eventos logisticos.
- `/whatsapp-events`: status de instancia WhatsApp.

Handshake atual usa `auth.userId` ou query `userId`. Em uma borda mais segura,
prefira evoluir para token, mas nao quebre o contrato atual sem backend.

## Web Push

O front e responsavel por:

- registrar Service Worker;
- pedir permissao ao usuario no momento certo;
- chamar `GET /notifications/vapid-public-key`;
- converter VAPID key para `Uint8Array`;
- criar `PushSubscription`;
- chamar `POST /notifications/push-subscriptions`;
- remover subscription com `DELETE /notifications/push-subscriptions`, enviando
  `endpoint` na query ou no body.

O backend envia push e limpa endpoints expirados.

## Expo Push

O app nativo e responsavel por:

- pedir permissao com `expo-notifications`;
- obter `ExponentPushToken[...]`;
- chamar `POST /notifications/expo-push-tokens`;
- remover token no logout com `DELETE /notifications/expo-push-tokens`.

O backend persiste Web Push e Expo Push em `UserDeviceToken`; o front so escolhe
o endpoint certo para a plataforma.

## Google Maps

O backend usa Google Maps/geocoding para endereco da loja e coordenadas. O front
pode usar mapa para visualizacao, mas nao deve substituir a coordenada oficial
sem passar pelo endpoint `PUT /delivery/store-address`.

No web-panel ja existe helper de loader em:

- `/home/rogerio/floovi/web-panel/src/features/orders/services/google-maps-loader.ts`

## Tratamento De Erro

O backend costuma responder:

```ts
type ApiErrorPayload = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};
```

Na UI:

- mostre `message` quando string;
- quando array, junte em lista simples;
- para `401`, redirecione/renove sessao;
- para `403`, mostre acesso negado e volte ao home correto do papel;
- para `409`, mostre conflito de estado e refaca fetch;
- para `400`, destaque campos quando a mensagem permitir.
