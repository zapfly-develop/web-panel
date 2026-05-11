# 09 - Front-ends Existentes No Workspace

Este arquivo aponta onde o agente deve procurar antes de criar algo do zero.

## Web Panel

Path:

```text
/home/rogerio/floovi/web-panel
```

Stack:

- Next.js 16 App Router.
- React 19.
- NextAuth v5 beta.
- shadcn/ui + Radix + Tailwind.
- `socket.io-client`.
- Google Maps via helper local.

Comandos:

```bash
cd /home/rogerio/floovi/web-panel
npm run dev
npm run build
```

Arquivos importantes:

- `src/proxy.ts`: guarda de rotas, redirect por role, isolamento rider.
- `src/auth.ts`: NextAuth.
- `src/types/next-auth.d.ts`: shape da sessao.
- `src/lib/nest-api.ts`: client server-side para Nest API.
- `src/lib/server-session.ts`: helpers `requireRiderUser` etc.
- `src/features/orders/*`: dashboard/kanban de pedidos.
- `src/features/delivery/*`: delivery manager e rider dashboard PWA.
- `src/features/wallet/*`: wallet do rider.
- `src/app/api/wallet/*`: BFF de wallet para rider.

Rotas ja existentes:

- `/login`
- `/register`
- `/dashboard`
- `/dashboard/orders`
- `/dashboard/delivery`
- `/dashboard/whatsapp`
- `/dashboard/products`
- `/billing`
- `/admin/dashboard`
- `/admin/scraping`
- `/delivery/rider`
- `/delivery/rider/register`
- `/delivery/rider/wallet`
- `/delivery/available`

Padroes a preservar:

- Riders autenticados vao para `/delivery/rider`.
- Riders nao acessam dashboard, billing, admin nem APIs de dashboard.
- Merchant sem acesso ativo vai para `/billing`.
- Admin vai para `/admin/dashboard`.
- Server-side usa `fetchNestApiJson` com `x-user-id` derivado da sessao; o helper
  pode trocar por JWT interno curto quando configurado.

## Rider App

Path:

```text
/home/rogerio/floovi/rider-app
```

Stack:

- Expo 54.
- React Native 0.81.
- Secure Store.
- `socket.io-client`.
- `expo-location`.
- `expo-notifications`.
- Zustand.

Comandos:

```bash
cd /home/rogerio/floovi/rider-app
npm run start
npm run typecheck
```

Arquivos importantes:

- `src/services/api-client.ts`: API client com Bearer token e refresh automatico.
- `src/config/env.ts`: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SOCKET_URL`.
- `src/services/storage.ts`: sessao em storage seguro.
- `src/types/auth.ts`: contrato de auth.
- `src/types/location.ts`: payload de localizacao.
- `src/features/location/location-task.ts`: background location ainda desativado.
- `src/components/ui/*`: componentes base mobile.

Padroes a preservar:

- Usar `Authorization: Bearer <accessToken>`.
- Em `401`, tentar refresh uma vez.
- Limpar sessao se refresh falhar.
- Localizacao deve ser enviada para `POST /delivery/riders/me/location`.
- Background location esta desativado; nao prometer rastreio em background sem
  ativar e testar permissao/plataforma.

## Quando Criar Novo Codigo

Antes de criar novo componente, procurar:

```bash
rg "termo-ou-rota" /home/rogerio/floovi/web-panel/src
rg "termo-ou-rota" /home/rogerio/floovi/rider-app/src
```

Prefira estender:

- services existentes;
- tipos existentes;
- hooks de realtime existentes;
- componentes UI existentes.

Crie abstracao nova apenas quando houver repeticao real entre telas ou quando a
fronteira de dominio ficar mais clara.

## Diferenca Entre Web PWA E Rider App

O web-panel ja tem experiencia rider PWA em `/delivery/rider`. O `rider-app` e
uma experiencia nativa/Expo paralela. Ambos devem respeitar os mesmos contratos
de backend:

- auth JWT;
- role rider;
- APIs `/delivery/riders/me/*`;
- wallet `/wallet/*`;
- Socket.IO `/delivery`;
- Web Push/notifications conforme plataforma.

Nao deixe uma experiencia criar regra diferente da outra. Se uma tela mobile
precisar de comportamento novo, primeiro confirme se o backend ja suporta ou se
deve virar endpoint/regra de dominio.

