# Ralph Loop Completion Criteria

Before outputting `<promise>COMPLETE</promise>`, verify ALL criteria for the relevant task type.
A single unchecked item means the loop must continue iterating.

---

## Dynamic Rubric Protocol (PRIMARY — runs before everything else)

Each loop generates its own living rubric from observation. The static checklists below are backstops only — the rubric drives completion.

### Phase 1 — Research & Rubric Generation

Before writing a single line of code:
1. Read every target file in full
2. Take Playwright screenshots (desktop + mobile)
3. Write a **Task Rubric** — 3–6 specific, observable success conditions based on what you actually found:

```
TASK RUBRIC: [page/feature name]
Generated from: [screenshot analysis + code read on iteration 1]

DONE WHEN:
[ ] [specific observable — e.g. "hero bg is visually #09090f, no gray bleed visible in screenshot"]
[ ] [specific observable — e.g. "form inputs show #1e1e30 border, no white/light border"]
[ ] [specific observable — e.g. "save button shows inline error text on failure, not just console.log"]
[ ] [specific observable — e.g. "mobile 390px: no horizontal scroll, CTA is full-width"]
[ ] [specific observable — e.g. "reviewer scores Craft ≥8 and Originality ≥8"]

DISCOVERED DURING ITERATION:
(add here as you uncover issues mid-fix)
```

### Phase 2 — Fix & Evolve

After each fix pass:
- Screenshot again → check each DONE WHEN item visually
- Check off resolved items
- Promote any DISCOVERED items that are still open into DONE WHEN
- Do NOT call the reviewer until all DONE WHEN items are checked

### Phase 3 — Complete

Only call `feature-dev:code-reviewer` when every DONE WHEN item is visually confirmed.
Only commit when reviewer returns YES.

The living rubric is the source of truth. The checklists below are global anti-pattern guards.

---

## Vision-First Iteration Protocol (ALL loops)

Every ralph loop that touches UI **must** include at least one visual feedback cycle:

### Step V1 — Screenshot Before
Use Playwright to capture the current state before any changes:
```
mcp__plugin_playwright__browser_navigate → URL
mcp__plugin_playwright__browser_take_screenshot → save as "before"
mcp__plugin_playwright__browser_resize → 390x844 (mobile)
mcp__plugin_playwright__browser_take_screenshot → save as "before-mobile"
```

### Step V2 — Visual Analysis
After capturing screenshots, evaluate against this visual rubric:
- [ ] Background is `#09090f` — not gray, white, or any other shade
- [ ] Cards/panels use `rgba(18,18,31,0.8)` dark glass — not solid white/gray
- [ ] All borders use `#1e1e30` — not gray-200, gray-700, or similar
- [ ] Primary text `#ededf5` — not gray-900 or white
- [ ] Secondary text `#9090a8` — not gray-500 or gray-400
- [ ] CTAs are `#4f6ef7` blue or `#fcc824` amber — not indigo, purple, or generic blue
- [ ] No light-mode artifacts visible (should look dark and intentional everywhere)
- [ ] Typography hierarchy is clear — headings vs body vs muted text are visually distinct
- [ ] Hover states visible on interactive elements (test by hovering in browser)
- [ ] Mobile layout: no horizontal overflow, tap targets adequate, no text truncation

### Step V3 — Screenshot After
After making changes, screenshot again and compare:
- Does it look better than before?
- Are there any new visual regressions?
- Does mobile still work?

### Step V4 — Vision Score (self-assess before calling reviewer)
Rate 1-10 based on screenshots:
- **Originality**: Does it look like a deliberate product or AI-generated boilerplate?
- **Polish**: Would a designer be proud of this?
- **Brand**: Unmistakably MindsetOS (dark, amber/blue accents, professional)?

Only call `feature-dev:code-reviewer` when your own visual score is ≥7 on all three. If below 7, iterate first.

---

## Feature-Specific Rubric Template

Each ralph loop defines its own rubric at the top of its task. The rubric must cover:

```
FEATURE RUBRIC: [Feature Name]
Target page(s): [list]
User goal: [what does the user accomplish here?]
Success looks like: [describe the ideal visual + functional state]

Visual checklist:
- [ ] [specific thing this page must look like]
- [ ] [specific thing this page must look like]

Functional checklist:
- [ ] [specific thing this page must do]
- [ ] [specific thing this page must do]

NOT acceptable:
- [list of specific anti-patterns for this feature]
```

---

## UI Feature / New Component

