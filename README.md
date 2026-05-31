# Studio — Jonathan Simpson & Co. Agency OS

Built with Next.js 16 · TypeScript · Tailwind CSS v4 · shadcn/ui · MongoDB

An internal agency operating system for Jonathan Simpson & Co., a two-founder software and automation agency based in Hong Kong. Replaces a collection of spreadsheets, Google Docs, and disconnected tools with one integrated platform.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Next.js 16 App Router (React 19, Server Actions)    │
│  Tailwind CSS v4 · shadcn/ui (New York style)        │
│  Dark mode only · Zinc/teal colour palette           │
├──────────────────────────────────────────────────────┤
│  Auth.js (email/password, GitHub OAuth, Google OAuth)│
│  MongoDB Atlas (Mongoose ODM, ~30 collections)       │
│  GridFS (file storage in MongoDB)                    │
├──────────────────────────────────────────────────────┤
│  GitHub REST API (issues, milestones, repos)         │
│  Google Calendar API + Gmail API /w OAuth2           │
│  Resend (invoice/proposal email with PDF)            │
│  OpenRouter (5 free-tier models, unified API)        │
│  @react-pdf/renderer (PDF generation)                │
└──────────────────────────────────────────────────────┘
```

**Patterns:**
- Server Components for data fetching, Client Components for interactivity
- Server Actions for mutations (create, update, delete)
- Route Handlers for API endpoints (external integrations, cron, AI)
- Auth.js session for auth, API key bearer tokens for agents
- Mongoose models for all data access, upserts for idempotent writes
- Collections auto-created by Mongoose on first write — no manual migration needed

---

## Getting Started

### Prerequisites

- Node.js 20+ (this project uses Turbopack, requires 20.9+)
- A MongoDB Atlas cluster (M0 free tier works for development)
- Accounts for: GitHub (PAT with repo scope), Google Cloud (OAuth credentials), Resend (verified domain), OpenRouter (API key)

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Copy the template from `.env.local` (included in the repo) and fill in all values:

```
MONGODB_URI=                        # From MongoDB Atlas → Connect → Drivers
AUTH_SECRET=                        # Generate: openssl rand -hex 32
AUTH_GITHUB_ID=                     # From GitHub OAuth app settings
AUTH_GITHUB_SECRET=                 # From GitHub OAuth app settings
AUTH_GOOGLE_ID=                     # From Google Cloud Console → OAuth 2.0
AUTH_GOOGLE_SECRET=                 # From Google Cloud Console → OAuth 2.0
FOUNDER_INVITE_CODE=                # Choose a secret invite code for registration
GITHUB_TOKEN=                       # Personal Access Token with repo scope
GITHUB_ORG=                         # Your GitHub org name
OPENROUTER_API_KEY=                 # From openrouter.ai
RESEND_API_KEY=                     # From resend.com
EMAIL_FROM=studio@jonathansimpson.co
ENCRYPTION_KEY=                     # Generate: openssl rand -hex 32
NEXT_PUBLIC_APP_URL=https://studio.jonathansimpson.co
CRON_SECRET=                        # Generate: openssl rand -hex 16
```

### 3. Configure MongoDB Atlas

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) and create a cluster
2. Under **Network Access**, add your IP (or `0.0.0.0/0` for Vercel)
3. Under **Database Access**, create a database user with read/write on any database
4. Click **Connect → Drivers** and copy the connection string
5. Replace `<password>` and `<dbname>` with your values
6. Set as `MONGODB_URI` in your environment

Collections are auto-created by Mongoose on first write. No manual migration step required.

### 4. Configure OAuth apps

**GitHub OAuth:**
1. Go to GitHub **Settings → Developer Settings → OAuth Apps → New OAuth App**
2. Set callback URL to `https://studio.jonathansimpson.co/api/auth/callback/github`
3. Copy Client ID and generate Client Secret → set `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`

**Google OAuth:**
1. Go to Google Cloud Console → **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
2. Add redirect URI: `https://studio.jonathansimpson.co/api/auth/callback/google`
3. Enable **Google Calendar API** and **Gmail API** for the project
4. Copy Client ID and Client Secret → set `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`

### 5. Run dev server

```bash
npm run dev
```

Open `http://localhost:3000`, click **Register**, enter your invite code and credentials.

---

## Route Map

### Pages (22 routes)

