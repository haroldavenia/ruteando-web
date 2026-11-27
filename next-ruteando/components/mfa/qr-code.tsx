'use client';

import { useEffect, useState } from 'react';

import { useT } from '@/lib/i18n/client';

/**
 * Código QR como SVG (sin imagen ni `innerHTML`, por la CSP). La biblioteca `qrcode` se carga solo cuando hace falta (al activar la
 * aplicación autenticadora), no en el arranque. Siempre oscuro sobre claro: así lo leen las aplicaciones, también con el tema oscuro.
 */
export function QrCode({ text, label }: { text: string; label?: string }) {
  const t = useT();
  const [shape, setShape] = useState<{ size: number; path: string } | null>(null);

  useEffect(() => {
    let current = true;
    void import('qrcode').then((mod) => {
      if (!current) return;
      const { create } = mod.default ?? mod;
      const { modules } = create(text, { errorCorrectionLevel: 'M' });
      const quiet = 4; // margen claro alrededor, como pide el estándar
      let path = '';
      for (let row = 0; row < modules.size; row++) {
        for (let col = 0; col < modules.size; col++) {
          if (modules.get(row, col)) path += `M${col + quiet} ${row + quiet}h1v1h-1z`;
        }
      }
      setShape({ size: modules.size + quiet * 2, path });
    });
    return () => {
      current = false;
    };
  }, [text]);

  if (!shape) return null;
  return (
    <div className="block w-44 max-w-full overflow-hidden rounded-xl border border-outline-variant">
      <svg
        role="img"
        aria-label={label ?? t('Código QR para la aplicación autenticadora')}
        viewBox={`0 0 ${shape.size} ${shape.size}`}
        shapeRendering="crispEdges"
        xmlns="http://www.w3.org/2000/svg"
        className="block h-auto w-full"
      >
        <rect width="100%" height="100%" fill="#fff" />
        <path d={shape.path} fill="#000" />
      </svg>
    </div>
  );
}
