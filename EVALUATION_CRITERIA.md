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

## Project-Specific Anti-Patterns (updated 2026-04-02, extended 2026-04-02 Three.js review, extended 2026-04-02 token sweep)

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

### Divergent navigation paths for the same UI element
When a component offers two interaction surfaces for the same action (e.g., clicking a canvas lobe shape vs. clicking the same lobe in a legend), both must resolve to the same destination via the same canonical lookup. Using different strategies (e.g., `primarySlug` on canvas path vs. `AGENT_NODES.find()` on legend path) produces silent routing divergence — the user reaches a different agent with no visual indication. All call sites must use one canonical lookup. Scores Correctness ≤6 and Functionality ≤7.

### Concurrent WebGL state mutation from React effect and rAF loop
When a `useEffect` and a `requestAnimationFrame` loop both write to the same Three.js material properties (`emissiveIntensity`, `opacity`, etc.), the last writer per-frame wins silently. Active-state highlights applied by the effect are overwritten by the animation loop's hover-restore path. Assign ownership of WebGL material state to one writer — store active state as a field on the scene refs object (`sceneRef.current.activeLobeIdx`) so the animation loop applies all material writes in one place. Flag for Correctness.

### Ghost agent slugs in interactive scene data
When a Three.js scene assigns `userData.slug` values to interactive objects, every slug must resolve to a real navigable agent at runtime. Slugs that exist in scene data but not in the backend agent list produce silent no-ops on click — the user gets no feedback and no navigation. The canonical slug list for MindsetOS is the 10 agents defined in CLAUDE.md. Validate slugs against this list at definition time. Scores Functionality ≤6 and User Intent ≤6.

### Same-price plan collision in checkout
When two or more checkout plans share the same displayed price (e.g., two products at $1,997), the billing model difference (one-time vs. recurring subscription) must be communicated at the plan-card heading level, not only in small muted sub-text. A user in a buying moment will misread the secondary label. Acceptable fix: a prominent billing-type badge ("ONE-TIME PAYMENT" / "ANNUAL SUBSCRIPTION") adjacent to the price amount, or a visual separator between recurring and one-time plan groups. Scores User Intent ≤6 if the distinction relies solely on muted `/year` vs `one-time` sub-labels at text-white/40 weight.

### Frontend validPlans out of sync with backend PLANS
The `validPlans` array and `priceMap` in the checkout page must only contain keys that exist in the backend `PLANS` object. Orphaned plan keys that pass frontend validation but are rejected by the backend surface a raw "Unknown plan: [key]" error string directly in the user-facing error div. Cross-check `validPlans` against the backend catalogue on every checkout change. Scores Functionality ≤6 and Correctness ≤6 if orphaned keys exist.

### Cross-product metadata leak into Stripe
MindsetOS is a white-label product. Any Stripe API call (customer creation, session metadata, webhook logging) that embeds ECOS-specific identifiers (e.g., `source: 'ecos_checkout'`) violates the CLAUDE.md cross-contamination rule. These strings appear in Stripe dashboards, customer exports, and support tickets visible to users. Audit all `metadata` objects in `checkout.cjs` after every backend change.

### Pointer/click double-fire on mobile tap in Three.js canvas
When a canvas registers both `pointerup` and `click` event handlers for the same action (e.g., `onAgentSelect`), a single finger tap on touch devices fires both events — triggering the action twice. This causes double-navigation and potentially double-API calls. Fix: use `pointer` events exclusively for tap/click on canvas elements — remove `click` and rely on `pointerup` alone, or add a guard flag (`let pointerUpHandled = false`) that the `click` handler checks and resets. Scores Mobile Readiness ≤7 and Correctness ≤7 if both handlers fire the same action without deduplication.

### Label/tooltip clipping at narrow viewports in Three.js overlays
Absolute-positioned labels computed from `getBoundingClientRect()` projections will clip at container edges on narrow viewports (≤420px) when `overflow: hidden` is set on the parent. The label x/y must be clamped to `[margin, containerWidth - margin]` and `[margin, containerHeight - margin]` before setting React state. Scores Mobile Readiness ≤7 if labels are visibly cut off at 420px viewport width.

### Uninitialised RAF ID in Three.js cleanup
`let rafId: number` declared without an initial value means `cancelAnimationFrame(undefined)` is called if the component unmounts before the first animation frame executes (e.g., during fast remount in React Strict Mode). Initialise as `let rafId = 0` — `cancelAnimationFrame(0)` is a no-op and avoids the undefined call. Flag for Correctness.