| Route | Layout | Purpose |
|---|---|---|
| `/login` | Auth (centered card) | Email/password sign-in page |
| `/register` | Auth (centered card) | Registration with invite code |
| `/dashboard` | App shell (sidebar + topbar) | Landing page with greeting, stat cards, upcoming milestones, recent activity, active projects, personal tasks |
| `/leads` | App shell | Lead pipeline: Kanban board by stage or sortable table. Create leads via slide-out sheet |
| `/leads/[id]` | App shell | Full lead detail: editable form, heat score (client-side algorithm), activity timeline, convert-to-client dialog |
| `/clients` | App shell | Client table: company, primary contact, active projects, revenue, outstanding, services. Toggle to show internal JSCo client |
| `/clients/[id]` | App shell | Client detail with 6 tabs: Projects, Invoices, Proposals, Notes, Files, Activity |
| `/projects` | App shell | Default landing page. Filterable table: name, client, status, billing type, repos, issues, due date |
| `/projects/[id]` | App shell | Project detail with 8 tabs: Overview (key stats, repos, AI summary), Tasks & Issues (mixed internal + GitHub board), Milestones (progress bars), Notes, Files, Proposals, Invoices, Activity |
| `/tasks` | App shell | Global task board: Todo / In Progress / Bottlenecked / Done. Table toggle. Internal tasks only (GitHub issues are project-scoped) |
| `/notes` | App shell | Grid of all visible notes. Search by title/body. Visibility filtering |
| `/notes/[id]` | App shell | Full markdown editor: GitHub-style formatting toolbar, preview toggle, visibility controls, linked records |
| `/proposals` | App shell | Proposal list table: number, client, status, total, dates |
| `/proposals/[id]` | App shell | Full proposal editor: line items, discount, markdown sections, AI generate button, status workflow, auto-creates project + invoice on accept |
| `/invoices` | App shell | Invoice list with outstanding total card at top |
| `/invoices/[id]` | App shell | Full invoice editor: line items, discount, tax, recurring, AI generate, status workflow, payment notes |
| `/finance` | App shell | Summary cards, quarterly bar chart, by-client table, costs table with add-cost sheet |
| `/calendar` | App shell | Multi-calendar view with Google Calendar sync and ICS export |
| `/issues` | App shell | Ticket pipeline with AI triage, auto-task creation, GitHub issue sync |
| `/inbox` | App shell | Gmail inbox with AI importance/action-needed classification |
| `/portal` | Public (no auth) | Client ticket lookup and creation by email |
| `/settings` | App shell | 5 tabs: Profile, Agency, Integrations, Templates, Team |

