import './globals.css';

import type { Metadata, Viewport } from 'next';
import { Manrope, Roboto } from 'next/font/google';
import type { ReactNode } from 'react';

// Autoalojadas por Next en la compilación: el navegador no pide nada a Google y la CSP solo necesita `font-src 'self'`.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = { title: 'Ruteando' };
export const viewport: Viewport = { themeColor: '#5a3fc0' };

// El nonce de la CSP cambia en cada petición: todo se renderiza bajo demanda (si no, Next sirve HTML estático sin nonce).
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${manrope.variable} ${roboto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
