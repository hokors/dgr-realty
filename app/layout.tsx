import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { ScrollAnimations } from '@/components/ScrollAnimations';
import { getSiteUrl } from '@/lib/site-url';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
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
        <Analytics />
      </body>
    </html>
  );
}
