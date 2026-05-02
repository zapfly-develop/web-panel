# Modulo AI Agent

## Localizacao

- `src/modules/ai-agent/ai-agent.module.ts`
- `src/modules/ai-agent/ai-agent.service.ts`
- `src/modules/ai-agent/services/ai-context-builder.service.ts`
- `src/modules/ai-agent/services/ai-model-provider.service.ts`
- `src/modules/ai-agent/ai-agent-commerce.service.ts`
- `src/modules/ai-agent/ai-agent-whatsapp-checkout.service.ts`
- `src/modules/ai-agent/ai-agent.repository.ts`
- `src/modules/ai-agent/ai-audio.service.ts`
- `src/modules/ai-agent/ai-agent.prompts.ts`
- `src/modules/ai-agent/ai-agent-selection.utils.ts`
- `src/modules/ai-agent/entities/*`

## Responsabilidade

Motor de conversa e tomada de decisao com IA para Telegram e WhatsApp.

Responsabilidades:

- enfileirar respostas Telegram em `ai-response`;
- gerar resposta conversational;
- gerar resposta DONT_SELL;
- gerar resposta estruturada para WhatsApp grocery/delivery;
- transcrever audio WhatsApp;
- decidir operacoes de carrinho;
- sugerir produtos relacionados;
- escolher templates/midia de preview;
- gerar ou coordenar checkout PIX;
- persistir historico em `ChatMessage`;
- aplicar fallback de modelo Gemini.

## Modelos e Fallback

Modelos default em `ai-agent.prompts.ts`:

- principal geral: `gemini-2.5-flash`
- WhatsApp grocery: `gemini-2.5-flash`
- transcricao: `gemini-2.5-flash`
- fallback: `gemini-2.0-flash`

Env vars suportadas:

- `GEMINI_API_KEY`
- `GEMINI_MODEL_PRIMARY`
- `GEMINI_MODEL`
- `GEMINI_MODEL_FALLBACK`
- `GEMINI_WHATSAPP_MODEL_PRIMARY`
- `GEMINI_WHATSAPP_MODEL`
- `GEMINI_WHATSAPP_MODEL_FALLBACK`
- `GEMINI_AUDIO_TRANSCRIPTION_MODEL_PRIMARY`
- `GEMINI_AUDIO_TRANSCRIPTION_MODEL`
- `GEMINI_AUDIO_TRANSCRIPTION_MODEL_FALLBACK`
- `GEMINI_PRIMARY_COOLDOWN_MS`
- `GEMINI_PRIMARY_RECOVERY_SUCCESS_COUNT`

O circuit breaker usa Redis com prefixo `ai:gemini:circuit` e fica centralizado em `AiModelProviderService`.

`AiModelProviderService` tambem centraliza a inicializacao do SDK `GoogleGenerativeAI`, resolucao dos modelos por escopo (`default`, `whatsapp`, `transcription`), fallback para modelo secundario quando o primary retorna erro de indisponibilidade, metadados da execucao (`modelName`, `primaryModelName`, `fallbackModelName`, `fallbackUsed`, `scope`) e conversao de usage/token counts. O `AiAgentService` deve chamar `aiModelProvider.generateResponse(...)` e nao acessar SDK Gemini, Redis ou configuracoes de modelo diretamente.

`AiContextBuilderService` centraliza recuperacao e formatacao de contexto para prompts: historico recente, persona/perfil de negocio, catalogo, templates de preview, carrinho WhatsApp, produtos encontrados, checkout settings, prompt runtime e produtos relacionados do grocery. O `AiAgentService` deve usar esse builder para montar contexto e manter apenas orquestracao de dominio, persistencia de mensagens e chamada ao provider/modelo.

`AiAgentWhatsappCheckoutService` encapsula acoes e respostas de checkout: captura endereco, interpreta finalizacao conversacional, aplica operacoes de carrinho, formata respostas deterministicas, limpa carrinho apos finalizacao e decide etapas de pagamento/entrega. `AiAgentService` nao deve injetar `TemporaryCartService` diretamente.

`AiDomainStrategy` define o contrato de comportamento por nicho com `getSystemInstructions(businessName: string): string`, `getCatalogRules(): string` e `getCheckoutGuidelines(): string`. `AiStrategyFactory` resolve a estrategia pelo `BusinessProfile` do tenant (`GROCERY`, `RESTAURANT`, `SNACK_BAR`, `EVENT`) e o `AiContextBuilderService` usa essa estrategia ao montar system instructions e runtime context. Novos nichos devem registrar uma nova implementacao de `AiDomainStrategy` no factory, sem colocar regra de prompt no `AiAgentService`.

