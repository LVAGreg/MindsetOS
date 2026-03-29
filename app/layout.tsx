import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Script from 'next/script';

// Heading + body: Plus Jakarta Sans — modern, confident, clean
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

// Heading variant — same font, heavier weights for strong hierarchy
const plusJakartaHeading = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['700', '800'],
});

// Monospace — for code blocks, data display
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

const BASE_URL = 'https://mindset.show';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#09090f',
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'MindsetOS — Mindset Coaching for Entrepreneurs',
    template: '%s | MindsetOS',
  },
  description:
    'AI-powered mindset coaching for entrepreneurs. Build daily practices, map your beliefs, sharpen decisions, and lead with presence. Your inner world runs your outer world.',
  keywords: [
    'mindset coaching',
    'entrepreneur mindset',
    'AI coaching platform',
    'mindset practice',
    'business clarity',
    'decision making',
    'Greg mindset',
    'inner world',
    'performance coaching',
    'leadership mindset',
  ],
  authors: [{ name: 'Greg', url: BASE_URL }],
  creator: 'Greg — MindsetOS',
  publisher: 'MindsetOS',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'MindsetOS',
    title: 'MindsetOS — Mindset Coaching for Entrepreneurs',
    description:
      'AI-powered mindset coaching for entrepreneurs. Build daily practices, map your beliefs, sharpen decisions, and lead with presence. Your inner world runs your outer world.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MindsetOS — Mindset Coaching for Entrepreneurs',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MindsetOS — Mindset Coaching for Entrepreneurs',
    description:
      'AI-powered mindset coaching for entrepreneurs. Build daily practices, map your beliefs, sharpen decisions, and lead with presence.',
    images: ['/og-image.png'],
    creator: '@mindsetshow',
    site: '@mindsetshow',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: BASE_URL,
  },
  other: {
    'msapplication-TileColor': '#09090f',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MindsetOS',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  url: BASE_URL,
  description:
    'AI-powered mindset coaching platform for entrepreneurs. Build daily practices, map your beliefs, sharpen decisions, and lead with presence.',
  offers: [
    {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free Mindset Score assessment',
    },
    {
      '@type': 'Offer',
      price: '47',
      priceCurrency: 'USD',
      description: '48-Hour Mindset Reset',
    },
    {
      '@type': 'Offer',
      price: '997',
      priceCurrency: 'USD',
      description: '90-Day Mindset Architecture — Group Cohort',
    },
  ],
  author: {
    '@type': 'Person',
    name: 'Greg',
    url: 'https://www.linkedin.com/in/gregmindset/',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '200',
  },
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
                // MindsetOS is always dark-mode — add class immediately to
                // prevent any flash of light-mode content (FOUC).
                document.documentElement.classList.add('dark');
              } catch (e) {}
            })();
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${plusJakarta.className} ${plusJakarta.variable} ${plusJakartaHeading.variable} ${jetbrainsMono.variable}`}>{children}</body>
    </html>
  );
}
