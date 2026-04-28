# Backend API

O backend fica em /home/rogerio/jobs/zaply/back-end.

Use os contextos do backend como fonte de regra de negócio:
- Delivery: entregas, riders, status, atribuição, localização
- Wallet: saldo, ledger, saque, extrato
- Notifications: Web Push/PWA

Endpoints relevantes:
- GET /delivery/deliveries
- POST /delivery/deliveries/:deliveryId/assign
- POST /delivery/deliveries/:deliveryId/pick-up
- POST /delivery/deliveries/:deliveryId/complete
- GET /delivery/riders/available
- GET /wallet/me
- GET /wallet/statement
- POST /wallet/withdrawals
