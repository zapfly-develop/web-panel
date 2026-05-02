# Regras de Negocio

## Multitenancy

- `User` e o tenant principal.
- Catalogo, tags, instancias WhatsApp, pedidos, bots e configuracoes pertencem ao usuario quando existe `ownerUserId` ou `userId`.
- Rotas de tenant usam principalmente o header `x-user-id`.
- O sistema ainda nao tem autenticacao forte em todas as bordas; varios controllers confiam em `x-user-id` ou secret simples.

## Acesso SaaS

- `SubscriptionService` decide se um usuario tem acesso ativo.
- `SUPER_ADMIN` sempre tem acesso.
- `BANNED` bloqueia acesso.
- Assinatura `ACTIVE` vale ate `endDate` quando houver.
- `PAST_DUE` vale ate `graceUntil`.
- `CANCELED` ainda vale ate `endDate`, quando houver.

## Planos

Planos ficam em `src/modules/subscription/plan-catalog.ts`:

- `FREE`: limite diario de 10 mensagens de IA.
- `BASIC`: limite diario de 200 mensagens de IA.
- `PRO`: sem limite diario.
- `ENTERPRISE`: sem limite diario.

`aiMessageLimitOverride` no usuario sobrescreve o limite do plano.

## Uso de IA

- Acesso de IA para Telegram e WhatsApp passa por `SubscriptionService`.
- O consumo diario conta mensagens `ChatMessage` com role `user`, agrupadas por bots e instancias WhatsApp do tenant.
- Falta de assinatura ativa ou limite diario excedido bloqueia respostas de IA.
- Falhas de quota do Gemini podem ser tratadas silenciosamente no fluxo WhatsApp.
- Erros temporarios de busy podem acionar fallback de modelo e/ou retry.

## Perfis de Negocio

Enum `BusinessProfile`:

- `GROCERY`
- `RESTAURANT`
- `SNACK_BAR`
- `EVENT`

O perfil altera tom, prompt, interpretacao do catalogo e comportamento de venda. O default e `GROCERY`.

## Catalogo

- Produto ativo precisa de `isActive=true`.
- Produto de venda recorrente Telegram pode usar `ProductType.SUBSCRIPTION`.
- Produto para delivery WhatsApp usa `ProductType.ONE_TIME`.
- Preco promocional so vale quando `promotionalPriceCents` e maior que zero e menor que `priceCents`.
- Estoque `null` significa sem controle de estoque.
- Estoque `0` torna o produto indisponivel.
- Tags pertencem ao tenant e podem ser usadas para busca e recomendacao.

## Carrinho Temporario

- Carrinho WhatsApp fica no Redis com chave `delivery:cart:<whatsappId>`.
- TTL padrao: 6 horas.
- Carrinho guarda itens, subtotal, taxa de entrega, total, tipo de entrega, pagamento, troco, endereco e escopo do tenant/instancia.
- O carrinho nao pode trocar de instancia ou dono depois de associado.
- O total sempre inclui taxa de entrega quando houver itens.

## Checkout WhatsApp

- Tipos de entrega:
  - `DELIVERY`
  - `PICKUP`
- Metodos de pagamento:
  - `PIX_ONLINE`
  - `PIX_DELIVERY`
  - `CARD_DELIVERY`
  - `CASH`
- Para `DELIVERY`, endereco e obrigatorio antes de finalizar.
- Para `PICKUP`, endereco de entrega nao e necessario.
- Para `CASH`, o sistema pergunta troco quando ainda nao sabe se precisa.
- `PIX_ONLINE` gera cobranca SyncPay antes de confirmar preparo.
- `PIX_DELIVERY`, `CARD_DELIVERY` e `CASH` confirmam pedido para preparo com pagamento no ato.

## Pedido

- Pedido nasce `PENDING` enquanto esta sendo sincronizado a partir do carrinho.
- Quando finalizado pela IA/checkout, vira `PREPARING`.
- Dashboard lista `PREPARING` e `SHIPPED`.
- "Enviar para entrega" manda mensagem WhatsApp e muda status para `SHIPPED`.
- Kanban da loja pode alterar status via `PATCH /delivery/orders/:orderId/status`; mover para `SHIPPED` dispara `order.ready_for_pickup` para criar/notificar a corrida quando o pedido for delivery.
- Mover pedido para `DELIVERED` pelo kanban deve respeitar a entrega: se houver `Delivery`, ela precisa estar `PICKED_UP` para ser concluida pelo fluxo logistico.
- Status `DELIVERED` nao pode voltar para entrega.

