# Contexto WhatsApp

## Localizacao

- `src/whatsapp/*`
- `src/modules/evolution/*`
- `src/modules/operating-hours/*`

## Responsabilidade

Integracao com WhatsApp via Evolution API, incluindo instancia, webhooks, entrada, debounce, IA, carrinho, saida, midia, handover e realtime.

## Instancias

`WhatsappInstanceService`:

- cria instancia gerenciada por usuario;
- usa nome `user_<userId>`;
- consulta status remoto na Evolution;
- gera QR Code;
- recria instancia quando local existe mas remoto nao;
- garante escopo por `x-user-id`;
- persiste status local `CONNECTED`, `CONNECTING` ou `DISCONNECTED`.

Endpoints:

- `POST /whatsapp/connect`
- `GET /whatsapp/qr-code`
- CRUD `/whatsapp`

## Evolution

`EvolutionService` encapsula HTTP:

- criar instancia;
- conectar;
- status;
- logout/delete;
- enviar texto;
- enviar midia;
- enviar audio WhatsApp;
- presence;
- read receipt;
- buscar base64 de midia recebida.

Env vars:

- `EVOLUTION_API_URL` ou `EVOLUTION_BASE_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_TIMEOUT_MS`
- `EVOLUTION_WEBHOOK_URL`
- `MY_APP_WEBHOOK_URL`
- `NEST_API_URL`

## Webhook

Endpoint:

- `POST /webhooks/evolution`

Fluxo:

1. `EvolutionWebhookService` parseia evento e persiste `WebhookEvent`.
2. Busca `WhatsappInstance` por `instanceName`.
3. `MESSAGES_UPSERT` vai para `EvolutionWebhookMessageService`.
4. `CONNECTION_UPDATE` atualiza status local e emite realtime.

## Entrada de Mensagem

`EvolutionWebhookMessageService`:

- ignora mensagens sem chat ou do proprio sistema;
- marca atividade para debounce;
- upserta `WhatsappCustomer`;
- verifica horario de funcionamento;
- envia auto-reply de loja fechada quando aplicavel;
- enfileira ou debouceia mensagem.

Filas:

- `whatsapp-incoming`

Job:

- `process-whatsapp-incoming`

## Debounce e Typing

Textos podem ser agrupados antes da IA.

Env vars:

- `WHATSAPP_INCOMING_DEBOUNCE_MS`
- `WHATSAPP_PRE_AI_TYPING_DELAY_MS`

O fluxo tambem envia indicador de digitacao antes de processar IA para parecer mais natural.

## Handover

Palavras-chave:

- `atendente`
- `problema`

Quando ha handover aberto, a IA nao responde.

Modelo:

- `WhatsappHandover`

## Saida

Filas:

- `whatsapp-outgoing`
- `whatsapp-media-outgoing`

`WhatsappIncomingReplyService`:

- quebra respostas longas;
- escolhe tipo de midia por template;
- agenda confirmacao atrasada do carrinho;
- salva mensagens do modelo.

`WhatsappOutgoingProcessor`:

- descarta confirmacao atrasada se houve nova atividade;
- prepara midia;
- delega video/midia pesada para fila separada.

`WhatsappSenderService`:

- envia read receipt;
- simula typing;
- aplica rate limit por instancia no Redis;
- chama Evolution.

Rate limit atual:

- 20 mensagens por minuto por instancia.

## Midia

`MediaHandlerService`:

- resolve preview templates;
- baixa midia remota;
- valida MIME;
- converte audio para OGG/Opus com ffmpeg;
- gera TTS quando texto contem `[AUDIO]`.

Env vars:

- `WHATSAPP_TTS_API_URL`
- `WHATSAPP_TTS_API_TOKEN`
- `WHATSAPP_TTS_VOICE`
- `WHATSAPP_TTS_INPUT_FORMAT`
- `WHATSAPP_TTS_TIMEOUT_MS`
- `WHATSAPP_MEDIA_FETCH_TIMEOUT_MS`
- `WHATSAPP_MEDIA_HEAD_TIMEOUT_MS`

## Realtime

Namespace:

- `/whatsapp-events`

Evento:

- `whatsapp:instance-status`

Sala:

- `owner:<userId>`

## Riscos

- O webhook depende de `instanceName` bater com a instancia local.
- Sem Redis, debounce/rate limit/carrinho ficam comprometidos.
- Sem ffmpeg, audio/tts pode falhar.
- Auth realtime e CRUD simples ainda dependem de borda confiavel.

