# Design

## Context

Estado observado (2026-10-28):

- `server/server.js` registra `morgan`, el proxy `/gateway` y el estático/comodín del cliente; no pone ninguna cabecera de seguridad ni desactiva `X-Powered-By`.
- La compilación de navegador (`index.csr.html`) no tiene `<script>` en línea. Tiene 3 bloques `<style>` en línea (estilos críticos de Angular) y un manejador `onload` en el enlace a la hoja de estilos (carga diferida de los estilos críticos): un manejador en línea que `script-src 'self'` bloquea.
- Recursos externos: hoja de Google Fonts (`fonts.googleapis.com`) y sus ficheros (`fonts.gstatic.com`), y teselas de `tile.openstreetmap.org` (configurables en `environment*.ts`). Angular Material y OpenLayers añaden estilos en línea en ejecución.
- El refresh token vive en `localStorage` (`hanoitToken`): cualquier XSS podría leerlo.

## Goals / Non-Goals

**Goals:**
- Impedir que se ejecute código que no venga del propio origen (`script-src 'self'`), impedir la incrustación en otros sitios y fijar el tipo de contenido.
- Poder activar la política sin romper la aplicación: primero informe (no bloquea), luego bloqueo con OK explícito.

**Non-Goals:**
- Eliminar `'unsafe-inline'` de estilos y autohospedar fuentes (cambios aparte).
- Sustituir el almacenamiento del refresh token.

## Decisions

1. **Middleware propio, sin `helmet`.** Son pocas cabeceras fijas y la política se calcula con dos variables; una dependencia nueva no compensa y amplía la superficie de la cadena de suministro.
2. **`report-only` por defecto.** `Content-Security-Policy-Report-Only` no bloquea nada y deja ver en la consola del navegador qué se habría bloqueado: el funcionamiento de la aplicación no cambia al desplegar este change. Se pasa a `enforce` con `CSP_MODE=enforce` solo cuando la verificación en navegador no muestre violaciones y haya OK explícito. Se descarta empezar en `enforce`: un recurso olvidado dejaría sin mapa o sin fuentes a todo el mundo.
3. **El `onload` de la hoja de estilos.** Con `script-src 'self'` el navegador no lo ejecuta y la hoja crítica diferida quedaría en `media="print"`. La verificación en navegador decide: si los estilos dejan de aplicarse en `enforce`, se desactiva la carga diferida con `optimization.styles.inlineCritical = false` en `angular.json` (coste: algo de rendimiento de primera carga). No se añade `'unsafe-inline'` a `script-src` ni hashes por ser frágiles. Es una tarea de comprobación, no un cambio ya decidido, y se consulta antes de tocar `angular.json`.
4. **Orígenes de imágenes extra por entorno** (`CSP_IMG_SRC`, separados por espacios). La URL de teselas está en el código del cliente; la política del servidor debe poder acompañarla sin recompilar. Por defecto incluye `https://tile.openstreetmap.org`.
5. **`Strict-Transport-Security` solo con HTTPS** (`X-Forwarded-Proto: https`). Enviarla por HTTP no tiene efecto y en desarrollo local no debe fijar HTTPS para `localhost`. `trust proxy` no se toca: se lee la cabecera directamente.
6. **Antes del proxy, sin pisar.** El middleware va antes de `/gateway` y del estático, de modo que las respuestas del gateway y los ficheros también llevan las cabeceras; si una respuesta ya trae una cabecera de seguridad propia, no se sobrescribe.

## Risks / Trade-offs

- [Una CSP incompleta bloquea fuentes, mapa o estilos] → Mitigación: informe primero (no bloquea) y verificación en navegador por la ruta real del servidor (no solo con `ng serve`).
- [`style-src 'unsafe-inline'` reduce la protección contra inyección de estilos] → Se acepta: el riesgo principal (ejecución de scripts) queda cubierto por `script-src 'self'`. Mejora posible con nonces.
- [Google Fonts en la política] → Se retira cuando las fuentes se autohospeden (S7).
- [Cloudflare u otro proxy delante puede añadir o duplicar cabeceras] → Se comprueba con `curl -I` contra el despliegue real antes de pasar a `enforce`.
