# 11 - Auditoria Do NotificationModule

Data da analise: 2026-05-22.
Status apos correcao: modulo apto para Web Push/PWA e Expo Push nativo.

## Estado Atual

O NotificationModule opera como facade de notificacoes por usuario. O envio por
`sendToUsers()` consulta os tokens do usuario e dispara para os canais
disponiveis:

- Web Push para painel web/PWA;
- Expo Push para app nativo;
- limpeza automatica de tokens expirados;
- logs agregados `sent`, `expired` e `failed`.

Arquivos principais:

- `src/modules/notifications/notification.service.ts`
- `src/modules/notifications/notification.controller.ts`
- `src/modules/notifications/delivery-push-notification.listener.ts`
- `src/modules/notifications/notification-messages.ts`
- `src/modules/notifications/notification.types.ts`
- `prisma/schema.prisma`

## Persistencia De Tokens

Fonte principal:

```prisma
enum PushTokenType {
  EXPO
  WEB_PUSH
}

model UserDeviceToken {
  id             String        @id @default(uuid())
  userId         String
  token          String        @db.Text
  type           PushTokenType
  p256dh         String?       @db.Text
  auth           String?       @db.Text
  expirationTime DateTime?
  userAgent      String?       @db.Text
  deviceId       String?
  platform       String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@unique([type, token])
  @@index([userId, type, updatedAt])
}
```

Decisao tecnica:

- Expo usa `token` com `type = EXPO`.
- Web Push usa `token = endpoint`, com `p256dh`, `auth` e `expirationTime`
  estruturados.
- A tabela legada `PushSubscription` foi preservada para nao perder dados
  historicos; a migration faz backfill para `UserDeviceToken`.

Essa estrutura evita JSON opaco para Web Push e permite busca rapida por usuario
e tipo.

## Endpoints

| Metodo | Path | Uso |
| --- | --- | --- |
| GET | `/notifications/vapid-public-key` | retorna chave publica VAPID para PWA |
| POST | `/notifications/push-subscriptions` | registra Web Push do browser |
| DELETE | `/notifications/push-subscriptions` | remove Web Push por `endpoint` |
| POST | `/notifications/expo-push-tokens` | registra token Expo nativo |
| DELETE | `/notifications/expo-push-tokens` | remove token Expo por `token` |

Todos os endpoints de escrita usam `Authorization: Bearer <accessToken>` e
`@CurrentUser()`. `x-user-id` nao e contrato publico do modulo.

`DELETE` aceita query ou body opcional:

```http
DELETE /notifications/push-subscriptions?endpoint=...
DELETE /notifications/expo-push-tokens?token=...
```

## Diferenca: Web Push Vs Expo Push

Web Push:

- canal de browser/PWA;
- exige Service Worker, Push API e VAPID;
- payload abre deep link via `payload.data.url`;
- ideal para painel web, PWA e desktop/mobile browser.

Expo Push:

- canal nativo para app Expo;
- usa token `ExponentPushToken[...]`;
- nao usa VAPID nem Service Worker;
- passa pelo servico da Expo, que entrega para APNs/FCM;
- ideal para rider app nativo com `expo-notifications`.

Os canais sao complementares. Um mesmo usuario pode ter um token Expo no celular
nativo e uma subscription Web Push no painel.

## Pontos Fortes

- `onModuleInit` inicializa VAPID fora do constructor e registra log claro.
- `vapidReady` impede tentativa de Web Push sem configuracao.
- Expo tokens sao validados com `Expo.isExpoPushToken`.
- `Promise.allSettled` evita que uma falha cancele o lote todo.
- Tokens expirados sao removidos em lote.
- Listener usa handlers com arrow function e remove listeners em
  `onModuleDestroy`.
- Textos e rotas de notificacao foram separados em `notification-messages.ts`.

## Cuidados Para O Front

- Registrar Web Push somente em ambiente seguro HTTPS/PWA.
- Registrar Expo Push somente depois de permissao nativa concedida.
- Remover token/subscription no logout quando possivel.
- Nao pedir permissao na primeira tela publica.
- Normalizar deep links de delivery:
  - `/delivery/available?deliveryId=<id>` para tela operacional do rider;
  - `/delivery/active?deliveryId=<id>` para entrega ativa;
  - `/delivery/deliveries/<id>` para detalhe da loja;
  - `/delivery/tracking/<id>` apenas quando houver tracking publico seguro.

## Limitacoes Restantes

- Cliente final so recebe push se existir `User` resolvivel por telefone ou
  `customerUserId`; cliente WhatsApp anonimo ainda deve usar canal WhatsApp.
- Expo receipts detalhados ainda nao sao consultados em job posterior; hoje a
  limpeza ocorre pelos tickets imediatos, como `DeviceNotRegistered`.
- Se VAPID nao estiver configurado, Web Push e ignorado, mas Expo continua
  funcionando para usuarios com token nativo.

## Conclusao

O NotificationModule esta pronto para suportar painel web/PWA e o futuro app
Expo sem duplicar listeners. O front deve escolher o canal de registro conforme
a plataforma e tratar notificacoes como deep links autenticados.
