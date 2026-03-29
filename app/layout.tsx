import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Script from 'next/script';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MindsetOS — Stop Reacting, Start Designing',
  description: 'AI-powered mindset coaching platform for entrepreneurs. Build your personal operating system for how you think under pressure, make decisions, and design your life.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <Script id="theme-initializer" strategy="beforeInteractive">
          {`
            (function() {
              try {
                document.documentElement.classList.remove('dark');
              } catch (e) {}
            })();
          `}
        </Script>
      </head>
      <body className={`${plusJakarta.className} ${plusJakarta.variable}`}>{children}</body>
    </html>
  );
}
