# Insurance Lead Engine

Generate exclusive, compliant, high-intent insurance leads and route them to the
right agent instantly.

This is an MVP implementation of the Insurance Lead Engine blueprint: a platform
that captures quote requests for **auto, home, renters, life, and commercial**
insurance, collects product-specific information, stores **one-to-one (TCPA)
consent records**, **scores and deduplicates** leads, **routes** them to licensed
agents by state/product/capacity, gives agents a CRM-style dashboard to work
leads, and gives admins reporting on lead quality, ROI, and agent performance.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Prisma ORM** with **SQLite** for zero-config local dev (swap to PostgreSQL
  for production — see below)
- **Zod** for request validation

## Quick start

```bash
npm install
npm run setup     # prisma generate + db push + seed demo data
npm run dev       # http://localhost:3000
```

Then open:

- `/` — consumer landing page
- `/quote` — multi-step quote form (product → contact → details → consent)
- `/agent` — agent dashboard (lead inbox sorted by score, pipeline, filters)
- `/agent/leads/[id]` — lead detail (profile, score breakdown, activity, consent, actions)
- `/admin` — admin dashboard (totals, by product/source, pipeline, agent performance)
- `/admin/agents` — manage agents & routing rules (license states, products, capacity, weight)
- `/admin/campaigns` — manage lead-source campaigns & cost-per-lead

Useful scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run db:push` | Sync schema to the database |
| `npm run db:seed` | Load demo agencies, agents, campaigns, leads |
| `npm run db:reset` | Wipe + reseed |
| `npm test` | Run the unit test suite (Vitest) |

## How the core pipeline works

When a quote request is submitted (`POST /api/leads` → `src/lib/leadService.ts`):

1. **Validate** contact info + require explicit TCPA consent (Zod + helpers).
2. **Deduplicate** — flags a lead if the same email/phone submitted the same
   product in the last 30 days.
3. **Score** (`src/lib/scoring.ts`) 0–100 across the blueprint's weighted model:
   intent/urgency (25), completeness (20), coverage fit (15), contact quality
   (15), geographic fit (10), insurance status (10), fraud/dup risk (5).
   Buckets: **hot** ≥ 80, **warm** 50–79, **cold** < 50.
4. **Route** (`src/lib/routing.ts`) to an eligible agent — licensed in the
   lead's state, product enabled, under daily capacity — using weighted
   least-loaded selection (round-robin biased by `routingWeight`).
5. **Persist** the lead + an immutable **consent record** (text, channels, IP,
   user agent, landing page, TCPA/privacy/terms versions, named agency) and log
   a system **activity** entry.

## Compliance (built in from day one)

- **One-to-one TCPA consent**: the disclosure names the specific agency that will
  contact the consumer (`src/lib/constants.ts`), and the exact consent text,
  channel permissions (SMS/email/phone), timestamp, IP, user agent, landing page
  URL, and policy versions are stored per lead in `ConsentRecord`.
- **Suppression list / opt-outs**: setting a lead to `do_not_contact` adds its
  email + phone to the `Suppression` table, and the inbound SMS webhook
  (`/api/webhooks/twilio/sms`) honors **STOP/START/HELP** keywords (CAN-SPAM /
  CTIA STOP handling). Phone numbers are canonicalized to 10 digits everywhere
  so opt-outs reliably match lead records.
- **Audit trail**: every status change, assignment, and contact attempt is
  written to `ActivityLog`.
- The notification service (`src/lib/notifications.ts`) checks the suppression
  list and per-channel consent before sending consumer confirmations or agent
  alerts.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/leads` | Public intake: validate → dedupe → score → route → store consent |
| GET | `/api/leads` | List/filter leads (`status`, `temperature`, `product`, `agentId`, `q`) |
| GET | `/api/leads/:id` | Full lead profile + relations |
| PUT | `/api/leads/:id/status` | Change pipeline stage (handles do-not-contact suppression) |
| POST | `/api/leads/:id/assign` | Manual (`{agentId}`) or auto re-route |
| POST | `/api/leads/:id/activity` | Log call/sms/email/note |
| POST | `/api/leads/:id/tasks` | Create a follow-up task |
| POST | `/api/leads/:id/outcome` | Record quote/bind outcome (ROI) |
| GET | `/api/leads/export` | CSV export of all leads |
| GET | `/api/consents/:leadId` | Retrieve stored consent record |
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Create an agent (+ backing user); validates states/products |
| GET/PUT | `/api/agents/:id` | Get / update an agent (license states, products, capacity, weight, status) |
| GET | `/api/agencies` | List agencies |
| GET/POST | `/api/campaigns` | List / create campaigns |
| GET/PUT | `/api/campaigns/:id` | Get / update a campaign |
| GET | `/api/reports/dashboard` | Aggregated admin metrics |
| POST | `/api/webhooks/twilio/sms` | Inbound SMS: honor STOP/START/HELP against the suppression list, reply with TwiML |

## Data model

See `prisma/schema.prisma`: `User`, `Agency`, `Agent`, `Lead`, `ConsentRecord`,
`Campaign`, `ActivityLog`, `Task`, `QuoteOutcome`, `Suppression`. Product-specific
answers are stored as JSON on `Lead.details`; list fields (license states,
products) are CSV strings for cross-database portability.

## Switching to PostgreSQL

1. In `prisma/schema.prisma`, set `datasource db { provider = "postgresql" }`.
2. Set `DATABASE_URL` to your `postgres://…` connection string.
3. `npm run db:push && npm run db:seed`.

## Security notes

- **postcss** is forced to a patched `^8.5.10` via the `overrides` field in
  `package.json` (Next 14 otherwise pins a vulnerable 8.4.x transitively).
- **Next.js** is pinned to `14.2.35` (latest patched 14.x). Some framework-level
  advisories are only fixed in Next 16, which is a major breaking change
  (React 19, App Router/API changes). For this MVP we knowingly stay on 14.2.35
  and defer that upgrade; revisit before production.

## Scope notes

Implemented (MVP): consumer landing + multi-product quote forms, consent capture,
lead scoring, routing, dedup, activity tracking, agent dashboard, admin
reporting, email/SMS suppression foundation, CSV export.

Deliberately **out of scope** for this MVP (per the blueprint): carrier quoting,
full policy binding, AMS sync, AI voice agent, multi-agency marketplace, real
Twilio/SendGrid/Stripe integrations (the data model and webhooks are structured
to add them).

> Demo software. Consent/TCPA/CAN-SPAM features are foundational scaffolding, not
> legal advice — review with counsel before production use.
