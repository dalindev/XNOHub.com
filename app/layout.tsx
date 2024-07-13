import { Analytics } from '@vercel/analytics/react';

import '@/app/globals.css';

export const metadata = {
  title: 'Nano Network Visualizer',
  description:
    'NanoHub.com, A 3D visualization of the Nano network, showing the current state of the network and the nodes that are participating in it.'
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