### API Routes

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/ai/generate` | Session or API key | AI content generation (12 action types) |
| GET | `/api/ai/models` | Session or API key | List registered models and action mapping |
| POST | `/api/ai/test-model` | Session | Ping a model to verify response |
| POST | `/api/github/issues` | Session | Create a GitHub issue |
| PATCH | `/api/github/issues` | Session | Update a GitHub issue |
| POST | `/api/github/sync` | Session | Manual sync open issues from linked repos |
| POST | `/api/github/sync-all` | Session | Sync all active projects |
| POST | `/api/invoices/pdf` | Session | Generate invoice PDF |
| POST | `/api/proposals/pdf` | Session | Generate proposal PDF |
| POST | `/api/files/upload` | Session | Upload file to GridFS |
| POST | `/api/files/delete` | Session | Delete file from GridFS |
| GET | `/api/files/serve` | None | Serve file by ID |
| POST | `/api/leads` | API key (write) | Create lead from portfolio site |
| POST | `/api/ocr/extract` | Session | OCR text extraction from images/PDFs |
| POST | `/api/ocr/parse` | Session | Parse extracted text into structured data |
| GET | `/api/calendars/[id]/feed.ics` | None | Public ICS feed for shared calendars |
| POST | `/api/expenses` | Session | Create daily expense entry |
| GET | `/api/cron/sync-github` | Bearer (CRON_SECRET) | Auto-sync all active project repos |
| GET | `/api/cron/check-overdue` | Bearer (CRON_SECRET) | Sets overdue invoices, generates recurring |
| GET | `/api/cron/send-reminders` | Bearer (CRON_SECRET) | Sends due-date reminders |
| GET | `/api/cron/sync-google-calendars` | Bearer (CRON_SECRET) | Syncs Google Calendar events |
| GET | `/api/cron/sync-gmail` | Bearer (CRON_SECRET) | Syncs Gmail inbox |
| GET | `/api/cron/sync-feeds` | Bearer (CRON_SECRET) | Polls external ICS feeds |

---

## Database Schema (~30 Mongoose Collections)

| Domain | Collections |
|---|---|
| Users & Auth | `users` (timezone, hourly rate, OAuth provider IDs), `api_keys` (scoped bearer tokens) |
| CRM | `leads` (heat score, pipeline stage, service interests), `clients` (multi-currency, internal flag, ticket package), `contacts` |
| Projects | `projects` (multi-currency, budget, FKs to lead/proposal), `project_repos`, `milestones`, `project_templates` |
| Tasks | `tasks` (priority, status, assignee, estimated hours), `synced_github_issues` (GitHub issue cache) |
| Docs | `notes` (markdown body, visibility, tags, linking), `proposals` (line items, markdown sections, PDF), `invoices` (recurring, tax, PDF) |
| Finance | `costs` (by client/project, 7 categories, recurring) |
| Calendar | `calendars`, `events` (RRULE recurrence), `reminders`, `daily_expenses`, `calendar_sources`, `calendar_shares`, `calendar_invites` |
| Integration | `google_calendar_sync`, `google_inboxes`, `inbox_messages` (Gmail cache) |
| Ticketing | `tickets` (auto-numbered, status, priority, tags, AI triage) |
| Files | `file_records` (GridFS storage, visibility, linked entities) |
| Infrastructure | `activity_log` (all mutations with typed meta), `agency_settings` (single row), `integrations` (encrypted API keys), `doc_number_sequences` (gap-free INV/PROP/TKT numbering), `time_entries` (start/end timer per task/project), `ocr_tasks` (OCR job tracking), `event_comments` |

---

## Key Features

### Lead Heat Score
Client-side algorithm (`lib/heat-score.ts`). No DB writes. Takes the lead object + optional proposal, returns 1–5. Factors: days since contact, deal value (HKD/GBP/IDR thresholds), source quality, stage bonus. Runs on every render — zero server cost.

### Unified Task Board
Project detail shows internal tasks and synced GitHub issues on a single board. Internal tasks use Todo/In Progress/Bottlenecked/Done. GitHub issues show open/closed with GH logo badge. No duplication — GitHub rows live in `synced_github_issues`, not `tasks`.

### AI Generation (12 Actions)
Abstracted provider wrapper in `lib/ai.ts`. Default models via OpenRouter. 12 action types: proposal, invoice, project summary, monthly report, audit, tool docs, GitHub issue, draft email, follow-up, multilingual email, autofill note, autofill task. Results editable before saving.

### Multi-Currency (HKD/GBP/IDR)
Amounts stored as-is in their currency. No conversion. Each record has its own `currency` field. Finance dashboard shows amounts with `CurrencyBadge`.

### PDF Generation
`@react-pdf/renderer` for server-side PDF generation. Branded templates for invoices (logo, bill-to, line items, subtotals, tax, payment terms, footer) and proposals (cover note, scope, timeline, pricing, terms, expiry).

### GitHub Integration
Two-way sync: create/edit issues from the app (immediate API call + cache update), background sync via Vercel cron, manual sync button. Repo selector with manual entry fallback.

### Google Calendar + Gmail
OAuth2 scopes for Calendar and Gmail. Two-way calendar sync, Gmail inbox with AI importance/action-needed classification. Background sync via Vercel cron jobs.

### Command Palette (Cmd+K)
Client-side fuzzy search via Fuse.js. Lightweight page index — zero DB queries. Instant navigation.

### Activity Log
Every mutation writes to `activity_log` with typed meta JSON. Rendered grouped by date with actor avatar, action, timestamp. Across lead, client, project, and all detail pages.

### Time Tracking
Floating timer in top bar. Start/stop per task or project. Running timer persists across navigation. Manual entry also available. Purely informational — no auto-billing.

### Project Templates
Create reusable templates with default task lists. Used when creating new projects or converting leads.

### Notifications
Bell icon in top bar (empty — ready for badge counts). Sidebar shows derived counts (stale leads, overdue tasks, invoices). Sonner toasts for all feedback.

### API Keys (Agent Ready)
Scoped bearer token authentication. Middleware checks `Authorization` header when no session exists. Agents can call any API route. Keys shown once on creation — only SHA-256 hash stored.

---

## Mobile Support

On screens under 768px, the sidebar collapses and a bottom tab bar appears (Dashboard, Leads, Projects, Tasks, More). The "More" button opens a slide-up sheet with remaining nav items.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `AUTH_SECRET` | Yes | Auth.js session encryption key |
| `AUTH_GITHUB_ID` | No (if using GitHub OAuth) | GitHub OAuth Client ID |
| `AUTH_GITHUB_SECRET` | No (if using GitHub OAuth) | GitHub OAuth Client Secret |
| `AUTH_GOOGLE_ID` | No (if using Google OAuth) | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | No (if using Google OAuth) | Google OAuth Client Secret |
| `FOUNDER_INVITE_CODE` | Yes | Registration invite code |
| `GITHUB_TOKEN` | Yes (if using GitHub) | GitHub PAT with repo scope |
| `GITHUB_ORG` | No | GitHub organization name |
| `OPENROUTER_API_KEY` | Yes (if using AI) | OpenRouter API key |
| `RESEND_API_KEY` | Yes (if using email) | Resend API key |
| `EMAIL_FROM` | No | Default: `studio@jonathansimpson.co` |
| `ENCRYPTION_KEY` | Yes (if storing API keys) | 32-byte hex for AES-256-GCM |
| `NEXT_PUBLIC_APP_URL` | No | Absolute URLs in emails/PDFs |
| `CRON_SECRET` | Yes (for Vercel cron) | Protects cron endpoints |

---

## Deployment

See `MANUAL_SETUP.md` for the complete setup guide covering:
- MongoDB Atlas cluster creation and configuration
- OAuth app registration (GitHub, Google)
- Vercel deployment with environment variables
- External service setup (Resend, OpenRouter, GitHub, Google)
- Post-launch configuration (agency settings, templates, API keys)
- Things the build cannot do (and must be done manually)

The app is designed to deploy to Vercel with zero configuration changes. Cron jobs are configured in `vercel.json`.
