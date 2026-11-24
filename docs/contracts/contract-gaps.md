# Huecos de contrato

Actualizado 2026-11-23 con `BACKEND_PENDIENTES_RESPUESTA.md` (sección de cierre del 2026-11-23). **No queda ningún hueco de contrato ni de operación abierto en el entorno de desarrollo**; solo D12 (push web) está aplazado y faltan fixtures por capturar.

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
| G12 | Borrado por lote (M1) | Resuelto 2026-11-23 | `POST /{recurso}/batch-delete {ids}` en places, resource-types, resources, settings, users y journeys; máx. 100; 200 con resultado por id. Paquetes **no** tienen lote |
| G13 | Estado de paquetes por lote (M2) | Resuelto 2026-11-23 | `PATCH /packages/status {ids,status,reason?}`; 422 no escribe ninguno |
| G14 | Estados vivos de paradas (M3) | Resuelto 2026-11-23 | `GET /journeys/{id}/package-statuses` |
| G15 | Fechas en auditoría (M4) | Resuelto 2026-11-23 | `dateFrom`/`dateTo` Instant UTC inclusivos; 400 si se cruzan |
| G16 | Búsqueda de paquetes (M5) | Resuelto 2026-11-23 | `GET /packages?q=` (≤ 80, literal, sin mayúsculas, guía/nombre/dirección) |
| G17 | Plan asíncrono (D11) | Resuelto 2026-11-23 | `POST /journeys/plan?async=true` → 202 `{jobId}`; `GET /journeys/plan/jobs/{jobId}`; 429 con la cola llena (20) |
| G18 | Fallo de envío de OTP | Resuelto 2026-11-23 | 502 `OTP_DELIVERY_FAILED` sin `otpId`; política de opt-in en `backend-docs/compliance/SMS_OTP_OPT_IN.md` |
| G19 | Estado de jornada `planned` vs `planning` | Resuelto 2026-11-24 | `planning` es canónico; filtro solo `planning`/`in_progress`/`completed`/`failed`/`cancelled`; `planned` y `dispatched` → 400. JOR-002 |
| G20 | Respuesta de aceptar invitación | Resuelto 2026-11-24 | 201 `LoginResponse` (`message`, `accessToken`, `refreshToken`, `expiresIn`, `user`); sesión iniciada. EMP-002 |
| G21 | Parámetros de `places/nearby` | Resuelto 2026-11-24 | Solo `lon`/`lat`; `longitude`/`latitude` son de zonas y posición del conductor. MAE-005 |
| G22 | Facturación: checkout y asientos | Resuelto 2026-11-24 | Checkout 201 `{checkoutUrl,sessionId}`; seats 200, `quantity` delta (10 + 3 → 13). EMP-004 |
| G23 | Colección Postman incompleta | Resuelto 2026-11-24 | Lotes y `upload/limits` añadidos; `GET /packages/status/{status}` no existe y su petición se quitó de la colección (filtro: `GET /packages?status=`). `contract-diff --postman` → 0. Ver `postman-mapping.md` |

## Operación del entorno de desarrollo

| # | Qué | Estado (2026-11-23) |
|---|---|---|
| E1 | URL de desarrollo | Resuelto: `https://hanoit:8000`, certificado autofirmado `CN=hanoit` (`config/certs/hanoit-dev.pem`), sin `X-Api-Key`; el frontend resuelve `hanoit` por `/etc/hosts` |
| E2 | Cuentas por rol | Resuelto: tenant `sdd-test` (plan standard, 10 asientos) con `tenant_admin`, `agent`, `driver` y `super_admin`; credenciales solo en `.env` |
| B1 | Correos Brevo | Comprobado: verificación (plantilla 2), restablecer (3), invitación (6); remitente `info@routengio.com` |
| D12 | Push web (Firebase + VAPID) | **Aplazado** hasta F6-05: EMP-005 oculta el push tras `features.pushWeb` |
| D13 | Stripe test | Comprobado: checkout premium mensual → `trialing`; webhook 200/400/502/500 |

### Discrepancia a corregir en la documentación del backend
La fila E1 de `BACKEND_PENDIENTES_RESPUESTA.md` dice que el proxy del frontend reenvía `/api/...` a `/api/v1/...`. **No es así** (ADR-0002): el cliente llama a `/api/v1/**` y el proxy no reescribe rutas. También indica `NODE_EXTRA_CA_CERTS`; el frontend usa `BACKEND_CA_FILE`, porque Node ignora `NODE_EXTRA_CA_CERTS` cuando llega por `.env`.

### Pendiente de entregar
`postman/Hanoit-API.postman_collection.json` y los entornos `Hanoit-Local` / `Hanoit-Staging` no venían en el paquete de documentación del 2026-11-23.

## Fixtures por capturar (G4)
`post__geocoding`, `post__reverse-geocoding`, `post__packages__upload`, `get__packages__upload__limits`, `get__units`, `get__package-status-reasons`, y del 2026-11-23: `post__{places,resource-types,resources,settings,users,journeys}__batch-delete`, `patch__packages__status`, `get__packages__q`, `post__journeys__plan__async` (202), `get__journeys__plan__jobs__jobId` (queued/succeeded/failed), `get__journeys__id__package-statuses`, `get__audit-logs__dates`, `post__notifications__otp__send__502`. Recapturar: `get__master-domains` (Role v3) y `get__journeys__id` con waypoints. Se capturan con `node tests/tools/capture-fixture.mjs` contra `https://hanoit:8000` y la cuenta `sdd-test`.
