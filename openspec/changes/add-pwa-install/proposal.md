# Proposal

## Why

Para quien reparte o planifica, abrir la aplicación desde un icono —en el escritorio o en el móvil— y que cargue rápido aunque la conexión sea mala es una mejora grande con poco coste. Una PWA (manifiesto + service worker) permite **instalarla como aplicación** en Windows, macOS, Linux, Android y iOS sin tiendas ni ejecutable aparte, reutilizando el frontend actual.

## Alcance realista

- **Sí**: instalable (icono, ventana propia sin barra del navegador), arranque instantáneo desde caché, aviso «hay una versión nueva», aviso sin conexión, teselas del mapa y fuentes en caché.
- **No (por diseño)**: trabajar **sin conexión con datos**. La API vive en el gateway por `/gateway`, que **nunca se cachea** (sesión, tokens, rutas en vivo: un dato viejo sería un error, no una función). Sin red se enseña la carcasa y un aviso claro.
- **Fuera de alcance**: Electron / Tauri / Capacitor. Si hiciera falta Play Store, una TWA envuelve esta misma PWA sin reescribir nada.

## What Changes

- `@angular/service-worker` (oficial; `ng add @angular/pwa` genera la base) con `ngsw-config.json`.
- `manifest.webmanifest` (`display: standalone`, `lang: es`, colores, iconos 192/512 y maskable) enlazado en `index.html`, con `theme-color` claro/oscuro y `apple-touch-icon`.
- Registro del service worker solo en navegador y producción; aviso de actualización con `SwUpdate`.
- Servidor Express: `ngsw-worker.js`, `ngsw.json` y el manifiesto con `Cache-Control: no-cache`; CSP con `worker-src 'self'` y `manifest-src 'self'`.
- Opcional: botón «Instalar aplicación» (`beforeinstallprompt`, Chrome/Edge/Android).
