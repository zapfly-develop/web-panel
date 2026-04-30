# Contexto do Projeto

## Identidade

Este projeto e o frontend Next16 do sistema de atendimento e vendas por WhatsApp e Telegram com IA humanizada. O produto e um SaaS multitenant para negocios locais e digitais, com suporte a perfis como mercearia, restaurante, lanchonete e eventos.

O nome do pacote ainda e `zapfly`, mas o escopo atual e maior: atendimento WhatsApp via Evolution, automacao Telegram Business, catalogo, carrinho, pedidos, billing, campanhas e decisao com IA.

## Proposta

O sistema automatiza conversas comerciais com linguagem natural, entende texto, audio e midia, consulta catalogo real do tenant, monta carrinho temporario, conduz checkout, gera PIX quando necessario e cria pedidos para preparo/entrega.

O objetivo tecnico e manter um monolito modular pragmatico: um unico deploy/processo, com modulos internos bem separados por dominio e integracoes isoladas.

## Capacidades Principais

- Atendimento WhatsApp via Evolution API.
- Atendimento Telegram Business via Bot API e MTProto.
- IA com Gemini para conversa, venda, selecao de produtos, sugestoes e redundancia de modelo.
- Transcricao de audio WhatsApp antes da tomada de decisao.
- Catalogo de produtos com categoria, tags, estoque e preco promocional.
- Carrinho temporario no Redis.
- Pedidos persistidos no Postgres via Prisma.
- Modo delivery com entregadores, entregas vinculadas a pedidos, presenca/geolocalizacao efemera, repasse por corrida e notificacoes Web Push.
- Carteira virtual planejada como livro razao central para saldos auditaveis de lojas, entregadores e operacoes internas.
- Dashboard de pedidos em tempo real via Socket.IO.
- Notificacoes PWA via Web Push/VAPID para loja, entregadores e cliente quando houver usuario vinculado.
- Assinaturas SaaS, planos, limite diario de mensagens de IA e bloqueio por acesso.
- Integracao SyncPay para PIX de assinatura e venda.
- Horarios de funcionamento e resposta automatica quando a loja esta fechada.
- Handover para atendimento humano.
- Campanhas, templates, mensagens recorrentes e fluxo DONT_SELL.
- Scraping/transferencia Telegram com controle de flood e filas.

## Runtime

- Framework: NestJS.
- Banco: PostgreSQL via Prisma.
- Filas e estado volatil: Redis + BullMQ.
- Realtime: Socket.IO.
- IA: Google Gemini via `@google/generative-ai`.
- WhatsApp: Evolution API.
- Telegram: `node-telegram-bot-api` e `telegram` MTProto.
- Pagamento: SyncPay.
- Notificacoes PWA: Web Push via `web-push` e VAPID.

## Fonte de Verdade

- Dados duraveis ficam no Postgres, modelados em `prisma/schema.prisma`.
- Estado temporario e operacional fica no Redis:
    - filas BullMQ;
    - carrinho temporario;
    - presenca e ultima geolocalizacao dos entregadores;
    - processamento assincrono de repasse de entregas;
    - debounce WhatsApp;
    - locks de cron;
    - circuit breaker de Gemini;
    - cache runtime de conexoes Telegram;
    - rate limit de envio WhatsApp.

## Arquivos de Entrada Importantes

- `src/app.module.ts`: composicao do monolito.
- `src/main.ts`: bootstrap HTTP, CORS e limite de body.
- `prisma/schema.prisma`: modelo de dados.
- `src/modules/*`: dominios de negocio.
- `src/whatsapp/*`: contexto de integracao WhatsApp/Evolution.
- `src/telegram/*`: contexto de integracao Telegram.

## Estado Arquitetural Atual

O projeto ja foi parcialmente reestruturado para monolito modular pragmatico. Modulos que estavam na raiz foram movidos para `src/modules`, e os contextos `telegram` e `whatsapp` ficaram como integracoes de alta mudanca.

Os principais pontos ainda quentes sao:

- `src/modules/ai-agent/ai-agent.service.ts`
- `src/whatsapp/queue/services/whatsapp-incoming-flow.service.ts`
- `src/telegram/services/scheduler.service.ts`
- fluxos de billing/webhook SyncPay
- liquidacao real de repasse para entregadores, hoje registrada como ledger interno em `DeliveryPayout`
- integracao futura de carteira/Wallet a partir do evento `payout.processed`
- modelagem do `WalletModule` como ledger central sem regra de origem do dinheiro

Ao trabalhar no projeto, preserve rotas publicas, nomes de filas e contratos externos sempre que possivel.
