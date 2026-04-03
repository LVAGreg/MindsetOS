# Delta Reviewer — MindsetOS

A lightweight background agent that runs after every commit. Its job:
1. Read only the diff
2. Find patterns not caught by ERIL self-scoring
3. Update EVALUATION_CRITERIA.md with new entries or incremented hits
4. Report near-misses so they become criteria before they become bugs

---

## How to invoke

```
Agent tool, subagent_type: "feature-dev:code-reviewer"

Prompt: "Run the Delta Review protocol from DELTA_REVIEWER.md on this diff: [paste git diff]"
```

Or from the main agent, after any commit:

```
Agent tool, run_in_background: true
Prompt: "Delta review Loop N. Read DELTA_REVIEWER.md for instructions. 
Diff: [git diff HEAD~1]"
```

---

## Delta Review Protocol

### Step 1 — Read the diff only
Do not read the full files. The diff is your scope.

### Step 2 — Run the high-confidence checklist (30 seconds, not negotiable)

For every changed line, check:

| Check | What to look for |
|-------|-----------------|
| Off-token colors | Any hex not in the 9-token palette |
| API URL | Any `/api/...` string — does it match real-backend.cjs? |
| Response field reads | Any `res.data.X` — does X exist in the backend handler? |
| Silent catch | Any `catch` without `setError` or equivalent |
| Missing aria-label | Any `<button>` or icon-only element without aria-label |
| AGENT_HEX values | Any color map — are all values on-token? |

### Step 3 — Near-miss detection

A near-miss is a pattern that COULD have been a bug but wasn't in this diff. Examples:
- A component adds a new prop but only one call site exists (the new one) — future sites will forget
- A color value is `#fcc823` (one digit off from `#fcc824`) — visually identical, technically wrong
- A backend route is registered but the method check is wrong (POST vs PUT)

Near-misses get logged as: `NEAR-MISS: [description] → [suggested anti-pattern title]`

### Step 4 — Update EVALUATION_CRITERIA.md

For each confirmed bug or near-miss:

**If covered by an existing anti-pattern:**
- Increment `hits` by 1
- Update `last_caught` to current loop

**If NOT covered:**
- Append a new entry in the appropriate section
- Use format:
  ```
  <!-- hits:1 | last_caught:Loop-N | class:CLASS | severity:SEVERITY | blocker:yes/no -->
  ### [Pattern Name]
  [Description of the pattern, what it causes, how to fix it, what it caps.]
  ```
- Update the Class Index count

### Step 5 — Promote patterns to high-confidence

If any pattern now has `hits >= 5` and is not already in the "High-confidence" section of ERIL_PROTOCOL.md, add it there.

### Step 6 — Report

```
DELTA REVIEW — Loop N
New bugs found in diff: N
Near-misses: N  
Criteria updated: [list of pattern names with new hit counts]
New patterns added: [list]
Promotions to high-confidence: [list]
```

---

## What delta review does NOT do

- Does not re-run the full implementation (ERIL already did that)
- Does not score the code (V5 already did that)
- Does not read files outside the diff (that's V5's job)
- Does not block ship (ship decision was made by V5)

Its only job: keep the criteria document accurate and current.

---

## Criteria decay rule

If a pattern has `hits:1` and `last_caught` is more than 10 loops ago, it may be stale. Delta reviewer adds a `<!-- stale? -->` comment next to the metadata. After 20 loops of no hits, the pattern moves to an "Archived" section at the bottom of the file rather than being deleted — it may return.
