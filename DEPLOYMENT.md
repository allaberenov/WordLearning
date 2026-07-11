# Deploy

## Recommended: VPS + Docker Compose

This repository includes a production Docker setup:

- `Dockerfile` builds the Next.js app.
- `docker-compose.prod.yml` runs the app and PostgreSQL.
- `docker/entrypoint.sh` runs `prisma migrate deploy` before starting the app.
- `docker-compose.caddy.yml` optionally adds HTTPS via Caddy.

### 1. Prepare VPS

Install Docker and the Compose plugin:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and back in after adding the user to the `docker` group.

### 2. Copy Project To VPS

From your local machine:

```bash
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .env \
  --exclude .env.local \
  ./ user@your-vps-ip:/opt/word_learning/
```

Or clone/pull the repository on the VPS.

### 3. Create Production Env

On the VPS:

```bash
cd /opt/word_learning
cp .env.production.example .env.production
openssl rand -base64 32
```

Edit `.env.production`:

```env
APP_BIND=0.0.0.0
APP_PORT=3000
RUN_MIGRATIONS=true

POSTGRES_DB=word_learning
POSTGRES_USER=word_learning
POSTGRES_PASSWORD=use-a-long-random-password

AUTH_SECRET=output-from-openssl-rand-base64-32

AI_PROVIDER=gemini
GEMINI_API_KEY=your-new-gemini-api-key
GEMINI_MODEL=gemini-flash-latest
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_TIMEOUT_MS=30000
```

Use a new Gemini key. Do not reuse a key that was pasted into chat or logs.

### 4. Start

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Check logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app
```

The app will be available at:

```text
http://your-vps-ip:3000
```

### 5. HTTPS With Domain

Point your domain A-record to the VPS IP.

Set in `.env.production`:

```env
DOMAIN=your-domain.com
APP_BIND=127.0.0.1
```

Run:

```bash
docker compose --env-file .env.production \
  -f docker-compose.prod.yml \
  -f docker-compose.caddy.yml \
  up -d --build
```

The app will be available at:

```text
https://your-domain.com
```

### 6. Update Deploy

Copy or pull the latest code, then:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

### 7. Optional Seed

Run only if you want the demo account:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app npm run db:seed
```

Demo account:

```text
demo@example.com
demo12345
```

For public production, avoid keeping the demo user with this password.

## CI/CD With GitHub Actions

The repository includes two workflows:

- `.github/workflows/ci.yml` runs typecheck, tests, production build, and Docker build.
- `.github/workflows/deploy-vps.yml` deploys to a VPS by SSH and Docker Compose.

### Required GitHub Secrets

Add these in GitHub:

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

Required secrets:

```text
VPS_HOST
VPS_USER
VPS_SSH_KEY
VPS_APP_DIR
VPS_ENV_PRODUCTION
```

Optional secrets:

```text
VPS_PORT
VPS_HEALTHCHECK_URL
```

`VPS_PORT` defaults to `22`.

`VPS_APP_DIR` example:

```text
/opt/word_learning
```

`VPS_HEALTHCHECK_URL` examples:

```text
http://1.2.3.4:3000
https://words.example.com
```

`VPS_ENV_PRODUCTION` is the full content of `.env.production`, for example:

```env
APP_BIND=0.0.0.0
APP_PORT=3000
RUN_MIGRATIONS=true

POSTGRES_DB=word_learning
POSTGRES_USER=word_learning
POSTGRES_PASSWORD=use-a-long-random-password

AUTH_SECRET=output-from-openssl-rand-base64-32

AI_PROVIDER=gemini
GEMINI_API_KEY=your-new-gemini-api-key
GEMINI_MODEL=gemini-flash-latest
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_TIMEOUT_MS=30000

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

If using Caddy/HTTPS, add a GitHub Actions variable:

```text
Settings -> Secrets and variables -> Actions -> Variables
VPS_ENABLE_CADDY=true
```

And include this in `VPS_ENV_PRODUCTION`:

```env
DOMAIN=your-domain.com
APP_BIND=127.0.0.1
```

### SSH Key

Generate a deploy key locally:

```bash
ssh-keygen -t ed25519 -C "github-actions-word-learning" -f ./word_learning_deploy_key
```

Put the public key on the VPS:

```bash
ssh-copy-id -i ./word_learning_deploy_key.pub user@your-vps-ip
```

Put the private key content into GitHub secret `VPS_SSH_KEY`:

```bash
cat ./word_learning_deploy_key
```

### Deploy

Deployment runs automatically on push to `main`, and can also be started manually:

```text
GitHub -> Actions -> Deploy VPS -> Run workflow
```

## Alternative: Vercel + Managed PostgreSQL

This app is a full-stack Next.js application. It cannot be deployed as a static site because it uses:

- Next.js API routes;
- server-side sessions;
- Prisma;
- PostgreSQL;
- Gemini/OpenAI/Ollama backend generation providers.

For production, use a hosted PostgreSQL database such as Vercel Postgres, Neon, Supabase, Railway Postgres, or any PostgreSQL server reachable from Vercel.

## Required Production Environment Variables

Set these in the hosting provider dashboard:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
AUTH_SECRET="generate-a-long-random-secret"

AI_PROVIDER="gemini"
GEMINI_API_KEY="your-production-gemini-key"
GEMINI_MODEL="gemini-flash-latest"
GEMINI_BASE_URL="https://generativelanguage.googleapis.com/v1beta"
GEMINI_TIMEOUT_MS="30000"

OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
```

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Do not use `localhost` in `DATABASE_URL` for production.

## First Deploy Flow

1. Install dependencies:

```bash
npm install
```

2. Create or attach a production PostgreSQL database.

3. Set environment variables in Vercel.

4. Apply database migrations against the production database:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require" npm run db:deploy
```

5. Deploy:

```bash
npx vercel --prod
```

## Optional Seed

Run seed only if you want the demo account in production:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require" npm run db:seed
```

Demo account:

```text
demo@example.com
demo12345
```

For a real public deployment, avoid seeding the demo user or change its password immediately.

## Gemini Key Safety

If an API key was pasted into chat, terminal output, screenshots, or logs, revoke it and create a new key before production deploy.
