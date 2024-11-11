import { Analytics } from '@vercel/analytics/react';

import '@/app/globals.css';

export const metadata = {
  title: 'NanoCurrency (XNO) Representative Network Visualization',
  description:
    'Interactive 3D visualization of the NanoCurrency (XNO) representative network. Explore real-time node distribution, voting weight, and network health of the Nano digital currency ecosystem.',
  keywords: [
    'NanoCurrency',
    'XNO',
    'Nano Digital Currency',
    'Nano Cryptocurrency',
    'Nano Network',
    'Nano Representatives',
    'XNO Network',
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
      'Explore the NanoCurrency (XNO) representative network in an interactive 3D visualization. View real-time node distribution and voting weight.',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/xno_currencies_mini.gif',
        width: 800,
        height: 262,
        alt: 'NanoCurrency Network Visualization'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NanoCurrency (XNO) Network Visualization',
    description:
      'Interactive 3D visualization of the NanoCurrency (XNO) representative network',
    images: ['/xno_currencies_mini.gif']
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
