import './globals.css';

import { Analytics } from '@vercel/analytics/react';
import Nav from './nav';
import { Suspense } from 'react';

export const metadata = {
  title: 'Nano Network Visualizer - Coming Soon',
  description:
    'Stay tuned for the Nano Network Visualizer, an interactive tool to explore the entire Nano cryptocurrency network.'
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full relative">
      <body className="h-full text-white relative bg-black">
        <Suspense>
          <Nav />
        </Suspense>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