`GroceryAiDomainStrategy` vive em `strategies/implementations/grocery.strategy.ts` e concentra o cerebro de mercado: `getSystemInstructions` monta persona/tom de voz, `getCatalogRules` concentra regras de catalogo e produtos relacionados, e `getCheckoutGuidelines` concentra fechamento de pedido e instrucao JSON. Complementos de hortifruti, como sugerir tomate/alface/cebola quando fizer sentido, devem ser adicionados nessa estrategia, nao no builder nem no service.

## Fluxo Telegram

1. `BusinessBotService` recebe mensagem livre.
2. `AiAgentService.enqueueIncomingMessage` valida acesso, persiste mensagem do usuario e adiciona job `generate-ai-response`.
3. `AiAgentProcessor` chama `generateResponse`.
4. O prompt inclui persona, perfil de negocio, produtos ativos e previews.
5. A resposta pode apontar:
   - `previewTemplateIds`;
   - `productIdToCharge`;
   - usage/token count.
6. O envio final fica no contexto Telegram.

## Fluxo DONT_SELL

`SchedulerService` chama `generateDontSellResponse`. A IA recebe historico, catalogo e texto ancora do template DONT_SELL. Se falhar, o sistema usa fallback de template.

## Fluxo WhatsApp

1. `WhatsappIncomingFlowService` chama `generateWhatsappResponse`.
2. Audio e resolvido por `AiAudioService` e transcrito antes da decisao.
3. A conversa usa chave `whatsapp:<instanceId>:<chatId>` em `ChatMessage`.
4. O runtime context inclui:
   - historico recente;
   - catalogo do tenant;
   - produtos encontrados por busca;
   - carrinho atual;
   - produtos relacionados;
   - configuracoes de checkout.
5. Gemini responde JSON validado por `GroceryStructuredReplyEntity`.
6. `AiAgentWhatsappCheckoutService` aplica operacoes de carrinho, captura endereco, decide pagamento, resposta deterministica e finalizacao.
7. Quando finaliza, `DeliveryOrderService` muda pedido para `PREPARING` e emite realtime.

## Regras Criticas

- IA nao pode inventar produto, preco, estoque, midia ou promessa.
- Operacao de carrinho deve usar somente product IDs do catalogo runtime.
- Quantidade incerta nao deve atualizar carrinho.
- Audio com ruido deve priorizar intencao clara do cliente.
- Pedido de delivery precisa de endereco antes da finalizacao.
- PIX online gera cobranca antes de resposta de confirmacao.

## Entidades de Apoio

- `GroceryStructuredReplyEntity`: parse, fallback e normalizacao de JSON da IA.
- `WhatsappCheckoutEntity`: textos e regras de checkout a partir do carrinho.
- `WhatsappConversationTurnEntity`: interpretacao deterministica de intencoes simples.
- `WhatsappGroceryRuntimeContextEntity`: construcao do prompt runtime.
- `AiContextBuilderService`: data gathering e string formatting para Telegram, DONT_SELL e WhatsApp grocery.
- `AiModelProviderService`: chamada Gemini, fallback/circuit breaker e usage snapshot.
- `AiStrategyFactory`: selecao da estrategia de dominio por perfil de negocio.
- `AiDomainStrategy`: contrato para instrucoes de sistema, regras de catalogo e diretrizes de checkout por nicho.

## Utilitarios Recentes Para Checkout Conversacional

- `utils/address-extraction.utils.ts` centraliza a extracao e validacao semantica de enderecos informais em pt-BR. O checkout WhatsApp usa esse helper antes da chamada ao Gemini para salvar endereco no carrinho e sincronizar o pedido pendente.
- `utils/finalization-detection.utils.ts` detecta intencao de finalizacao usando texto do cliente, ultima resposta do atendente e estado real do carrinho. O fluxo usa esse helper para evitar repetir "posso finalizar?" quando o cliente ja confirmou, mandou endereco junto com confirmacao, ou demonstrou impaciencia.
- A decisao deterministica de finalizacao so deve sobrescrever a intencao da IA quando nao houver operacoes de carrinho normalizadas na mesma resposta, para nao confundir "manda 2 unidades" com fechamento do pedido.
- `GroceryAiDomainStrategy` e `ADDITIONAL_RUNTIME_RULES` reforcam portugues brasileiro coloquial, assertividade, nao repeticao de perguntas, captura de endereco com ruido conversacional e finalizacao contextual.

## Riscos

- `ai-agent.service.ts` ainda e o orquestrador principal, mas nao deve receber novas responsabilidades de infraestrutura, busca de contexto, prompt formatting ou regra interna de carrinho.
- O ciclo com Telegram usa `forwardRef`.
- Mudancas no prompt podem afetar checkout e pedidos.
- Falha de Redis prejudica circuit breaker, carrinho e debounce.
