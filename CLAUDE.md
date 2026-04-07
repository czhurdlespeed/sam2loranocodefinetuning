# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Dev server on localhost:3000
pnpm build                # Production build
pnpm lint                 # ESLint
pnpm db:generate          # Generate Drizzle migrations (uses .env.local)
pnpm db:migrate           # Run migrations
pnpm db:push              # Push schema directly to DB (no migration file)
pnpm db:studio            # Open Drizzle Studio browser UI
pnpm auth:generate        # Regenerate auth schema into src/db/schema.ts
pnpm create-user          # Create user via CLI script (scripts/create-user.ts)
```

All `db:*` and `auth:*` commands use `dotenv -e .env.local` to load environment variables.

## Architecture

### Training Job Lifecycle (SSE Streaming)

The core feature is a real-time training pipeline using Server-Sent Events:

1. `Config.tsx` manages a state machine: **idle → pending → running → completed/failed**
2. `TrainingControls.tsx` triggers `startTraining()` in `src/services/trainingApi.ts`
3. `POST /api/train` (app/api/train/route.ts) validates user approval, creates a `TransformStream`, sends keepalive pings every 15s during GPU spinup, then pipes Modal's SSE response to the client
4. `useTrainingLogs` hook (src/hooks/useTrainingLogs.ts) parses the SSE stream (`data: {"log":"...", "status":"..."}\n\n`), updates logs in `LogsDisplay.tsx`, and triggers stage transitions
5. On completion, `Config.tsx` calls `POST /api/jobs/complete` to persist the job; on failure, nothing is stored
6. User downloads checkpoints via `GET /api/download?jobId=...` which streams from Cloudflare R2

**Modal API contract**: Request body is `{userjob: {user_id, job_id}, lora_rank, base_model, dataset, num_epochs, fullfinetune}`. Response is an SSE stream.

### Auth Flow

Better-Auth with Drizzle adapter. Supports GitHub OAuth, Google OAuth, and email/password.

- Server config: `src/lib/auth.ts` — dynamically sets `baseURL` and `trustedOrigins` based on `VERCEL_ENV` (production/preview/dev)
- Client: `src/lib/auth-client.ts` — exports `signIn`, `signUp`, `signOut`, `useSession`
- New signups default to `approved=false`; admin must approve via `POST /api/admin/approve-user`
- Admin endpoints use Bearer token auth (`ADMIN_SECRET`)
- Post-signup sends notification email to admin via Resend (`src/lib/email.ts`)

### Database (Drizzle ORM + Neon PostgreSQL)

- Schema: `src/db/schema.ts` — tables: `user`, `session`, `account`, `verification`, `trainingJob`
- DB instance: `src/db.ts` — Neon serverless HTTP client
- Migrations: `drizzle/*.sql`
- The `trainingJob` table has a composite index on `(userId, jobId)` for fast lookups
- Only successful jobs are persisted; failed jobs are never written to the database

### Component Relationships

- `app/page.tsx` renders `Header` + `Config` + `Footer`
- `Config.tsx` is the central orchestrator — owns training state, coordinates `TrainingControls`, `ConfigOption`, `ConfigSlider`, `LogsDisplay`, `JobsDropdown`
- `ConfigOption.tsx` renders circular toggle buttons for rank/checkpoint/dataset selection
- `ConfigSlider.tsx` is the epochs slider (1-100, snaps at 10)
- `LiveKitEmbed.tsx` is injected globally via `app/layout.tsx` for voice agent integration

### Security Headers

`next.config.ts` configures CSP, HSTS with preload, X-Frame-Options: DENY, and restrictive Permissions-Policy. API routes are set to no-cache. Static assets get 1-year immutable cache.

## Environment Variables

Required in `.env.local`:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Auth signing secret |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL` | Auth base URL |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `MODAL_TRAIN_URL` / `MODAL_CANCEL_URL` | Modal API endpoints |
| `MODAL_KEY` / `MODAL_SECRET` | Modal authentication |
| `CF_R2_*` / `AWS_*` | Cloudflare R2 bucket credentials |
| `ADMIN_SECRET` | Bearer token for admin API endpoints |
| `RESEND_API_KEY` | Email notifications |
| `LIVEKIT_*` | Voice agent embed (API key, secret, URL, embed origin) |
| `LOGFIRE_TOKEN` / `OTEL_EXPORTER_*` | Observability |

## Tech Stack

Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Material UI 7, Drizzle ORM, Better-Auth, PNPM, deployed on Vercel.
