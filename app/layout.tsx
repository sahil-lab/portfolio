import type { Metadata, Viewport } from 'next';

import './globals.css';



export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover'};

export const metadata: Metadata = {
  title: 'The Living Computer Kingdom — An explorable developer portfolio',
  description: 'Be a tiny creature inside a living computer. Explore seven hardware and software districts, operate their machines, and enter a developer portfolio.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