### Payload-type mismatch after field removal
When a backend response object drops a field (e.g., removing `id` from a handoff agent payload), every downstream consumer must be audited: (1) inline TypeScript type annotations, (2) `key` props on mapped list elements, (3) any logic that reads the removed field. Leaving a TypeScript type that still declares the removed field as `string` suppresses the type error and allows `undefined` to propagate silently at runtime — causing `key={undefined}` on React list items and defeating reconciliation. Fix order: update the type → grep all usages of the removed field name in the consumer → replace with the canonical field still present. Scores Correctness ≤6 if removed-field references remain in the consumer after the contract change.

### Inline hover handler fragility (borderLeft sub-property)
When applying `borderLeft` shorthand as an inline style on initial render (which sets top/right/bottom/left borders simultaneously), restoring `borderColor` in `onMouseLeave` overwrites the left-border accent. The correct restore sequence is: set `borderColor` back to default, then immediately override `borderLeftColor` with the accent. The explicit sub-property wins over the shorthand because it fires last. Reviewers should verify multi-border restore handlers explicitly set `borderLeftColor` after any `borderColor` reset. Recommended fix: use a CSS class + CSS custom property for the accent border rather than inline hover handlers. Scores Simplicity ≤7 if repeated across two or more elements.

### Modified-section grey token leak
When a PR touches a JSX block (adds/removes elements, modifies styles), all `text-gray-*` and `dark:*-gray-*` classes in that same JSX block must be migrated to MindsetOS design tokens. Leaving `text-gray-500` in a label that sits inside a modified section counts as a partial migration and caps Craft at 7. Reviewers should grep the surrounding JSX element from opening tag to closing tag for grey tokens, not just the diff lines.

### Tailwind `violet-*` vs design-token purple in changed files
MindsetOS's purple token is `#7c5bf6`. Tailwind's `violet-500` is `#8b5cf6` — a different value. When a token sweep PR touches a file that contains `violet-*` classes, those classes must be migrated to inline `style={{ color: '#7c5bf6' }}` (or the appropriate opacity variant) to be on-token. Leaving `violet-*` in a changed file caps Craft at 7 even if all `gray-*`/`indigo-*` classes are removed. Reviewers should add `violet-` to the grep pattern for every token sweep.

### onMouseEnter/onMouseLeave hover handlers require `as HTMLElement` cast
When applying inline hover state to a button/anchor via `onMouseEnter`, the event's `currentTarget` must be cast to `HTMLElement` before accessing `.style`. Omitting the cast produces a TypeScript error that gets hidden at runtime but fails in strict mode builds. Pattern: `(e.currentTarget as HTMLElement).style.background = ...`. All new inline hover handlers introduced in a PR must include the cast or the PR scores Correctness ≤8 for the changed file.

### Analytics semantic mismatch (funnel attribution corruption)
When calling a named tracking helper (e.g., `trackLeadMagnet`, `trackTrialStarted`), the call site must match the actual user action, not the nearest available event type. `trackLeadMagnet('scorecard')` must only fire when a user submits a scorecard form — not on a trial registration page that may be reached from any entry point. Using the wrong event corrupts funnel attribution in PostHog and makes it impossible to distinguish sources. Always match the helper name to the actual action at the call site. Scores Correctness ≤6 and User Intent ≤7 if the event name does not match the action.

### useEffect with object dependency where primitive would suffice
When a `useEffect` depends on an object returned by a hook (e.g., `useSearchParams()`, `useRouter()`), and the effect only reads a single value from that object, depend on the extracted primitive value, not the object. `[searchParams]` will re-fire whenever the reference changes, even if the value is the same. Use `const planParam = searchParams.get('plan')` outside the effect and depend on `[planParam]`. Applies to any object-type hook return value where the effect only reads a single property. Scores Correctness ≤8 if the latent double-fire is not addressed.

### Analytics wrapper — exported low-level `trackEvent` invites bypass
When a `lib/analytics.ts` module defines typed named helpers (`trackLeadMagnet`, `trackTrialStarted`, etc.), exporting the underlying `trackEvent` primitive as public API invites callers to bypass the typed surface and fire ad-hoc event strings. Prefer keeping `trackEvent` unexported (or marking it `/** @internal */`) unless callers genuinely need one-off events. Any new ad-hoc `trackEvent('...')` call introduced by a PR should be reviewed: if the event belongs to the funnel, add a named helper instead.

