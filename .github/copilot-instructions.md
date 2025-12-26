# Group Guard Project Instructions

## Architecture Overview
- **Platform**: Cloudflare Pages (Frontend + Functions), D1 Database, Workers KV (via `WorkersCacheStorage`), Cloudflare Queues.
- **Runtime**: Bun (used for building and as a macro engine).
- **Frontend**: React 19 (beta), SWR, tRPC client, Framer Motion.
- **Backend**: Cloudflare Pages Functions, tRPC server, Grammy (Telegram Bot), Queue Consumer.
- **Data Flow**: Frontend <-> tRPC (Functions) <-> D1 Database; Bot <-> Queue <-> Consumer.

## Key Patterns & Conventions

### 1. Database Access (SQL Macros)
Always use the SQL query builder macros from `@lib/qb` for complex queries. These are Bun macros that generate SQL strings at compile time.
- `qb`: Standard SELECT query.
- `jsonQb`: SELECT query that returns a single JSON object.
- `jsonAggQb`: SELECT query that returns a JSON array of objects.

Example:
```typescript
import { qb } from "./qb" with { type: "macro" };
const sql = qb({ table: { from: { table: "my_table" } } }, { id: "table.id" });
```

### 2. Environment & Context
- Use `globalEnv` from `@lib/env` to access Cloudflare bindings (DB, QUEUE, etc.).
- Use `waitUntil` from `@lib/env` for non-blocking background tasks in Workers.
- Entry points (e.g., `functions/api/[[trpc]].ts`, `functions/webhook.ts`) must call `syncenv(env, waitUntil)` to initialize these globals.

### 3. API & Routing
- API routes are defined in `lib/api-server.ts` using tRPC.
- Frontend uses `@trpc-swr/client` for data fetching.

### 4. Telegram Bot
- Bot logic resides in `lib/bot.ts` using the `grammy` framework.
- Webhook handler is in `functions/webhook.ts`.

### 5. Frontend Development
- Pages are in `pages/`, components in `src/components/`.
- Use `css-in-bun` for styling and `svg-in-bun` for icons.
- Prefer SWR for state management and data fetching.
- Use path aliases: `@/*` (src), `@lib/*` (lib), `@shared/*` (shared).
- Macros: Use `with { type: "macro" }` for `css-in-bun`, `svg-in-bun`, and `@lib/qb`.

## Developer Workflows
- **Build**: `bun run build` (custom build script in `build.ts`).
- **Deploy**: `bun run deploy` (builds and uses `wrangler` to deploy).
- **Database**: `bun run migrate` to apply D1 migrations.
- **Bot Setup**: `bun run register` to set up the Telegram bot webhook.

## File Structure
- `functions/`: Cloudflare Pages Functions (API & Webhook).
- `lib/`: Core business logic, database access, and bot implementation.
- `pages/`: Frontend page entry points.
- `src/`: Shared frontend components, hooks, and utilities.
- `shared/`: Types and constants shared between frontend and backend.
- `consumer/`: Cloudflare Queue consumer for background tasks.
