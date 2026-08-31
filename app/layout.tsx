import type { Metadata } from 'next';
import { ScrollAnimations } from '@/components/ScrollAnimations';
import './globals.css';

function getMetadataBase() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const fallbackUrl = vercelHost ? `https://${vercelHost}` : 'http://localhost:3000';

  if (!configuredUrl) return new URL(fallbackUrl);

  try {
    return new URL(
      configuredUrl.startsWith('http://') || configuredUrl.startsWith('https://')
        ? configuredUrl
        : `https://${configuredUrl}`,
    );
  } catch {
    return new URL(fallbackUrl);
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: 'DGR Realty | Find Your Next Property in Pampanga',
    template: '%s | DGR Realty',
  },
  description:
    'Browse curated houses, condominiums, lots, rentals, commercial properties, and farm land across Pampanga with DGR Realty.',
  applicationName: 'DGR Realty',
  keywords: ['Pampanga real estate', 'property for sale', 'property for rent', 'DGR Realty'],
  openGraph: {
    title: 'DGR Realty | Find your next property',
    description: 'Browse homes, land, rentals, commercial spaces, and investment opportunities across Pampanga.',
    type: 'website',
    siteName: 'DGR Realty',
    images: [{ url: '/og-marketplace.png', width: 1536, height: 1024, alt: 'DGR Realty - Find your next property.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DGR Realty | Find your next property',
    description: 'Browse homes, land, rentals, commercial spaces, and investment opportunities across Pampanga.',
    images: ['/og-marketplace.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ScrollAnimations />
        {children}
      </body>
    </html>
  );
}
