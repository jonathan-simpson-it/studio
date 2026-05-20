# Studio — Jonathan Simpson & Co. Agency OS

Built with Next.js 16 · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase

An internal agency operating system for Jonathan Simpson & Co., a two-founder software and automation agency based in Hong Kong. Replaces a collection of spreadsheets, Google Docs, and disconnected tools with one integrated platform.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Next.js 16 App Router (React 19, Server Actions)    │
│  Tailwind CSS v4 · shadcn/ui (New York style)        │
│  Dark mode only · Zinc/teal colour palette           │
├──────────────────────────────────────────────────────┤
│  Supabase Auth (email/password, cookie sessions)     │
│  Supabase Postgres (22 tables, RLS, tsvector-ready)  │
│  Supabase Storage (studio-files bucket, signed URLs)  │
├──────────────────────────────────────────────────────┤
│  GitHub REST API (issues, milestones, repos)         │
│  Resend (invoice/proposal email with PDF)            │
│  OpenRouter (5 free-tier models, unified API)         │
│  @react-pdf/renderer (PDF generation)                │
└──────────────────────────────────────────────────────┘
```

**Patterns:**
- Server Components for data fetching, Client Components for interactivity
- Server Actions for mutations (create, update, delete)
- Route Handlers for API endpoints (external integrations, cron, AI)
- Supabase `createServerClient` (cookie-based) for all data access
- Supabase service-role client (`createAdminClient`) only for cron jobs
- RLS enforced on every table with `founder` policy, future `client` policy commented out

---

## Getting Started

### Prerequisites

- Node.js 20+ (this project uses Turbopack, requires 20.9+)
- A Supabase project (Pro tier recommended for PITR backups)
- Accounts for: GitHub (PAT with repo scope), Resend (verified domain), DeepSeek (API key)

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Copy the template from `.env.local` (included in the repo) and fill in all values:

```
NEXT_PUBLIC_SUPABASE_URL=           # From Supabase dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # From Supabase dashboard → Settings → API
SUPABASE_SERVICE_ROLE_KEY=          # From Supabase dashboard → Settings → API
GITHUB_TOKEN=                       # Personal Access Token with repo scope
GITHUB_ORG=                         # Your GitHub org name
OPENROUTER_API_KEY=                 # From openrouter.ai
RESEND_API_KEY=                     # From resend.com
EMAIL_FROM=studio@jonathansimpson.co
ENCRYPTION_KEY=                     # Generate: openssl rand -hex 32
NEXT_PUBLIC_APP_URL=https://studio.jonathansimpson.co
CRON_SECRET=                        # Generate: openssl rand -hex 16
```

### 3. Run database migration

Open Supabase SQL Editor, paste and execute `supabase/migrations/001_initial.sql`. This creates all 22 tables, enables RLS with founder policies, seeds the internal JSCo client, default agency settings, and doc number sequences.

### 4. Create storage bucket

In Supabase Storage, create a private bucket called `studio-files`. Add the RLS policy from `MANUAL_SETUP.md`.

### 5. Create auth users

In Supabase Auth dashboard, create two users:
- `lewis@jonathansimpson.co` — Lewis Simpson
- `devano@jonathansimpson.co` — Devano Jonathan

Then add them to the `users` table via SQL Editor with `role = 'founder'`.

### 6. Run dev server

```bash
npm run dev
```

Open `http://localhost:3000` and sign in.

---

## Route Map

### Pages (22 routes)

