import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "What's Your Thinking Style Under Pressure? | MindsetOS",
  description:
    '7 questions. Real patterns. Find out if you\'re an Analyst, Sprinter, Protector, or Performer — and what it\'s costing your business.',
  openGraph: {
    title: "What's Your Thinking Style Under Pressure?",
    description:
      '7 questions. Real patterns. Discover the thinking pattern quietly running your business.',
    type: 'website',
  },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
