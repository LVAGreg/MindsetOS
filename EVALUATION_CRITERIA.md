# MindsetOS Evaluation Criteria

Used by the evaluator agent (or code-reviewer subagent) to score implementations before marking them complete. Score each criterion 1–10. Target: ≥7 on all, ≥8 on starred.

---

## UI / Frontend (per screen or component)

### ★ Originality — /10
Does this look like a deliberate design or a generic AI output?
- 1–4: Default purple/white gradient, stock card layout, could be any SaaS
- 5–7: Has some personality but borrows common patterns
- 8–10: Distinctive — dark glass, amber accents, typography choices feel intentional, unmistakably MindsetOS

### ★ Quality of Design — /10
Does the screen feel like a coherent product or assembled components?
- 1–4: Sections feel unrelated, inconsistent spacing, mismatched visual weight
- 5–7: Mostly coherent but some jarring elements
- 8–10: Every element serves the layout, visual hierarchy is clear, nothing feels bolted on

### Craft — /10
Typography, spacing, color, micro-details.
- 1–4: Inconsistent font sizes, arbitrary padding, raw Tailwind defaults
- 5–7: Mostly consistent but corners cut
- 8–10: Spacing is deliberate, type scale is consistent, colors match `#09090f / #12121f / #1e1e30 / #9090a8 / #ededf5` design tokens, hover states exist on interactive elements. When a PR replaces a colour token (e.g., migrating to `#fcc824` amber or `#4f6ef7` blue), ALL instances in changed files must be updated — including focus-ring classes, icon colour classes, and border-colour classes. A partial migration caps Craft at 7.

