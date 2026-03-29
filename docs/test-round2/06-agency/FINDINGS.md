# MindsetOS /agency Page - Test Round 2 Findings

**URL**: https://mindset-os-frontend-production.up.railway.app/agency
**Date**: 2026-03-29
**Viewports Tested**: Mobile (375x812), Tablet (768x1024), Desktop (1440x900)
**Source File**: `apps/mindset-os/app/agency/page.tsx`

---

## Screenshots

| Viewport | File |
|----------|------|
| Desktop (1440x900) | `agency-desktop-fullpage.png` |
| Tablet (768x1024) | `agency-tablet-fullpage.png` |
| Mobile (375x812) | `agency-mobile-fullpage.png` |

---

## Checklist Results

### 1. Heading: "Your Practice. Your Clients. Your Methodology."

**PARTIAL MATCH** -- The heading actually reads:

> Your Practice. **Your Agents.** Your Methodology.

The middle phrase is "Your Agents" (in amber/gold #fcc824), not "Your Clients" as expected. This is intentional based on the source code (line 120-122 of `page.tsx`):

```tsx
Your Practice.{' '}
<span style={{ color: '#fcc824' }}>Your Agents.</span>{' '}
Your Methodology.
```

**Verdict**: The heading renders correctly and is visible at all viewports. The amber-highlighted "Your Agents" text is legible and well-contrasted. If the intended heading was "Your Clients" instead of "Your Agents", this is a content issue to discuss with the product owner.

---

### 2. Pricing -- Is it $397?

**YES, but there are TWO pricing tiers:**

| Plan | Price | Clients |
|------|-------|---------|
| Practice 5 | $297/mo | 5 coaching clients |
| Practice 10 | $397/mo | 10 coaching clients |

- The hero CTA says: "Start Coaching Practice -- from $297/mo"
- Below the hero: "5 clients from $297/mo . 10 clients from $397/mo"
- The pricing section shows both cards side-by-side with a "BEST VALUE" badge on Practice 10 ($397)
- Default selection is Practice 5 ($297)
- The CTA button dynamically updates: "Get Practice 5 -- $297/mo" or "Get Practice 10 -- $397/mo"

**Verdict**: PASS. Pricing is clear, correctly displayed, and both tiers are accurately represented at all viewports.

---

### 3. Logo -- Correct? No duplicates?

**PASS.** Two logo instances, both correct and expected:

1. **Nav header** (line 87): `<MindsetOSLogo size="md" />` with Brain icon + "mindset**OS**" text + " / Coaching Practice" suffix
2. **Footer** (line 439): `<MindsetOSLogo size="xs" />` with "Coaching Practice -- powered by MindsetOS"

The logo renders as a Brain icon (amber-500) with "mindset" in dark text and "OS" in amber. No duplicate logos within any single section. No ECOS logo appears anywhere.

---

### 4. Any ECOS/Expert/"consultant" language?

**CLEAN -- No ECOS leakage detected.**

Grep search for `consultant|ECOS|Expert Project|expertproject|expertconsulting|Rana|backend-production-f747` across all three agency pages (`page.tsx`, `checkout/page.tsx`, `checkout/success/page.tsx`) returned zero matches.

Language is consistently MindsetOS-branded:
- "MindsetOS" (logo, footer, FAQ)
- "Coaching Practice" (nav label, section headers, CTA buttons)
- "mindset.show" (support email: hello@mindset.show)
- "Greg" (mentioned in FAQ: "DM Greg on LinkedIn")
- "Client Fast Start" (MindsetOS base tier, used in FAQ and footer)

The checkout page API fallback URL correctly points to `mindset-os-backend-production.up.railway.app` (not the ECOS backend).

**Verdict**: PASS. Zero ECOS/Expert/consultant language anywhere in the agency funnel.

---

### 5. Features and FAQ -- mindset coaching content?

**PASS.** All content is specific to mindset coaching practices:

**Features section** ("Everything You Need to Run a Coaching Practice"):
- Multi-Client Management
- Per-Client AI Memory
- Custom Coaching Agent Creator
- Client-Scoped Playbooks
- Granular Memory Controls
- All 10+ MindsetOS AI Agents

**"Built for Coaches Who Serve Multiple Clients"** section:
- 5 bullet points about coaching multiple clients, mindset profiles, frameworks, exercises
- 4-step "How the Coaching Practice Works" walkthrough (create profile, switch client, run assessments, repeat)

**Comparison Table** ("Standard vs Coaching Practice"):
- 9-row feature comparison covering agents, client profiles, AI memory, custom agents, playbook scoping, etc.
- Column headers: "Standard" vs "Coaching Practice" (indigo highlight)

**FAQ** (6 questions):
- Sub-accounts, custom agents, token allowance, Client Fast Start inclusion, upgrade path, enterprise plans
- All answers are coaching-specific and MindsetOS-branded
- Enterprise contact: "DM Greg on LinkedIn or email hello@mindset.show"

**Verdict**: PASS. All content is mindset-coaching-appropriate with no generic/ECOS content.

---

### 6. CTA buttons -- do they link to correct checkout?

**PASS.** All CTA buttons link to `/agency/checkout`:

| Location | Button Text | href |
|----------|-------------|------|
| Nav (top-right) | "Get Coaching Practice" | `/agency/checkout` |
| Hero | "Start Coaching Practice -- from $297/mo" | `/agency/checkout` |
| Pricing section | "Get Practice 5 -- $297/mo" or "Get Practice 10 -- $397/mo" | `/agency/checkout?plan=practice5` or `?plan=practice10` |
| Footer CTA (dark section) | "Get Coaching Practice -- from $297/mo" | `/agency/checkout` |

The checkout page (`/agency/checkout`) is confirmed to exist and includes:
- Plan selector (radio buttons for Practice 5 / Practice 10)
- Contact form (first name, last name, email, phone)
- Coupon code field
- Stripe payment redirect via `/api/checkout/create-session`
- Correct MindsetOS backend URL

The `?plan=` query param from the pricing section is read by the checkout page to pre-select the correct plan.

**Verdict**: PASS. All CTAs route correctly. The checkout page picks up the plan param.

---

## Additional Observations

### Layout & Responsiveness

**Desktop (1440x900)**: Clean layout, all sections visible, pricing cards side-by-side, comparison table renders properly. Full page captures entire content from hero to footer.

**Tablet (768x1024)**: Good adaptation. Features grid goes to 2 columns. Pricing cards still side-by-side. "Built for Coaches" section stacks vertically. All text readable.

**Mobile (375x812)**: Full single-column layout. Hero text wraps cleanly. Features stack vertically. Pricing cards stack. Comparison table scrollable. FAQ items stack well. All CTAs are full-width and tappable.

### Minor Issues Found

**Issue 1: Checkout page has redundant "client" in plan description**
**Page**: `/agency/checkout` line 235, 266
**File**: `apps/mindset-os/app/agency/checkout/page.tsx`
**Detail**: The checkout radio labels say "5 client coaching clients" and "10 client coaching clients" -- the word "client" appears twice.
**Fix**: Change `5 client coaching clients` to `5 coaching clients` and `10 client coaching clients` to `10 coaching clients`.

**Issue 2: "Client Fast Start" reference may confuse new users**
**Page**: `/agency` FAQ and footer
**Detail**: The FAQ says "Do I still get everything from Client Fast Start?" -- a user landing directly on the agency page may not know what "Client Fast Start" is. The footer also links to `/join` labeled "Client Fast Start".
**Severity**: Low. This is a product naming convention, not a bug.

### No Critical or High-Impact Issues Found

The page is well-built, properly branded, responsive, and free of ECOS leakage. All pricing, CTAs, features, and FAQ content are appropriate for the MindsetOS coaching practice tier.

---

## Summary

| Check | Result |
|-------|--------|
| Heading visible | PASS -- "Your Practice. Your Agents. Your Methodology." (note: "Agents" not "Clients") |
| Pricing $397 | PASS -- $297 (5 clients) and $397 (10 clients) both shown correctly |
| Logo correct, no duplicates | PASS -- Brain icon + mindsetOS in nav and footer only |
| No ECOS/Expert/consultant language | PASS -- Zero matches across all agency pages |
| Features & FAQ mindset coaching content | PASS -- All content coaching-specific |
| CTA buttons link to checkout | PASS -- All CTAs route to /agency/checkout with correct plan params |
| Redundant "client" text in checkout | MINOR BUG -- "5 client coaching clients" should be "5 coaching clients" |
