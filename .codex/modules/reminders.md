# Campanhas, Agendamentos e Reminders

## Localizacao

- `src/modules/campaigns/*`
- `src/modules/schedule/*`
- `src/telegram/services/scheduler.service.ts`
- `src/telegram/services/business-bot-greeting.service.ts`

## Responsabilidade

Envio programado de templates, campanhas, mensagens recorrentes e fluxo DONT_SELL.

## Conceitos

- `MessageTemplate`: conteudo de mensagem.
- `TimedMessageRule`: regra de disparo por atraso/segmento.
- `ScheduledMessageJob`: job individual para um usuario.
- `RecurringSchedule`: agenda recorrente por hora/minuto/dia da semana.
- `DontSellInterval`: intervalos configuraveis para DONT_SELL.

## CampaignsModule

Endpoints:

- `POST /templates/send`
- `POST /templates/schedule`
- `POST /templates/process-jobs`

`CampaignsService`:

- envia template imediato;
- agenda jobs para usuario por segmento;
- processa jobs vencidos;
- recria jobs quando regra tem `repeatIntervalSeconds`.

## ScheduleModule

Endpoint:

- `POST /schedules/process`

`ScheduleService`:

- chama `SchedulerService.processJobs`;
- processa `RecurringSchedule`;
- usa locks Redis para evitar execucao duplicada em multiplas instancias.

Locks:

- `scheduled-jobs`
- `recurring-schedules`

## DONT_SELL

Fluxo:

1. Usuario novo recebe greeting.
2. `BusinessBotGreetingService` agenda jobs DONT_SELL.
3. `SchedulerService` processa jobs vencidos.
4. Se usuario ja comprou (`SaleStatus.PAID`), job e cancelado.
5. Se for job DONT_SELL, tenta resposta com IA.
6. Se IA falhar, envia template fallback.
7. Ao final, tenta enviar menu/oferta.

Nome de regra automatica:

- `DONT_SELL Auto`

## Recorrencia

`RecurringSchedule` dispara quando:

- `isActive=true`;
- hora atual bate com `hour`;
- minuto atual bate com `minute`;
- dia atual esta em `weekDays`;
- bot esta ativo;
- template esta ativo.

`SUBSCRIBER_CONTENT` so e enviado para `TelegramUser.isSubscriber=true`.

## Env Vars Relevantes

- `CRON_SECRET`
- `SCHEDULED_JOB_BATCH_SIZE`
- `SCHEDULED_JOB_SEND_DELAY_MS`
- `SCHEDULED_JOBS_LOCK_TTL_SECONDS`
- `RECURRING_SCHEDULES_LOCK_TTL_SECONDS`
- `RECURRING_SCHEDULE_BATCH_SIZE`
- `RECURRING_SCHEDULE_SEND_DELAY_MS`

## Riscos

- Existem dois caminhos de processamento de scheduled jobs: `CampaignsService` e `SchedulerService`.
- Para Telegram Business e DONT_SELL, prefira `SchedulerService`.
- Preservar rotas antigas de `/templates/*` para compatibilidade.

