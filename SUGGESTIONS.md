# MindsetOS — Upgrade Suggestions & Strategy Call Brief
*Adapted from ECOS Strategy Call — March 30, 2026*

This document translates the full ECOS upgrade roadmap into MindsetOS context. MindsetOS is a white-label of ECOS — most of what Rana is building for consultants has a direct equivalent for Greg's mindset coaching audience. Where the ECOS plan says "consultant pipeline," read "coaching client pipeline." Where it says "Money Model agent handoff," read "Architecture Coach handoff."

**✅ = Already shipped** | **🔧 = Needs build** | **💡 = Adapt from ECOS**

---

## Status: What Just Shipped (March 30 Session)

These are live and committed. Run the migrations to activate them in production.

| Feature | Status | Action Needed |
|---------|--------|--------------|
| PostHog analytics (all key pages) | ✅ Deployed | Set `NEXT_PUBLIC_POSTHOG_KEY` in Railway |
| $997 Architecture + $1997 Intensive + Annual plan cards on checkout | ✅ Deployed | None — live |
| `/cohort/[id]` user dashboard + `/admin/cohorts` management | ✅ Deployed | Run migration 057 |
| `/dashboard/referrals` + referral service | ✅ Deployed | Run migration 055 |
| Webhook service + user_webhooks table | ✅ Deployed | Run migration 056 |
| Upsell service + `UpsellCTA` component | ✅ Deployed | None — wired |
| ECOS branding removed from frontend (7 files) | ✅ Deployed | Run migration 059 |
| Per-client KB scoping (agency privacy fix) | ✅ Deployed | Run migration 058 |
| Redis caching for AGENT_CACHE | ✅ Deployed | Add Redis plugin in Railway |
| `/api/cron/*` endpoints for email schedulers | ✅ Deployed | Set `CRON_SECRET`, create 3 Railway Cron jobs |
| `railway.toml` healthchecks + Dockerfile optimization | ✅ Deployed | None |
| Migration runner script (`scripts/run-migrations.cjs`) | ✅ Deployed | Add to `railway.toml` preDeployCommand |

**Migrations to run (in order):**
```bash
# Run each via: POST https://mindset-os-backend-production.up.railway.app/api/admin/execute
# Header: x-admin-secret: <FROM RAILWAY VARIABLES>
# Body: {"operation": "run-migration", "params": {"sql": "<file contents>"}}

migrations/055_referral_commissions.sql
migrations/056_user_webhooks.sql
migrations/057_cohorts.sql
migrations/058_kb_client_scoping.sql
migrations/059_fix_agent_branding.sql
```

---

## Sprint 0 — Quick Wins (This Week, < 1 Day)

Straight from the ECOS plan — all apply to MindsetOS with zero adaptation needed.

### QW1 — Error pages (30 min) 🔧
- `app/error.tsx` — friendly error page with Refresh button
- `app/not-found.tsx` — custom 404 with "Back to Dashboard" button
- `app/dashboard/error.tsx` — dashboard error boundary
Currently: blank white screens on errors. Fix is cosmetic but matters for conversions.

### QW2 — PDF export (30 min) 🔧
- `components/CanvasPanel.tsx` uses `window.print()` — bad formatting
- `html2pdf.js` is already installed but not imported
- Replace `window.print()` with `html2pdf().from(element).save('mindset-plan.pdf')`

### QW3 — DOCX export (45 min) 🔧
- `docx` library already installed but unused
- Add "Export Word Doc" button in CanvasPanel
- Renders playbook/plan sections as formatted `.docx`

### QW4 — npm audit fix 🔧
```bash
cd apps/mindset-os && npm audit fix
```

---

## Sprint 1 — Stickiness Features

These are the features that make users come back daily and make the product painful to leave.

### Feature 1 — Smart Agent Handoff Recommendations 🔧 💡

**What**: When a user hits the edge of an agent's scope, a styled "Next Step" card appears recommending the right agent with one-tap navigation. No dead ends.

**MindsetOS mapping**:
- Reset Guide finishes → handoff to Architecture Coach ("Ready to go deeper?")
- Decision Framework finishes a decision → handoff to Accountability Partner ("Want to track this?")
- Mindset Score gives results → handoff to Reset Guide ("Start the 48-hour reset")
- Story Excavator uncovers a pattern → handoff to Inner World Mapper

