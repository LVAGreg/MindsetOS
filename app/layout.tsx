import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

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
      <body className={inter.className}>{children}</body>
    </html>
  );
}
