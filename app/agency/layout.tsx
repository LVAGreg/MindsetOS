import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Coaching Practice Plan — MindsetOS',
  description:
    'Run your entire coaching practice on MindsetOS. Manage multiple clients, activate specialized AI agents, and deliver transformational mindset work at scale.',
  alternates: {
    canonical: 'https://mindset.show/agency',
  },
  openGraph: {
    title: 'Coaching Practice Plan — MindsetOS',
    description:
      'Run your entire coaching practice on MindsetOS. Manage multiple clients and deliver transformational mindset work at scale.',
    url: 'https://mindset.show/agency',
  },
};

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