**Backend** (`real-backend.cjs`):
1. In the SSE chat handler, scan final assembled text for `[HANDOFF: agent-slug]`
2. If found, emit additional widget SSE event: `{ "type": "agent_handoff", "agents": [{ "id": "...", "name": "...", "reason": "..." }] }`
3. Strip the tag from visible message text before storing

**Frontend** (`components/ChatWindow.tsx`):
1. In `renderBackendWidget()`, add `case type === 'agent_handoff'`
2. Render "Suggested Next Step" card: agent icon + name + reason + "Open [Agent] →" button

**Agent prompt updates** (via admin SQL — add to system prompts):
```
When the user's request is better served by a different agent, answer briefly then
end with [HANDOFF: agent-slug] on its own line. Slugs: reset-guide, architecture-coach,
accountability-partner, decision-framework, inner-world-mapper, story-excavator,
practice-builder, conversation-curator.
```

**Verification**: Chat with Reset Guide, complete day 2 → "Open Architecture Coach →" card appears. Click → lands in Architecture Coach with context.

---

### Feature 2 — Per-User CLAPS Tracker 🔧 💡

**Note**: MindsetOS already has an *admin* CLAPS tracker at `/admin/claps`. This is different — it's a **user-facing** tracker so Greg's paying members log their own wins and see their own progress. This is an accountability and retention feature, not an admin tool.

**MindsetOS mapping**: Instead of consultant sales metrics, Greg's users track:
- **C** — Conversations (coaching conversations initiated)
- **L** — Learnings (insights captured this week)
- **A** — Actions (commitments made)
- **P** — Progress (milestones hit)
- **S** — Shifts (mindset shifts experienced)

Or keep the original sales metrics if Greg's users are entrepreneurs tracking their business.

**Database** — new migration `060_user_claps.sql`:
```sql
CREATE TABLE IF NOT EXISTS user_claps_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  connections INTEGER NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  appointments INTEGER NOT NULL DEFAULT 0,
  presentations INTEGER NOT NULL DEFAULT 0,
  sales INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);
CREATE INDEX IF NOT EXISTS idx_user_claps_user_week ON user_claps_log(user_id, week_start DESC);
```

