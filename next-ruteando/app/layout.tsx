import './globals.css';

import type { Metadata, Viewport } from 'next';
import { Manrope, Roboto } from 'next/font/google';
import type { ReactNode } from 'react';

import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { ToastProvider } from '@/components/ui/toast';
import { I18nProvider } from '@/lib/i18n/client';
import { dictionaryOf } from '@/lib/i18n/dictionary';
import { getLanguage } from '@/lib/i18n/server';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { themeAttribute } from '@/lib/theme';
import { getTheme } from '@/lib/theme-server';

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

const DESCRIPTION =
  'Ruteando: planificación de rutas de reparto y recogida, flota y seguimiento de visitas. Route, fleet and journey planning.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Ruteando · Planificación de rutas', template: '%s · Ruteando' },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Hanoit, LLC' }],
  keywords: [
    'planificación de rutas',
    'route planning',
    'planejamento de rotas',
    'flota',
    'fleet management',
    'jornadas',
    'entregas',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: 'Ruteando · Planificación de rutas',
    description: DESCRIPTION,
    url: '/',
  },
  twitter: { card: 'summary', title: 'Ruteando · Planificación de rutas', description: DESCRIPTION },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { themeColor: '#5a3fc0', width: 'device-width', initialScale: 1 };

// El nonce de la CSP cambia en cada petición: todo se renderiza bajo demanda (si no, Next sirve HTML estático sin nonce).
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Idioma y tema los decide el servidor con sus cookies: la primera pintura ya sale bien, sin script ni parpadeo
  const lang = await getLanguage();
  const theme = await getTheme();
  return (
    <html lang={lang} data-theme={themeAttribute(theme)} className={`${manrope.variable} ${roboto.variable}`}>
      <body>
        <I18nProvider lang={lang} dictionary={dictionaryOf(lang)}>
          <ToastProvider>{children}</ToastProvider>
          <ServiceWorkerRegister />
        </I18nProvider>
      </body>
    </html>
  );
}
