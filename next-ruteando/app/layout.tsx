import type { ReactNode } from 'react';

import './globals.css';

export const metadata = { title: 'Ruteando' };

// El nonce de la CSP cambia en cada petición: todo se renderiza bajo demanda (si no, Next sirve HTML estático sin nonce).
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