### Partial null-check sweep in symmetric store actions
When a null-check guard is added to one store action that reads `data.someField` from a JSON response (e.g., `createCustomAgent` checking `data?.customAgent`), every symmetric sibling action that performs the same pattern must receive the same guard in the same PR (e.g., `updateCustomAgent` also reading `data.customAgent`). A sweep that fixes `create` but not `update` leaves the same class of bug alive and scores Correctness ≤7. Reviewers should grep for all occurrences of the guarded field name in the store file and verify each read site has been hardened.

### Error log messages must reflect the abstracted implementation
When a helper function (e.g., `getToken()`) is introduced to wrap `localStorage` access, error log messages in callers that still say `"No token found in localStorage"` are inaccurate — the caller no longer accesses localStorage directly. Update error messages to reference the abstraction level (e.g., `"No auth token available — user needs to log in again"`). Inaccurate log messages slow down debugging. Does not score below 7 in isolation, but counts against Simplicity when the mismatch is in a heavily-logged code path.

### Inconsistent letterColor paradigm across a data array
When a constant array (e.g., `CLAPS_FIELDS`) assigns a styling field (`letterColor`, `barColor`) per row, all rows must use the same styling paradigm. A partial migration — where some rows use Tailwind dark: classes (`bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400`) and others use hex bracket notation (`bg-[#7c5bf6]/10 text-[#7c5bf6]`) — creates an inconsistent array that is harder to maintain and signals incomplete work. Reviewers should grep the entire array when any row is migrated and ensure all rows are updated to the same pattern. Caps Craft at 7.

### Residual indigo-* classes after an indigo → hex migration
When a PR migrates `bg-indigo-400` or `border-indigo-500` to hex values, every other `indigo-*` reference in the same file must also be migrated: icon classes (`text-indigo-500`), button backgrounds (`bg-indigo-600 hover:bg-indigo-700`), focus rings (`focus:ring-indigo-500`), and inline badges (`text-indigo-500`). A sweep that fixes only the bar chart colors while leaving the Save button, icons, focus rings, and "current" badges on `indigo-*` is incomplete. Grep the full file for `indigo-` after every targeted migration. Caps Craft at 6 if more than two residual indigo-* usages remain in the changed file.

### Off-token yellow/amber hex values (#eab308, #f59e0b) in data arrays
When a token sweep targets `#f59e0b`, reviewers must also check for `#eab308` (Tailwind yellow-500) in the same file — it is a different non-token yellow that is visually similar but distinct from `#fcc824`. Both values must be migrated to `#fcc824`. A sweep that clears `#f59e0b` but leaves `#eab308` is incomplete. Include `eab308` in the grep pattern for every amber/yellow token sweep. Caps Craft at 7 per the "Incomplete colour-token migration" rule; combined with other violations, caps at 6.

### Ambient glow divs are in scope for violet-* → #7c5bf6 migration
Decorative background orbs (blurred, pointer-events-none radial gradient divs) that use `bg-violet-500/[...]` are still subject to the design-token rule. Even though they are purely decorative and visually subtle, they emit the wrong hue at the ambient level. When a token sweep PR touches any file, all `violet-*` classes — including on ambient glow blobs — must be migrated to `bg-[#7c5bf6]/[...]`. Grep for `violet-` across the whole file, not just interactive elements. Caps Craft at 7 per the Tailwind `violet-*` anti-pattern; combined with other violations, caps at 6.

### text-white/* opacity variants in changed files — follow-on debt
When a PR changes any line in a file that still contains `text-white/10`, `text-white/50`, `text-white/70`, `border-white/10`, `hover:border-white/20` etc., those opacity-alpha white variants are off-token for MindsetOS. The correct tokens are: primary text `#ededf5`, secondary `#9090a8`, dim `#5a5a72`, borders `#1e1e30`. Because `text-white/X` is not a named design-system alias and `white` at partial opacity produces different perceived values than the calibrated palette, these should be migrated. If pre-existing (not introduced by the PR diff), they do not block ship but must be logged as follow-on debt. If introduced by the PR, caps Craft at 7. Reviewers: grep `white/` in any changed file and confirm the diff did not introduce new instances.

### dark: conditional classes conflict with inline token styles
When a file adopts the MindsetOS pattern of setting color via `style={{ color: '#ededf5' }}` (inline tokens), any residual `dark:text-gray-*` or `dark:bg-gray-*` Tailwind conditional classes in the same file create a conflict: the dark-mode class can overwrite the inline style depending on specificity and render order. A file should use one styling paradigm per element — either inline token styles OR Tailwind with `dark:` variants, not both. A PR that converts some elements to inline tokens while leaving `dark:` variants on sibling elements produces visual inconsistency. Caps Craft at 7. Fix: migrate remaining `dark:` variant classes to inline token styles in the same pass.

