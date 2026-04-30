# Modulo AI Agent

## Localizacao

- `src/modules/ai-agent/ai-agent.module.ts`
- `src/modules/ai-agent/ai-agent.service.ts`
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

O circuit breaker usa Redis com prefixo `ai:gemini:circuit`.

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
6. `AiAgentWhatsappCheckoutService` aplica operacoes de carrinho, captura endereco, decide pagamento e finalizacao.
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

## Riscos

- `ai-agent.service.ts` ainda e grande e concentra muitas responsabilidades.
- O ciclo com Telegram usa `forwardRef`.
- Mudancas no prompt podem afetar checkout e pedidos.
- Falha de Redis prejudica circuit breaker, carrinho e debounce.

