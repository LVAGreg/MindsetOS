import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Start Your Free Trial — MindsetOS',
  description:
    'Try MindsetOS free. Get your Mindset Score, build daily practices, map your beliefs, and start thinking clearer in 7 days. No credit card required.',
  alternates: {
    canonical: 'https://mindset.show/trial-v3b',
  },
  openGraph: {
    title: 'Start Your Free Trial — MindsetOS',
    description:
      'Try MindsetOS free. Get your Mindset Score, build daily practices, and start thinking clearer in 7 days.',
    url: 'https://mindset.show/trial-v3b',
  },
};

export default function TrialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
