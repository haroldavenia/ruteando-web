# Design

## Por qué `@angular/service-worker` y no uno a mano

Genera `ngsw.json` con los hashes de cada recurso, versiona atómicamente (nunca mezcla ficheros de dos versiones) y trae `SwUpdate`. Uno propio obliga a reimplementar eso y es la fuente clásica de «se quedó una versión vieja pegada».

## Estrategia de caché (`ngsw-config.json`)

| Grupo | Qué | Estrategia |
|---|---|---|
| `assetGroups: app` | `index.csr.html`, JS, CSS, `favicon`, `theme-init.js`, manifiesto, iconos | `prefetch` |
| `assetGroups: assets` | `assets/**` | `lazy`, `updateMode: prefetch` |
| `assetGroups: fonts` | `fonts.googleapis.com`, `fonts.gstatic.com` | `lazy` |
| `dataGroups: tiles` | teselas de OpenStreetMap | `performance`, `maxSize` ~300, `maxAge` 7 d; sin precarga (política de uso de OSM) |
| **Nada para `/gateway/**`** | API | sin regla = siempre red; además `navigationUrls` excluye `/gateway`, `/api`, `/auth` |

## Piezas del repo que se tocan y por qué

- **SSR**: `angular.json` construye con `ssr`, pero el servidor publica `index.csr.html`. `ngsw.json` se genera junto a la compilación de navegador (que `server.js` ya publica) y `ngsw-config.json` debe declarar `index: /index.csr.html`. Registro con `provideServiceWorker(..., { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`, solo en navegador.
- **Cabeceras** (`server/server.js`, `security-headers.js`): `ngsw-worker.js`, `ngsw.json` y `manifest.webmanifest` con `no-cache` (si el navegador cachea el worker, nunca actualiza). CSP: `worker-src 'self'` y `manifest-src 'self'` explícitos; teselas y fuentes ya están permitidas. Comprobar con `CSP_MODE=report-only` antes de `enforce`.
- **Tema**: `theme-color` debe seguir al tema (dos metas con `media="(prefers-color-scheme: …)"`; si la persona fuerza Claro/Oscuro, `ThemeService` actualiza la meta).
- **Sesión**: refresh token en `localStorage`, access token en memoria; el worker no los toca y no hay datos privados en caché.
- **Iconos**: no hay PNG original de la marca (solo SVG inline en `shared/brand`); generar 192, 512, maskable 512 y `apple-touch-icon` 180 desde ese SVG con un script puntual, sin dependencia nueva.
- **Presupuesto del bundle** (500 kB inicial): el registro añade poco; medir.

## Plataformas

- **Chrome/Edge (Windows, macOS, Linux, Android)**: instalar desde la barra de direcciones o con nuestro botón.
- **Safari iOS/iPadOS**: sin evento; «Compartir → Añadir a pantalla de inicio»; requiere `apple-touch-icon` y metas `apple-mobile-web-app-*`; mostrar una pista breve solo en iOS.
- **HTTPS obligatorio** (salvo `localhost`); HSTS ya se añade tras `X-Forwarded-Proto: https`.

## Riesgos

- **Versión vieja pegada**: mitigado con `SwUpdate` (aviso + recargar) y `no-cache` del worker. Probar el ciclo con dos compilaciones seguidas.
- **Proxy real** (nginx/Traefik de Coolify): debe respetar el `Cache-Control` de esos tres ficheros; verificar a través del proxy y no solo contra Express.
- **Teselas**: cachear de más viola la política de OSM; límite de tamaño y sin precarga.
- **Pruebas**: Karma no ejercita service workers; la verificación es manual en Chrome (Lighthouse «Installable», Application → Service Workers, modo sin conexión) más pruebas unitarias del servicio de actualización con `SwUpdate` simulado.
