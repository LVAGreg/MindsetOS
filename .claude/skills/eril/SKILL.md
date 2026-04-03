---
name: eril
description: ERIL v2 — implement a feature using the MindsetOS protocol (Evaluate, Research, Implement, Loop). Reads ERIL_PROTOCOL.md, scores against EVALUATION_CRITERIA.md, runs Playwright visual context, mandatory cross-file API verification, returns VERDICT.
argument-hint: "[feature description or file to improve]"
---

You are running ERIL v2 for MindsetOS. Follow every step exactly.

## Step 0 — Read the protocol and rubric first
Read `/data/workspace/ECOS/apps/mindset-os/ERIL_PROTOCOL.md` — follow it exactly.
Read `/data/workspace/ECOS/apps/mindset-os/EVALUATION_CRITERIA.md` — this is your scoring rubric.

## Your task
$ARGUMENTS

## Mandatory pre-flight (from ERIL_PROTOCOL.md Step 0)
Before writing any code:
1. Identify which anti-pattern classes apply (token-violation, cross-file-mismatch, silent-failure, etc.)
2. For every API endpoint you will call: grep `real-backend.cjs` to verify the registered path matches exactly
3. For every `res.data.field` you will read: verify `field` exists in the backend handler response
4. For every color value: verify it against the 9-token palette in EVALUATION_CRITERIA.md

## Visual context
Use Playwright to screenshot https://mindset-os-frontend-production.up.railway.app before implementing UI changes.

## Scoring
Score against EVALUATION_CRITERIA.md — all 10 criteria (or Functionality/Simplicity/Correctness for backend-only).
- Any `blocker:yes` anti-pattern hit → VERDICT: REVISE regardless of score
- Any ★ criterion < 8 → VERDICT: REVISE
- Any criterion < 7 → VERDICT: REVISE

## Near-miss log
Note any patterns you caught pre-emptively: `NEAR-MISS: [what] → [class]`

## End your response with
```
VERDICT: YES | REVISE
Score: X.X/10
Blockers: (list or "none")
Near-misses: (list or "none")
Files created/modified: (list)
```
