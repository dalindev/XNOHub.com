import { Analytics } from '@vercel/analytics/react';
import { Metadata } from 'next';

import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'NanoCurrency (XNO) Representative Network Visualization',
  description:
    'Interactive 3D visualization of the NanoCurrency (XNO) representative network. Explore real-time node distribution, voting weight, and network health of the Nano digital currency ecosystem.',
  keywords: [
    'NanoCurrency',
    'XNO',
    'Ӿ',
    'ӾNO',
    'XNOHub',
    'Nano Digital Currency',
    'Nano Cryptocurrency',
    'Nano Network',
    'Nano Representatives',
    'XNO Network',
    'SpaceX',
    'Starlink',
    'Falcon Heavy',
    'Starlink Satellite',
    'Nano Nodes',
    'Digital Currency',
    'Digital Cash',
    'Digital Money',
    'Cryptocurrency Visualization',
    'Blockchain Visualization',
    'Green Cryptocurrency',
    'Eco-Friendly Cryptocurrency',
    'Feeless Transactions',
    'Instant Payments',
    'Sustainable Cryptocurrency'
  ],
  openGraph: {
    title: 'NanoCurrency (XNO) Network Visualization',
    description:
      'Explore the NanoCurrency (XNO) representative network in an interactive 3D visualization',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://xnohub.com/open-graph/xnohub.png',
        width: 650,
        height: 400,
        alt: 'NanoCurrency Network Visualization'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NanoCurrency (XNO) Network Visualization',
    description:
      'Interactive 3D visualization of the NanoCurrency (XNO) representative network',
    creator: '@dalinhuang',
    images: [
      {
        url: 'https://xnohub.com/open-graph/xnohub.png',
        width: 650,
        height: 400,
        alt: 'NanoCurrency Network Visualization'
      }
    ]
  }
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-screen relative">
      <body className="h-screen text-white relative bg-black">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
