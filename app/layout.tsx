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
      <div
        className="fixed inset-0"
        style={{
          background: `black url('/logo.png') repeat 0 0 / 300px 100px`,
          top: '-50%',
          left: '-50%',
          filter: 'blur(5px)',
          transform: 'rotate(-35deg)',
          opacity: '0.1',
          width: '200%',
          height: '200%',
          overflow: 'hidden',
          zIndex: -1
        }}
      ></div>
      <body className="h-full text-white relative bg-black">
        {/* <Suspense>
          <Nav />
        </Suspense> */}
        {/* {children} */}
        <main className="flex flex-col items-center justify-center h-screen text-2xl text-center z-10">
          <h1 className="mb-4 text-orange-500 text-4xl">
            Our XNOHub.com App is Coming Soon!
          </h1>
          <p className="text-2xl text-blue-300">
            &quot;What&apos;s a Bitcoin enthusiast&apos;s favorite drink?
            Feeeeees!&quot; LOL
          </p>
          <p className="text-2xl">
            We&apos;re working hard Nano fam, Stay tuned!
          </p>
        </main>
        <Analytics />
      </body>
    </html>
  );
}
