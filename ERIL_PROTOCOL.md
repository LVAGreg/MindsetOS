# ERIL v2 Protocol — MindsetOS

**Every ERIL agent follows these exact steps. No deviations.**

ERIL = Evaluate → Research → Implement → Loop

---

## Step 0 — Pre-flight: filter the rubric to your task

Read `/data/workspace/ECOS/apps/mindset-os/EVALUATION_CRITERIA.md`.

Identify which anti-pattern classes apply to your task:

| If your task involves... | Check these classes |
|--------------------------|-------------------|
| API calls / fetch / endpoints | `cross-file-mismatch` — verify URL against real-backend.cjs |
| Colors / design / tokens | `token-violation` — verify against design token reference table |
| Buttons / icons / interactive elements | `accessibility` — aria-labels required |
| `catch` blocks / async operations | `silent-failure` — every catch needs UI feedback |
| Props passed to child components | `integration-gap` — verify at every call site |
| HTMLElement style mutations | `typescript` — cast to HTMLElement |
| Mobile layout / touch | `mobile` — flex-wrap, tap targets ≥44px |
| Three.js / WebGL | `webgl` — geometry ownership, RAF cleanup |

**Mandatory cross-file checks (do these BEFORE writing any code):**

1. **API endpoints**: For every `fetch('/api/...')` or `apiClient.get('/api/...')` you will write, grep `real-backend.cjs` for the registered path. If the path doesn't match exactly, you have a bug before you start.

2. **Response field names**: For every `res.data.fieldName` you will write, read the backend route handler's response object to confirm `fieldName` exists.

3. **Color values**: For every hex color you write, verify it against the design token table in EVALUATION_CRITERIA.md. The 9 canonical tokens are: `#09090f`, `rgba(18,18,31,0.8)`, `#1e1e30`, `#ededf5`, `#9090a8`, `#5a5a72`, `#4f6ef7`, `#fcc824`, `#7c5bf6`. Any other hex is off-token unless it's an opacity variant of one of these.

---

## Step 1 — Screenshot (when visual context helps)

Use Playwright to navigate the production site and take a screenshot.
Only required for UI-facing components. Skip for backend-only work.

URL: `https://mindset-os-frontend-production.up.railway.app`

---

## Step 2 — Read before writing

Read every file you will modify. Read files your code will call into.
Never edit a file you haven't read.

**Context budget check:**  
Before writing, estimate your token footprint: system prompt + all file reads + conversation history. If you expect to exceed ~60% of the model's context window, plan for chunked reads — read files in offset windows rather than whole files. Long files (>500 lines) should be read in 200-line chunks targeted at the relevant section, not fully loaded.

---

## Step 3 — Score your implementation against BOTH rubrics

ERIL uses a **dual rubric**. Both must independently pass. Either failing → VERDICT: REVISE.

---

### Rubric A — Self-created rubric (write this BEFORE touching any code)

In Step 2, before modifying any file, write 5 task-specific criteria for this feature:

```
Self-Rubric for: [feature name]
1. Does [specific behavior] work correctly?
2. Does it handle [edge case] gracefully?
3. Is [element] visible/functional on mobile?
4. Does [integration point] connect to the real backend endpoint?
5. Is [user action] intuitive without instruction?
```

These criteria must be specific to YOUR task — things the universal rubric can't anticipate.
Score each criterion after implementing: each must be ≥7 for VERDICT: YES.

---

### Rubric B — EVALUATION_CRITERIA.md universal floor

Use the scoring template from EVALUATION_CRITERIA.md. Score all 10 criteria:

```
UI
  Originality:        /10  (target ≥8)
  Quality of Design:  /10  (target ≥8)
  Craft:              /10

Agent Experience (if applicable)
  Conversation Feel:  /10  (target ≥8)
  Context Persistence:/10

Code
  Simplicity:         /10
  Correctness:        /10

UX
  User Intent:        /10  (target ≥8)
  Mobile Readiness:   /10
```

For backend-only work (no UI), score only: Functionality, Simplicity, Correctness.

---

### VERDICT rules (both rubrics must pass)

- If ANY `blocker:yes` anti-pattern applies → VERDICT: REVISE (immediate, no other scoring needed)
- If ANY self-rubric criterion < 7 → VERDICT: REVISE
- If ANY starred criterion (★) in Rubric B < 8 → VERDICT: REVISE
- If ANY Rubric B criterion < 7 → VERDICT: REVISE
- All of the above pass → VERDICT: YES

---

## Step 4 — Near-miss log

After scoring, note any patterns that ALMOST failed — where you caught something before it became a bug. These are candidates for new rubric entries.

Format: `NEAR-MISS: [what you caught] → [class it would belong to]`

---

## Step 4.5 — What to persist

After every loop, ask: **"What did I learn in this implementation that a future ERIL agent shouldn't have to rediscover?"**

Check these three questions:

**a) Reusable pattern?**  
If this loop involved 5+ tool calls, recovered from a bug, or discovered a non-obvious API contract — write a brief pattern note.  
Format: `PATTERN: [what the pattern is] → [where it applies]`  
Example: `PATTERN: idempotent column adds use ALTER TABLE IF NOT EXISTS — applies to all migration steps`

