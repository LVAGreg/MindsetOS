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
- 8–10: Spacing is deliberate, type scale is consistent, colors match `#09090f / #12121f / #1e1e30 / #9090a8 / #ededf5` design tokens, hover states exist on interactive elements

### Functionality — /10
Does every visual element serve a purpose?
- 1–4: Decorative components with no interaction, dead CTAs, broken states
- 5–7: Core flow works, edge cases rough
- 8–10: Empty states handled, loading states exist, error states degrade gracefully, all buttons do what the label says

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
- 8–10: Error paths handled, no silent failures, no data mutation surprises

---

## UX / User Flows

### ★ User Intent Alignment — /10
Does the flow match what a user actually wants to accomplish, not just what was technically implemented?
- 1–4: Multiple unnecessary steps, confusing redirects, unclear next action
- 5–7: Gets the user there but with friction
- 8–10: Shortest logical path, clear CTAs, user always knows where they are and what to do next

### Mobile Readiness — /10
Does it work on a phone? (MindsetOS users are often on mobile)
- 1–4: Layout breaks below 768px, tap targets too small
- 5–7: Usable but not polished
- 8–10: Responsive at all breakpoints, tap targets ≥44px, no horizontal scroll

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