**Backend**: `GET /api/claps` (user's last 12 weeks) + `POST /api/claps` (upsert current week)

**Frontend**: `app/dashboard/claps/page.tsx` — weekly entry form + 8-week sparkline bar charts + WoW delta indicators

**Verification**: Enter week → save → reload → data persists. 3 prior weeks → sparklines update.

---

### Feature 3 — Per-User Pipeline CRM 🔧 💡

**Note**: MindsetOS has an *admin* pipeline at `/admin/pipeline` for Greg to track leads into the platform. This is different — it's a **user-level** CRM so Greg's paying agency coaches can track their own coaching clients.

**Why it matters**: Agency tier users are coaches. They need to track their own prospects and clients. This makes the agency tier dramatically stickier — their pipeline data lives in MindsetOS.

**Database** — new migration `061_user_pipeline.sql`:
```sql
CREATE TABLE IF NOT EXISTS user_pipeline_contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  company TEXT,
  linkedin_url TEXT,
  source TEXT NOT NULL DEFAULT 'manual',   -- manual|zoom|linkedin|lead_magnet
  stage TEXT NOT NULL DEFAULT 'lead',       -- lead|connected|call_booked|pitch_done|client
  enrichment_data JSONB,
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, email)
);
CREATE INDEX IF NOT EXISTS idx_user_pipeline_stage ON user_pipeline_contacts(user_id, stage);
```

**Backend** (`real-backend.cjs`):
- `GET /api/pipeline/contacts` — all for user, grouped by stage
- `POST /api/pipeline/contacts` — add single contact
- `PATCH /api/pipeline/contacts/:id` — update stage / notes
- `DELETE /api/pipeline/contacts/:id` — remove
- `POST /api/pipeline/import` — bulk CSV (Zoom or LinkedIn format)

**Frontend**: `app/dashboard/pipeline/page.tsx` — 5 Kanban columns, drag-and-drop, Add Contact modal, Import CSV modal, card actions

**Role gate**: Agency + admin + power_user only (same pattern as `/dashboard/clients`)

**Verification**: Add contact → import Zoom CSV → drag between stages → all persist on reload.

---

### Feature 4 — Broadcast Email to Pipeline Contacts 🔧 💡

**What**: Agency coaches can email all their pipeline contacts (or filter by stage) directly from the dashboard. Manual only — no automation yet.

**Backend**: `POST /api/pipeline/broadcast` — body: `{subject, html, stage_filter?}` — uses existing `sendCustomEmail()`, logs to `email_send_log`, rate limits: max 500 recipients/send, 3 broadcasts/day

**Frontend**: "Send Email" button in pipeline header → modal with subject + rich text + stage filter + "Send to X contacts" count

**Verification**: Filter "lead" stage → compose → send → `email_send_log` shows rows.

---

## Sprint 2 — Growth Layer (Week 2–3)

### Feature 5 — Lead Source Tracking + LinkedIn Enrichment 🔧 💡

**What**: Know exactly where each lead came from (which lead magnet, which UTM campaign). Auto-add quiz/form leads to pipeline. Optional: enrich with LinkedIn via Apollo.io.

**Database** — migration `062_lead_enrichment.sql`:
```sql
ALTER TABLE quiz_leads
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS enrichment_data JSONB,
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending';

-- Also apply to 7days / scorecard / audit lead tables
ALTER TABLE lm_leads
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT;
```

**Backend**:
1. In `/api/quiz/submit`, `/api/leads/capture`: capture UTM params + referer header
2. After inserting lead → auto-insert into `pipeline_contacts` (admin pipeline) with `source: 'lead_magnet'`
3. New route: `POST /api/pipeline/enrich/:contactId` — calls Apollo.io `people/match` API, stores in `enrichment_data`
   - Env var: `APOLLO_API_KEY` ($15-20/mo basic)

**Verification**: Scorecard submit with `?utm_source=linkedin` → pipeline contact auto-created with source + UTM. Enrich → LinkedIn URL populated.

---

### Feature 6 — Landing Page Builder 🔧 💡

**What**: Each paying user (agency tier) gets a branded coaching page at `[slug].mindset.show` (or `[slug].mindsetOS.com`). Template + Claude-generated copy = live page in under 5 minutes. Leads sync to pipeline.

**MindsetOS angle**: Instead of consultant offer pages, these are *coaching intake pages* — "Book a mindset consultation with [Coach Name]." Leads captured → auto-added to their pipeline.

**Database** — migration `063_landing_pages.sql`:
```sql
CREATE TABLE IF NOT EXISTS landing_pages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  template_id TEXT NOT NULL DEFAULT 'minimal',  -- 'minimal'|'bold'|'authority'
  headline TEXT,
  subheadline TEXT,
  offer_section JSONB,       -- {title, bullets[], cta_text, cta_url}
  social_proof JSONB,        -- [{quote, name, title}]
  custom_css TEXT,
  published_at TIMESTAMPTZ,
  lead_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_landing_slug ON landing_pages(slug);
```

**Backend**:
- `GET /api/landing-pages` — user's pages
- `POST /api/landing-pages` — create, calls Claude API with user's profile to generate copy
- `PATCH /api/landing-pages/:id` — edit content
- `GET /api/p/:slug` — public renderer (no auth), returns rendered page HTML

**Frontend**:
- `app/dashboard/landing-pages/page.tsx` — page manager
- `app/dashboard/landing-pages/[id]/edit/page.tsx` — live preview editor
- `app/p/[slug]/page.tsx` — public page (ISR revalidation 60s)
- Lead capture form → `/api/leads/capture` → auto-adds to user's pipeline

**Verification**: Create page → publish → visit slug URL → page loads. Submit lead form → contact in pipeline.

---

### Feature 7 — Slide Generation 🔧 💡

**What**: Export any plan/playbook as a polished PPTX. Claude structures the outline, `pptxgenjs` (already in npm) renders it.

**Backend** (`real-backend.cjs`):
- `POST /api/playbook/export-slides` — body: `{playbookId, format: 'pptx'}`
- Fetch playbook sections from DB
- Call Claude: "Structure these sections into a slide outline: `[{heading, bullets[], notes}]`"
- Use `pptxgenjs` to render: branded title slide + content slides
- Return base64 PPTX for client-side download

**Frontend**:
- Add "Export Slides" button in `CanvasPanel.tsx` next to existing PDF
- Calls endpoint, triggers `a.download` with returned base64

**Verification**: Open plan with 3+ sections → Export Slides → PPTX downloads with correct content.

---

## Sprint 3 — White Label Platform (Week 4–6)

**This is the biggest strategic move.** Instead of forking the entire codebase for each white-label deployment (current MindsetOS approach — 29+ file changes), run ONE service that serves different brands based on the incoming domain.

```
wellbeingOS.com  ──CNAME──→  mindset-os-frontend-production.up.railway.app
                                      ↓
                        Next.js middleware reads Host header
                                      ↓
                        DB lookup: white_label_configs WHERE domain = 'wellbeingOS.com'
                                      ↓
                        Pages render with that coach's logo, colors, agents
```

Greg can sell "MindsetOS for Your Coaching Practice" to other mindset and wellness coaches at $297/week per license. Railway handles SSL automatically for each custom domain.

### Feature 8 — Multi-Tenant White Label Infrastructure 🔧 💡

**Database** — migration `064_white_label_configs.sql`:
```sql
CREATE TABLE IF NOT EXISTS white_label_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  brand_name TEXT NOT NULL,
  brand_tagline TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  accent_color TEXT DEFAULT '#f59e0b',
  logo_url TEXT,
  favicon_url TEXT,
  support_email TEXT,
  agent_prefix TEXT DEFAULT 'Coach',
  allowed_agent_slugs JSONB DEFAULT '[]'::jsonb,  -- [] = all agents
  custom_css TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wl_domain ON white_label_configs(domain);
```

**Backend** (`real-backend.cjs`):
1. `GET /api/brand-config?domain=<hostname>` — public, no auth, cached in-process 5min
2. Update CORS to also allow registered WL domains
3. `POST /api/admin/white-label` — create/update WL config
4. `POST /api/admin/white-label/add-railway-domain` — calls Railway API to provision custom domain

**Frontend** — `middleware.ts` (new file):
```typescript
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const isMainDomain = hostname === 'mindset.show'
    || hostname.endsWith('.mindset.show')
    || hostname === 'localhost:3000'

  if (!isMainDomain) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/brand-config?domain=${hostname}`)
    const brand = await res.json()
    if (brand?.brand_name) {
      const headers = new Headers(request.headers)
      headers.set('x-brand-config', JSON.stringify(brand))
      return NextResponse.next({ request: { headers } })
    }
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] }
```

**Frontend** — `lib/useBrand.ts` (new file):
```typescript
import { headers } from 'next/headers'

