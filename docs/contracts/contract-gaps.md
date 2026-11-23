# Huecos de contrato

Actualizado 2026-11-19 con la respuesta del backend. **No queda ningún hueco de contrato abierto**; lo pendiente es de operación (entorno, cuentas) y de fixtures.

| # | Tema | Estado | Resolución |
|---|---|---|---|
| G1 | `POST /packages/upload` | Resuelto | GEOCODING_API §4; tope en `GET /packages/upload/limits` |
| G2 | Geocoding | Resuelto | GEOCODING_API §1–3 |
| G3 | Unidades | Resuelto | Fijas de plataforma: g, cm³, cm, m, s (`GET /units`) |
| G4 | `PUT` | Resuelto | Sustituye; excepciones en `endpoints.md` «Semántica de PUT» |
| G5 | `/routing/optimizations*` | Resuelto | `CargoConfig` legacy |
| G6 | Navegación | Resuelto | `RouteNavigation` v4/v5 (D7 del backend) |
| G7 | Borrado en uso | Resuelto | 409 `details{referencedBy, ids}` |
| G8 | Roles | Resuelto | migration-guide §2 |
| G9 | Posiciones | Resuelto | `{id, driverId, resourceId, longitude, latitude, address, recordedAt}` |
| G10 | Enlaces de correo | Resuelto | `/verify-email?token=`, `/reset-password?token=`; invitación la arma la plantilla Brevo #3 con `invitation_token` |
| G11 | Paginación audit-logs | Resuelto | `PageResponse` estándar |

## Pendiente de operación (fuera del código)

| # | Qué | Impacto si no llega |
|---|---|---|
| E1 | ~~URL fija del entorno de desarrollo~~ **Resuelto 2026-11-23**: `https://hanoit:8000`, certificado autofirmado `CN=hanoit` (`config/certs/hanoit-dev.pem`), sin `X-Api-Key`; el frontend resuelve `hanoit` por `/etc/hosts` | — |
| E2 | Parcial: tenant de pruebas con `tenant_admin`; faltan cuentas `agent`, `driver` y `super_admin` | Sondas por rol con dispensa |
| B1 | Brevo (remitente, plantillas #1–#3) | Verificación, recuperación e invitación sin prueba en vivo |
| D12 | Firebase web + VAPID | Push web (EMP-005) se aplaza |
| D13 | Stripe en modo test | Facturación (EMP-004) sin prueba en vivo |
| — | URL de la plantilla de invitación (#3) | Debe apuntar a `<app>/#/access/invitation?token=` o a una ruta sin `#` que `server.js` redirija |

## Fixtures por capturar (G4)
`post__geocoding`, `post__reverse-geocoding`, `post__packages__upload`, `get__packages__upload__limits`, `get__units`, `get__package-status-reasons`.
