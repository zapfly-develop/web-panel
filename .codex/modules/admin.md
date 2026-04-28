# Admin e Monitoramento

## Localizacao

- `src/modules/admin/*`

## Responsabilidade

Fornecer visao administrativa do SaaS: receita, usuarios, assinaturas, saude de instancias WhatsApp, handovers e metricas de mensagens processadas.

## Protecao

Todo `AdminController` usa `AdminRoleGuard`.

Requisito:

- header `x-user-id`;
- usuario com role `SUPER_ADMIN`.

## Endpoints

- `GET /admin/dashboard`
- `GET /admin/monitoring/messages`
- `GET /admin/monitoring/instances/health`
- `GET /admin/monitoring/financial`
- `GET /admin/users`
- `PATCH /admin/users/:userId/access`
- `GET /admin/balance`
- `GET /admin/openapi.json`
- `GET /admin/docs`

## Dashboard

`AdminService.getDashboardMetrics` calcula:

- MRR;
- churn;
- usuarios ativos;
- receita total;
- receita no mes;
- vendas legadas;
- saldo diario/mensal;
- saude de instancias WhatsApp;
- handovers abertos;
- mensagens processadas por dia.

## Monitoramento

`AdminMonitoringService` usa queries Prisma e SQL bruto para:

- separar mensagens Telegram e WhatsApp;
- filtrar por plano;
- agregar por dia;
- estimar custos operacionais;
- calcular receita liquida estimada.

Env vars de custo estimado:

- `ESTIMATED_TELEGRAM_API_COST_PER_MESSAGE_CENTS`
- `ESTIMATED_WHATSAPP_API_COST_PER_MESSAGE_CENTS`
- `ESTIMATED_WHATSAPP_TTS_COST_PER_AUDIO_CENTS`

## OpenAPI

O modulo gera documentacao basica em memoria:

- spec em `/admin/openapi.json`;
- pagina Swagger em `/admin/docs`.

## Riscos

- Alguns indicadores sao estimativas.
- Auth depende de `x-user-id` vindo de borda confiavel.
- Queries raw dependem do formato atual de `ChatMessage.telegramId` para WhatsApp.