- [ ] **V1** Screenshot taken before changes (desktop + mobile)
- [ ] **V2** Visual analysis complete — all token violations identified from screenshot
- [ ] **V3** Screenshot taken after changes — visual improvement confirmed
- [ ] **V4** Self-assessed visual score ≥7 before calling reviewer
- [ ] All files compile with zero TypeScript errors in new/changed files
- [ ] No `any` casts introduced at integration sites (prop wiring verified against store types)
- [ ] Both mobile (pointer events) and desktop (mouse events) interactions work
- [ ] No inline arrow functions passed as props to components with `useEffect` deps — use `useCallback`
- [ ] Empty/loading states handled (no blank canvas on slow load)
- [ ] `feature-dev:code-reviewer` spawned and returned **YES** or **REVISE with minor fixes only**
- [ ] All EVALUATION_CRITERIA.md starred criteria scored ≥ 8
- [ ] Committed to git
- [ ] Build confirmed green

## Backend Feature / API Endpoint

- [ ] Migration applied to production via `/api/admin/execute`
- [ ] Endpoint tested with `curl` — happy path returns expected shape
- [ ] Error path tested — bad input returns 4xx, not 500
- [ ] No silent `catch` blocks — errors surface to caller
- [ ] `feature-dev:code-reviewer` spawned and returned **YES**
- [ ] Committed and deployed

## Design Sweep / Visual Polish

- [ ] **V1** Screenshot taken before — used to identify ALL remaining token violations
- [ ] **V2** Grep for `gray-`, `purple-`, `indigo-`, `violet-`, `bg-white`, `bg-black` in changed files — all addressed
- [ ] **V3** Screenshot taken after — no visible regressions, clear improvement
- [ ] All design tokens consistent across changed files (`#09090f`, `#12121f`, `#1e1e30`, `#9090a8`, `#ededf5`)
- [ ] No old colour tokens remaining in changed files
- [ ] Focus rings updated to `#4f6ef7`
- [ ] Hover states present on all interactive elements
- [ ] EVALUATION_CRITERIA.md Craft score ≥ 8
- [ ] EVALUATION_CRITERIA.md Originality score ≥ 8
- [ ] Committed and deployed

## Three.js / WebGL Component

- [ ] Scene disposed fully on unmount (renderer, per-mesh geometries, materials, RAF, observers, event listeners)
- [ ] No shared `BufferGeometry` across meshes — each mesh owns its instance
- [ ] `Math.random()` called outside component or in a stable `useRef` — not inside render or unstable `useEffect`
- [ ] Pointer events (`pointermove`, `pointerup`) added alongside mouse events
- [ ] `touchAction: "none"` on canvas element
- [ ] `useEffect` deps are stable (no inline functions, no inline objects)
- [ ] `dynamic(() => import(...), { ssr: false })` wrapper in place
- [ ] **V1** Screenshot at 420px viewport width (mobile) — confirmed interactive
- [ ] `feature-dev:code-reviewer` spawned and returned **YES**
- [ ] Committed and deployed

## Agent Prompt / Content Update

- [ ] Brand voice check: zero prohibited patterns (no "As an AI...", no symmetrical sentences, no rhetorical question overuse)
- [ ] Framework correctly applied (DESIGN, 6Ps, WHAT-WHAT-HOW, etc. — whichever is relevant)
- [ ] Security shutdown response present and correct
- [ ] Updated via `/api/admin/execute` with `run-migration`
- [ ] Verified with `run-sql` SELECT after update

---

## Self-Check Process (run before every `COMPLETE` output)

1. Read `.claude/ralph-loop.local.md` — what iteration is this?
2. List every file changed this session
3. Run through the relevant checklist above — mark each item explicitly
4. **Vision check**: were screenshots taken before AND after? Did they show improvement?
5. If `feature-dev:code-reviewer` has not been spawned yet — spawn it now, wait for result
6. If reviewer returned **NO** — fix all blockers before continuing
7. Only output `<promise>COMPLETE</promise>` when every checkbox is ticked

---

## Loop Iteration Budget

| Task complexity | Expected iterations |
|----------------|---------------------|
| Simple token fix / single file | 1-2 |
| New component, no review yet | 2-3 (screenshot → build → review → fix) |
| Complex feature, multiple files | 3-5 |
| Vision reveals major issues | Add 1-2 iterations for visual polish |
| If still not complete at iteration 10 | Surface blockers to user, stop loop |

---

## Parallel Loop Rules

- Each loop owns its files exclusively — no two loops touch the same file
- If a loop finds its target file was recently changed by another loop, it reads the latest state first
- Loops commit independently — no coordination needed
- Deployment: each loop runs `railway up --detach` after its commit
- Vision screenshots: use `http://localhost:3000` if dev server is running, or prod URL `https://mindset-os-frontend-production.up.railway.app`

---

## Production URLs for Vision Testing

```
Frontend: https://mindset-os-frontend-production.up.railway.app
Login:    https://mindset-os-frontend-production.up.railway.app/login
Dashboard: https://mindset-os-frontend-production.up.railway.app/dashboard
Quiz:     https://mindset-os-frontend-production.up.railway.app/quiz
Scorecard: https://mindset-os-frontend-production.up.railway.app/scorecard
```

Use these for pre-change screenshots (reflects current deployed state).
Use `npx next build && npx next start` locally for post-change screenshots, or review diffs carefully.
