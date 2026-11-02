# Tasks

- [x] 1. `ng add @angular/pwa` en `ng-ruteando/` (revisar lo generado y quitar lo que sobre), versión alineada con Angular 21.2
- [x] 2. `ngsw-config.json`: `index: /index.csr.html`, grupos del diseño, `navigationUrls` sin `/gateway`, `/api`, `/auth`
- [x] 3. `manifest.webmanifest` en español (`name` «Ruteando», `start_url: /`, `scope`, `display: standalone`, colores del tema, iconos) y enlaces/metas en `index.html`
- [x] 4. Iconos 192/512/maskable/180 generados desde el SVG de la marca
- [x] 5. `provideServiceWorker` solo producción y navegador; `UpdateService` con `SwUpdate.versionUpdates` y aviso «Nueva versión disponible · Recargar» (accesible)
- [ ] 6. Botón «Instalar aplicación» (`beforeinstallprompt`) en el menú de usuario; pista de iOS
- [x] 7. `server/`: `Cache-Control: no-cache` para `ngsw-worker.js`, `ngsw.json`, `manifest.webmanifest`; `worker-src`/`manifest-src` en la CSP; pruebas en `server/test/`
- [ ] 8. `theme-color` que sigue al tema (meta dinámica en `ThemeService`)
- [ ] 9. (Hecho en Chrome 156 sobre :3100: worker activado, 194 recursos en caché, `/gateway` no cacheado, sin avisos de CSP. Falta: Lighthouse, instalar, modo sin conexión, ciclo de actualización, teselas y fuentes bajo `enforce`) Verificar en Chrome real: Lighthouse instalable, instalar en escritorio, sin conexión (carcasa + aviso, `/gateway` no cacheado), ciclo de actualización con dos compilaciones
- [ ] 10. Verificar en Android (Chrome) e iOS (Safari) y a través del proxy real de producción
- [ ] 11. Actualizar `CLAUDE.md` y `README.md`
