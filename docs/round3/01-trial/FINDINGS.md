# Round 3 -- Trial-v3b & Register/Trial UI Test Findings

**Date**: 2026-03-29
**URLs Tested**:
- `https://mindset-os-frontend-production.up.railway.app/trial-v3b`
- `https://mindset-os-frontend-production.up.railway.app/register/trial`
**Viewports**: Desktop (1440x900), Tablet (768x1024), Mobile (375x812)

---

## Performance Summary

| Page | Load Time | DOM Nodes | Console Errors | Network Failures |
|------|-----------|-----------|----------------|------------------|
| /trial-v3b | 2103ms | 433 | 0 | 0 |
| /register/trial | 719ms | 107 | 0 | 0 |

---

## Issues Found

### ISSUE 1 -- CRITICAL: 3D Robot Has "EXPERT" Branding on Chest

**Page**: /trial-v3b
**Screenshot**: `trial-v3b-desktop-robot.png`
**File**: `apps/mindset-os/app/trial-v3b/page.tsx` line 24

The Spline 3D robot model (`eMGivaKFmAnLq1NK`) displays "EXPERT" on its chest. This is the ECOS (Expert Consulting OS) robot being reused without modification. On a MindsetOS white-label site, this is a branding leak that undermines the product identity.

**Fix**: Either:
1. Create a new Spline scene with "MINDSET" or no text on the robot's chest, and update `SPLINE_ROBOT_URL` on line 24.
2. If the Spline model cannot be easily edited, replace the robot with a different 3D element or remove the Spline and use a static hero image/illustration instead.

**Severity**: CRITICAL -- visible on all viewports, directly contradicts white-label requirement.

---

### ISSUE 2 -- HIGH: Mobile Hero Text Overlap with Robot

**Page**: /trial-v3b (mobile 375x812)
**Screenshot**: `trial-v3b-mobile-hero.png`
**File**: `apps/mindset-os/app/trial-v3b/page.tsx` lines 269-272

On mobile, the Spline robot renders as a full-screen background behind the hero text (via `MobileSplineBackground`). The robot's body overlaps with the heading text "Your AI-powered mindset coaching engine," making the "RT" from "EXPERT" on the robot visible through the text. The dark overlay gradient (`from-[#07080f]/10 via-transparent to-[#07080f]/40`) is too transparent to provide adequate text separation.

**Fix**: Increase the dark overlay opacity on mobile to improve text readability. Change line 272 from:
```
from-[#07080f]/10 via-transparent to-[#07080f]/40
```
to:
```
from-[#07080f]/60 via-[#07080f]/40 to-[#07080f]/70
```
Or reduce the mobile robot opacity from `0.75` to `0.3` on line 270.

**Severity**: HIGH -- text readability is compromised on the primary mobile viewport.

---

### ISSUE 3 -- HIGH: Massive Empty Space Below Hero on Desktop

**Page**: /trial-v3b (desktop 1440x900, full-page)
**Screenshot**: `trial-v3b-desktop-fullpage.png`
**File**: `apps/mindset-os/app/trial-v3b/page.tsx` line 244

The hero section uses `min-h-[100vh] lg:min-h-[105vh]`, which pushes the stats and pipeline sections far below the fold. The full page screenshot shows enormous dark empty space between the hero and the stats bar, followed by more dark space before the pipeline section. The content-heavy pipeline, "How it Works," and "Why MindsetOS" sections are all hidden and require extensive scrolling. On the full-page screenshot, the page appears mostly empty.

This is caused by the scroll-reveal animations (`useScrollReveal` with `opacity: 0` default). In a static screenshot, sections remain invisible until the user scrolls to trigger the IntersectionObserver.

**Fix**: This is partially a screenshot artifact (animations trigger on scroll), but `lg:min-h-[105vh]` for the hero is excessive. Change line 244:
```
min-h-[100vh] lg:min-h-[105vh]
```
to:
```
min-h-[90vh] lg:min-h-[95vh]
```
This ensures the stats section is at least partially visible above the fold, encouraging scrolling.

**Severity**: HIGH -- users may not realize there is content below the hero section.

---

### ISSUE 4 -- MEDIUM: "Why MindsetOS" Section Targets "Coaches" Instead of "Entrepreneurs"

**Page**: /trial-v3b
**File**: `apps/mindset-os/app/trial-v3b/page.tsx` line 425

The heading reads: "Built for mindset coaches who are done guessing"

