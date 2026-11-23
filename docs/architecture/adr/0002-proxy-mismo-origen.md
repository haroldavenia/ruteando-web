# ADR-0002: Consumir `/api/v1` por un proxy del mismo origen

- Estado: Propuesto (se aprueba con FND-002)
- Fecha: 2026-11-17 (actualizado 2026-11-20)
- Specs: FND-002

## Contexto
El AngularJS llama a `http://hanoit:9000` con URL absolutas (`master/js/custom/config/constant.js`). El backend nuevo publica `/api/v1` con TLS autofirmado en desarrollo; el gateway rechaza peticiones con `Origin` no permitido (E4 del backend: no amplía CORS) y algunos despliegues exigen `X-Api-Key`, que no puede vivir en el navegador. La planificación (`POST /journeys/plan`) puede tardar minutos.

## Decisión
- `server/app.js` expone `/api/v1/**` y lo reenvía a `BACKEND_URL` (`.env`) con `server/proxy.js`: streaming en ambos sentidos (multipart de `/packages/upload`), sin `Origin`, `Referer` ni `Cookie`, con `X-Api-Key` si `BACKEND_API_KEY` existe.
- Timeouts: `BACKEND_TIMEOUT_MS` (60 s) y `BACKEND_PLAN_TIMEOUT_MS` (180 s) solo para `POST /api/v1/journeys/plan`.
- Errores propios con el formato del backend: 503 `SERVICE_UNAVAILABLE` (sin `BACKEND_URL`), 502 `BAD_GATEWAY`, 504 `GATEWAY_TIMEOUT`; si el backend corta a mitad de respuesta se corta la conexión.
- Redirecciones de los enlaces de correo sin `#`: `/verify-email`, `/reset-password`, `/invitations/accept` → rutas de la SPA con el `token`.
- TLS: nunca se desactiva la verificación de CA ni de nombre. El backend de desarrollo usa un certificado autofirmado (`CN=hanoit`; SAN `hanoit`, `localhost`, `127.0.0.1`; vence 2036-04-21) versionado como público en `config/certs/hanoit-dev.pem`. El proxy y las sondas lo cargan explícitamente con `BACKEND_CA_FILE` (o `NODE_EXTRA_CA_CERTS`) en un `https.Agent` junto a las CA del sistema, porque Node ignora `NODE_EXTRA_CA_CERTS` si llega por `--env-file` (comprobado en Node 22). La URL es `https://hanoit:8000` y la máquina del frontend resuelve `hanoit` por `/etc/hosts`.
- Sin `X-Api-Key`: el backend no tiene gateway; `BACKEND_API_KEY` queda vacío (el soporte se conserva por si un despliegue lo añade).
- El ejemplo Satellizer/MongoDB se movió sin cambios a `server/legacy-satellizer.js`, montado solo con `LEGACY_SATELLIZER=1`; se retira en CIE-001.

## Consecuencias
- Sin CORS ni secretos en el cliente; el mismo build sirve para cualquier entorno.
- El servidor web ya no necesita MongoDB para arrancar ni para las pruebas.
