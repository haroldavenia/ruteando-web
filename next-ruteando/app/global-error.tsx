'use client';

import './globals.css';

/**
 * Último recurso: el error ocurrió en el propio layout raíz, así que aquí no hay proveedor de idioma, tema ni fuentes. Texto fijo y
 * mínimo (en español y en inglés a la vez, porque no se sabe el idioma de la persona).
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body className="grid min-h-dvh place-items-center px-4">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-bold">Algo salió mal · Something went wrong</h1>
          <button
            type="button"
            onClick={reset}
            className="min-h-12 cursor-pointer rounded-control bg-primary px-6 font-medium text-on-primary"
          >
            Reintentar · Retry
          </button>
        </div>
      </body>
    </html>
  );
}
