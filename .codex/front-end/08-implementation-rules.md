# 08 - Regras De Implementacao E QA

## Checklist Antes De Implementar Tela

- Identificar papel da tela: publico, merchant, rider ou admin.
- Confirmar endpoint e DTO em `03-api-contracts.md`.
- Confirmar regra de negocio em `04-business-flows.md`.
- Definir se chamada sera direta ao Nest ou via BFF.
- Definir loading, empty state, error state e retry.
- Definir se precisa Socket.IO ou Web Push.
- Definir se valores financeiros usam centavos.
- Definir se datas precisam ser filtradas em ISO.

## Nao Fazer

- Nao hardcodar userId no client.
- Nao deixar rider acessar telas de merchant.
- Nao calcular repasse, bonus, escrow ou saldo no front.
- Nao gravar coordenada continua no Postgres; envie ao backend e deixe Redis.
- Nao salvar secrets em `NEXT_PUBLIC_*` ou bundle mobile.
- Nao editar historico financeiro; mostrar estorno/ajuste quando existir.
- Nao assumir que webhook de pagamento e instantaneo.
- Nao criar tela de integrations que receba segredo no browser.

## Fazer

- Usar tipagem local para payloads.
- Validar input para UX antes de chamar API.
- Tratar `401`, `403`, `409` e `422/400` com mensagens claras.
- Revalidar dados apos mutacoes criticas.
- Usar optimistic UI apenas quando reversao for simples.
- Manter permissao de localizacao e push como fluxo consentido.
- Mostrar estados operacionais reais, mesmo quando frustrantes.
- Usar labels humanos sem trocar os enums enviados ao backend.

## Padroes De API Client

### Web server-side

```ts
await fetchNestApiJson<T>("/path", {
  headers: { "x-user-id": user.id },
});
```

O helper atual pode trocar `x-user-id` por Bearer interno curto quando
`NEST_API_JWT_SECRET` estiver configurado.

### Browser/mobile com JWT

```ts
await fetch(`${apiUrl}/path`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  },
});
```

Em `401`, tente refresh uma vez.

## Testes Manuais Minimos

Auth:

- login merchant redireciona para `/dashboard`;
- login rider redireciona para `/delivery/rider`;
- login admin redireciona para `/admin/dashboard`;
- token expirado renova;
- usuario banido nao entra.

Merchant:

- billing lista planos e cria Pix;
- WhatsApp conecta e atualiza por realtime;
- pedido novo aparece por `/orders`;
- mover pedido para `SHIPPED` cria fluxo de entrega;
- mover para `DELIVERED` respeita estado da entrega;
- store address salva e retorna coordenadas.

Rider:

- cadastro cria perfil;
- rider pendente nao fica online;
- rider ativo pede localizacao e fica online;
- envio de localizacao funciona;
- lista de entregas proximas atualiza;
- aceitar, coletar, reportar incidente, cliente ausente e concluir respeitam
  estados;
- wallet mostra saldo/extrato;
- saque bloqueia valor acima do saldo.

Realtime/Push:

- reconexao refaz fetch;
- push abre deep link correto;
- logout envia DELETE de push subscription com `{ endpoint }` no body ate o
  backend aceitar body opcional;
- logout remove ou pelo menos invalida subscription local.

Admin:

- dashboard carrega metricas;
- filtros de datas usam ISO;
- alteracao de accessStatus atualiza lista.

## Como Validar Com Backend Local

1. Garanta Postgres e Redis rodando.
2. Backend:

```bash
npm run start:dev
```

3. Abra Swagger:

```text
http://localhost:3001/docs
```

4. Web panel:

```bash
cd /home/rogerio/floovi/web-panel
npm run dev
```

5. Rider app:

```bash
cd /home/rogerio/floovi/rider-app
npm run start
```

## Criterio De Pronto

Uma tela esta pronta quando:

- respeita role e tenant;
- lida com loading/empty/error;
- usa contratos corretos;
- nao duplica regra de negocio do backend;
- funciona com refresh/reload;
- funciona apos reconexao Socket.IO quando aplicavel;
- nao expoe secrets;
- foi testada em largura mobile e desktop quando web;
- textos nao quebram dentro de botoes/cards;
- o fluxo principal tem caminho de recuperacao para erro.