## Delivery Logistico

- `Rider` representa o perfil operacional do entregador e sempre pertence a um `User`.
- Entregador de marketplace inicia como `PENDING_REVIEW`; entregador proprio de estabelecimento inicia como `ACTIVE`.
- Status cadastral do entregador fica no Prisma (`PENDING_REVIEW`, `ACTIVE`, `SUSPENDED`, `REJECTED`).
- Status operacional de presenca fica no Redis (`OFFLINE`, `ONLINE`, `BUSY`).
- O campo Prisma `RiderAvailabilityStatus.AVAILABLE` mapeia para o estado operacional `ONLINE`.
- Apenas entregadores cadastralmente `ACTIVE` podem ficar online.
- Para receber entrega, o entregador precisa estar cadastralmente `ACTIVE` e operacionalmente `ONLINE`.
- `Delivery` e o contrato logistico de uma entrega e vincula um `Order` a no maximo um entregador.
- Um pedido pode ter apenas uma `Delivery` no modelo persistido.
- Entrega sem entregador fica `WAITING_RIDER`; `PENDING_ASSIGNMENT` existe apenas por compatibilidade.
- Monitor de no-rider roda a cada 1 minuto para entregas `WAITING_RIDER`.
- Com 10 minutos sem motoboy, aplica bonus dinamico do tenant (`User.dynamicFareBonusCents`) em `Delivery.bonusValueCents`, marca `deliveryBonusApplied=true`, incrementa `riderPayoutCents` e republica `rider.new_available_delivery`.
- Com o limite de estagnacao do tenant (`User.stagnatedTimeoutMinutes`, padrao 15), a entrega muda para `DELIVERY_STAGNATED` e a loja recebe aviso por WhatsApp/Web Push.
- Monitor de rider parado roda a cada 1 minuto para entregas `ASSIGNED` com `acceptedAt` e coordenada-base.
- Ao atribuir ou aceitar entrega, o sistema grava `acceptedLatitude` e `acceptedLongitude` a partir da ultima coordenada Redis do rider quando disponivel.
- O monitor de rider parado usa Haversine entre a ancora de movimento e `delivery:rider:location:<riderId>`; se houver deslocamento de 100m ou mais, atualiza a ancora em Redis e reinicia o cronometro.
- Se o rider ficar a menos de 100m por mais de 7 minutos, registra `DeliveryEvent.RIDER_STALLED_WARNING`, emite `delivery.rider_stalled_warning` e envia Web Push ao entregador perguntando se ele esta a caminho.
- Se o rider ficar a menos de 100m por mais de 10 minutos, registra `DeliveryEvent.RIDER_STALLED_UNASSIGNED`, remove o `riderId`, volta a entrega para `WAITING_RIDER`, reseta `riderSearchStartedAt`, bloqueia o rider em `Rider.incidentBlockedUntil`, derruba a presenca para `OFFLINE` e republica `rider.new_available_delivery`.
- Motoboy pode reportar incidente via rota propria; o sistema registra `DeliveryIncident`, desvincula o rider, deixa a entrega `READY_FOR_PICKUP`, marca `isHighPriority=true` e reseta `riderSearchStartedAt`/`updatedAt` para voltar como nova na fila global.
- Apos a transaction do incidente, o sistema emite `delivery.incident_reported`; o AiAgent enfileira WhatsApp para o cliente e o realtime envia `delivery:available` com `priorityLabel=ALTA_PRIORIDADE` para riders proximos.
- Incidente so pode ser reportado quando a entrega ja foi coletada (`PICKED_UP` ou `IN_TRANSIT`).
- Rider que reporta incidente fica bloqueado ate `Rider.incidentBlockedUntil`; a duracao vem de `User.riderIncidentCooldownMinutes` do tenant e impede ficar online, ser atribuido ou receber novas ofertas.
- Rider removido automaticamente por inatividade tambem fica bloqueado ate `Rider.incidentBlockedUntil`, usando a mesma configuracao `User.riderIncidentCooldownMinutes`.
- Cliente ausente pode ser reportado pelo motoboy apenas quando a chegada ao destino foi confirmada (`ARRIVED_AT_DESTINATION`); o sistema grava `Delivery.absentClientAt`, muda para `ABSENT_WAITING`, registra `DeliveryEvent.CLIENT_ABSENT_REPORTED` e reserva em escrow a taxa de entrega na carteira da loja caso ainda nao tenha sido bloqueada.
- Cliente ausente agenda timeout de 5 minutos via BullMQ; se a entrega seguir `ABSENT_WAITING`, muda para `RETURNING_TO_MERCHANT`, notifica o PWA do motoboy e enfileira compensacao financeira. Se for entregue antes, o job e ignorado.
- Ao reportar cliente ausente, o AiAgent/WhatsApp envia imediatamente mensagem de alta prioridade ao cliente; qualquer resposta recebida durante a janela de 5 minutos emite Socket.io para o motoboy aguardar.
- Ao entrar em `RETURNING_TO_MERCHANT`, o payout paga 100% da taxa/repasse reservado ao motoboy.
- A primeira ocorrencia mensal de retorno por cliente ausente por loja e coberta por `FLOOVI_SAFETY_FUND`, registrada em `DeliverySafetyFundCoverage`, e o escrow da loja e liberado.
- As ocorrencias seguintes do mesmo mes sao custeadas pela loja via liquidacao do `DELIVERY_ESCROW`.
- Atribuicao manual muda para `ASSIGNED`, emite `delivery.assigned` e coloca o rider como `BUSY`.
- Aceite do motoboy registra `acceptedAt`, mas nao muda o estado principal.
- Coletas aceitam transicao de `ASSIGNED` para `PICKED_UP`.
- Conclusao aceita `PICKED_UP`, muda pedido para `DELIVERED`, volta o rider para `ONLINE` e enfileira repasse.
- Localizacoes de rastreio ficam no Redis via GEO com TTL curto; nao persistir coordenadas continuas no Postgres.
- `DeliveryPayout` registra o valor devido ao entregador por corrida.
- O processamento de repasse roda na fila `delivery-payout` e deve ser idempotente.
- O calculo de distancia usa Haversine em linha reta entre coordenadas de loja e cliente.
- O calculo de preco usa `taxa_base + distancia_km * valor_km`.
- Taxa base vem de configuracao do tenant (`User.deliveryFeeCents`) quando houver, com fallback para env vars.
- Bonus dinamico de no-rider e pago ao motoboy no payout como acrescimo ao repasse calculado, sem alterar a taxa de entrega cobrada do cliente.
- `paymentHandledBy=STORE_MACHINE` significa que o valor do pedido ficou com a loja e o repasse gera debito interno da loja.
- `paymentHandledBy=RIDER` significa que o motoboy reteve o valor; o ledger marca `RIDER_RETAINED`.
- `FLOOVI_SAFETY_FUND` significa que a Floovi cobre a ocorrencia de retencao e libera a reserva da loja.
- O ledger interno ja credita a Wallet do rider via `payout.processed`; transferencia bancaria/PIX externa ainda fica para adaptador futuro.

