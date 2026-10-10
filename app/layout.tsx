import type { Metadata, Viewport } from 'next';
import {ClientDiagnostics} from './diagnostics';

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
      <head>
        <meta name="kingdom-build" content={process.env.VERCEL_GIT_COMMIT_SHA??'local'} />
        <link rel="preload" href="/assets/world-v1/kingdom-world-kit.glb" as="fetch" crossOrigin="anonymous" fetchPriority="low" />
        <link rel="preload" href="/assets/premium-v1/architecture-kit.glb" as="fetch" crossOrigin="anonymous" fetchPriority="low" />
        <link rel="preload" href="/assets/world-v1/craft-kit.glb" as="fetch" crossOrigin="anonymous" fetchPriority="low" />
        <link rel="preload" href="/assets/life-v1/life-kit.glb" as="fetch" crossOrigin="anonymous" fetchPriority="low" />
      </head>
      <body>
        <ClientDiagnostics />
        {children}
      </body>
    </html>
  );
}