export function getBrandConfig() {
  const h = headers()
  const raw = h.get('x-brand-config')
  if (raw) return JSON.parse(raw)
  return {
    brand_name: 'MindsetOS',
    primary_color: '#6366f1',
    accent_color: '#f59e0b',
    logo_url: '/logo.svg',
  }
}
```

**Pages to update**: `app/layout.tsx` (title, favicon), login, register, `components/Sidebar.tsx`

**Customer DNS setup (5 min)**:
1. Go to their DNS provider
2. Add: `CNAME wellbeingOS.com → mindset-os-frontend-production.up.railway.app`
3. Tell Greg their domain → he adds it in Railway → SSL provisions in 2-3 minutes
4. Brand is live

**Verification**: Visit custom domain → white label brand served. Visit `mindset.show` → MindsetOS branding unchanged.

---

### Feature 9 — White Label Admin Panel 🔧 💡

White-label licensees get a restricted admin panel — only their users, their agents, their brand. They never see MindsetOS data or other tenants.

**New DB role**: `white_label_admin` (between power_user and admin)

**Permissions**: Can manage their registered users, configure their brand, run broadcasts to their users, enable/disable agents. Cannot see other tenants or billing.

**Frontend** — `app/wl-admin/` (new route group):
- `page.tsx` — WL dashboard: user count, active users, top agents
- `users/page.tsx` — manage their users
- `branding/page.tsx` — logo upload, color picker, preview
- `agents/page.tsx` — enable/disable which agents their users see

---

### Feature 10 — Branding Wizard for WL Onboarding 🔧 💡

A 5-step wizard that auto-generates a full brand kit from a logo upload.

**Tools**:
- `Chroma.js` — extract dominant palette from logo → suggest primary/accent colors
- Claude API — from coaching description → generate tagline + tone guidelines
- Canvas API — browser-side favicon generation
- Next.js `ImageResponse` — server-side OG image with brand colors

**Wizard steps**:
1. Upload logo → extract colors
2. Describe your coaching practice → Claude generates tagline + voice
3. Preview: sample agent card + dashboard + login in their brand
4. Set custom domain (input + DNS instructions modal)
5. Confirm → saves to `white_label_configs`, domain provisioning begins

---

### Feature 11 — Agent Improvement Flywheel (Cohort Learning) 🔧 💡

**This is the moat.** Greg doesn't just sell software — he helps coaches iterate their agents using cohort data. Each cohort, the agents get measurably smarter. No other platform does this.

**Database** — migration `065_agent_quality_signals.sql`:
```sql
CREATE TABLE IF NOT EXISTS agent_quality_signals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  agent_slug TEXT NOT NULL,
  conversation_id INTEGER,
  signal_type TEXT NOT NULL,  -- thumbs_up|thumbs_down|copy|handoff_accepted|handoff_ignored
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quality_signals_agent ON agent_quality_signals(agent_slug, created_at DESC);
```

**ChatWindow UI** — add 👍 👎 icons below each assistant message (appear on hover):
```javascript
// On click:
POST /api/signals { messageId, conversationId, agentSlug, signalType }
```

**Weekly quality SQL** (run via admin panel):
```sql
SELECT agent_slug,
  COUNT(*) FILTER (WHERE signal_type = 'thumbs_up') AS positive,
  COUNT(*) FILTER (WHERE signal_type = 'thumbs_down') AS negative,
  ROUND(COUNT(*) FILTER (WHERE signal_type = 'thumbs_up')::numeric /
        NULLIF(COUNT(*), 0) * 100, 1) AS satisfaction_pct