| Route | Layout | Purpose |
|---|---|---|
| `/login` | Auth (centered card) | Email/password sign-in page |
| `/dashboard` | App shell (sidebar + topbar) | Landing page with greeting, stat cards, upcoming milestones, recent activity, active projects, personal tasks |
| `/leads` | App shell | Lead pipeline: Kanban board by stage or sortable table. Create leads via slide-out sheet |
| `/leads/[id]` | App shell | Full lead detail: editable form, heat score (client-side algorithm), activity timeline, convert-to-client dialog |
| `/clients` | App shell | Client table: company, primary contact, active projects, revenue, outstanding, services. Toggle to show internal JSCo client |
| `/clients/[id]` | App shell | Client detail with 6 tabs: Projects, Invoices, Proposals, Notes, Files, Activity |
| `/projects` | App shell | Default landing page. Filterable table: name, client, status, billing type, repos, issues, due date |
| `/projects/[id]` | App shell | Project detail with 8 tabs: Overview (key stats, repos, AI summary), Tasks & Issues (mixed internal + GitHub board), Milestones (progress bars), Notes, Files, Proposals, Invoices, Activity |
| `/tasks` | App shell | Global task board: Todo / In Progress / Bottlenecked / Done. Table toggle. Internal tasks only (GitHub issues are project-scoped) |
| `/notes` | App shell | Grid of all visible notes. Search by title/body. Visibility filtering enforced by RLS |
| `/notes/[id]` | App shell | Full markdown editor: GitHub-style formatting toolbar, preview toggle, visibility controls, linked records |
| `/proposals` | App shell | Proposal list table: number, client, status, total, dates |
| `/proposals/[id]` | App shell | Full proposal editor: line items (add/remove), discount, 4 markdown sections (cover note, scope, timeline, terms), AI generate button, status workflow (Draft → Sent → Viewed → Accepted → Rejected), auto-creates project + invoice on accept |
| `/invoices` | App shell | Invoice list with outstanding total card at top |
| `/invoices/[id]` | App shell | Full invoice editor: line items, discount, tax label + %, recurring toggle with frequency/next date, AI generate, status workflow (Draft → Sent → Paid → Overdue → Cancelled), payment notes |
| `/finance` | App shell | 4 sections: 6 summary cards (revenue, quarterly, collected, outstanding, costs, margin %), quarterly bar chart (Q1–Q4), by-client table (invoiced, collected, outstanding, costs, margin, margin %), costs table with add-cost sheet |
| `/settings` | App shell | 5 tabs: Profile (name, timezone, hourly rate), Agency (name, address, currency, logo), Integrations (GitHub, Resend, DeepSeek keys + test buttons), Templates (invoice/proposal defaults), Team (founder list, invite — coming soon) |

### API Routes (7 endpoints)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/ai/generate` | Session | Generates AI content. Accepts `{ action, context }`. 7 action types: generate-proposal, generate-invoice, generate-project-summary, generate-monthly-report, generate-audit, generate-tool-documentation, create-github-issue |
| GET | `/api/github/issues?owner=x&repo=y` | Session | Fetch open issues from a GitHub repo |
| POST | `/api/github/issues` | Session | Create a GitHub issue. Body: `{ repo, title, body, labels, assignees }` |
| PATCH | `/api/github/issues` | Session | Update a GitHub issue. Body: `{ repo, issueNumber, title?, body?, state?, labels?, assignees? }` |
| POST | `/api/github/sync` | Session | Manual trigger: sync all open issues from linked repos into `synced_github_issues` table. Body: `{ projectId }` |
| POST | `/api/invoices/pdf` | Session | Generate invoice PDF via `@react-pdf/renderer`, upload to Supabase Storage, return signed URL |
| POST | `/api/proposals/pdf` | Session | Generate proposal PDF, same pattern as invoices |
| GET | `/api/cron/sync-github` | Bearer token (CRON_SECRET) | Auto-sync all active project repos. Called by Vercel cron every 30 minutes |
| GET | `/api/cron/check-overdue` | Bearer token (CRON_SECRET) | Sets overdue invoices (`due_date < today AND status = Sent`). Generates recurring invoices where `next_issue_date = today`. Runs daily at 1 AM UTC |

---

## Database Schema (22 tables)

| Domain | Tables |
|---|---|
| Users & Auth | `users` (timezone, hourly rate per founder) |
| CRM | `leads` (with `next_action`, `stage_changed_at`), `clients`, `contacts` |
| Projects | `projects` (multi-currency, budget, FKs to lead/proposal), `project_repos`, `milestones`, `project_templates` |
| Tasks | `tasks` (internal only, no type column), `synced_github_issues` (GitHub cache, merged client-side) |
| Notes | `notes` (markdown body, visibility: internal/private/client-safe, RLS enforced per user) |
| Billing | `proposals` (PROP-YYYY-NNN, line items as jsonb, markdown sections), `invoices` (INV-YYYY-NNN, HKD/GBP/IDR, recurring support, tax) |
| Finance | `costs` (by client/project, 7 categories) |
| Files | `files` (uploaded to Supabase Storage, visibility levels, signed URLs) |
| Infrastructure | `activity_log` (all mutations with typed meta), `agency_settings` (single row), `integrations` (encrypted API keys), `doc_number_sequences` (gap-free INV/PROP numbering), `time_entries` (start/end timer per task/project), `api_keys` (agent authentication) |

The full migration is at `supabase/migrations/001_initial.sql`. All tables have RLS enabled with founder policies. Client portal policies are commented out and ready for future activation.

---

## Key Features

