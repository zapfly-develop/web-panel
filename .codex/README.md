# Front-end Contexto Floovi

Este diretorio e um pacote de handoff para agente ou desenvolvedor front-end.
Ele resume a logica de produto, contratos HTTP, realtime, papeis de usuario e
cuidados de integracao com o backend NestJS.

Leia nesta ordem:

1. `00-project-map.md`: mapa do produto, repositorios e fonte de verdade.
2. `01-frontend-architecture.md`: arquitetura recomendada para web e rider app.
3. `02-auth-roles-routing.md`: autenticacao, roles, protecao de rotas e tenants.
4. `03-api-contracts.md`: endpoints, headers, payloads e erros.
5. `04-business-flows.md`: fluxos de loja, rider, wallet, billing e delivery.
6. `05-realtime-and-push.md`: Socket.IO, Web Push e eventos que movem UI.
7. `06-screen-map.md`: telas esperadas e responsabilidades por papel.
8. `07-domain-types.md`: enums e tipos TypeScript base para o front.
9. `08-implementation-rules.md`: checklist de implementacao e QA.
10. `09-existing-frontends.md`: mapa dos front-ends existentes no workspace.

## Principios

- O backend e a fonte de verdade de regras de negocio.
- O front deve orquestrar UX, estado visual, cache e chamadas HTTP, mas nao deve
  recalcular regras financeiras, logisticas ou de permissao.
- Use valores em centavos (`amountCents`, `totalCents`) e formate apenas na UI.
- Use datas ISO vindas da API; normalize exibicao em `America/Sao_Paulo`.
- Prefira `Authorization: Bearer <accessToken>` para clientes novos.
- `x-user-id` e legado/conveniencia de borda. No browser, injete no servidor ou
  use JWT; nao confie em `x-user-id` montado pelo cliente.
- Para mudancas criticas, apos mutacao HTTP, atualize localmente e aceite eventos
  realtime como reconciliacao.

## Fontes De Verdade Locais

- Backend: `/home/rogerio/floovi/back-end`
- Web panel Next.js: `/home/rogerio/floovi/web-panel`
- Rider app Expo: `/home/rogerio/floovi/rider-app`
- Backend docs gerais: `.codex/project.md`, `.codex/business-rules.md`,
  `.codex/modules/*.md`
- Swagger em runtime: `GET /docs` no backend, normalmente `http://localhost:3001/docs`
