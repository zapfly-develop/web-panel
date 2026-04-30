# Modulo Wallet

## Estado

Modulo iniciado. A primeira etapa implementa persistencia, service transacional e endpoints de consulta.

## Localizacao

- `src/modules/wallet/wallet.module.ts`
- `src/modules/wallet/controllers/wallet.controller.ts`
- `src/modules/wallet/services/wallet.service.ts`
- `src/modules/wallet/listeners/delivery-payout-wallet.listener.ts`
- `src/modules/wallet/dto/*`
- `src/modules/wallet/entities/wallet.entity.ts`
- `src/modules/wallet/entities/wallet-transaction.entity.ts`
- `src/modules/wallet/entities/wallet-domain-error.entity.ts`

## Responsabilidade

Wallet e a carteira virtual do sistema e deve atuar como livro razao centralizado.

Ele garante:

- saldo consistente;
- lancamentos auditaveis;
- idempotencia contra duplicidade;
- rastreabilidade da origem;
- base para saques, estornos e conciliacao.

Ele nao deve saber como o dinheiro foi ganho. Regras como taxa de entrega, percentual de repasse, desconto de plano, cobranca SaaS, promocao ou comissao pertencem aos modulos de origem.

## Fronteiras

Delivery:

- calcula valor da entrega e repasse;
- registra `DeliveryPayout`;
- emite `payout.processed`;
- nao atualiza saldo diretamente.

Billing/Subscription:

- calcula cobrancas, renovacoes, descontos e status de assinatura;
- pode emitir eventos financeiros futuros;
- nao deve manipular ledger diretamente fora da API do Wallet.

SyncPay/provedores:

- executam cobranca, PIX, saque ou transferencia externa;
- Wallet registra o efeito contabil e o estado operacional;
- adaptadores de provedor nao devem conter regra de saldo.

## Entidades

`Wallet` / `WalletEntity`:

- conta financeira de um usuario ou ator interno;
- pertence a `User` quando for conta de loja, entregador ou cliente;
- possui moeda, saldo disponivel e saldo reservado materializado.
- encapsula regras de saldo antes de qualquer update no banco.
- possui `canWithdraw(amount)`, `deposit`, `withdraw`, `requestWithdrawal` e `applyTransaction`.

Campos principais:

- `userId`
- `balanceCents`
- `frozenBalanceCents`
- `currency`

`WalletTransaction` / `WalletTransactionEntity`:

- lancamento imutavel do livro razao;
- guarda `amountCents`, moeda, direcao, tipo, status, referencia externa e metadados;
- deve permitir auditoria ate o evento/modulo de origem.
- monta o payload persistivel de lancamento a partir da `WalletEntity` e da mudanca de saldo.
- valida valor positivo e ownership para idempotencia.

Campos principais:

- `walletId`
- `userId`
- `type`
- `category`
- `status`
- `amountCents`
- `balanceBeforeCents`
- `balanceAfterCents`
- `frozenBalanceBeforeCents`
- `frozenBalanceAfterCents`
- `sourceModule`
- `sourceEvent`
- `sourceReferenceId`
- `idempotencyKey`
- `metadata`

## Tipos de Movimento

Tipos esperados:

- `CREDIT`: credito em conta.
- `DEBIT`: debito de conta.

Categorias atuais:

- `DELIVERY_PAYOUT`
- `WITHDRAWAL`
- `REFUND`

Status atuais:

- `COMPLETED`
- `PENDING`
- `FAILED`

## Origem e Idempotencia

Todo comando de lancamento deve informar:

- `accountOwnerUserId` ou conta destino;
- `amountCents`;
- `currency`;
- `direction`;
- `type`;
- `sourceModule`;
- `sourceEvent`;
- `sourceReferenceId`;
- `idempotencyKey`;
- metadados minimos para auditoria.

`idempotencyKey` deve ser unica por movimento financeiro. Reprocessar o mesmo evento deve retornar o lancamento existente ou ser no-op seguro.

## Regras de Saldo

- Saldo nao e atualizado sem lancamento correspondente.
- Lancamento e saldo materializado devem ser persistidos na mesma transacao.
- Saldo disponivel nao deve ficar negativo, exceto se uma regra futura de credito/antecipacao for formalizada.
- Valores financeiros usam centavos inteiros.
- Moeda deve ser explicita, inicialmente `BRL`.
- Historico contabil nao deve ser editado; correcoes devem usar lancamentos de estorno ou ajuste quando essas categorias forem formalizadas.
- Na implementacao atual, `COMPLETED` altera saldo disponivel.
- `WITHDRAWAL/PENDING` tambem altera saldo: reduz `balanceCents` e aumenta `frozenBalanceCents`.
- Outros `PENDING` e `FAILED` registram ledger sem mudar saldo disponivel.
- Debitos `COMPLETED` validam saldo suficiente.
- Solicitacao de saque valida saldo suficiente antes de congelar o valor.