### Functionality — /10
Does every visual element serve a purpose?
- 1–4: Decorative components with no interaction, dead CTAs, broken states
- 5–7: Core flow works, edge cases rough
- 8–10: Empty states handled, loading states exist, user receives visible error feedback on every async failure (save, fetch, upload). Silent `catch` blocks that swallow errors without any UI indication score a maximum of 6. Feature-gate API calls on mount (e.g. checking whether a user's tier allows access to `architecture-coach` or `launch-companion` to decide whether to show an upgrade banner) must fail-open — a bare `.catch(() => {})` that silently suppresses the banner also scores a maximum of 6.

---

## Agent / Chat Experience

### ★ Conversation Feel — /10
Does the agent interaction feel like talking to a smart coach or a chatbot?
- 1–4: Robotic phrasing, long walls of text, no personality
- 5–7: Competent but forgettable
- 8–10: Matches Greg's voice (direct, warm, no-BS), messages scannable, response feels earned

### Context Persistence — /10
Does the agent remember what matters across the conversation?
- 1–4: Repeats questions already answered, ignores prior context
- 5–7: Remembers basics, misses nuance
- 8–10: Picks up threads naturally, references earlier user inputs, memory surfaced at the right moment

---

## Code Architecture

### Simplicity — /10
Is the implementation as simple as it needs to be, no more?
- 1–4: Abstractions invented for single use, unnecessary indirection
- 5–7: Reasonable but some speculative complexity
- 8–10: Reads like the obvious solution, could be understood by anyone in 5 minutes

### Correctness — /10
Does it actually work, including edge cases?
- 1–4: Breaks on obvious inputs, missing null checks at system boundaries
- 5–7: Happy path works, some edge cases untested
- 8–10: Error paths handled, no silent failures, no data mutation surprises. Async state transitions that depend on timing (nested `setTimeout` re-trigger tricks, double-setState cycling) score a maximum of 7 without explicit justification. Agent slugs passed to routing functions must use one canonical format consistently across all call sites (e.g., always `'mindset-score'`, never mix with display names or ad-hoc variants). Props wired at the integration site must be verified against the actual type of the source variable — passing `obj?.id` when `obj` is already a string (not an object) is a wiring bug that silently disables the prop's feature. Shared WebGL resources (geometries, materials) disposed in cleanup while still referenced by live meshes score a maximum of 6.

---

## UX / User Flows

### ★ User Intent Alignment — /10
Does the flow match what a user actually wants to accomplish, not just what was technically implemented?
- 1–4: Multiple unnecessary steps, confusing redirects, unclear next action
- 5–7: Gets the user there but with friction
- 8–10: Shortest logical path, clear CTAs, user always knows where they are and what to do next

### Mobile Readiness — /10
Does it work on a phone? (MindsetOS users are often on mobile)
- 1–4: Layout breaks below 768px, tap targets too small; or canvas/WebGL components have zero touch event handlers (entire feature non-interactive on mobile) — score ≤4
- 5–7: Usable but not polished
- 8–10: Responsive at all breakpoints, tap targets ≥44px, no horizontal scroll; canvas/Three.js components handle `touchstart`/`touchend` or `pointerdown`/`pointerup` equivalently to mouse events

---

## Scoring Summary Template

```
Feature: [name]
Date: [date]

UI
  Originality:        /10
  Quality of Design:  /10
  Craft:              /10
  Functionality:      /10

Agent Experience
  Conversation Feel:  /10
  Context Persistence:/10

Code
  Simplicity:         /10
  Correctness:        /10

UX
  User Intent:        /10
  Mobile Readiness:   /10

TOTAL: /100
Blockers (anything <7):
Ship? YES / NO / REVISE
```

---

## Design Token Reference (for Craft scoring)

| Token | Value | Use |
|-------|-------|-----|
| Background deep | `#09090f` | Page backgrounds |
| Background card | `rgba(18,18,31,0.8)` | Cards, panels |
| Border default | `#1e1e30` | All borders |
| Text primary | `#ededf5` | Headings, labels |
| Text secondary | `#9090a8` | Body, descriptions |
| Text muted | `#5a5a72` | Timestamps, counts |
| Accent blue | `#4f6ef7` | Primary actions |
| Accent amber | `#fcc824` | Free/score/CTAs |
| Accent purple | `#7c5bf6` | Premium/intensity |

---

## Project-Specific Anti-Patterns (updated 2026-04-02)

### Silent async failure
Any `catch` block in a user-initiated save/submit action that does not set an error state or show a toast scores Functionality ≤6 and Correctness ≤6. The user must always know whether their data was saved.

### `setTimeout`-based state re-trigger
Using nested `setTimeout` calls to force an effect re-run (e.g., null → value cycling to trigger a `useEffect`) creates race conditions on slow connections or unmount. Flag for Correctness. Acceptable alternatives: a dedicated `refetchTrigger` counter, or a named async function called directly.

### Agent slug format inconsistency
Routing functions (e.g., `handleSelectAgent`, chat navigation) must be called with one canonical slug format throughout the codebase. Mixing slug formats — e.g., using `'mindset-score'` in one place and a display-name variant or uppercase key in another — is a correctness risk. The canonical format is the database slug (`'mindset-score'`, `'reset-guide'`, `'architecture-coach'`, `'inner-world-mapper'`, `'practice-builder'`, `'decision-framework'`, `'accountability-partner'`, `'story-excavator'`, `'conversation-curator'`, `'launch-companion'`). Use this format at every call site.

### Duplicated inline form blocks
When the same form structure appears twice in one component, extract it to a named sub-component before shipping. Diverging Tailwind class strings are a long-term craft debt.

### Fixed z-index stacking
When introducing a new `fixed`-position overlay, document its z-index and verify it against all other fixed elements in the layout (floating panels, modals, chat windows, notification bell). A z-index comment or constant prevents future regressions.

### `Math.random()` in render
Using `Math.random()` inside JSX or a component render path produces a different value on every re-render, causing visual instability (flickering, layout jumps) and defeating React reconciliation. Stable pseudo-random placeholder sequences must be defined as constants outside the component. Flag for Correctness and Craft.

### Incomplete colour-token migration
When a PR replaces a colour token (e.g., generic purple/indigo → MindsetOS amber `#fcc824` or blue `#4f6ef7`), every usage in changed files must be updated: CTA backgrounds, focus rings (`focus:ring-*`), icon colour classes, and border-colour classes. Leaving focus rings or icon accents in the old colour means the visual pass is half-done. Reviewers should grep all changed files for the old token names before accepting. Scores Craft ≤7 if the pass is partial.

### Silent feature-gate API check
A `.catch(() => {})` on an API call whose result determines whether a UI warning or feature is shown (e.g., checking tier/access to conditionally render an upgrade prompt for `architecture-coach` or `launch-companion`) counts as a silent failure. If the check call fails, the feature gate silently defaults to "no problem", hiding important user-facing information. The catch must either show an error state or fail-open (show the warning). Scores Functionality ≤6 and Correctness ≤6.

### `Math.random()` inside a `useEffect` with unstable dependencies
`Math.random()` inside a `useEffect` whose dependency array contains an unstable value (e.g., an inline arrow function re-created on every parent render) causes the entire Three.js scene to rebuild on every parent render. The effect's deps must be stable (memoized via `useCallback`, or refs) and any random initialization must live outside the component or be seeded once into a `useRef`. Flag for Correctness.

### Prop wiring type mismatch at integration site
When a parent passes a prop from a store value, verify the type of the store value against what the prop expects. A common pattern: `activeSlug={currentAgent?.id}` when `currentAgent` is `string | null` (not an object) means `.id` is always `undefined`, silently killing the receiving component's active-state logic. Always check the store type definition before accessing nested properties. Flag for Correctness at the integration file, not just the component.

### Shared WebGL geometry disposed while meshes live
When multiple Three.js `Mesh` objects share a `BufferGeometry` instance, calling `geometry.dispose()` in cleanup invalidates it while all meshes still reference it. Each mesh should own its geometry instance, or dispose per-mesh geometries individually in cleanup. Flag for Correctness.