FROM agent_quality_signals
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY agent_slug ORDER BY satisfaction_pct ASC;
```

**Langfuse prompt versioning** (self-hosted on Railway, open-source, free):
- Every system prompt stored with version tag `{agent_slug, version, cohort_quarter}`
- Compare quality scores across versions
- A/B test: 5% of users get "variant" prompt, 95% get "control"
- Env vars: `LANGFUSE_HOST`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`

**Cohort tagging**: Tag each user on registration with `cohort: '2026-Q2'` → track which cohort generates highest agent satisfaction → story to tell white-label clients: *"Your agents improve each cohort."*

---

## Sprint 4 — Dream Layer (Month 2+)

### Dream 1 — Embeddable Agent Widgets 💡

**Vision**: "Drop the Mindset Score as a lead magnet on your website." Coach embeds an iframe — their website visitors interact with the agent, leads auto-sync to the coach's pipeline.

```html
<iframe src="https://mindset.show/embed/mindset-score?key=abc123"></iframe>
```

Visitor completes the score → email captured → auto-added to coach's pipeline as `source: 'embedded_widget'`. Coach sees "12 leads from your website widget this week."

**Why this is huge**: The widget runs on coaches' websites. Every use is marketing for MindsetOS. Free distribution flywheel.

---

### Dream 2 — Cohort Benchmarking Dashboard 💡

**Vision**: *"Your Accountability Partner agent has a 74% satisfaction rate. Top 10% of users achieve 91%. Here's what they do differently."*

