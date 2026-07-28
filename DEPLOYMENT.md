# Deploy

## Recommended: VPS + Docker Compose

This repository includes a production Docker setup:

- `Dockerfile` builds the Next.js app image in GitHub Actions.
- `docker-compose.prod.yml` runs the published app image and PostgreSQL.
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

### 2. Prepare App Directory

GitHub Actions uploads only deployment files to the VPS:

- `docker-compose.prod.yml`
- `docker-compose.caddy.yml`
- `docker/Caddyfile`
- `scripts/deploy-vps.sh`
- `.env.production`

The application source is not built on the VPS.

### 3. Create Production Env

On the VPS:

```bash
cd /opt/word_learning
cp .env.production.example .env.production
openssl rand -base64 32
```

Edit `.env.production`:

```env
APP_IMAGE=ghcr.io/your-owner/your-repo:latest
APP_BIND=0.0.0.0
APP_PORT=3000
RUN_MIGRATIONS=true

POSTGRES_DB=word_learning
POSTGRES_USER=word_learning
POSTGRES_PASSWORD=use-a-long-random-password

AUTH_SECRET=output-from-openssl-rand-base64-32
ADMIN_EMAILS=your-admin-email@example.com

AI_PROVIDER=gemini
GEMINI_API_KEY=your-new-gemini-api-key
GEMINI_MODEL=gemini-flash-latest
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_TIMEOUT_MS=30000

GROQ_API_KEY=
GROQ_MODEL=qwen/qwen3.6-27b
GROQ_SENTENCE_MODEL=llama-3.1-8b-instant
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_TIMEOUT_MS=20000
GROQ_MAX_CONCURRENCY=1
GROQ_QUEUE_MAX_SIZE=20
GROQ_QUEUE_TIMEOUT_MS=15000
GROQ_GLOBAL_RPM=25
GROQ_GLOBAL_RPD=900

GENERATION_RATE_LIMIT_RPM=5
GENERATION_RATE_LIMIT_RPD=200
```

Use a new Gemini key. Do not reuse a key that was pasted into chat or logs.

### 4. Start

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
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
  pull

docker compose --env-file .env.production \
  -f docker-compose.prod.yml \
  -f docker-compose.caddy.yml \
  up -d
```

The app will be available at:

```text
https://your-domain.com
```

### 6. Update Deploy

Set `APP_IMAGE` to the new image tag, then:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml pull app
docker compose --env-file .env.production -f docker-compose.prod.yml up -d app
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

- `.github/workflows/ci.yml` runs PR checks.
- `.github/workflows/deploy-vps.yml` runs the production pipeline on push/manual trigger:
  1. `test` runs typecheck and unit tests.
  2. `build_image` builds the Docker image and pushes it to GitHub Container Registry.
  3. `deploy_vps` logs into GHCR on the VPS, pulls the published image, and runs Docker Compose.

### Required GitHub Secrets

Add these in GitHub:

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

Required repository variables:

```text
VPS_HOST
VPS_USER
VPS_APP_DIR
ADMIN_EMAILS
GEMINI_BASE_URL
GEMINI_MODEL
GEMINI_TIMEOUT_MS
GROQ_BASE_URL
GROQ_MODEL
GROQ_SENTENCE_MODEL
GROQ_TIMEOUT_MS
GROQ_MAX_CONCURRENCY
GROQ_QUEUE_MAX_SIZE
GROQ_QUEUE_TIMEOUT_MS
GROQ_GLOBAL_RPM
GROQ_GLOBAL_RPD
GENERATION_RATE_LIMIT_RPM
GENERATION_RATE_LIMIT_RPD
```

Optional repository variables:

```text
VPS_PORT
VPS_ENABLE_CADDY
VPS_HEALTHCHECK_URL
DOMAIN
RUN_MIGRATIONS
OPENAI_MODEL
```

Required repository secrets:

```text
VPS_SSH_KEY
APP_BIND
APP_PORT
AUTH_SECRET
AI_PROVIDER
GEMINI_API_KEY
GROQ_API_KEY
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
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

The workflow creates `.env.production` on the VPS from these secrets and variables. The generated file has this shape:

