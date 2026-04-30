# Guia de instalação e execução do projeto

Este guia mostra o passo a passo para preparar o ambiente na **WSL Ubuntu**, instalar **Node.js**, instalar **Docker**, subir o **PostgreSQL no Docker com restart always**, configurar os arquivos **.env**, instalar dependências, executar o **Prisma**, buildar e rodar o **Next.js** e o **NestJS**, e por fim manter tudo rodando com **PM2**.

---

# Estrutura do projeto

/meu-projeto
├── .env
├── package.json
├── telegram-user-service-nest
│ ├── .env
│ └── package.json

- Raiz do projeto → Front-end (Next.js)
- telegram-user-service-nest → Back-end (NestJS)

---

# 1. Atualizar sistema

sudo apt update && sudo apt upgrade -y

---

# 2. Instalar Node.js

## Instalar NVM

curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

Recarregar terminal:

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

Instalar Node LTS:

nvm install --lts
nvm use --lts

Verificar:

node -v
npm -v

---

# 3. Instalar Docker

sudo apt remove docker docker-engine docker.io containerd runc -y
sudo apt install -y ca-certificates curl gnupg lsb-release

sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo service docker start

sudo usermod -aG docker $USER

Testar:

docker --version
docker ps

---

# 4. Rodar PostgreSQL no Docker

docker rm -f postgres-dev 2>/dev/null || true

docker run -d \
--name postgres-dev \
--restart always \
-e POSTGRES_USER=postgres \
-e POSTGRES_PASSWORD=postgres \
-e POSTGRES_DB=app \
-p 5432:5432 \
-v postgres_data:/var/lib/postgresql/data \
postgres:16

Testar:

docker ps

docker exec -it postgres-dev psql -U postgres -d app

---

# 5. Instalar dependências

Front-end:

npm install

Back-end:

cd telegram-user-service-nest
npm install
cd ..

---

# 6. Criar .env do front

Use `.env.example` como base e preencha os segredos localmente:

```bash
cp .env.example .env.local
```

Para desenvolvimento local no mesmo computador:

```env
APP_BASE_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEST_API_URL=http://localhost:3001
NEXT_PUBLIC_NEST_API_URL=http://localhost:3001
```

Para testar o PWA em celular, `NEXT_PUBLIC_NEST_API_URL` deve usar o IP da
maquina que roda o back-end:

```env
NEXT_PUBLIC_NEST_API_URL=http://SEU_IP_LOCAL:3001
```

---

# 7. Criar .env do back

Crie o `.env` no repositório do back-end com os valores reais do banco,
Redis, SyncPay, Evolution, Telegram e VAPID. Não copie segredos para docs ou
commits.

---

# 8. Criar banco do front

docker exec -it postgres-dev psql -U postgres -d app -c 'CREATE DATABASE "teletram-bot";'

---

# 9. Prisma

cd telegram-user-service-nest

npx prisma generate
npx prisma migrate deploy

cd ..

---

# 10. Build

Front:

npm run build

Back:

cd telegram-user-service-nest
npm run build
cd ..

---

# 11. Instalar PM2

npm install -g pm2

---

# 12. Rodar aplicações

Front:

pm2 start npm --name telegram-front -- start

Back:

pm2 start npm --name telegram-back --cwd ./telegram-user-service-nest -- run start:prod

Salvar:

pm2 save

---

# 13. Habilitar no boot

pm2 startup
pm2 save

---

# 14. Comandos úteis

pm2 list
pm2 logs telegram-front
pm2 logs telegram-back
pm2 restart all

Docker:

docker ps
docker logs -f postgres-dev
docker restart postgres-dev
docker compose -f docker-compose.nest-cloudflare.yml config
docker compose -f docker-compose.nest-cloudflare.yml up --build -d
docker compose -f docker-compose.nest-cloudflare.yml logs -f
docker compose -f docker-compose.nest-cloudflare.yml down
