import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'DGR Realty | Homes, Land & Property in Pampanga',
    template: '%s | DGR Realty',
  },
  description:
    'Browse curated houses, condominiums, lots, rentals, commercial properties, and farm land across Pampanga with DGR Realty.',
  applicationName: 'DGR Realty',
  keywords: ['Pampanga real estate', 'property for sale', 'property for rent', 'DGR Realty'],
  openGraph: {
    title: 'DGR Realty | Find your place in Pampanga',
    description: 'A curated collection of homes, land, rentals, and investment opportunities across Pampanga.',
    type: 'website',
    siteName: 'DGR Realty',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: 'DGR Realty — Find your place in Pampanga.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DGR Realty | Find your place in Pampanga',
    description: 'A curated collection of homes, land, rentals, and investment opportunities across Pampanga.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
