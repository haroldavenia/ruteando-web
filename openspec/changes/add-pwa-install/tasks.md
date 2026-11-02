# Tasks

- [x] 1. `ng add @angular/pwa` en `ng-ruteando/` (revisar lo generado y quitar lo que sobre), versión alineada con Angular 21.2
- [x] 2. `ngsw-config.json`: `index: /index.csr.html`, grupos del diseño, `navigationUrls` sin `/gateway`, `/api`, `/auth`
- [x] 3. `manifest.webmanifest` en español (`name` «Ruteando», `start_url: /`, `scope`, `display: standalone`, colores del tema, iconos) y enlaces/metas en `index.html`
- [x] 4. Iconos 192/512/maskable/180 generados desde el SVG de la marca
- [x] 5. `provideServiceWorker` solo producción y navegador; `UpdateService` con `SwUpdate.versionUpdates` y aviso «Nueva versión disponible · Recargar» (accesible)
- [x] 6. Botón «Instalar aplicación» (`beforeinstallprompt`) en el menú de usuario; pista de iOS
- [x] 7. `server/`: `Cache-Control: no-cache` para `ngsw-worker.js`, `ngsw.json`, `manifest.webmanifest`; `worker-src`/`manifest-src` en la CSP; pruebas en `server/test/`
- [x] 8. `theme-color` que sigue al tema (meta dinámica en `ThemeService`)
- [x] 9. Verificado en Chrome 156 (compilación de producción, CSP en `enforce`, gateway simulado): worker activo, 194 recursos en caché, `/gateway` no cacheado (sin red responde 504), la app abre sin servidor (carcasa y redirección a acceso), ciclo de actualización con dos compilaciones (aviso y «Recargar» pasan a la versión nueva) y teselas cacheadas (`cacheOpaqueResponses`, porque son peticiones de imagen opacas). No medido: Lighthouse ni la instalación real del cuadro del navegador.
- [ ] 10. Verificar en Android (Chrome) e iOS (Safari) y a través del proxy real de producción
- [x] 11. Actualizar `CLAUDE.md` y `README.md`
