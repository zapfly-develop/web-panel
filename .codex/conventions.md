# Convencoes do Projeto

## Linguagem e Estilo

- Codigo TypeScript com NestJS.
- Modulos em `src/modules/<contexto>`.
- Integracoes complexas ficam em `src/telegram` e `src/whatsapp`.
- Use nomes explicitos e orientados a caso de uso.
- Evite criar abstracao nova quando um servico local ja resolve o problema.
- Preserve mensagens, nomes de filas e rotas externas durante refactors.

## Modulos Nest

- Controller recebe request, valida minimamente e delega.
- Service implementa caso de uso ou coordenacao.
- Entity de dominio encapsula regra pura e invariantes antes da persistencia.
- Em dominios com dinheiro, pedido, estoque, assinatura ou estado critico, prefira entidade antes de colocar regra diretamente em service.
- Processor de fila deve ser fino e delegar a service.
- Gateway deve apenas autenticar sala e emitir evento.

## Prisma

- `PrismaService` e global.
- Mesmo assim, importe `PrismaModule` no modulo quando o padrao local ja faz isso.
- Prefira queries com escopo de tenant explicito.
- Nunca invente dados de tenant quando `ownerUserId` ou `userId` estiver ausente.
- Preserve migrations existentes.

## Redis

Redis e usado para:

- BullMQ;
- carrinho temporario;
- presenca e ultima localizacao de entregadores;
- debounce WhatsApp;
- locks;
- circuit breaker Gemini;
- runtime registry Telegram;
- rate limit WhatsApp.

Ao adicionar chaves novas, use prefixos claros por contexto.

## Filas

- Mantenha nomes de filas atuais.
- Jobs devem ter payload serializavel.
- Use `removeOnComplete` e `removeOnFail` com contagem limitada.
- Para midia pesada, mantenha fila separada quando ja existir.
- Evite trabalho pesado em request HTTP direto.
- Para repasse financeiro/logistico, prefira jobs idempotentes e estados persistidos antes de integrar com provedor externo.

## Delivery Logistico

- Mantenha catalogo/carrinho e logistica separados dentro de `DeliveryModule`.
- Controllers de delivery devem permanecer finos e delegar para `RiderService`, `DeliveryService` ou `PricingService`.
- Toda consulta de entrega da loja deve filtrar por `ownerUserId`.
- Toda acao do entregador deve validar `userId` e perfil `Rider`.
- Rastreamento continuo de entregador deve ficar no Redis; evite persistir coordenadas frequentes no Postgres.
- Ao cruzar Prisma e Redis, mapeie `RiderStatus.ONLINE` para `RiderAvailabilityStatus.AVAILABLE`.
- Mudancas de estado de entrega devem persistir impacto principal antes de disparar eventos ou jobs.
- Use `DELIVERY_EVENT_EMITTER` para eventos internos do fluxo logistico.
- Mantenha `DeliveryPayout` como ledger interno ate existir Wallet/provedor real.

## Notifications

- Web Push usa `web-push` com VAPID via ConfigService.
- Assinaturas pertencem a `User` e devem suportar multiplos dispositivos.
- Endpoints expirados devem ser removidos quando o envio retornar `404` ou `410`.
- Payloads de push devem sempre ter `title`, `body`, `icon` e `data.url`.
- Nao colocar VAPID private key em docs, logs ou seed.

## Wallet

- Trate Wallet como ledger central, nao como calculadora de regras comerciais.
- `WalletEntity` protege saldo disponivel/congelado; `WalletTransactionEntity` monta lancamentos imutaveis.
- Regras como "nao permitir saldo negativo" devem morar nas entidades antes de chegar ao Prisma.
- Modulos como Delivery e Billing calculam valores e enviam comandos/eventos financeiros para Wallet.
- Lancamentos devem ser imutaveis, idempotentes e vinculados a uma referencia externa.
- Nunca atualize saldo sem criar lancamento contabil na mesma transacao.
- Use `deposit` para credito concluido e `withdraw` para debito concluido.
- Use `requestWithdrawal` para reserva de saque: debita `balanceCents`, credita `frozenBalanceCents` e cria transacao `WITHDRAWAL/PENDING`.
- Eventos de Delivery devem entrar no Wallet por listener dedicado, mantendo calculo logistico fora da carteira.
- Prefira valores inteiros em centavos (`amountCents`) e moeda explicita.
- Operacoes que falham em provedor externo devem gerar novo lancamento de estorno ou mudar estado operacional, nunca editar historico contabil.

## IA

- Nunca deixe a IA inventar produtos, precos, estoque, ingredientes, prazos ou promessas.
- O prompt deve sempre receber catalogo/runtime context.
- Use structured output quando a resposta precisa acionar carrinho ou checkout.
- Registre mensagens em `ChatMessage` quando elas entram/saem do fluxo de IA.
- Preserve fallback/circuit breaker de modelo.

## WhatsApp

- Entrada vem da Evolution.
- Normalizacao de webhook deve ficar em entities/services de `src/whatsapp/application/webhooks`.
- Fluxo de entrada deve passar por fila.
- Saida deve passar por `WhatsappQueueService` e `WhatsappSenderService`.
- Evite responder quando houver handover aberto.
- Respeite horario de funcionamento antes de IA.

## Telegram

- `TelegramService` e fachada.
- `BusinessBotService` registra handlers e delega.
- `TemplateService` envia template ou enfileira midia.
- `SchedulerService` processa `ScheduledMessageJob`.
- `RuntimeRegistryProvider` guarda tokens/conexoes runtime e locks no Redis.

## DTOs e Entrada HTTP

O projeto ainda possui varios `any` em controllers. Ao tocar endpoints, prefira:

- DTO tipado;
- normalizacao de strings;
- validacao de tenant;
- erros Nest (`BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`).

## Seguranca

- Nao colocar segredo em docs, logs ou commits.
- Nao usar valores reais de `.env`.
- Rotas com `x-user-id` sao confianca de borda, nao autenticacao forte.
- Admin usa `AdminRoleGuard`.
- Cron usa `x-cron-secret` quando `CRON_SECRET` existe.

## Build e Artefatos

- Validacao primaria: `npm run build`.
- O projeto tem pouca cobertura automatizada.
- Nao edite `dist/` manualmente.
- Cache incremental do TypeScript fica em `dist/tsconfig.tsbuildinfo` para evitar build sem emissao quando `dist/` for removido.
- Mudancas de codigo devem focar `src/`, `prisma/` e documentacao.

## Documentacao Codex

- `.codex/project.md`: visao geral do produto.
- `.codex/architecture.md`: mapa tecnico e fluxos.
- `.codex/business-rules.md`: regras de dominio.
- `.codex/conventions.md`: padroes de trabalho.
- `.codex/modules/*.md`: fichas por contexto.
- `.codex/modules/notifications.md`: Web Push e notificacoes PWA.
- `.codex/modules/wallet.md`: carteira virtual e ledger financeiro.
- `.codex/prompts/*.md`: orientacoes para futuras tarefas com Codex.

# Convenções

- Usar TypeScript estrito
- Não usar lógica de negócio em controllers
- Eventos devem ser disparados para ações críticas
- Evitar acoplamento entre módulos
