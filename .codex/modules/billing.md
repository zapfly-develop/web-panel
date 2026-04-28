# Billing, Subscription e SyncPay

## Localizacao

- `src/modules/subscription/*`
- `src/modules/billing/*`
- `src/modules/syncpay/*`

## Responsabilidade

Controle de planos SaaS, acesso, limites de IA, checkout de assinatura, webhooks SyncPay e confirmacao de vendas legadas.

## SubscriptionModule

`SubscriptionService`:

- monta snapshot de acesso do usuario;
- verifica acesso ativo;
- calcula limite de IA;
- decide se IA esta liberada para bot ou usuario;
- conta mensagens processadas no dia.

Guards:

- `SubscriptionGuard`: exige `x-user-id` e acesso ativo.
- `AdminRoleGuard`: exige `SUPER_ADMIN`.

## Planos

Definidos em `plan-catalog.ts`:

- `FREE`: R$ 0, limite 10/dia.
- `BASIC`: preco default 4900 centavos, limite 200/dia.
- `PRO`: preco default 9900 centavos, sem limite.
- `ENTERPRISE`: preco default 19900 centavos, sem limite.

Env vars de preco:

- `SAAS_BASIC_PRICE_CENTS`
- `SAAS_PRO_PRICE_CENTS`
- `SAAS_ENTERPRISE_PRICE_CENTS`

## BillingModule

Endpoints:

- `GET /billing/plans`
- `POST /billing/activate-free`
- `POST /billing/checkout`
- `POST /api/syncpay/webhook`
- `POST /webhook/syncpay`

Regras:

- Free e ativado diretamente.
- Checkout pago cria cobranca SyncPay.
- Assinatura fica `PAST_DUE` com grace de 3 dias ate pagamento.
- Webhook de sucesso ativa assinatura e registra pagamento.
- Webhook de falha marca transacao como `FAILED`.
- Webhook de cancelamento cancela assinatura.

## SyncPayModule

`SyncPayService`:

- autentica em `/api/partner/v1/auth-token`;
- cacheia bearer token em memoria;
- cria cash-in PIX em `/api/partner/v1/cash-in`;
- exige webhook URL configurada;
- aceita nomes legados de env, mas prefere nomes novos.

Env vars:

- `SYNCPAY_CLIENT_ID`
- `SYNCPAY_CLIENT_SECRET`
- `SYNCPAY_API_KEY` legado
- `SYNCPAY_TOKEN` legado
- `SYNCPAY_DEFAULT_CPF`
- `SYNCPAY_DEFAULT_EMAIL`
- `SYNCPAY_DEFAULT_PHONE`
- `SYNCPAY_WEBHOOK_URL`

## Vendas Legadas Telegram

Billing tambem trata `Sale`:

- busca sale por referencias do webhook;
- sucesso muda `Sale` para `PAID`;
- produto `SUBSCRIPTION` pode atualizar `TelegramUser.subscriberUntil`;
- chama `TelegramService.confirmPayment` para entregar acesso.

## Riscos

- Token SyncPay fica em cache de memoria por processo.
- Webhook precisa correlacionar por multiplos campos possiveis.
- Billing importa Telegram para confirmacao legada, acoplamento que deve ser tratado com cuidado.