Per the MindsetOS CLAUDE.md, the target audience is "Entrepreneurs and business operators, ages 30-45" -- not mindset coaches. Additionally, the "Community" bullet (line 432) says "Join coaches already scaling with systematic, repeatable processes."

**Fix**: Change line 425 from:
```
Built for mindset coaches who are{' '}<span className="text-[#fcc824]">done guessing</span>
```
to:
```
Built for entrepreneurs who are{' '}<span className="text-[#fcc824]">done guessing</span>
```

Change line 432 from:
```
{ icon: Users, title: 'Community', text: 'Join coaches already scaling with systematic, repeatable processes.' },
```
to:
```
{ icon: Users, title: 'Community', text: 'Join entrepreneurs already designing their mindset with systematic, repeatable processes.' },
```

**Severity**: MEDIUM -- mismatch between landing page messaging and target audience.

---

### ISSUE 5 -- LOW: No Duplicate Logo Issue (PASS)

**Page**: /trial-v3b, /register/trial
**Screenshot**: `trial-v3b-desktop-hero.png`, `register-trial-desktop.png`

The MindsetOSLogo component renders a brain icon + "mindsetOS" text as a single unit. There is no separate h1 title duplicating the logo. This check passes.

---

### ISSUE 6 -- LOW: Footer "Coaching Practice" Link Naming

**Page**: /trial-v3b
**File**: `apps/mindset-os/app/trial-v3b/page.tsx` line 521

The footer link "Coaching Practice" points to `/agency`. The terminology "Coaching Practice" is reasonable for MindsetOS but should be verified that the `/agency` page itself uses MindsetOS branding and not ECOS branding.

**Fix**: Verify `/agency` page branding separately. No change needed on this page unless the target page has issues.

**Severity**: LOW -- informational.

---

## What Passed

| Check | Status | Notes |
|-------|--------|-------|
| Branding says "MindsetOS" in text | PASS | Header, footer, CTA all say MindsetOS |
| No "ECOS" or "Expert Consulting" text | PASS | No text references found in source |
| No "Client Fast Start" references | PASS | Not present |
| No "Expert Project" references | PASS | Not present |
| No "Rana" references | PASS | Footer credits "Greg" correctly |
| MindsetOSLogo renders correctly | PASS | Brain icon + "mindsetOS" text, no duplication |
| CTA buttons link to /register/trial | PASS | All 4 CTA buttons correctly linked |
| Register/trial form structure | PASS | Name, email, password, confirm password fields |
| Form validation (password match) | PASS | Client-side validation present in source |
| Form validation (min 8 chars) | PASS | Client-side validation present in source |
| Copyright year | PASS | "2026 MindsetOS. All rights reserved." |
| Footer links present | PASS | Coaching Practice, Join, Terms, Privacy, Contact |
| No console errors | PASS | 0 errors on both pages |
| No network failures | PASS | 0 failures on both pages |
| Content is mindset/coaching focused | PASS | 10 AI coaches, mindset terminology throughout |
| 3D robot/Spline renders | PASS | Loads and renders on desktop and mobile |
| Desktop layout | PASS | Clean two-column hero, stats bar, pipeline sections |
| Tablet layout | PASS | Responsive, content readable |
| Register/trial page responsive | PASS | Clean at all viewports |
| Dark mode support on register | PASS | Dark mode classes present |

---

## Screenshots Index

| File | Description | Viewport |
|------|-------------|----------|
| `trial-v3b-desktop-hero.png` | Hero section with robot | 1440x900 |
| `trial-v3b-desktop-fullpage.png` | Full page scroll | 1440x900 |
| `trial-v3b-desktop-robot.png` | Robot close-up showing "EXPERT" text | 1440x2000 |
| `trial-v3b-mobile-hero.png` | Mobile hero with text overlap | 375x812 |
| `trial-v3b-mobile-fullpage.png` | Mobile full page | 375x812 |
| `trial-v3b-tablet-fullpage.png` | Tablet full page | 768x1024 |
| `register-trial-desktop.png` | Registration form | 1440x900 |
| `register-trial-mobile.png` | Registration form mobile | 375x812 |
| `register-trial-tablet.png` | Registration form tablet | 768x1024 |

---

## Priority Summary

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | Robot "EXPERT" branding on chest | CRITICAL | High (needs new Spline model) |
| 2 | Mobile hero text/robot overlap | HIGH | Low (CSS opacity tweak) |
| 3 | Excessive hero height pushing content below fold | HIGH | Low (CSS min-height tweak) |
| 4 | "Coaches" vs "Entrepreneurs" audience mismatch | MEDIUM | Low (text change) |
