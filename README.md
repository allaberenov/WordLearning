# Word Learning

Веб-приложение для изучения английских слов с интервальными повторениями. Интерфейс на русском, карточки содержат английский контент, перевод, простые определения и примеры.

## Архитектура

- `src/app` — Next.js App Router, защищенные страницы и API routes.
- `src/components` — UI, формы, review-экран, таблицы, статистика.
- `src/lib` — Prisma, авторизация, rate limiting, OpenAI, FSRS, статистика, Zod-схемы.
- `prisma/schema.prisma` — PostgreSQL-модель данных.
- `prisma/migrations` — SQL-миграция.
- `prisma/seed.ts` — демо-пользователь и набор `Demo English`.
- `tests` — unit-тесты основной логики.

## Стек

Next.js, React, TypeScript, PostgreSQL, Prisma ORM, Tailwind CSS, shadcn/ui-style компоненты, Zod, OpenAI Responses API, bcrypt-хеширование паролей, httpOnly cookie sessions.

## Безопасность

- Пароли хранятся только в виде bcrypt-хеша.
- Сессии хранятся в БД как HMAC-хеш токена; raw token находится только в httpOnly cookie.
- Закрытые API endpoints получают пользователя из серверной сессии.
- Проверка владельца набора и карточки выполняется на сервере.
- `OPENAI_API_KEY` используется только backend-кодом.
- Для auth и OpenAI generation есть in-memory rate limiting.
- Входные данные валидируются Zod, размер JSON-запросов ограничен.
- Дубликаты сравниваются по `normalizedWord`; явный дубликат сохраняется через `meaningIndex`.

## Генерация карточек

Генерация карточек выполняется в `src/lib/openai.ts`. Поддержаны два провайдера:

- `AI_PROVIDER="ollama"` — локальная Ollama-модель, например `qwen3:4b-instruct`.
- `AI_PROVIDER="openai"` — OpenAI Responses API с `text.format` и `json_schema`, `strict: true`.
- `AI_PROVIDER="gemini"` — Google Gemini `generateContent` API с `responseMimeType="application/json"` и `responseSchema`.
- `AI_PROVIDER="groq"` — Groq OpenAI-compatible Chat Completions, по умолчанию `qwen/qwen3-32b`.

После ответа JSON дополнительно валидируется `generatedCardSchema` через Zod. При некорректном JSON выполняется одна повторная попытка.

Переменные:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/word_learning?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"

AI_PROVIDER="gemini"

GEMINI_API_KEY=""
GEMINI_MODEL="gemini-flash-latest"
GEMINI_BASE_URL="https://generativelanguage.googleapis.com/v1beta"
GEMINI_TIMEOUT_MS="30000"

OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="qwen3:4b-instruct"
OLLAMA_TIMEOUT_MS="60000"

GROQ_API_KEY=""
GROQ_MODEL="qwen/qwen3-32b"
GROQ_BASE_URL="https://api.groq.com/openai/v1"
GROQ_TIMEOUT_MS="20000"

# Defaults match Groq qwen/qwen3-32b request limits: 60 RPM and 1000 RPD.
GENERATION_RATE_LIMIT_RPM="60"
GENERATION_RATE_LIMIT_RPD="1000"

OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
```

Для локальной генерации сначала запустите Ollama и скачайте модель:

```bash
ollama pull qwen3:4b-instruct
ollama run qwen3:4b-instruct
```

## Локальный запуск

1. Установите зависимости:

```bash
npm install
```

2. Поднимите PostgreSQL и создайте базу:

```bash
createdb word_learning
```

3. Создайте `.env` на основе `.env.example` и заполните значения.

4. Примените миграции и seed:

```bash
npm run db:migrate
npm run db:seed
```

5. Запустите dev-сервер:

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:3000`.

Демо-аккаунт после seed:

```text
email: demo@example.com
password: demo12345
```

## Проверки

```bash
npm run typecheck
npm run test
npm run build
```

## Развертывание

Подробная инструкция находится в [DEPLOYMENT.md](./DEPLOYMENT.md).

Для VPS:

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Для Vercel:

1. Создайте production PostgreSQL в выбранном окружении.
2. Установите переменные `DATABASE_URL`, `AUTH_SECRET`, `AI_PROVIDER` и ключ выбранного AI-провайдера.
3. Выполните миграции против production DB:

```bash
npm run db:deploy
```

4. Соберите и запустите:

```bash
npm run build
npm run start
```

Для Vercel используйте тот же набор env vars и выполните `prisma migrate deploy` в build/deploy pipeline.
