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
  color: 'purple' | 'blue' | 'amber' | 'green';
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
    color: 'blue',
  },
  low_score_to_reset: {
    heading: 'Your score shows room to grow',
    title: 'Start With the 48-Hour Reset',
    description: 'A quick score under 60 usually means the fundamentals need attention first.',
    cta: 'Begin the Reset — $47',
    href: '/checkout?plan=individual',
    color: 'amber',
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

// Design-system color tokens
const COLOR_STYLES: Record<
  CTAContent['color'],
  { accentBorder: string; headingColor: string; buttonBg: string; buttonHoverBg: string }
> = {
  purple: {
    accentBorder: '#7c5bf6',
    headingColor: '#7c5bf6',
    buttonBg: '#7c5bf6',
    buttonHoverBg: '#6b4de0',
  },
  blue: {
    accentBorder: '#4f6ef7',
    headingColor: '#4f6ef7',
    buttonBg: '#4f6ef7',
    buttonHoverBg: '#3d5ce0',
  },
  amber: {
    accentBorder: '#fcc824',
    headingColor: '#fcc824',
    buttonBg: '#fcc824',
    buttonHoverBg: '#e0b020',
  },
  green: {
    accentBorder: '#34d399',
    headingColor: '#34d399',
    buttonBg: '#34d399',
    buttonHoverBg: '#22c082',
  },
};

export default function UpsellCTA({ trigger, onDismiss }: UpsellCTAProps) {
  const content = CTA_MAP[trigger];
  const colors = COLOR_STYLES[content.color];

  // amber buttons need dark text for contrast
  const buttonTextColor = content.color === 'amber' ? '#09090f' : '#ffffff';

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        gap: '12px',
        borderRadius: '8px',
        border: `1px solid #1e1e30`,
        borderLeft: `4px solid ${colors.accentBorder}`,
        background: 'rgba(18,18,31,0.8)',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '4px',
            color: colors.headingColor,
          }}
        >
          {content.heading}
        </p>

        <p
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#ededf5',
            lineHeight: '1.3',
            marginBottom: '4px',
          }}
        >
          {content.title}
        </p>

        <p
          style={{
            fontSize: '13px',
            color: '#9090a8',
            lineHeight: '1.4',
            marginBottom: '12px',
          }}
        >
          {content.description}
        </p>

        <a
          href={content.href}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 600,
            color: buttonTextColor,
            background: colors.buttonBg,
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = colors.buttonHoverBg;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = colors.buttonBg;
          }}
        >
          {content.cta}
          <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
        </a>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            flexShrink: 0,
            alignSelf: 'flex-start',
            borderRadius: '4px',
            padding: '2px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#5a5a72',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#ededf5';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#5a5a72';
          }}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
