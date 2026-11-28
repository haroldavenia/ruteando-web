import type { MetadataRoute } from 'next';

/** Manifiesto de la aplicación instalable (PWA): nombre, iconos, capturas e identidad de color de la marca. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Ruteando',
    short_name: 'Ruteando',
    description: 'Planificación de rutas, flota y jornadas · Route, fleet and journey planning.',
    lang: 'es',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#5a3fc0',
    categories: ['business', 'productivity', 'navigation'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      {
        src: '/screenshots/wide-login.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Inicia sesión para planificar y seguir tus rutas en el escritorio',
      },
      {
        src: '/screenshots/narrow-login.png',
        sizes: '540x960',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Inicia sesión para planificar y seguir tus rutas en el móvil',
      },
    ],
  };
}
