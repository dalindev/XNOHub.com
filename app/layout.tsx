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
    <html lang="en" className="h-full bg-gradient-to-r from-black to-gray-800">
      <body className="h-full text-white">
        {/* <Suspense>
          <Nav />
        </Suspense> */}
        {/* {children} */}
        <main className="flex flex-col items-center justify-center h-screen text-2xl text-center">
          <h1 className="mb-4 text-orange-500 text-4xl">
            Our XNOHub.com App is Coming Soon!
          </h1>
          <p className="text-2xl text-blue-300">
            "What's a Bitcoin enthusiast's favorite drink? Feeeeees!" LOL
          </p>
          <p className="text-2xl">We're working hard Nano fam, Stay tuned!</p>
        </main>
        <Analytics />
      </body>
    </html>
  );
}
