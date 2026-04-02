# Ralph Loop Completion Criteria

Before outputting `<promise>COMPLETE</promise>`, verify ALL criteria for the relevant task type.
A single unchecked item means the loop must continue iterating.

---

## UI Feature / New Component

- [ ] All files compile with zero TypeScript errors in new/changed files
- [ ] No `any` casts introduced at integration sites (prop wiring verified against store types)
- [ ] Both mobile (pointer events) and desktop (mouse events) interactions work
- [ ] No inline arrow functions passed as props to components with `useEffect` deps — use `useCallback`
- [ ] Empty/loading states handled (no blank canvas on slow load)
- [ ] `feature-dev:code-reviewer` spawned and returned **YES** or **REVISE with minor fixes only**
- [ ] All EVALUATION_CRITERIA.md starred criteria scored ≥ 8
- [ ] Committed to git and deployed via `railway up --detach`
- [ ] Build confirmed green (check Railway deploy logs or URL responds correctly)

## Backend Feature / API Endpoint

- [ ] Migration applied to production via `/api/admin/execute`
- [ ] Endpoint tested with `curl` — happy path returns expected shape
- [ ] Error path tested — bad input returns 4xx, not 500
- [ ] No silent `catch` blocks — errors surface to caller
- [ ] `feature-dev:code-reviewer` spawned and returned **YES**
- [ ] Committed and deployed

## Design Sweep / Visual Polish

- [ ] All design tokens consistent across changed files (`#09090f`, `#12121f`, `#1e1e30`, `#9090a8`, `#ededf5`)
- [ ] No old colour tokens remaining in changed files (grep for `gray-`, `purple-`, `indigo-`)
- [ ] Focus rings updated to match new accent colour
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
- [ ] Tested at 420px viewport width (mobile)
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
4. If `feature-dev:code-reviewer` has not been spawned yet — spawn it now, wait for result
5. If reviewer returned **NO** — fix all blockers before continuing
6. Only output `<promise>COMPLETE</promise>` when every checkbox is ticked

---

## Loop Iteration Budget

| Task complexity | Expected iterations |
|----------------|---------------------|
| Simple fix / single file | 1 |
| New component, no review yet | 2 (build → review → fix) |
| Complex feature, multiple files | 3-4 |
| If still not complete at iteration 10 | Surface blockers to user, stop loop |