## Notificacoes Web Push

- `PushSubscription` pertence a `User` e representa um dispositivo PWA.
- Um usuario pode ter multiplos dispositivos assinados.
- Assinatura e removida automaticamente quando o provedor retorna endpoint expirado ou inexistente.
- Chaves VAPID devem vir de variaveis de ambiente; nunca salvar chaves privadas em docs ou logs.
- `rider.new_available_delivery` notifica motoboys proximos com deep link para `/delivery/available?deliveryId=<id>`.
- `delivery.status_changed` notifica a loja com deep link para `/delivery/deliveries/<deliveryId>`.
- Cliente final so recebe Web Push quando houver usuario identificavel por `customerUserId` ou telefone compativel com `customerWhatsappId`.

## Wallet / Carteira Virtual

- Wallet e o livro razao central do sistema.
- Wallet nao decide como o dinheiro foi ganho, qual comissao aplicar, nem qual taxa cobrar; isso pertence ao modulo de origem, como Delivery ou Billing.
- Wallet recebe lancamentos financeiros ja calculados, com `amountCents`, moeda, direcao, tipo, dono da conta e referencia externa.
- `Wallet` pertence a um `User` e guarda `balanceCents` e `frozenBalanceCents`.
- `WalletTransaction` registra movimentacoes com tipo `CREDIT` ou `DEBIT`.
- `WalletEntity` deve validar regras de saldo antes da persistencia.
- `WalletTransactionEntity` deve representar lancamento imutavel e auditavel.
- Categorias atuais de transacao: `DELIVERY_PAYOUT`, `DELIVERY_ESCROW`, `WITHDRAWAL`, `REFUND`.
- Status atuais de transacao: `COMPLETED`, `PENDING`, `FAILED`.
- Extrato da carteira deve sempre filtrar pelo usuario logado e pode limitar por data, tipo, categoria e status.
- Todo lancamento deve ser auditavel, imutavel e rastreavel ate a origem por `sourceModule`, `sourceEvent` e `sourceReferenceId`.
- Cada lancamento precisa de chave idempotente para evitar credito/debito duplicado em retries.
- Saldo disponivel nunca deve ser atualizado sem lancamento correspondente no ledger.
- O saldo materializado pode existir para performance, mas a fonte contabil e a soma dos lancamentos confirmados.
- Debitos nao podem deixar saldo negativo, exceto se houver regra explicita futura para credito/antecipacao.
- Saques devem reservar saldo antes de chamar provedor externo e depois confirmar, falhar ou estornar.
- Solicitar saque cria `WalletTransaction` `DEBIT`/`WITHDRAWAL`/`PENDING`.
- Na solicitacao de saque, o valor sai de `balanceCents` e entra em `frozenBalanceCents` na mesma transacao.
- Saque pendente nao pode ser solicitado quando `balanceCents` e insuficiente.
- `payout.processed` do Delivery e entrada do Wallet para credito `DELIVERY_PAYOUT` na carteira do entregador, sem mover a regra de calculo de repasse para Wallet.
- `DELIVERY_ESCROW/PENDING` congela saldo da loja para garantir pagamento do rider em cliente ausente; o retorno para loja liquida esse escrow ou libera a reserva quando houver cobertura do Fundo de Seguranca.
- Integracoes com PIX, banco ou provedor de pagamento ficam em adaptadores; Wallet registra estados e consistencia, nao faz regra comercial externa.

