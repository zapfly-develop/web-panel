# 04 - Fluxos De Negocio Para O Front

## 1. Login E Entrada

1. Usuario envia email/senha.
2. Front chama `POST /auth/login`.
3. Guarda access/refresh token ou cria sessao server-side.
4. Redireciona por papel:
   - admin: `/admin/dashboard`
   - rider: `/delivery/rider`
   - merchant: `/dashboard`
5. Se merchant sem acesso ativo, mande para `/billing`.

## 2. Billing Merchant

Telas:

- catalogo de planos;
- checkout Pix;
- estado de assinatura.

Fluxo:

1. `GET /billing/plans`.
2. Se `FREE`: `POST /billing/activate-free`.
3. Se pago: `POST /billing/checkout` com `planType`.
4. Mostre `pixCode`, `gatewayReference`, status `PAST_DUE` e grace.
5. Webhook SyncPay atualiza assinatura no backend; front deve ter botao de
   atualizar ou polling moderado.

Nao crie no front logica de ativar assinatura paga sem webhook.

## 3. WhatsApp Merchant

Fluxo de conexao:

1. `POST /whatsapp/connect`.
2. `GET /whatsapp/qr-code` em polling ate `CONNECTED` ou evento realtime.
3. Assine `/whatsapp-events` e evento `whatsapp:instance-status`.
4. Ao conectar, atualize lista de instancias.

Regras:

- Precisa de assinatura ativa.
- Status remoto pode demorar; UI deve suportar `CONNECTING`, `CONNECTED`,
  `DISCONNECTED` e estados textuais legados.

## 4. Store Address

Endereco da loja e obrigatorio para experiencia logistica correta.

Fluxo:

1. Carregar `GET /delivery/store-address`.
2. Se vazio, mostrar setup antes de criar entregas.
3. Salvar com `PUT /delivery/store-address`.
4. Backend geocodifica e retorna coordenadas.
5. Front pode mostrar mapa usando coordenadas retornadas.

Nao confie em coordenada calculada apenas no browser para precificar corrida.

## 5. Orders Dashboard

Fluxo:

1. Carregar `GET /delivery/orders/dashboard`.
2. Conectar Socket.IO `/orders`.
3. Ouvir:
   - `orders:finalized`
   - `orders:updated`
4. Atualizar kanban/lista/tabela.
5. Ao mover card:
   - `PATCH /delivery/orders/:orderId/status`.
6. Ao enviar para entrega:
   - `POST /delivery/orders/:orderId/send-to-delivery`.

Regras de UI:

- Mostrar apenas alvos `PREPARING`, `SHIPPED`, `DELIVERED`.
- Bloquear retorno de `DELIVERED`.
- Ao mover para `SHIPPED`, perguntar quem manuseia pagamento quando relevante:
  `RIDER` ou `STORE_MACHINE`.
- Se API negar por estado da entrega, refazer fetch e mostrar mensagem clara.

## 6. Delivery Merchant

Telas:

- lista de entregas por status;
- mapa operacional;
- dialog de atribuicao manual;
- performance de riders;
- avaliacao de entrega.

Fluxo:

1. `GET /delivery/deliveries?status=...`.
2. `GET /delivery/riders/available`.
3. Para atribuir: `POST /delivery/deliveries/:deliveryId/assign`.
4. Para ocorrencia: `POST /delivery/deliveries/:deliveryId/report-incident`.
5. Para cliente ausente: `POST /delivery/deliveries/:deliveryId/report-absence`.
6. Para coletar/finalizar pelo merchant: endpoints `pick-up` e `complete`.
7. Ouvir `/delivery` para status e ofertas.

Estados que a UI deve reconhecer:

- `WAITING_RIDER`: aguardando motoboy.
- `READY_FOR_PICKUP`: pronto para coleta, pode voltar como alta prioridade.
- `INCIDENT_REPORTED`: houve ocorrencia.
- `DELIVERY_STAGNATED`: sem motoboy apos timeout.
- `ASSIGNED`: atribuido.
- `PICKED_UP`: coletado.
- `ARRIVED_AT_DESTINATION`: chegou no destino.
- `ABSENT_WAITING`: cliente ausente, janela de espera ativa.
- `RETURNING_TO_MERCHANT`: retornando para loja.
- `DELIVERED`: concluido.
- `CANCELED`: cancelado.

## 7. Rider Onboarding

Fluxo:

1. Usuario acessa `/delivery/rider/register`.
2. Envia `POST /delivery/riders/register`.
3. Backend cria perfil:
   - marketplace rider: `PENDING_REVIEW`;
   - store-owned rider: pode iniciar `ACTIVE`.
4. Apos login, rider vai para `/delivery/rider`.

Campos:

- `displayName`
- `documentNumber`
- `cnhNumber`
- `vehicleType`
- `vehiclePlate`
- `ownerUserId` se for rider proprio da loja
- `isStoreOwned`

## 8. Rider Operacao

Tela principal do rider deve:

- carregar `GET /delivery/riders/me`;
- carregar `GET /delivery/riders/me/active-delivery`;
- se online, listar `GET /delivery/riders/me/available-deliveries`;
- permitir alternar disponibilidade;
- enviar localizacao periodicamente;
- permitir aceitar, coletar, reportar incidente, reportar cliente ausente e
  concluir entrega.

Disponibilidade:

1. Para ficar online: pedir permissao de localizacao.
2. Enviar `PATCH /delivery/riders/me/availability` com `AVAILABLE` ou `ONLINE`.
3. Enviar `POST /delivery/riders/me/location`.
4. Atualizar UI via evento `rider:status_changed`.

Regras:

- Rider `PENDING_REVIEW`, `SUSPENDED` ou `REJECTED` nao deve ver botao "ficar online".
- Rider bloqueado por incidente (`incidentBlockedUntil`) deve ver countdown.
- Ao aceitar entrega, o status principal pode continuar `ASSIGNED`; aceite grava
  `acceptedAt`.
- Coleta so faz sentido a partir de `ASSIGNED`.
- Conclusao so faz sentido a partir de `PICKED_UP`.
- Cliente ausente so faz sentido apos chegada ao destino.

## 9. Wallet Rider

Fluxo:

1. `GET /wallet/me`.
2. `GET /wallet/statement?take=50`.
3. Para saque: `POST /wallet/withdrawals`.

Regras:

- Valores sempre em centavos.
- `balanceCents`: saldo disponivel.
- `frozenBalanceCents`: saldo reservado.
- Saque pendente move saldo disponivel para congelado.
- Saque exige `idempotencyKey`; gere UUID por tentativa real do usuario.
- Nao permita saque acima de `balanceCents` no front, mas backend e autoridade.

## 10. Push Notifications

Momento bom para pedir permissao:

- rider depois de ficar online;
- merchant depois de abrir dashboard delivery;
- nunca na primeira tela publica.

Fluxo:

1. `GET /notifications/vapid-public-key`.
2. `registration.pushManager.subscribe(...)`.
3. `POST /notifications/push-subscriptions`.
4. Em logout, tente `DELETE /notifications/push-subscriptions` enviando
   `endpoint` na query ou no body.

Fluxo Expo nativo:

1. Pedir permissao com `expo-notifications`.
2. Obter `ExponentPushToken[...]`.
3. `POST /notifications/expo-push-tokens`.
4. Em logout, tente `DELETE /notifications/expo-push-tokens` enviando `token`
   na query ou no body.

Deep links:

- Rider: `/delivery/available?deliveryId=<id>`
- Loja: `/delivery/deliveries/<deliveryId>`
- Cliente: `/delivery/tracking/<deliveryId>` quando existir experiencia cliente.
