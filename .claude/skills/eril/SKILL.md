---
name: eril
description: ERIL v2 — implement one or many features using the MindsetOS protocol. Pass a single feature or a numbered list. Automatically spawns parallel agents for multiple features, runs V5 review and delta-review when all complete.
argument-hint: "[feature] OR [feature1 / feature2 / feature3 ...]"
---

You are the ERIL v2 orchestrator for MindsetOS.

## Parse the input

$ARGUMENTS may be:
- A single feature description → run one ERIL agent
- Multiple features separated by `/` or newlines → run one agent per feature in parallel

**Examples:**
- `/eril add streak badge to sidebar` → 1 agent
- `/eril add streak badge / add export button / fix pin sort` → 3 agents in parallel
- `/eril [paste a list of 10 features]` → 10 agents in parallel

---

## For a SINGLE feature

Follow ERIL_PROTOCOL.md exactly as a single agent. Steps:

1. Read `/data/workspace/ECOS/apps/mindset-os/ERIL_PROTOCOL.md`
2. Read `/data/workspace/ECOS/apps/mindset-os/EVALUATION_CRITERIA.md`
3. Step 0: mandatory cross-file verification (API URLs vs real-backend.cjs, field names, color tokens)
4. Playwright screenshot of https://mindset-os-frontend-production.up.railway.app (UI work only)
5. Read files you will modify
6. Implement
7. Score against EVALUATION_CRITERIA.md rubric
8. Return VERDICT + near-misses

---

## For MULTIPLE features

### Phase 1 — Assign agents (do this first, before anything else)

Split $ARGUMENTS into individual feature descriptions. For each feature:

- Assign it to one of: A (UI/dashboard), C (new component file), B (backend route), I (enhance existing component)
- Determine which files it will touch
- Check for conflicts: two features touching the SAME file → serialize them, don't parallelize

### Phase 2 — Launch all non-conflicting agents in parallel

Use the Agent tool with run_in_background: true for every feature. Each agent prompt must include:

```
You are running ERIL v2 for MindsetOS. Follow these steps exactly:

STEP 0 — Read /data/workspace/ECOS/apps/mindset-os/ERIL_PROTOCOL.md
STEP 0 — Read /data/workspace/ECOS/apps/mindset-os/EVALUATION_CRITERIA.md
STEP 0 — Mandatory cross-file verification:
  - Every API URL: grep real-backend.cjs to confirm registration
  - Every res.data.field: confirm field exists in backend handler
  - Every color value: verify against 9-token palette

YOUR TASK: [feature description]

Files this agent may touch: [list — must not overlap with other running agents]

Score against EVALUATION_CRITERIA.md. End with:
VERDICT: YES | REVISE
Score: X.X/10
Blockers: ...
Near-misses: ...
Files created/modified: ...
```

### Phase 3 — Collect results

Wait for all agents. For each:
- VERDICT: YES → collect files changed, ready to commit
- VERDICT: REVISE → agent must fix and re-score before proceeding

### Phase 4 — Commit YES verdicts in batches

Group by frontend / backend. Commit with descriptive Loop message.

### Phase 5 — Run V5 review

Launch feature-dev:code-reviewer against all changed files:

> "Score using EVALUATION_CRITERIA.md. Assume bugs exist. Increment hits + update last_caught on every anti-pattern caught. Append new patterns. Return ship decision: YES / NO / REVISE."

Fix any REVISE findings. Commit fixes.

### Phase 6 — Run delta-review

`/delta-review HEAD~N` where N = number of commits made in this loop.

---

## Conflict resolution rules

| Situation | Resolution |
|-----------|-----------|
| Two features touch different files | Parallel — safe |
| Two features touch the same file | Serialize — run second after first commits |
| Feature needs a backend route + frontend component | Backend agent first, frontend agent reads the route file before implementing |
| New component + ChatWindow.tsx wiring | Component agent first, wiring agent (V4-style) runs after |

---

## Output while running

After launching agents, print a status board:

```
Launching N agents in parallel...

Agent 1 — [feature name] → [files] — RUNNING
Agent 2 — [feature name] → [files] — RUNNING
...

Will collect verdicts and run V5 + delta-review when all complete.
```

Update the board as agents complete.
