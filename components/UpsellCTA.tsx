'use client';

import { X, ArrowRight } from 'lucide-react';

interface UpsellCTAProps {
  trigger: 'weekly_to_architecture' | 'trial_to_paid' | 'low_score_to_reset' | 'agency_near_limit';
  onDismiss?: () => void;
}

interface CTAContent {
  heading: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  color: 'purple' | 'indigo' | 'orange' | 'green';
}

const CTA_MAP: Record<UpsellCTAProps['trigger'], CTAContent> = {
  weekly_to_architecture: {
    heading: 'Ready for the full architecture?',
    title: '90-Day Mindset Architecture',
    description: "You've been showing up for 4+ weeks. It's time to go deeper.",
    cta: 'Join the Cohort — $997',
    href: '/checkout?plan=architecture_997',
    color: 'purple',
  },
  trial_to_paid: {
    heading: 'Unlock the full Reset',
    title: 'The 48-Hour Mindset Reset',
    description: "You've had 3 conversations. The full Reset program takes you all the way through.",
    cta: 'Get the Reset — $47',
    href: '/checkout?plan=individual',
    color: 'indigo',
  },
  low_score_to_reset: {
    heading: 'Your score shows room to grow',
    title: 'Start With the 48-Hour Reset',
    description: 'A quick score under 60 usually means the fundamentals need attention first.',
    cta: 'Begin the Reset — $47',
    href: '/checkout?plan=individual',
    color: 'orange',
  },
  agency_near_limit: {
    heading: 'Your practice is growing fast',
    title: 'Upgrade to Practice 10',
    description: "You're near your client limit. Practice 10 supports up to 10 active clients.",
    cta: 'Upgrade Your Practice',
    href: '/checkout?plan=agency',
    color: 'green',
  },
};

const COLOR_STYLES = {
  purple: {
    border: 'border-purple-500',
    heading: 'text-purple-600 dark:text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600',
  },
  indigo: {
    border: 'border-indigo-500',
    heading: 'text-indigo-600 dark:text-indigo-400',
    button: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600',
  },
  orange: {
    border: 'border-orange-500',
    heading: 'text-orange-600 dark:text-orange-400',
    button: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600',
  },
  green: {
    border: 'border-green-500',
    heading: 'text-green-600 dark:text-green-400',
    button: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
  },
};

export default function UpsellCTA({ trigger, onDismiss }: UpsellCTAProps) {
  const content = CTA_MAP[trigger];
  const colors = COLOR_STYLES[content.color];

  return (
    <div
      className={`relative flex gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 border-l-4 ${colors.border} shadow-sm`}
    >
      <div className="flex-1 min-w-0">
        <p
          className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${colors.heading}`}
        >
          {content.heading}
        </p>

        <p className="text-[15px] font-bold text-gray-900 dark:text-gray-50 leading-snug mb-1">
          {content.title}
        </p>

        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-snug mb-3">
          {content.description}
        </p>

        <a
          href={content.href}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold text-white transition-colors ${colors.button} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800`}
        >
          {content.cta}
          <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
        </a>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 self-start rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
