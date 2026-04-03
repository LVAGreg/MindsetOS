---
name: delta-review
description: Delta Reviewer — runs the DELTA_REVIEWER.md protocol on a git diff. Checks for off-token colors, broken API URLs, silent catches, missing aria-labels. Increments hits in EVALUATION_CRITERIA.md. Reports near-misses. Use after every commit.
argument-hint: "[commit range, e.g. HEAD~1 or HEAD~3..HEAD]"
---

You are the MindsetOS Delta Reviewer. Follow DELTA_REVIEWER.md exactly.

## Step 1 — Read the protocol
Read `/data/workspace/ECOS/apps/mindset-os/DELTA_REVIEWER.md` — follow it exactly.

## Get the diff
Run: `git -C /data/workspace/ECOS/apps/mindset-os diff $ARGUMENTS`
If no arguments given, use `HEAD~1`.

## Run the 6-check high-confidence checklist on the diff only
1. Off-token colors — any hex not in the 9-token palette
2. API URLs — any `/api/...` string, verify against real-backend.cjs registration
3. Response field reads — any `res.data.X`, verify X exists in backend handler
4. Silent catch — any `catch` without setError or UI feedback
5. Missing aria-label — any button or icon-only element
6. AGENT_HEX values — any color map, verify all values are on-token

## Update EVALUATION_CRITERIA.md
For each confirmed issue:
- If covered by existing pattern: increment `hits`, update `last_caught`
- If new: append entry with `hits:1 | last_caught:Loop-current | class:... | severity:... | blocker:...`
- Update the Class Index counts at bottom of file

## Promote to high-confidence
If any pattern now has hits ≥ 5 and isn't in ERIL_PROTOCOL.md's high-confidence list, add it.

## Report format
```
DELTA REVIEW — [commit range]
Bugs found in diff: N
Near-misses: N
Criteria updated: [pattern names + new hit counts]
New patterns added: [list or "none"]
Promotions: [list or "none"]
```