## Service

`WalletService` expoe:

- `getOrCreateWallet(userId)`: cria carteira vazia para usuario existente.
- `getMyWallet(userId)`: consulta/cria carteira do usuario da borda.
- `listMyTransactions(userId, filtros)`: lista lancamentos do usuario.
- `getStatement(userId, filtros)`: retorna extrato do ledger do usuario logado com filtros por data e tipo.
- `deposit(input)`: registra credito `COMPLETED` de forma atomica.
- `withdraw(input)`: registra debito `COMPLETED` de forma atomica e bloqueia saldo negativo.
- `requestWithdrawal(input)`: cria saque `PENDING`, movendo valor de `balanceCents` para `frozenBalanceCents`.
- `requestWithdrawalForUser(userId, input)`: helper para endpoint de solicitacao de saque.
- `recordTransaction(input)`: API interna para registrar credito/debito com idempotencia.
- `recordTransactionForUser(userId, input)`: helper para comandos internos com DTO.

Decisoes:

- Operacoes de saldo usam transacao Prisma.
- A linha da `Wallet` e bloqueada com `SELECT ... FOR UPDATE` antes de calcular novo saldo.
- O service orquestra persistencia, mas nao calcula saldo diretamente.
- `WalletEntity` calcula saldo disponivel/congelado e impede saldo negativo.
- `WalletTransactionEntity` cria lancamentos imutaveis com saldos antes/depois.
- `deposit` e `withdraw` reaproveitam o mesmo caminho transacional de `recordTransaction`.
- `requestWithdrawal` usa transacao propria porque precisa atualizar saldo disponivel e congelado ao mesmo tempo.
- `idempotencyKey` e unica e evita duplicidade em retries.

## Endpoints

- `GET /wallet/me`
- `GET /wallet/transactions`
- `GET /wallet/statement`
- `POST /wallet/withdrawals`

Nao ha endpoint publico generico de criacao de transacao. Escrita de credito/debito deve vir de modulos internos ou eventos. O endpoint de saque permite apenas debitar saldo proprio e congelar o valor para processamento externo.

Payload de saque:

- `amountCents`
- `currency`
- `idempotencyKey`
- `pixKey`
- `pixKeyType`
- `description`
- `metadata`

Confirmacao Pix real ainda nao foi integrada nesta etapa.

Filtros do extrato:

- `dateFrom`: ISO date/datetime inicial, aplicado em `createdAt >= dateFrom`.
- `dateTo`: ISO date/datetime final, aplicado em `createdAt <= dateTo`.
- `type`: `CREDIT` ou `DEBIT`.
- `category`: `DELIVERY_PAYOUT`, `WITHDRAWAL` ou `REFUND`.
- `status`: `COMPLETED`, `PENDING` ou `FAILED`.
- `take`: limite de itens, maximo 100.

Resposta do extrato:

- `items`: lancamentos do ledger em ordem decrescente de `createdAt`.
- `filters`: filtros normalizados aplicados.

## Eventos

Eventos que Wallet consome:

- `payout.processed`: credito/debito interno relacionado ao repasse de entrega.

Eventos que Wallet deve consumir futuramente:

- eventos futuros de Billing/Subscription para credito, debito, estorno ou ajuste.

Eventos que Wallet deve emitir:

- `wallet.entry_recorded`
- `wallet.balance_changed`
- `wallet.withdrawal_requested`
- `wallet.withdrawal_completed`
- `wallet.withdrawal_failed`

## Fluxo Delivery Futuro

1. `PayoutProcessor` conclui `DeliveryPayout`.
2. Delivery emite `payout.processed` com valor final e referencia da entrega/payout.
3. `DeliveryPayoutWalletListener` busca o `userId` do `Rider`.
4. Wallet chama `deposit` com categoria `DELIVERY_PAYOUT`.
5. A idempotencia usa `delivery-payout:<payoutId>:rider-credit`.

Nesta etapa, o Wallet credita a carteira do entregador. Debito/reserva da loja para `STORE_DEBIT` fica para uma etapa posterior.

## Riscos

- Duplicidade de eventos financeiros pode gerar saldo incorreto se nao houver idempotencia forte.
- Misturar regra comercial no Wallet cria acoplamento entre dominios.
- Atualizar saldo sem ledger quebra auditoria.
- Saques precisam de estados claros para evitar pagar duas vezes ou liberar reserva indevidamente.
- Integracao com provedor externo deve ser tolerante a retries e reconciliacao.