### Lead Heat Score
Client-side algorithm (`lib/heat-score.ts`). No DB storage, no cron. Takes the lead object + most recent proposal (optional), returns 1–5. Factors: days since contact, days since stage change, deal value (HKD/GBP/IDR thresholds), source quality, proposal pending timeout, stage bonus, new-lead penalty. Runs every time a lead renders — zero server cost.

### Unified Task Board
Project detail shows both internal tasks and synced GitHub issues on a single board. Internal tasks use Todo/In Progress/Bottlenecked/Done. GitHub issues show open/closed with a GH logo badge, state badge, and link to GitHub URL. No duplication — GitHub rows live in `synced_github_issues`, not `tasks`.

### AI Generation (7 Actions)
All AI calls route through `lib/ai.ts`, an abstracted provider wrapper. Default provider is DeepSeek. Each action has a structured system prompt with agency context (name, location, 20+ services). Context objects limited to 20 most recent items for token management. Results returned to UI for editing before saving.

### Multi-Currency (HKD/GBP/IDR)
Amounts stored as-is in their currency. No conversion. Each record has its own `currency` field. Finance dashboard shows amounts with `CurrencyBadge`. Heat score deal-value thresholds hardcoded per currency.

### PDF Generation
`@react-pdf/renderer` for server-side PDF generation (no browser dependency). Branded templates for invoices (logo, bill-to, line items, subtotals, tax, payment terms, footer) and proposals (cover note, scope, timeline, pricing, terms, expiry). Generated PDF uploaded to Supabase Storage, signed URL stored on the record.

### GitHub Integration
Two-way sync: create/edit issues from the app (immediate API call + cache update), background sync every 30 minutes via Vercel cron, manual sync button on project detail. Repo selector fetches from the linked GitHub org with manual entry fallback for personal repos.

### Command Palette (Cmd+K)
Client-side fuzzy search via Fuse.js. Lightweight page index fetched on dialog open — zero DB queries. Navigates to pages instantly.

### Activity Log
Every mutation writes to `activity_log` with typed `meta` JSON (e.g. `{ field: 'stage', old_value: 'Contacted', new_value: 'Discovery' }`). Rendered grouped by date with actor avatar, action description, and timestamp. Used across lead, client, project, all detail pages.

### Time Tracking
A floating timer in the top bar. Start/stop per task or project. Running timer persists across page navigation (end_time = null in DB, resumed on page load). Manual entry also available. Hours are purely informational — no auto-billing. Shown on task sheet and project detail.

### Project Templates
Create reusable templates with default task lists. Used when creating a new project or converting a lead. Speeds up repetitive project setup.

### Notifications
Bell icon in top bar (empty in v1 — ready for future badge counts). Sidebar nav shows derived counts (stale leads, overdue tasks, overdue invoices). Sonner toasts for all success/error feedback.

### API Keys (Agent Ready)
`api_keys` table with scoped bearer token authentication. Middleware checks `Authorization` header when no cookie session exists. Agents can call any API route with a valid key. Keys shown once on creation (raw key never stored — only SHA-256 hash).

---

## Mobile Support

On screens under 768px, the sidebar collapses and a bottom tab bar appears (Dashboard, Leads, Projects, Tasks, More). The "More" button opens a slide-up sheet with the remaining nav items (Notes, Proposals, Invoices, Finance, Settings).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (client-side safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service_role key (cron jobs only) |
| `GITHUB_TOKEN` | Yes (if using GitHub) | GitHub PAT with repo scope |
| `GITHUB_ORG` | No | GitHub organization name for repo selector |
| `OPENROUTER_API_KEY` | Yes (if using AI) | OpenRouter API key |
| `RESEND_API_KEY` | Yes (if using email) | Resend API key |
| `EMAIL_FROM` | No | Default: `studio@jonathansimpson.co` |
| `ENCRYPTION_KEY` | Yes (if storing API keys) | 32-byte hex for AES-256-GCM |
| `NEXT_PUBLIC_APP_URL` | No | Used for absolute URLs in emails/PDFs |
| `CRON_SECRET` | Yes (for Vercel cron) | Protects cron endpoints |

---

## Deployment

See `MANUAL_SETUP.md` for the complete setup guide covering:
- Supabase project creation and configuration
- Vercel deployment with environment variables
- External service setup (Resend, DeepSeek, GitHub)
- Post-launch configuration (agency settings, templates, API keys)
- Things the build cannot do (and must be done manually)

The app is designed to deploy to Vercel with zero configuration changes. Cron jobs are configured in `vercel.json`.
