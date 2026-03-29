import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join MindsetOS — Start Building Your Practice',
  description:
    'Join MindsetOS and get access to 10 AI mindset coaches. Build your daily practice, surface hidden beliefs, and make better decisions under pressure.',
  alternates: {
    canonical: 'https://mindset.show/join',
  },
  openGraph: {
    title: 'Join MindsetOS — Start Building Your Practice',
    description:
      'Join MindsetOS and get access to 10 AI mindset coaches. Build your daily practice and make better decisions under pressure.',
    url: 'https://mindset.show/join',
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
