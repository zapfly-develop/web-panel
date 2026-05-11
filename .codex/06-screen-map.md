# 06 - Mapa De Telas

## Publico

### `/login`

Responsabilidades:

- email/senha;
- chamar `POST /auth/login` ou fluxo NextAuth existente;
- redirecionar por papel;
- mostrar erro de credenciais e usuario banido.

### `/register`

Cadastro de loja/merchant. Deve diferenciar loja de rider. Se o usuario quer ser
motoboy, usar `/delivery/rider/register`.

### `/delivery/rider/register`

Onboarding rider. Deve deixar claro:

- cadastro separado do painel de loja;
- perfil pode exigir revisao;
- depois da aprovacao, o rider opera em `/delivery/rider`.

## Merchant

### `/dashboard`

Resumo operacional:

- status WhatsApp;
- pedidos recentes;
- assinatura;
- atalhos para delivery, produtos, campanhas e configuracoes.

### `/dashboard/whatsapp`

Responsabilidades:

- conectar instancia;
- mostrar QR/pairing code;
- listar instancias;
- ouvir `/whatsapp-events`.

### `/dashboard/orders`

Responsabilidades:

- kanban `PREPARING`, `SHIPPED`, `DELIVERED`;
- cards/tabela;
- detalhes do pedido;
- enviar para entrega;
- mover status com regras;
- mapa de calor opcional.

### `/dashboard/delivery`

Responsabilidades:

- lista de entregas por status;
- mapa operacional;
- riders disponiveis;
- atribuicao manual;
- incidentes e cliente ausente;
- ranking/performance;
- avaliacao da entrega concluida.

### `/billing`

Responsabilidades:

- listar planos;
- ativar Free;
- criar checkout Pix para pago;
- mostrar PIX copia-e-cola;
- orientar que pagamento atualiza via webhook.

### `/dashboard/products`

Existe no web-panel, mas o backend atual de catalogo e parcialmente interno ao
contexto delivery/IA. Ao mexer, confirme endpoints existentes no web-panel antes
de trocar contrato.

## Rider

### `/delivery/rider`

Primeira tela apos login de rider.

Blocos:

- perfil e status cadastral;
- toggle online/offline;
- permissao de localizacao;
- entrega ativa;
- entregas disponiveis proximas;
- acoes principais por status;
- alertas de incidente, cliente ausente e bloqueio temporario;
- atalho para carteira.

Estados de UI:

- Sem perfil: CTA para cadastro.
- `PENDING_REVIEW`: aguardando aprovacao.
- `SUSPENDED`/`REJECTED`: bloqueado.
- `ACTIVE` + offline: pode ficar online.
- `ACTIVE` + online: envia localizacao e recebe corridas.
- `BUSY`: foca entrega ativa.

### `/delivery/available?deliveryId=<id>`

Deep link de push. Deve redirecionar para `/delivery/rider?deliveryId=<id>`.

### `/delivery/rider/wallet`

Responsabilidades:

- saldo disponivel;
- saldo congelado;
- extrato;
- filtros simples;
- solicitacao de saque;
- validacao de valor e chave Pix;
- idempotency key por tentativa de saque.

## Admin

### `/admin/dashboard`

Responsabilidades:

- MRR;
- churn;
- usuarios ativos;
- receita;
- saude de instancias;
- handovers abertos;
- mensagens processadas.

### Admin Futuro

Telas recomendadas:

- usuarios e acesso;
- billing/financeiro;
- instancias WhatsApp;
- filas e jobs;
- integrations status.

## Cliente Final

Ainda nao ha experiencia completa de cliente final no front. O backend ja reserva
deep link `/delivery/tracking/<deliveryId>` para Push futuro quando houver
`customerUserId` ou telefone compativel.

Nao implemente tracking de cliente assumindo acesso publico irrestrito; defina
token/escopo antes.

