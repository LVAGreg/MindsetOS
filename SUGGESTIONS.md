# MindsetOS — Upgrade Suggestions & Strategy Call Brief
*Last updated: March 30, 2026*

This document covers two things:
1. **Proven upgrades from ECOS** (Rana's platform) that make sense to port into MindsetOS
2. **Strategy call agenda** — what to review, decide, and assign

---

## Part 1: ECOS → MindsetOS Port Opportunities

MindsetOS is ahead of ECOS in several areas (cohorts, CRM, referrals, webhooks, lead magnets). The gaps below are specific patterns ECOS has refined that translate directly to Greg's platform.

---

### HIGH PRIORITY

#### 1. Multi-Version Trial Funnel Testing
**What ECOS has**: 4 live variants of the trial page (`/trial`, `/trial-v2`, `/trial-v3`, `/trial-v3a`). Rana actively tests headline, CTA, and pricing layout. MindsetOS only has one.

**Why it matters**: The biggest revenue lever is trial → paid conversion. ECOS has been iterating on this. The `/trial-v3b` page in MindsetOS is good but it's a single untested version.

**Action**: Build 1–2 additional `/trial-v[X]` variants with different:
- Headline framing ("Stop surviving. Start designing." vs "The thinking OS for entrepreneurs.")
- Social proof placement (above fold vs. after features)
- CTA copy ("Start Your Reset" vs "Take the Mindset Score")
- Pricing display (weekly vs annual-first)

Then split-test via PostHog feature flags.

---

#### 2. Custom Agent Builder (Agent Creator)
**What ECOS has**: `/admin/agents/[agentId]/[version]` — a meta-agent that generates JSON config for new agents, wires them into the DB, and makes them live instantly. The UI wizard walks through: persona, framework, output format, memory usage, examples.

**Why it matters for MindsetOS**: Greg's vision is to sell the platform to coaches and consultants. The agent creator is the unlock — it lets clients build their own version of Greg's methodology. This is the core of the agency tier value prop.

**Status**: The backend schema and meta-agent exist in ECOS. The frontend admin wizard is ~60% built.

**Action**: Port `/admin/agents` create/edit pages from ECOS frontend into MindsetOS. Wire up the existing backend. Test the full "create agent → live in dashboard" flow end to end. Estimated: 2–3 days.

---

#### 3. Voice Agent Integration
**What ECOS has**: Full voice session system — `/api/voice/session/start`, TTS, STT, voice history, scenario library. The backend routes are already deployed in `real-backend.cjs` (MindsetOS shares this backend).

**Why it matters**: The accountability partner and daily check-in agents are much more powerful as voice. Coaches can have a spoken conversation instead of typing.

**Action**: The backend is ready. Port the voice UI components from ECOS frontend into MindsetOS dashboard. Connect the existing `/api/voice/*` routes.

---

#### 4. Playbook System
**What ECOS has**: A `playbooks` table and `/playbook` route. Coaches upload their own frameworks, case studies, and repeatable processes. The AI references these during conversations — not just generic knowledge base entries, but structured step-by-step playbooks with defined stages.

**Why it matters**: Playbooks are how Greg's IP gets systematized into the platform. The "3-Layer Architecture" framework, the "DESIGN" decision process, the 48-hour Reset — these should live as playbooks, not just in agent prompts.

**Action**: Port playbook schema and admin UI. Create MindsetOS-specific playbooks for Greg's 3 core frameworks.

---

### MEDIUM PRIORITY

#### 5. Memory Insights Dashboard
**What ECOS has**: Agent `memory-insights-v6` — gives users a visual breakdown of what the AI has learned about them. Categories: beliefs, patterns, wins, challenges, goals. Shown as a profile card.

**Why it matters**: Memory visibility is a trust-builder and retention driver. Users who can *see* what the AI knows about them engage more deeply and churn less.

**Action**: Build a `/dashboard/memory` page that calls existing memory API endpoints and visualizes the 4 memory types (core, conversational, episodic, semantic). Reference the `memory-insights-v6` agent prompt for the display format.

---

#### 6. Hybrid Search on Knowledge Base
**What ECOS has**: Full hybrid search (vector similarity + keyword BM25) on the knowledge base. ECOS has `HYBRID_SEARCH.md` documenting the implementation. MindsetOS currently uses vector-only search.

**Why it matters**: Hybrid search improves retrieval accuracy on specific named concepts (e.g., "DESIGN framework", "Architecture Coach") where pure embedding search can miss exact terms.

**Action**: Port the hybrid search function from ECOS RAG service. ~4 hours of backend work. No frontend changes needed.

---

#### 7. Chat Widget Formatting System
**What ECOS has**: A structured output formatting system — agents return rich markdown with consistent headers, callout boxes, numbered frameworks, and step separators. There's a full `CHAT_WIDGET_FORMATTING_SYSTEM.md` spec. MindsetOS renders basic markdown.

**Why it matters**: Greg's content is framework-heavy (DESIGN process, 3-Layer Architecture). It deserves structured visual rendering, not raw text blocks.

**Action**: Port the widget formatting spec into MindsetOS ChatWindow component. Update 2–3 key agents (Architecture Coach, Decision Framework, Reset Guide) to output structured format.

---

#### 8. Structured Metadata on Conversations
**What ECOS has**: Each conversation response includes structured metadata — key decisions made, frameworks applied, next actions, sentiment score. Stored in JSONB, surfaced in conversation history.

**Why it matters**: This is the data that powers upsell triggers, memory extraction, and eventually the "your week in review" report.

**Action**: Port the metadata extraction step from ECOS chat pipeline. Add `conversation_metadata` JSONB column to conversations table (1 migration). Update the chat handler to extract metadata post-response.

---

### LOWER PRIORITY (but worth tracking)

#### 9. LinkedIn Agent Suite (Future: "MindsetOS for Consultants")
ECOS has 6 LinkedIn-specific agents (events builder, daily lead sequence, profile power-up, authority content engine). These don't fit Greg's current audience (entrepreneurs focused on internal mindset work), but if MindsetOS ever expands to a B2B consulting tier, this whole agent suite ports directly.

**No action now** — just preserve the awareness that these exist in ECOS.

---

#### 10. Deep Research Agent (Perplexity Integration)
ECOS has `deep-research-expert` — an agent that fires Perplexity Sonar API searches, pulls citations, and synthesizes a research brief. The backend route `/api/research/*` exists but is not active in MindsetOS.

**Action (low priority)**: Enable the route, add `PERPLEXITY_API_KEY` to Railway env, expose the agent. Useful for power users doing market research on their business context.

---

## Part 2: Strategy Call Agenda

### Purpose
This call is to align on the MindsetOS roadmap for the next 60–90 days, prioritize the build backlog, and make key product decisions before investing development time.

---

### Pre-Call Prep (Greg)
Before the call, it's helpful if Greg reviews:
- [ ] The current live platform at `mindset-os-frontend-production.up.railway.app`
- [ ] The admin pipeline CRM — how many contacts are in it, how they got there
- [ ] The checkout page — confirm all 3 new plan cards (Architecture, Intensive, Annual) look right
- [ ] The admin cohorts page — start thinking about when to run the first 90-Day cohort and at what size

---

### Agenda

**Block 1 — Where we are (10 min)**
- Review what was just shipped: PostHog, new checkout plans, cohort system, referrals, pipeline CRM, CLAPS tracker, branding cleanup
- Confirm Railway deployments are healthy
- Quick check: is the trial → paid conversion funnel working end to end?

**Block 2 — Immediate actions required from Greg (10 min)**
These need manual steps to activate what was built:

1. **Run migrations 055–059** via the admin API (referral_commissions, user_webhooks, cohorts, KB scoping, agent branding)
   ```
   POST https://mindset-os-backend-production.up.railway.app/api/admin/execute
   Header: x-admin-secret: [from Railway variables]
   Body: {"operation": "run-migration", "params": {"sql": "<contents of migration file>"}}
   ```
2. **Set Railway env vars**:
   - `NEXT_PUBLIC_POSTHOG_KEY` — get from posthog.com (free tier)
   - `CRON_SECRET` — any random secret string
3. **Create 3 Railway Cron services** — `/api/cron/send-reports` (daily 9pm), `/api/cron/quiz-emails` (every 5 min), `/api/cron/lm-emails` (every 5 min)
4. **Add Redis plugin** in Railway dashboard for the backend service
5. **Fix agent branding** — run migration 059 to clean ECOS names from DB

**Block 3 — Product decisions (20 min)**

1. **When to run the first 90-Day Architecture cohort?**
   - The cohort system is built and live
   - Stripe checkout for `architecture_997` ($997) is wired
   - What's the minimum viable cohort size to launch? (Suggested: 5–8 people)
   - Target start date?

2. **Annual billing rollout**
   - Annual plan ($1,997) is now on the checkout page
   - Should it be the default/featured option for new visitors? Or only surfaced after 4 weeks?

3. **PostHog setup priority**
   - Once the API key is set, what events matter most to watch first? (Suggested: `lead_magnet_submitted`, `trial_started`, `checkout_completed`)
   - Does Greg want a shared PostHog dashboard with the dev?

4. **Referral program go-live**
   - The infrastructure is built. When does Greg announce it to existing members?
   - What's the payout cadence? (Suggested: monthly batch, Stripe payouts)

5. **Custom agent builder — yes or no for Q2?**
   - This is the biggest agency-tier feature
   - Does Greg want to sell "build your own mindset coaching AI" to other coaches?
   - If yes, this becomes the Q2 priority

**Block 4 — 60-day build prioritization (15 min)**

Suggested priority stack (adjust in call):

| Priority | Feature | Effort | Why |
|----------|---------|--------|-----|
| 1 | Run pending migrations (activates new features) | 30 min | Blockers on referrals, cohorts |
| 2 | PostHog conversion dashboard | 1 day | Can't optimize what you can't see |
| 3 | Trial page variant (A/B test) | 2 days | Biggest revenue lever |
| 4 | Memory insights dashboard | 2 days | Retention driver |
| 5 | Custom agent builder (port from ECOS) | 3 days | Agency tier unlock |
| 6 | Voice agent UI | 2 days | Accountability partner killer feature |
| 7 | Hybrid search (KB upgrade) | 4 hours | Agent quality improvement |
| 8 | Structured metadata on conversations | 1 day | Powers reports + upsells |
| 9 | Chat widget formatting | 1 day | Content quality improvement |

**Block 5 — Revenue focus (5 min)**
- Current MRR estimate?
- Next revenue milestone?
- Which single change would move the needle most in the next 30 days?

---

### Key Decisions to Make in the Call

1. **Cohort launch date** — commit to a specific date or say "Q3"
2. **Referral go-live** — announce to members now or hold until 50+ users?
3. **Custom agent builder** — Q2 priority yes/no
4. **Voice feature** — include in next sprint or deprioritize?
5. **Additional dev investment** — keep current pace or accelerate?

---

### After the Call
- Update this file with decisions made
- Create a sprint doc with the agreed build order
- Set a 2-week check-in to review PostHog data and conversion numbers

---

*This document lives at `apps/mindset-os/SUGGESTIONS.md`. Update it as the strategy evolves.*
