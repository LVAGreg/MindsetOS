# MindsetOS Legal Pages -- UI Testing Findings

**Date**: 2026-03-29
**Pages tested**:
- https://mindset-os-frontend-production.up.railway.app/terms
- https://mindset-os-frontend-production.up.railway.app/privacy

**Viewports**: Desktop (1440x900), Tablet (768x1024), Mobile (375x812)
**Dark mode**: Tested -- not active (intentionally disabled in layout.tsx)

---

## Summary

Both legal pages are well-built, correctly branded for MindsetOS, and render cleanly across all viewports. One legal content inconsistency was found regarding governing law jurisdiction. No ECOS, Expert Consulting, expertproject, or Rana references exist anywhere.

**Verdict**: PASS with 1 content issue to address

---

## Branding Audit -- PASS

All references verified correct:

| Check | Expected | Found | Status |
|-------|----------|-------|--------|
| Product name | MindsetOS | MindsetOS | PASS |
| Company entity | MindsetOS Pty. Ltd. | MindsetOS Pty. Ltd. | PASS |
| Contact email | hello@mindset.show | hello@mindset.show | PASS |
| Website URL | mindset.show | mindset.show | PASS |
| Copyright year | 2026 | 2026 | PASS |
| No ECOS references | None | None | PASS |
| No Expert Consulting | None | None | PASS |
| No expertproject | None | None | PASS |
| No Rana references | None | None | PASS |

---

## Issues Found

### Issue 1: Governing Law Jurisdiction Inconsistency (MEDIUM)

**Page**: /terms -- **Screenshot**: `terms-mobile-footer.png`
**File**: `apps/mindset-os/app/terms/page.tsx` lines 40 and 324

The Terms page references "prevailing law of the United States" in two places:
- Line 40: "...in accordance with and subject to, prevailing law of the United States."
- Line 324: "These Terms shall be governed and construed in accordance with the laws of the United States..."

However, the Privacy page correctly identifies:
- Company as "MindsetOS Pty. Ltd." (Australian entity)
- Country as "Queensland, Australia"
- Physical address as "Level 3 / 33 Longland Street, Newstead QLD 4006 Brisbane"

**Fix**: Update both references in `app/terms/page.tsx` to reference Australian law:
- Line 40: Change "prevailing law of the United States" to "prevailing law of Queensland, Australia"
- Line 324: Change "laws of the United States" to "laws of Queensland, Australia"

---

### Issue 2: Dark Mode Not Functional (LOW / BY DESIGN)

**Screenshot**: `terms-darkmode-desktop.png` vs `terms-desktop.png` (identical)
**File**: `apps/mindset-os/app/layout.tsx` line 30

The layout.tsx contains a theme initializer that explicitly removes the `dark` class:
```js
document.documentElement.classList.remove('dark');
```

Since Tailwind is configured with `darkMode: 'class'`, all `dark:` CSS classes in the legal pages are dead code. The pages have comprehensive dark mode styling ready (`dark:from-gray-900`, `dark:bg-gray-800/80`, `dark:text-gray-100`, etc.) but it never activates.

**Status**: Not a bug -- this is an intentional design decision. MindsetOS is light-mode only. The dark classes will work automatically if dark mode is ever enabled.

---

## What Passed

### Legal Content Completeness -- PASS
Both pages contain comprehensive, professional legal content:

**Terms page sections**:
- Introduction with proper definitions
- AI-Powered Services (output limitations, third-party models, IP, prohibited uses, liability, indemnification)
- Cookies
- License
- User Content & Comments
- Data Usage & Privacy
- Coaching & Support Access (coach portal access terms)
- Payment & Billing
- Service Availability
- Prohibited Uses
- Hyperlinking
- Content Liability
- Reservation of Rights
- Disclaimer
- Governing Law
- Contact Us
- Parent Company footer

**Privacy page sections**:
- Introduction
- Interpretation and Definitions (with company details)
- Collecting and Using Personal Data (personal data, AI interaction data, usage data)
- Tracking Technologies and Cookies
- Use of Personal Data
- Sharing of Personal Data
- Retention of Personal Data
- Transfer of Personal Data
- Security of Personal Data
- Children's Privacy
- GDPR Privacy (EU rights)
- CCPA Privacy (California residents)
- Links to Other Websites
- Changes to Privacy Policy
- Contact Us (email, website, physical address)
- Parent Company footer

### Navigation Links -- PASS
- Terms footer: Home, Privacy Policy, Register, Login
- Privacy footer: Home, Terms & Conditions, Register, Login
- Cross-linking between Terms and Privacy works correctly
- "Back to Home" link on both pages works
- External links point to mindset.show domain
- mailto link for hello@mindset.show is correct

### Responsive Layout -- PASS
- **Desktop (1440px)**: Clean centered card with amber/gold border, proper spacing
- **Tablet (768px)**: Content reflows properly, full padding maintained
- **Mobile (375px)**: Text wraps cleanly, lists remain readable, footer links wrap to two lines (acceptable)
- No horizontal overflow at any viewport
- No text truncation or cutoff issues

### Visual Design -- PASS
- Amber/gold (#fcc824) border on main card container
- Amber/gold links (Back to Home, external URLs, footer nav)
- Clean white card on warm gradient background (amber-50 to orange-50 to red-50)
- Typography hierarchy: h1 (4xl bold), h2 (2xl bold), h3 (xl bold), h4 (lg semibold)
- Proper use of prose class for readable paragraph text
- Bullet lists with disc markers and left padding
- Section separators using border-t dividers

### Footer Branding -- PASS
- "MindsetOS -- Mindset Operating System is operated by MindsetOS Pty. Ltd."
- "Copyright 2026 MindsetOS | All rights reserved."
- Both pages show identical operator/copyright lines

---

## Screenshots Index

| File | Description |
|------|-------------|
| `terms-desktop.png` | Terms full page at 1440x900 |
| `terms-desktop-viewport.png` | Terms above-the-fold at 1440x900 |
| `terms-tablet.png` | Terms full page at 768x1024 |
| `terms-mobile.png` | Terms full page at 375x812 |
| `terms-mobile-footer.png` | Terms footer close-up on mobile |
| `terms-darkmode-desktop.png` | Terms with dark mode preference (not active) |
| `terms-darkmode-mobile.png` | Terms mobile with dark mode preference (not active) |
| `privacy-desktop.png` | Privacy full page at 1440x900 |
| `privacy-tablet.png` | Privacy full page at 768x1024 |
| `privacy-mobile.png` | Privacy full page at 375x812 |
| `privacy-mobile-footer.png` | Privacy footer close-up on mobile |
| `privacy-darkmode-desktop.png` | Privacy with dark mode preference (not active) |
| `privacy-darkmode-mobile.png` | Privacy mobile with dark mode preference (not active) |
