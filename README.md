# Word Learning

Word Learning is a full-stack web application for learning and retaining English vocabulary with spaced repetition. The application UI is in Russian, while vocabulary cards contain English words, Russian translations, simple English definitions, and contextual examples.

## Features

- Email and password authentication with secure password hashing.
- httpOnly cookie sessions backed by database-stored hashed session tokens.
- Personal decks, cards, review history, settings, and statistics per user.
- AI-assisted card generation from a single English word or expression.
- Support for idioms, phrasal verbs, and fixed expressions.
- Duplicate detection inside a deck with an explicit override flow.
- FSRS-based review scheduling with Again, Hard, Good, and Easy ratings.
- Optional typed-answer review mode.
- Deck search and status filtering.
- Statistics for learned words, reviews, retention, activity, and forecasted workload.
- Light, dark, and system themes.
- Docker/VPS deployment with Caddy reverse proxy and GitHub Actions CI/CD.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- shadcn/ui-style local components
- Zod
- bcrypt password hashing
- Server-side API routes
- Groq, Gemini, OpenAI, and Ollama generation providers
- Vitest

## Project Structure

- `src/app` - Next.js App Router pages, protected app routes, and API routes.
- `src/components` - UI components, forms, review screens, tables, and statistics views.
- `src/lib` - Prisma, authentication, rate limiting, AI generation, FSRS, stats, and Zod schemas.
- `prisma/schema.prisma` - PostgreSQL data model.
- `prisma/migrations` - SQL migrations.
- `prisma/seed.ts` - demo user and the `Demo English` deck.
- `tests` - unit tests for core logic.
- `docker-compose.prod.yml` - production app and PostgreSQL services.
- `docker-compose.caddy.yml` - Caddy reverse proxy for VPS deployments.
- `.github/workflows` - CI and VPS deployment workflows.

## Security

- Passwords are stored only as bcrypt hashes.
- Session tokens are stored in cookies only as raw httpOnly values; the database stores HMAC hashes.
- Protected API routes resolve the current user from the server session.
- Deck and card ownership is verified on the server.
- AI provider keys are used only in backend code.
- Authentication and card generation endpoints are rate limited in memory.
- Request bodies are size-limited and validated with Zod.
- Duplicate cards are compared by `normalizedWord`; explicit duplicate cards use `meaningIndex`.

## AI Card Generation

Card generation is implemented in `src/lib/openai.ts`. The application supports these providers:

- `AI_PROVIDER="groq"` - Groq OpenAI-compatible Chat Completions. Default model: `qwen/qwen3-32b`.
- `AI_PROVIDER="gemini"` - Google Gemini `generateContent` API with JSON response schema.
- `AI_PROVIDER="openai"` - OpenAI Responses API with strict JSON Schema structured output.
- `AI_PROVIDER="ollama"` - local Ollama model, for example `qwen3:4b-instruct`.

Generated JSON is validated again with `generatedCardSchema`. Invalid JSON triggers one retry. Groq `json_validate_failed` responses are treated as invalid generated JSON and retried.

Relevant environment variables:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/word_learning?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"

AI_PROVIDER="groq"

GROQ_API_KEY=""
GROQ_MODEL="qwen/qwen3-32b"
GROQ_BASE_URL="https://api.groq.com/openai/v1"
GROQ_TIMEOUT_MS="20000"

# Defaults match Groq qwen/qwen3-32b request limits: 60 RPM and 1000 RPD.
GENERATION_RATE_LIMIT_RPM="60"
GENERATION_RATE_LIMIT_RPD="1000"

GEMINI_API_KEY=""
GEMINI_MODEL="gemini-flash-latest"
GEMINI_BASE_URL="https://generativelanguage.googleapis.com/v1beta"
GEMINI_TIMEOUT_MS="30000"

OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"

OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="qwen3:4b-instruct"
OLLAMA_TIMEOUT_MS="60000"
```

For local Ollama generation:

```bash
ollama pull qwen3:4b-instruct
ollama run qwen3:4b-instruct
```

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL and create the database:

```bash
createdb word_learning
```

3. Create `.env` from `.env.example` and fill in the required values.

4. Apply migrations and seed demo data:

```bash
npm run db:migrate
npm run db:seed
```

5. Start the development server:

```bash
npm run dev
```

The app will be available at:

```text
http://localhost:3000
```

Demo account after seeding:

```text
email: demo@example.com
password: demo12345
```

## Checks

```bash
npm run typecheck
npm run test
npm run build
```

## Production Deployment

Detailed deployment instructions are available in [DEPLOYMENT.md](./DEPLOYMENT.md).

For a VPS deployment:

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.caddy.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.caddy.yml up -d
```

The production deployment uses Caddy as the public reverse proxy on ports `80` and `443`.

For Vercel or another managed platform:

1. Create a production PostgreSQL database.
2. Set `DATABASE_URL`, `AUTH_SECRET`, `AI_PROVIDER`, and the selected AI provider key.
3. Run migrations against the production database:

```bash
npm run db:deploy
```

4. Build and start:

```bash
npm run build
npm run start
```

## CI/CD

The VPS workflow is split into three stages:

1. Run type checks and tests.
2. Build and push a Docker image to GitHub Container Registry.
3. Pull the image on the VPS and restart the production containers.

Deployment uses the image tag based on the commit SHA and keeps secrets in GitHub Actions variables and secrets.

## Version

Current release: `1.0.0`.
