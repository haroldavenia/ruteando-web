import './globals.css';

import type { Metadata, Viewport } from 'next';
import { Manrope, Roboto } from 'next/font/google';
import type { ReactNode } from 'react';

import { ToastProvider } from '@/components/ui/toast';
import { I18nProvider } from '@/lib/i18n/client';
import { dictionaryOf } from '@/lib/i18n/dictionary';
import { getLanguage } from '@/lib/i18n/server';
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

export const metadata: Metadata = { title: 'Ruteando' };
export const viewport: Viewport = { themeColor: '#5a3fc0' };

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
        </I18nProvider>
      </body>
    </html>
  );
}
