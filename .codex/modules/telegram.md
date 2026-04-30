# Contexto Telegram

## Localizacao

- `src/telegram/*`

## Responsabilidade

Automacao Telegram com conta MTProto, Telegram Business Bot, templates, pagamentos, campanhas, scraping e transferencia de usuarios.

## Fachada

`TelegramService` e o ponto unico para controllers e outros modulos.

Ele delega para:

- `SessionService`: OTP e 2FA MTProto.
- `BusinessBotService`: handlers Telegram Business.
- `TemplateService`: envio de templates.
- `SchedulerService`: jobs agendados.
- `BotApiProvider`: Bot API e business connections.
- `MtprotoProvider`: cliente MTProto.

## Bootstrap

No `onModuleInit`, carrega `BotAccount` com:

- `isUserAccount=true`
- `session != null`
- `isActive=true`

Inicializa MTProto e, se houver `businessBotToken`, inicializa Business Bot.

## Business Bot

`BusinessBotService` registra:

- `business_connection`
- `business_message`
- `callback_query`

Regras:

- Business connection revogada marca `isEnabled=false`.
- Mensagem do dono da conta business e ignorada.
- Chat private valido registra `chatId -> connectionId`.
- Usuario novo recebe greeting.
- Mensagem livre vira job de IA.

## Greeting e Venda

`BusinessBotGreetingService`:

- envia template `WELCOME`;
- envia timed templates;
- agenda menu;
- agenda DONT_SELL.

`BusinessBotSalesService`:

- lista produtos;
- trata `buy:<productId>`;
- trata `buy_discount:<productId>:<percent>`;
- gera PIX SyncPay;
- cria `Sale`;
- envia audio PIX quando configurado.

## Templates

`TemplateService`:

- `TEXT`: envia direto.
- `COMBO`: enfileira.
- midia unica: enfileira.
- em contexto business usa Bot API.
- fora do contexto business usa MTProto.

Fila:

- `send-message`

Jobs:

- `send-combo`
- `send-single-media`
- `send-product-menu`

## Session MTProto

`SessionService`:

- envia codigo OTP;
- verifica codigo;
- verifica senha 2FA quando necessario;
- finaliza login salvando session no bot.

Endpoints:

- `POST /telegram/send-code`
- `POST /telegram/verify-code`
- `POST /telegram/verify-password`

## Scraping e Transferencia

`GroupScraperService`:

- valida grupo origem/destino;
- extrai membros;
- grava `GroupScrapingJob` e `ScrapedUser`;
- cria `UserTransfer`;
- distribui jobs ao longo do tempo.

`TransferProcessor`:

- concurrency 1;
- respeita limite diario;
- trata `FLOOD_WAIT`, `PEER_FLOOD`, privacidade e participante ja existente;
- usa Redis para estado de rate/flood via `RuntimeRegistryProvider`.

Fila:

- `user-transfer`

Jobs:

- `scrape-group`
- `transfer-user`

## Runtime Registry

`RuntimeRegistryProvider` guarda no Redis:

- token de bot;
- owner connection;
- chat connection;
- locks;
- contador de transferencia;
- flood wait.

## Endpoints

- `POST /telegram/send`
- `POST /telegram/send-code`
- `POST /telegram/verify-code`
- `POST /telegram/verify-password`
- `POST /telegram/register-business-bot`
- `POST /telegram/create-sale-checkout`
- `GET /telegram/bot-status`
- `POST /telegram/confirm-payment`
- `POST /telegram/scraper/start`
- `GET /telegram/scraper/jobs`
- `GET /telegram/scraper/progress/:jobId`
- `POST /telegram/scraper/retry/:jobId`

## Riscos

- Fluxos Telegram sao sensiveis a rate limit e `BUSINESS_PEER_INVALID`.
- Conexoes business precisam ser resolvidas por chat quando possivel.
- Existe muito estado runtime em Redis e memoria local.
- Mudancas em template/midia podem afetar envio Bot API e MTProto.

