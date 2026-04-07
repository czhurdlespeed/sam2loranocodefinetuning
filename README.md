# SAM2 LoRA Fine-Tuning Web App

A full-stack web application for fine-tuning Meta's [Segment Anything Model 2 (SAM 2)](https://github.com/facebookresearch/sam2) on custom datasets using LoRA. Users configure training parameters through a browser UI, jobs run on serverless GPUs via [Modal Labs](https://modal.com), and completed checkpoints are available for download.

## Features

- **LoRA & Full Fine-Tuning** — Choose LoRA rank (2/4/8/16/32) or full fine-tune across SAM 2 model sizes (Tiny, Small, Base+, Large)
- **Real-Time Training Logs** — Server-Sent Events stream training output to the browser as it happens
- **Multi-Provider Auth** — GitHub OAuth, Google OAuth, and email/password via Better-Auth, with admin approval gating
- **Checkpoint Management** — Completed checkpoints stored in Cloudflare R2; download directly from the UI
- **Job History** — View and revisit past training runs
- **Voice Agent** — LiveKit-powered voice assistant integration

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, Material UI 7 |
| Database | Neon PostgreSQL, Drizzle ORM |
| Auth | Better-Auth (GitHub, Google, email/password) |
| Training | Modal Labs (serverless GPU) |
| Storage | Cloudflare R2 (S3-compatible) |
| Email | Resend |
| Voice Agent | LiveKit |
| Observability | Pydantic Logfire, OpenTelemetry |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 20+
- [PNPM](https://pnpm.io/) package manager
- A `.env.local` file with required environment variables (see below)

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Database Setup

```bash
pnpm db:push       # Push schema to database (quick setup)
# or
pnpm db:generate   # Generate migration files
pnpm db:migrate    # Run migrations
```

To explore the database interactively:

```bash
pnpm db:studio
```

### Other Commands

```bash
pnpm build            # Production build
pnpm lint             # Run ESLint
pnpm auth:generate    # Regenerate auth schema into src/db/schema.ts
pnpm create-user      # Create a user via CLI
```

## Environment Variables

Create a `.env.local` file with the following:

```env
# Database
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# OAuth — GitHub
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# OAuth — Google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Modal Labs (serverless GPU training)
MODAL_TRAIN_URL=...
MODAL_CANCEL_URL=...
MODAL_KEY=...
MODAL_SECRET=...

# Cloudflare R2 (checkpoint storage)
CF_R2_ACCOUNT_ID=...
CF_R2_ACCESS_KEY_ID=...
CF_R2_SECRET_ACCESS_KEY=...
CF_R2_BUCKET_NAME=...

# Admin
ADMIN_SECRET=...

# Email (Resend)
RESEND_API_KEY=...

# LiveKit (voice agent)
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=...

# Observability (optional)
LOGFIRE_TOKEN=...
```

## Architecture

### Training Flow

```
User → Config UI → POST /api/train → Modal Labs (GPU)
                                          │
                          SSE stream ◄────┘
                              │
                    LogsDisplay (real-time)
                              │
                     Job complete/failed
                              │
              POST /api/jobs/complete → Neon DB
                              │
              GET /api/download → Cloudflare R2 → .zip
```

1. User selects LoRA rank, model checkpoint, dataset, and number of epochs
2. The app submits the job to Modal Labs and opens an SSE connection
3. Training logs stream back to the browser in real time (with 15s keepalive pings during GPU spinup)
4. On completion, the job is recorded in the database and the checkpoint is available for download from R2

### Project Structure

```
app/
├── api/
│   ├── train/          # SSE training endpoint
│   ├── jobs/           # Job listing & completion webhook
│   ├── cancel/         # Cancel running job
│   ├── download/       # Stream checkpoint from R2
│   ├── admin/          # User creation & approval
│   ├── auth/           # Better-Auth handler
│   └── ...
├── login/              # Sign in / sign up page
├── layout.tsx          # Root layout (fonts, LiveKit embed)
└── page.tsx            # Home page
src/
├── components/         # React components (Config, TrainingControls, LogsDisplay, etc.)
├── hooks/              # useTrainingLogs (SSE parser), useTypingEffect
├── services/           # API client (trainingApi.ts)
├── constants/          # Training config options (ranks, checkpoints, datasets)
├── db/                 # Drizzle schema
├── db.ts               # Database instance
└── lib/                # Auth config, email
drizzle/                # SQL migrations
```

### Auth

New users must be approved by an admin before they can start training jobs. Admin approval is managed via `POST /api/admin/approve-user` (Bearer token auth). A notification email is sent to the admin on each new signup.

## License

Private — all rights reserved.
