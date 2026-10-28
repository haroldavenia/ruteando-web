# Tasks

## 1. Middleware de cabeceras

- [x] 1.1 Crear `server/security-headers.js` con `buildCsp(env)` (política a partir de `CSP_IMG_SRC`) y `securityHeaders(env)` (middleware: cabeceras fijas, CSP en el modo de `CSP_MODE`, HSTS solo con `X-Forwarded-Proto: https`, sin pisar cabeceras ya fijadas); verificar con `server/test/security-headers.test.js` (cabeceras básicas, `report-only` por defecto, `enforce`, `off`, contenido de la política sin `unsafe-inline` ni `unsafe-eval` en scripts, `CSP_IMG_SRC` añadido, HSTS con y sin HTTPS, un valor desconocido de `CSP_MODE` cae en `report-only`)
- [x] 1.2 Registrar el middleware en `server/server.js` antes del proxy y del estático y desactivar `X-Powered-By`; verificar con `server/test/serving.test.js` y `gateway-proxy.test.js` (una respuesta del estático, una del comodín del cliente, un 404 JSON y una respuesta del proxy llevan las cabeceras, y su contenido y estado no cambian)

## 2. Verificación en navegador

- [x] 2.1 Compilar (`npm run build:web`), arrancar el servidor con `CSP_MODE=report-only` y recorrer con Chrome (CDP) acceso, inicio, un listado, el mapa de lugares y el editor de zonas leyendo las violaciones de CSP de la consola; verificar que no hay ninguna o, si las hay, ajustar la política o consultar antes de tocar la compilación (en especial el `onload` de la hoja de estilos: comprobar que los estilos se aplican) y repetir
- [ ] 2.2 Repetir el recorrido con `CSP_MODE=enforce` en local y comprobar que la aplicación se ve y funciona igual (estilos, fuentes, mapa, login real contra el gateway); verificar con capturas en móvil y escritorio. El valor por defecto sigue siendo `report-only`: pasar a `enforce` en un despliegue es decisión aparte.
  - Resultado del 2026-10-28: en `report-only` solo hay una violación, `script-src-attr` por el `onload` de la hoja de estilos (resto del recorrido y login real sin violaciones ni peticiones fallidas); en `enforce` ese `onload` se bloquea y los estilos se ven mal. Pendiente de decidir cómo arreglarlo (ver design.md, decisión 3) antes de dar esta tarea por cumplida

## 3. Documentación e integración

- [x] 3.1 Documentar `CSP_MODE` y `CSP_IMG_SRC` en `.env.example`, `README.md` y una línea en `CLAUDE.md`, con el aviso de que cambiar el proveedor de teselas exige añadir su origen a `CSP_IMG_SRC`; verificar con `grep` que las dos variables aparecen en los tres ficheros
- [ ] 3.2 Ejecutar `npm run test:server`, `npm --prefix ng-ruteando run test:ci`, `npm --prefix ng-ruteando run build` y `npx --yes @fission-ai/openspec@1.14.3 validate --specs --strict`; verificar que pasan sin avisos nuevos