**b) Failed approach?**  
If you tried something that didn't work before finding the fix — log it.  
Format: `FAILED: [what you tried] → [why it failed] → [what worked instead]`  
Example: `FAILED: direct DB connection via psql → Railway internal-only → use admin API execute endpoint`

**c) Memory-worthy fact?**  
If you discovered something about the codebase that contradicts assumptions (wrong field name, unexpected schema, component API differs from docs) — add it to the Near-miss log AND flag it for V5.

These notes go at the bottom of your VERDICT block. They feed future loops — treat them as investment, not overhead.

---

## Step 5 — VERDICT

```
VERDICT: YES | REVISE
Score: X.X/10 (average of applicable criteria)
Blockers: (list any criterion <7 or blocker:yes anti-pattern hit)
Near-misses: (list any patterns you caught pre-emptively)
Patterns: (from Step 4.5a — reusable patterns discovered)
Failed approaches: (from Step 4.5b — what didn't work and why)
Files created/modified: (list)
```

---

## Design Token Reference (quick lookup)

| Token | Value | Use |
|-------|-------|-----|
| Background deep | `#09090f` | Page backgrounds |
| Background card | `rgba(18,18,31,0.8)` | Cards, panels |
| Border | `#1e1e30` | All borders |
| Text primary | `#ededf5` | Headings |
| Text secondary | `#9090a8` | Body |
| Text muted | `#5a5a72` | Timestamps |
| Accent blue | `#4f6ef7` | Primary actions |
| Accent amber | `#fcc824` | Free tier / CTAs |
| Accent purple | `#7c5bf6` | Premium |

**Off-token values to reject immediately:**
`#f59e0b`, `#eab308`, `#8b5cf6`, `#6366f1`, `#6b7280`, `#475569`, `#64748b`, `#1a1a2e`, `#e2e8f0`, `#16213e`

---

## High-confidence anti-patterns (hits ≥ 5) — always check these

These fire in almost every loop. Check them regardless of task type:

1. **Off-token amber** (`#f59e0b` or `#eab308` instead of `#fcc824`) — grep every color value you write
2. **Silent failure** — every `catch` block must call `setError()` or equivalent
3. **Partial token migration** — if you touch a file, grep it for `gray-*`, `indigo-*`, `violet-*`, `dark:*`
4. **Missing aria-labels** — every icon-only button needs `aria-label`
5. **HTMLElement cast** — every `.style` mutation needs `as HTMLElement`
6. **flex-wrap missing** — every row of buttons/pills needs `flex-wrap: wrap` or `flex-wrap`

---

## What V5 checks that ERIL agents miss

V5 independently reviews all ERIL output. It specifically looks for:
- Cross-file URL/field/column mismatches (ERIL agents writing in isolation can't see these)
- AGENT_HEX maps with off-token values copied from existing files
- Props added to a component but never wired at the call site
- Security issues in string rendering paths

Knowing V5 exists is not a reason to be less careful — it's a reason to be more careful, because V5's findings block the entire loop.

---

## V5 post-loop update duty

After V5 runs, it must:
1. Increment `hits` on every anti-pattern entry it caught
2. Update `last_caught` to the current loop number
3. Append any new patterns it found that aren't in the file
4. Update the Class Index counts at the bottom of EVALUATION_CRITERIA.md

---

## Memory Tiers — What ERIL Agents Should Know

MindsetOS uses three memory tiers. Understanding them helps ERIL agents write better implementations.

| Tier | Storage | When injected | What goes here |
|------|---------|---------------|----------------|
| **Working** | Context window | Always present | Current conversation, tool outputs, in-progress task state |
| **Durable** | `agent_memories` table (pgvector) | Session start, frozen snapshot | Facts, goals, decisions, pain points — things that reduce future steering |
| **Episodic** | `conversations` table (tsvector index) | On-demand via search tool | Past sessions — "what did this user say about X last month?" |

**Rules for ERIL agents writing memory-related code:**

1. **Never re-query the durable memory store mid-conversation** — the snapshot was injected at session start. Querying again produces inconsistency and breaks prefix caching.
2. **Extraction happens post-conversation, not mid-message** — the `extractMemories` function runs after the turn, not during.
3. **Importance scoring 0.0–1.0** — threshold for injection is 0.7. Anything below 0.7 should be archived, not deleted.
4. **Memory types in use**: `goals`, `pain_points`, `business_context`, `strategies`, `preferences`, `decisions`, `deliverable`, `agent_recommendation`
5. **The episodic layer (conversation search) is under construction** — do not assume it exists yet. If implementing it, the schema is: `ALTER TABLE conversations ADD COLUMN tsv_content tsvector GENERATED ALWAYS AS (to_tsvector('english', COALESCE(summary_text, ''))) STORED;`

**What the Hermes research taught us to add (priority order):**
1. Conversation search (episodic recall) — highest impact, medium effort
2. Frozen-snapshot caching per conversationId — low effort, real cost savings  
3. Periodic memory nudge every 5 turns — low effort, improves memory quality
4. Behavioral profile job (cross-session pattern inference) — medium effort, coaching differentiator
