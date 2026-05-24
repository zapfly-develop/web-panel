# 02 - Auth, Roles E Rotas

## Login JWT Backend

Endpoint:

```http
POST /auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "loja@example.com",
  "password": "senha"
}
```

Resposta:

```ts
type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
  refreshExpiresAt: string;
  user: {
    id: string;
    email?: string | null;
    role: "SUPER_ADMIN" | "ADMIN" | "MERCHANT" | "RIDER" | "CUSTOMER";
    accessStatus: "ACTIVE" | "BANNED";
    merchantId?: string | null;
    riderId?: string | null;
  };
};
```

Renovacao:

```http
POST /auth/refresh
```

Body:

```json
{ "refreshToken": "<refresh-token>" }
```

Logout:

```http
POST /auth/logout
Authorization: Bearer <access-token>
```

Body:

```json
{ "refreshToken": "<refresh-token>" }
```

## Headers

Preferido:

```http
Authorization: Bearer <access-token>
Accept: application/json
```

Legado ou server-side bridge:

```http
x-user-id: <user-id>
```

Regra: browser nao deve inventar `x-user-id`. Se o web-panel precisar usar este
header, derive-o da sessao em Server Component, Server Action ou Next API route.

## Roles Efetivas

O backend resolve role efetiva assim:

- `SUPER_ADMIN` e `ADMIN`: admin.
- `RIDER`: rider.
- `CUSTOMER` com `riderProfile`: rider.
- `CUSTOMER` com `merchantProfile`: merchant.
- `CUSTOMER` sem rider: tratado como merchant em rotas merchant por compatibilidade.
- `BANNED`: bloqueado.

## Home Por Papel

- Admin ou super admin: `/admin/dashboard`
- Rider: `/delivery/rider`
- Merchant: `/dashboard`
- Merchant sem acesso SaaS ativo: `/billing`

## Rotas Web Recomendadas

Publicas:

- `/login`
- `/register`
- `/delivery/rider/register`
- `/termos`

Merchant:

- `/dashboard`
- `/dashboard/orders`
- `/dashboard/delivery`
- `/dashboard/whatsapp`
- `/dashboard/products`
- `/billing`

Rider:

- `/delivery/rider`
- `/delivery/rider/wallet`
- `/delivery/available?deliveryId=<id>` redireciona para rider dashboard.

Admin:

- `/admin/dashboard`
- `/admin/scraping`
- telas futuras de usuarios, billing e monitoramento.

## Bloqueios Importantes

- Rider nao acessa `/dashboard`, `/billing`, `/admin` nem APIs de merchant.
- Merchant nao acessa `/delivery/rider`.
- Admin nao deve cair no dashboard de loja.
- Usuario nao autenticado em API do Next deve receber `401`, nao redirect HTML.

## Subscription

Algumas rotas merchant exigem assinatura ativa via `SubscriptionGuard`:

- `POST /whatsapp/connect`
- `GET /whatsapp/qr-code`

Regras de acesso SaaS:

- `SUPER_ADMIN` sempre tem acesso.
- `BANNED` bloqueia.
- `ACTIVE` vale ate `endDate` se houver.
- `PAST_DUE` vale ate `graceUntil`.
- `CANCELED` vale ate `endDate` se houver.

## Implementacao Segura

- Guarde refresh token em storage seguro. No browser, prefira cookie httpOnly via
  BFF; em mobile, use Secure Store.
- Access token pode ficar em memoria ou storage seguro com expiracao curta.
- Em `401`, tente refresh uma vez.
- Em `403`, nao tente refresh em loop.
- Ao trocar role ou receber sessao invalida, limpe cache local e redirecione.

