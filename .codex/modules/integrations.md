# Integracoes Externas

## Redis

Usado por BullMQ e por varios servicos diretamente.

Env vars:

- `REDIS_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_DB`

Quando `REDIS_URL` existe, os servicos usam ela. Caso contrario, montam conexao por host/port/password/db.

Observacao:

- O `BullModule.forRoot` atual usa `REDIS_HOST` e `REDIS_PORT`.
- Defina `REDIS_HOST`/`REDIS_PORT` mesmo se tambem definir `REDIS_URL`.
- `REDIS_PASSWORD` e `REDIS_DB` sao usados por services diretos com `ioredis`, mas nao pelo root atual do BullMQ.

Filas principais relacionadas:

- `whatsapp-incoming`
- `whatsapp-outgoing`
- `whatsapp-media-outgoing`
- `ai-response`
- `send-message`
- `user-transfer`
- `delivery-payout`

## PostgreSQL e Prisma

Env var:

- `DATABASE_URL`

`PrismaService` usa `@prisma/adapter-pg` com pool `pg`.

Schema:

- `prisma/schema.prisma`

Modelos relevantes adicionados recentemente:

- `PushSubscription`: assinaturas Web Push por usuario/dispositivo.
- `DeliveryPayout`: ledger interno de repasse logistico.
- `Wallet`: saldo materializado por usuario.
- `WalletTransaction`: lancamentos financeiros internos.

## Evolution API

Responsavel pela ponte com WhatsApp.

Modulo:

- `src/modules/evolution`

Webhook principal:

- `/webhooks/evolution`

Eventos relevantes:

- `MESSAGES_UPSERT`
- `CONNECTION_UPDATE`

## Gemini

Responsavel por conversa, decisao estruturada e transcricao.

Modulo:

- `src/modules/ai-agent`

Pontos de atencao:

- chave obrigatoria `GEMINI_API_KEY`;
- fallback de modelo;
- circuit breaker em Redis;
- structured JSON para checkout WhatsApp.

## SyncPay

Responsavel por PIX.

Modulo:

- `src/modules/syncpay`

Usos:

- assinatura SaaS;
- venda Telegram;
- PIX online WhatsApp.

Observacao: repasse de entregador ainda nao liquida via SyncPay. O delivery registra `DeliveryPayout` e processa o ledger interno na fila `delivery-payout`; a integracao financeira real deve ser definida em etapa futura.

## Wallet / Ledger Interno

Responsavel por consistencia contabil interna.

Modulo:

- `src/modules/wallet`

Papel:

- registrar creditos, debitos, reservas, estornos e saques;
- materializar saldo por usuario/conta;
- manter trilha auditavel com origem e idempotencia;
- servir como fronteira entre regras de dominio e provedores financeiros.

Nao e papel do Wallet:

- calcular taxa de entrega;
- decidir comissao de motoboy;
- aplicar regra de plano SaaS;
- substituir SyncPay ou outro provedor externo.

Eventos de entrada planejados:

- `payout.processed`
- eventos futuros de Billing/Subscription quando houver credito, debito ou estorno interno.

## Web Push / VAPID

Responsavel por notificacoes PWA.

Modulo:

- `src/modules/notifications`

Biblioteca:

- `web-push`

Env vars:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Aliases aceitos:

- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_VAPID_SUBJECT`
- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`

Eventos logisticos notificados:

- `rider.new_available_delivery`
- `delivery.status_changed`

## Telegram

Responsavel por Telegram Business e MTProto.

Bibliotecas:

- `node-telegram-bot-api`
- `telegram`

Pontos de atencao:

- business connection por chat;
- session MTProto;
- flood limits;
- media cache;
- polling.

## ffmpeg

Necessario para converter audio WhatsApp/TTS para OGG/Opus.

Uso:

- `src/whatsapp/messaging/media-handler.service.ts`