### Silent initial-load failure on data-fetch pages
When a page component calls a data-fetch function (e.g., `fetchContacts`, `fetchAgents`, `loadMessages`) on mount via `useEffect`, the `catch` block of that fetch function must either: (1) set a visible page-level error state (e.g., `setPageError`), or (2) set a flag that renders an error banner or empty-state message with a retry affordance. A `catch` block that only calls `console.error` while leaving the page in an empty/loading visual state is a silent failure — the user sees blank content with no explanation. This is distinct from silent save failures: it affects users who never even get to interact with the page. Scores Functionality ≤6 and Correctness ≤6. Fix: pass the caught error message into the existing page-level error state, or introduce one.

### hover-only delete affordance on touch devices
When a delete (or destructive) action on a list card is only shown via `opacity-0 group-hover:opacity-100`, that action is invisible on touch devices where hover never fires. For MindsetOS pipeline cards and similar list items, the delete button must also be accessible on mobile — either always-visible at low opacity, revealed on long-press, or available inside the detail drawer. A touch-only path that requires opening the full drawer to delete is acceptable. A path with no delete affordance at all on mobile scores Mobile Readiness ≤6. Note: if a full-detail drawer exposes a delete action, dock only one point (score ≤7) since the action is reachable via a second interaction.

### `fetchContacts`/`fetchData` pattern: use named variables to avoid stale-closure bugs
When a data-fetch callback is created with `useCallback` and depends on state or props, ensure the dependency array is complete. A `useCallback` with an empty `[]` dependency array that references values captured at mount time will use stale values after those values change. Common example: `fetchContacts` that reads from `authHeaders()` (which reads `localStorage` at call time) is safe since it re-reads on every call. But callbacks that close over state variables (e.g., a filter value) and are listed in `useEffect` deps must include those state variables in `useCallback`'s deps. Reviewers should check every `useCallback` with `[]` for closed-over mutable values. Scores Correctness ≤7 if stale closure is present.

### Duplicated detail/pane rendering across breakpoints
When a responsive detail pane is added as a mobile-only copy of a desktop pane (e.g., a `lg:hidden` card that mirrors a `hidden lg:block` card), the rendering logic must either be extracted into a shared sub-component or the two blocks must be kept intentionally minimal and divergent-safe. A raw JSX duplication — where the priority badge ternary, action-button loop, and message display are written twice in the same file — creates a maintenance liability: any future change to the detail structure must be applied twice. Reviewers: when a mobile breakpoint pane is added, check whether the desktop pane's key sections (badge logic, data display, action buttons) are duplicated. If so, flag for extraction. Caps Simplicity at 7 if three or more display blocks are duplicated verbatim.

### Redundant keyboard handler on native button elements
`<button>` elements already fire a synthetic `click` event when the user presses Enter or Space — this is the browser's built-in behavior. Adding an `onKeyDown` handler that checks `e.key === 'Enter' || e.key === ' '` and then calls the same function as `onClick` is dead code: it will fire the handler twice per keystroke (once via `onKeyDown`, once via the native `click` that follows). For action-only buttons (not `role="button"` on a div), `onKeyDown` for Enter/Space should be omitted. Only add `onKeyDown` when: (1) the element is a non-button interactive element (`div`, `li`, `span` with `role="button"`), or (2) Space needs to be explicitly prevented from scrolling (`e.preventDefault()`). A PR that adds the pattern to a `<button>` element without prevention benefit caps Correctness at 8 and Simplicity at 7.

### Mobile scroll-into-view missing on conditionally revealed detail pane
When selecting an item from a list causes a detail pane to appear below the list (not in a modal or fixed overlay), the implementation must scroll the detail pane into view on selection. Without it, users who select an item near the top of a long list will not see the detail appear — it renders below the fold with no visual cue. Required pattern: `const detailRef = useRef<HTMLDivElement>(null)` on the detail pane, with `useEffect(() => { if (selectedItem) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [selectedItem])`. Caps Mobile Readiness at 7 if absent on a below-the-list detail reveal pattern.

### Mobile detail pane lacks orientation label
When a mobile breakpoint reveals a detail card below a list in response to a tap, the card must include a clear contextual label (e.g., a small "Selected" badge, "Notification Details" heading, or visible close button with label) so users understand what they're looking at. A detail card that appears without any heading or label is visually ambiguous — on a first visit, users may not realize it is connected to the tapped list item. Acceptable implementations: (1) a small `text-xs` label above the card reading the item title or "Details"; (2) a close button with explicit label; (3) a heading inside the card at a visually distinct level. Caps Quality of Design at 7 if the mobile pane has no orientation label.