Makes the flywheel visible to users. Creates engagement. Drives upgrade behavior. Reduces churn (people don't want to fall behind their cohort peers).

- Anonymized aggregate stats from `agent_quality_signals`
- Percentile ranking per user per agent
- "This week you're in the top 30% for Decisions Made. Bottom 20% for Check-in frequency."

---

### Dream 3 — AI-Generated Case Studies 💡

**Vision**: When a pipeline contact moves to "Client" stage, system auto-drafts a case study: *"How [Name] rewired their decision-making in 48 hours using the MindsetOS Reset."* Coach reviews + publishes to their landing page.

- Trigger: `PATCH /api/pipeline/contacts/:id` with `stage: 'client'`
- Auto-draft via Claude using contact data + CLAPS wins + conversation context
- Draft stored in user's content library
- One-click "Share to LinkedIn" (LinkedIn API post)

---

### Dream 4 — Sub-Licensing for White Label Clients 💡

**Vision**: A WL coach (say, a therapy group practice) buys "WL Pro" and gets rights to license the platform to their own therapists at whatever price they set. Greg takes 15% via Stripe Connect.

**Two models**:
1. **Flat fee**: Pay $497/mo extra → license to up to 10 of your own practitioners
2. **Rev-share**: Free to sub-license, Greg takes 15% of whatever they charge

---

### Dream 5 — ROI Dashboard 💡

**Vision**: Every user sees their personal MindsetOS ROI: sessions completed → goals hit → revenue generated → vs. subscription cost. Makes renewal a math problem they can't argue with.

- Pull from CLAPS revenue + pipeline client count
- *"You've closed $8,400 in coaching clients this quarter. Your subscription cost: $564. ROI: 1,489%."*
- Show on dashboard home as a live stat
- Email digest: *"Your Q2 ROI with MindsetOS: 847%"*

---

## Profitability — Pricing Strategy for MindsetOS

Adapted from the ECOS strategy call.

### Current MindsetOS Pricing
| Tier | Price | Status |
|------|-------|--------|
| Free | $0 | Mindset Score |
| Entry | $47 one-time | 48-Hour Reset |
| Core | $997 one-time | 90-Day Architecture (cohort) |
| Premium | $1,997 one-time | Architecture Intensive (1:1) |

### Recommended Additions

**1. Annual plan** (reduce churn 40-60%)
- MindsetOS Annual: $1,997/yr — already on checkout page ✅
- Push this as the *featured* option for anyone reaching the checkout page after 30+ days

**2. MindsetOS for Coaches ($297/week per WL license)**
- Sell the white-label platform to other mindset/wellness coaches
- 10 WL clients = ~$12,880/mo recurring at near-zero marginal cost
- With the multi-tenant architecture (Sprint 3), each new client is 1 hour of setup

**3. Coaching Accelerator tier ($997/mo)**
- Weekly live group call with Greg
- Monthly cohort analysis report
- 2 custom agent buildouts per quarter (using agent creator from ECOS)
- Upsell to current Architecture cohort graduates

**4. Extended Agency tiers**
- Agency 5: $203/mo (current)
- Agency 10: Current (need to confirm pricing)
- Agency 25: $497/mo (new — coaches with larger practices)
- Agency Unlimited: $797/mo (new — franchise coaches, group practices)

**5. Affiliate program — activate what's already built**
- invite_codes + referral_commissions table already live ✅
- Offer 10% recurring for 12 months on every referral
- LTV math: subscriber at $203/mo × 24mo avg = $4,872 LTV
- Affiliate cost: 10% × $203 × 12 = $243.60 → 20:1 ROI on acquisition spend
- Coaches refer coaches (they network constantly)

### Revenue Model at 12 Months

| Stream | Accounts | MRR |
|--------|----------|-----|
| Individual Reset + Annual ($100/mo avg) | 200 | $20,000 |
| Architecture Cohort ($997/cohort × 4/yr ÷ 12) | 40 active | $13,267 |
| Agency Practice ($347/mo avg) | 60 | $20,820 |
| Coaching Accelerator ($997/mo) | 20 | $19,940 |
| White Label ($1,288/mo per licensee) | 10 | $12,880 |
| **Total MRR** | | **~$87,000** |

Gross margin stays ~99.99% through all of this. AI costs at $0.02/user/month don't move at 10x user growth.

---

## Strategy Call Agenda

### Pre-Call Prep (Greg)
- [ ] Confirm all March 30 migrations (055–059) are applied in production
- [ ] Set `NEXT_PUBLIC_POSTHOG_KEY` → check data is flowing in PostHog
- [ ] Log into `/admin/cohorts` — plan first Architecture cohort launch date
- [ ] Review `/admin/pipeline` — how many leads are there now?

---

### Block 1 — Activation Checklist (10 min)

Immediate steps to turn on what was built this session:

| Action | Who | Time |
|--------|-----|------|
| Run migrations 055–059 | Greg (via admin API) | 30 min |
| Set NEXT_PUBLIC_POSTHOG_KEY in Railway | Greg | 5 min |
| Set CRON_SECRET in Railway, create 3 Cron jobs | Greg or dev | 20 min |
| Add Redis plugin to Railway backend service | Greg | 5 min |
| Create first Architecture cohort in `/admin/cohorts` | Greg | 10 min |

---

### Block 2 — Product Decisions (20 min)

1. **First cohort launch date** — the system is built. What's the minimum viable size? (Suggested: 6 people). What date? Recommend 30 days out to fill it.

2. **Referral program go-live** — announce to existing members now or wait for 50+ users? The infrastructure is live, just needs a launch email.

3. **Annual billing positioning** — make it the featured/default option on checkout, or only surface it to users past week 4?

4. **White label licensing** — is Sprint 3 a Q2 or Q3 priority? At $297/week per licensee, 5 licenses pays for significant dev time.

5. **Per-user pipeline CRM (Sprint 1, Feature 3)** — is this valuable to Greg's agency users? Or are they pure mindset clients who don't need a CRM?

---

### Block 3 — 60-Day Build Stack (15 min)

Suggested priority order — adjust in call:

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | Activate March 30 migrations | 30 min | Unlocks referrals, cohorts, KB privacy |
| 2 | Sprint 0 quick wins (error pages, PDF/DOCX export) | 2 hrs | Polish |
| 3 | Agent handoff recommendations | 1 day | Retention + engagement |
| 4 | PostHog conversion funnel analysis | Ongoing | Optimization data |
| 5 | Trial page A/B variant | 2 days | Biggest revenue lever |
| 6 | Per-user Pipeline CRM (if agency tier focus) | 2 days | Agency stickiness |
| 7 | Lead source UTM tracking | 4 hrs | Attribution |
| 8 | White label infrastructure (Sprint 3) | 4 days | New revenue stream |
| 9 | Agent quality signals (👍 👎) | 1 day | Moat building |
| 10 | Memory insights dashboard | 2 days | Retention |

---

### Block 4 — The White Label Pitch (5 min)

The competitive moat from the ECOS call applies directly to MindsetOS:

> *We don't just sell software — we coach mindset practitioners AND help them iterate their agents using cohort data. Each cohort, their agents get smarter. No other platform does this. The data flywheel is the moat.*

Who to sell WL to:
- Other mindset coaches with 10+ clients
- Therapy practice groups (5-20 therapists)
- Corporate wellness programs
- Business coach platforms (high overlap with Greg's audience)
- Podcast hosts with existing audiences (they already have trust)

Each WL client points their domain at MindsetOS, their clients think it's custom-built software for their coach. Greg collects $297/week and they never know MindsetOS exists.

---

### Deployment Safety Rules (From ECOS Plan)

These apply to every future sprint:

1. **Feature flags**: Sprint 2+ features gated by env var (e.g., `FEATURE_LANDING_PAGES=true`). Default off.
2. **Additive migrations only**: All SQL uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`. Never `DROP`, never destructive rename.
3. **Canary approach**: New backend routes are purely additive — never modify existing route handlers.
4. **Downtime budget**: Max 2 minutes per deploy. Migrations run before backend restarts (handled by `scripts/run-migrations.cjs`).
5. **Multi-tenant isolation**: All WL queries filter by `white_label_id`. Test: create two WL configs, verify zero data bleed.

---

### After the Call

- Update this file with decisions made
- Create sprint doc with agreed build order
- Set 2-week check-in to review PostHog data and cohort enrollment numbers

---

*Document: `apps/mindset-os/SUGGESTIONS.md` — update as strategy evolves.*
