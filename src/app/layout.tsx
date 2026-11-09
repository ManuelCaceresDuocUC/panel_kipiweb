import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';

export const metadata: Metadata = {
  title: 'KIPIPOS Panel',
  description: 'Panel privado del dueño de KIPIPOS',
  robots: { index: false, follow: false },
  applicationName: 'KIPIPOS Panel',
  appleWebApp: { capable: true, title: 'KIPIPOS', statusBarStyle: 'black-translucent' },
  icons: { icon: '/favicon.ico', apple: '/icons/apple-touch-icon.png' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Leer los headers fuerza render dinámico, necesario para que Next aplique el nonce del CSP del middleware
  await headers();
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