## Horario de Funcionamento

- `manualStoreClosed=true` fecha a loja independentemente da agenda.
- Sem agenda cadastrada, a loja e considerada aberta.
- Horario suporta virada de dia.
- Timezone default: `America/Sao_Paulo`.
- Quando fechado, o webhook WhatsApp envia `closedMessage` do usuario ou mensagem padrao.

## Handover Humano

- Palavras-chave atuais: `atendente`, `problema`.
- Quando acionado, cria ou atualiza `WhatsappHandover` com status `OPEN`.
- Enquanto houver handover aberto para instancia/chat, o bot fica em silencio.
- A resposta inicial informa que um atendente sera chamado.

## Billing

- Plano free e ativado diretamente.
- Planos pagos criam cobranca SyncPay e deixam assinatura em `PAST_DUE` com grace de 3 dias ate confirmacao.
- Webhook de sucesso ativa assinatura e calcula novo `endDate`.
- Webhook de falha marca transacao como `FAILED` e assinatura como `PAST_DUE`.
- Webhook de cancelamento marca assinatura como `CANCELED`.
- O billing tambem trata vendas legadas `Sale` do Telegram.

## Telegram Business

- `BotAccount` com `isUserAccount=true`, `session` e `businessBotToken` e carregado no bootstrap.
- `BusinessConnection` associa o bot a um usuario Telegram Business.
- Mensagens do proprio dono da conta business sao ignoradas.
- Greeting para usuario novo dispara template `WELCOME`, timed templates, menu e DONT_SELL.
- Usuario que ja comprou nao recebe DONT_SELL.
- Callback `buy:*` ou `buy_discount:*` gera PIX e cria `Sale`.

## Campanhas e Recorrencias

- `TimedMessageRule` gera `ScheduledMessageJob`.
- `DONT_SELL` usa intervalos em `DontSellInterval`.
- `RecurringSchedule` dispara templates por hora/minuto/dia da semana.
- Processamento cron deve usar locks Redis via `RuntimeRegistryProvider`.
- Endpoints de cron aceitam header `x-cron-secret` quando `CRON_SECRET` esta configurado.