```env
APP_IMAGE=ghcr.io/allaberenov/wordlearning:<commit-sha>
APP_BIND=<APP_BIND>
APP_PORT=<APP_PORT>
RUN_MIGRATIONS=true

POSTGRES_DB=<POSTGRES_DB>
POSTGRES_USER=<POSTGRES_USER>
POSTGRES_PASSWORD=<POSTGRES_PASSWORD>

AUTH_SECRET=<AUTH_SECRET>
ADMIN_EMAILS=<ADMIN_EMAILS>

AI_PROVIDER=gemini
GEMINI_API_KEY=<GEMINI_API_KEY>
GEMINI_MODEL=<GEMINI_MODEL>
GEMINI_BASE_URL=<GEMINI_BASE_URL>
GEMINI_TIMEOUT_MS=<GEMINI_TIMEOUT_MS>

GROQ_API_KEY=<GROQ_API_KEY>
GROQ_MODEL=qwen/qwen3.6-27b
GROQ_SENTENCE_MODEL=llama-3.1-8b-instant
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_TIMEOUT_MS=20000
GROQ_MAX_CONCURRENCY=1
GROQ_QUEUE_MAX_SIZE=20
GROQ_QUEUE_TIMEOUT_MS=15000
GROQ_GLOBAL_RPM=25
GROQ_GLOBAL_RPD=900

GENERATION_RATE_LIMIT_RPM=5
GENERATION_RATE_LIMIT_RPD=200

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

`ADMIN_EMAILS` is a comma-separated allowlist. Example:

```env
ADMIN_EMAILS=your-admin-email@example.com,second-admin@example.com
```

### Groq Rate Limits

The app applies two local protection layers before calling Groq:

- per-user generation throttling: `GENERATION_RATE_LIMIT_RPM` and `GENERATION_RATE_LIMIT_RPD`;
- global provider throttling: `GROQ_GLOBAL_RPM`, `GROQ_GLOBAL_RPD`, `GROQ_MAX_CONCURRENCY`, `GROQ_QUEUE_MAX_SIZE`, `GROQ_QUEUE_TIMEOUT_MS`.

Default production-safe values:

```env
GROQ_MAX_CONCURRENCY=1
GROQ_QUEUE_MAX_SIZE=20
GROQ_QUEUE_TIMEOUT_MS=15000
GROQ_GLOBAL_RPM=25
GROQ_GLOBAL_RPD=900
GENERATION_RATE_LIMIT_RPM=5
GENERATION_RATE_LIMIT_RPD=200
```

The current limiter is in-memory and works only inside one Node.js process. For multiple replicas, move these counters and the queue to Redis or another shared external store.

If using Caddy/HTTPS, add a GitHub Actions variable:

```text
Settings -> Secrets and variables -> Actions -> Variables
VPS_ENABLE_CADDY=true
```

And add these variables:

```env
DOMAIN=dublind.ru
APP_BIND=127.0.0.1
```

For `dublind.ru`, create DNS records at your DNS provider:

```text
Type: A
Name: @
Value: 91.198.166.61

Type: A
Name: www
Value: 91.198.166.61
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
ADMIN_EMAILS="your-admin-email@example.com"

AI_PROVIDER="gemini"
GEMINI_API_KEY="your-production-gemini-key"
GEMINI_MODEL="gemini-flash-latest"
GEMINI_BASE_URL="https://generativelanguage.googleapis.com/v1beta"
GEMINI_TIMEOUT_MS="30000"

GROQ_API_KEY=""
GROQ_MODEL="qwen/qwen3.6-27b"
GROQ_SENTENCE_MODEL="llama-3.1-8b-instant"
GROQ_BASE_URL="https://api.groq.com/openai/v1"
GROQ_TIMEOUT_MS="20000"
GROQ_MAX_CONCURRENCY="1"
GROQ_QUEUE_MAX_SIZE="20"
GROQ_QUEUE_TIMEOUT_MS="15000"
GROQ_GLOBAL_RPM="25"
GROQ_GLOBAL_RPD="900"

GENERATION_RATE_LIMIT_RPM="5"
GENERATION_RATE_LIMIT_RPD="200"

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
