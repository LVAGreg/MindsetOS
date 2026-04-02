/**
 * analytics.ts — MindsetOS PostHog event helpers
 *
 * Rules:
 * - All functions are no-ops if PostHog is not loaded or key is missing
 * - Never throw — analytics must never break the app
 * - Server-safe: guard all calls with typeof window check
 * - Thin wrappers only: no business logic here
 */

import posthog from 'posthog-js';

/** Safe fire-and-forget wrapper around posthog.capture */
export function trackEvent(event: string, props?: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined') return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.capture(event, props);
  } catch {
    // Never crash the app for analytics
  }
}

/** Identify a user in PostHog */
export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>
): void {
  try {
    if (typeof window === 'undefined') return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.identify(userId, traits);
  } catch {
    // Never crash the app for analytics
  }
}

// ─── Funnel Events ──────────────────────────────────────────────────────────

/**
 * Lead entered the top of the funnel via a lead magnet
 * @param source  Which magnet: scorecard | audit | 7days | quiz
 */
export function trackLeadMagnet(
  source: 'scorecard' | 'audit' | '7days' | 'quiz'
): void {
  trackEvent('lead_magnet_submitted', { source });
}

/**
 * User completed trial/invite registration
 * @param source  Where they came from: 'register' | 'trial' | 'google'
 */
export function trackTrialStarted(source: string): void {
  trackEvent('trial_started', { source });
}

/**
 * User completed a paid checkout (fired on success page)
 * @param plan    Plan slug, e.g. 'weekly' | 'upfront' | 'architecture_997'
 * @param amount  Amount charged in USD (integer cents or dollars)
 */
export function trackCheckoutCompleted(plan: string, amount: number): void {
  trackEvent('checkout_completed', { plan, amount });
}

// ─── Engagement Events ───────────────────────────────────────────────────────

/**
 * User sent their first message to an agent (session start signal)
 * @param agentSlug  Agent identifier, e.g. 'mindset-score'
 */
export function trackAgentFirstMessage(agentSlug: string): void {
  trackEvent('agent_first_message', { agent_slug: agentSlug });
}

/**
 * User is still active with an agent in week 2 (retention signal)
 * Should be fired when a session is detected 7+ days after first message.
 * @param agentSlug  Agent identifier, e.g. 'mindset-score'
 */
export function trackAgentSessionWeek2(agentSlug: string): void {
  trackEvent('agent_session_week2', { agent_slug: agentSlug });
}
