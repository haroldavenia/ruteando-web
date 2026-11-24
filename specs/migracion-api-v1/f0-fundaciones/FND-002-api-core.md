# FND-002: Capa de API: configuración, proxy same-origin, ApiClient y errores

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f0-fundaciones` |
| Clave anterior | F0-02 · `API-CORE` |
| Depende de | FND-001 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-api-core` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | — |
| Maqueta | — |
| ADR relacionados | ADR-0002, ADR-0004 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Una sola puerta al backend `/api/v1`: base relativa, proxy Express hacia `BACKEND_URL`, `ApiClient` con páginas, errores tipados, `listAll` y `runBulk`, y mensajes de error i18n por código.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | URLs absolutas `http://hanoit:9000/hanoit/api/v1` y host v2 hardcoded en osrmHttp | `custom/config/constant.js; modules/services/osrmHttp.js` | Cambia: base relativa `/api/v1` |
| L2 | Errores mostrados como `{error, error_description}` o `{message}` con `message.show` | `modules/services/message.js y controladores` | Cambia: `ApiError` + `ErrorMessages.for()` |
| L3 | `authResponseInterceptor` redirige a login si `error: invalid_token` | `modules/services/authResponseInterceptor.js` | Cambia: lo sustituye ACC-001 (401 + refresh) |
| L4 | server.js: ejemplo Satellizer con MongoDB y `/auth/*` social, sirve estáticos | `server/server.js` | Cambia: añade proxy `/api/v1`; lo social se retira en CIE-001 |
| L5 | Listas paginadas en cliente (`paginations.itemsPerPage=10`) | `custom/*/*_controller.js` | Cambia: utilidades de página de servidor `ApiClient.page` |
| L6 | Borrado múltiple `DELETE ?ids=` | `*_http.js `deleteIds`` | Cambia: `ApiClient.runBulk` (N peticiones, concurrencia 4, informe) |
| L7 | Las bases legacy (`/oauth`, `/hanoit/**`, `/singup`…) responden 403, sin periodo de convivencia | `migration-guide §16` | Cambia: corte total; un 403 de esas rutas indica código sin migrar |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| * | `/api/v1/**` | — | Page `{content,totalElements,totalPages,page,size}` o arreglo | Formato `{error,message,timestamp,path,details}`; 429 `Retry-After` | `get__places.json, get__audit-logs.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como desarrollador del frontend, quiero una sola puerta al backend `/api/v1` con errores tipados, paginación y proxy del mismo origen, para migrar cada módulo sin repetir URL, manejo de errores ni CORS.

## 3. Alcance

**Incluye**

- ADR-F001 y ADR-F002; `apiConfig`; `ApiClient`; `ApiError`; `ErrorMessages`; proxy `/api/v1/**` en server.js con timeout, sin `Origin`, `X-Api-Key` opcional; manejo 502/503/504.

**Excluye (no tocar)**

- Autenticación (ACC-001) más allá de dejar el hueco del interceptor; servicios por entidad.
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `.env.example`
- `master/i18n/{es,en,es_AR}.json`
- `master/gulpfile.js` (tarea i18n)
- `master/js/modules/services/api_config.js`
- `master/js/modules/services/api_client.js`
- `master/js/modules/services/api_error.js`
- `master/js/modules/services/error_messages.js`
- `master/js/modules/services/authResponseInterceptor.js`
- `server/app.js`
- `server/proxy.js`
- `server/server.js`
- `server/legacy-satellizer.js` (movido sin cambios)
- `tests/helpers/sources.json`
- `tests/unit/api-core/**`
- `tests/integration/api-core/**`
- `tests/server/**`
- `tests/e2e/api-core.e2e.mjs`
- `tests/api/api-core.api.test.mjs`
- `tests/tools/i18n.test.mjs`
- `docs/architecture/adr/0002-proxy-mismo-origen.md`
- `docs/architecture/adr/0004-capa-api-y-sesion.md`
- `tests/mock-api/server.mjs`
- `tests/mock-api/store.mjs`
- `specs/migracion-api-v1/f0-fundaciones/evidencia/FND-002/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Exponer `apiConfig.baseUrl = '/api/v1'` y eliminar URLs absolutas del front
- **RF-2** — Reenviar `/api/v1/**` desde server.js a `BACKEND_URL` en streaming, quitando `Origin`, añadiendo `X-Api-Key` si existe y con `BACKEND_TIMEOUT_MS`
- **RF-3** — Responder 503 si `BACKEND_URL` no está definido, 502 si el backend cae y 504 si excede el tiempo
- **RF-4** — Ofrecer `ApiClient.get/post/put/patch/del` que resuelvan con el cuerpo y rechacen con `ApiError`
- **RF-5** — Normalizar páginas (`page` o `number`) a `{items,total,page,size,totalPages}`
- **RF-6** — Recorrer páginas con `listAll(path,{pageSize,max})` avisando si se alcanza el tope
- **RF-7** — Ejecutar operaciones por lote con `runBulk(ids, fn, {concurrency})` devolviendo éxitos y fallos con su error
- **RF-8** — Traducir errores a mensajes por código del backend, luego por estado, con overrides por pantalla, en es/en/es_AR
- **RF-9** — Tratar 201/202/204 sin cuerpo como éxito
- **RF-10** — Enviar `sort=campo,asc|desc` en los seis listados paginados (lista blanca por recurso) y tratar 400 `BAD_REQUEST` de un campo no permitido
- **RF-11** — Redirigir en `server.js` las rutas sin `#` de los correos (`/verify-email?token=`, `/reset-password?token=`) a las rutas de la SPA, conservando el token
- **RF-12** — Aplicar a `POST /api/v1/journeys/plan` un timeout propio del proxy (`BACKEND_PLAN_TIMEOUT_MS`, 180 000 por defecto) distinto del general
- **RF-13** — Ofrecer `ApiClient.batchDelete(recurso, ids)` sobre `POST /{recurso}/batch-delete` en lotes de 100, con resultado unificado `{deleted, notFound, conflicts, results}`

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado el build, Cuando busco `hanoit:9000|app.ruteando.co` en master/js, Entonces no hay coincidencias fuera de módulos aún no migrados registrados en legacy-scan
- **CA-2** (RF-2) — Dado `BACKEND_URL` apuntando a mock-api, Cuando el navegador hace `GET /api/v1/places`, Entonces el mock recibe la petición sin cabecera `Origin` y con `X-Api-Key` si `BACKEND_API_KEY` está definida
- **CA-3** (RF-2) — Dado un multipart de 1 MB a `/api/v1/packages/upload`, Cuando pasa por el proxy, Entonces llega íntegro al mock (streaming)
- **CA-4** (RF-3) — Dado `BACKEND_URL` vacío, Cuando pido `/api/v1/places`, Entonces el proxy responde 503 JSON `{error:'SERVICE_UNAVAILABLE'}`
- **CA-5** (RF-3) — Dado un backend que tarda más que `BACKEND_TIMEOUT_MS`, Cuando pido, Entonces el proxy responde 504
- **CA-6** (RF-4) — Dado un 404 `{error:'NOT_FOUND',message:'x'}`, Cuando `ApiClient.get` falla, Entonces rechaza con `ApiError{status:404, code:'NOT_FOUND'}`
- **CA-7** (RF-5) — Dado `get__audit-logs.json` (usa `number`), Cuando paso por `ApiClient.page`, Entonces obtengo `page` igual a `number` y `items` con la longitud de `content`
- **CA-8** (RF-6) — Dado 3 páginas de 100 y `max=250`, Cuando `listAll`, Entonces devuelve 250 elementos y `truncated:true`
- **CA-9** (RF-7) — Dado 5 ids y fallo 409 en el 3.º, Cuando `runBulk` con concurrencia 4, Entonces `ok` tiene 4, `failed` 1 con su `ApiError` y nunca hay más de 4 en vuelo
- **CA-10** (RF-8) — Dado `ApiError{status:429, code:'RATE_LIMIT_EXCEEDED', retryAfter:30}`, Cuando `ErrorMessages.for`, Entonces devuelve el texto i18n con 30 segundos
- **CA-11** (RF-8) — Dado `ApiError{status:409, code:'CONFLICT'}` y override `{CONFLICT:'places.errors.duplicate'}`, Cuando `ErrorMessages.for`, Entonces usa el override
- **CA-12** (RF-9) — Dado `DELETE` con 204 sin cuerpo, Cuando `ApiClient.del`, Entonces resuelve sin error
- **CA-13** (RF-10) — Dado `ApiClient.page('/packages', {sort:'createdAt,desc'})`, Entonces la URL lleva `sort=createdAt,desc`; dado un campo fuera de la lista blanca de `endpoints.md`, Entonces el servicio lo rechaza antes de enviar
- **CA-14** (RF-11) — Dado `GET /verify-email?token=abc`, Entonces 302 a `/#/access/verify?token=abc`; dado `GET /reset-password?token=xyz`, Entonces 302 a `/#/access/reset?token=xyz`
- **CA-15** (RF-12) — Dado un plan simulado de 90 s, Entonces el proxy no corta; dado otra ruta de 90 s, Entonces responde 504 con el timeout general
- **CA-16** (RF-4) — Dado 401 o 403 de seguridad, Entonces el cuerpo JSON `{error:'UNAUTHORIZED'|'FORBIDDEN',…}` se lee como `ApiError` con su código (ya no texto)
- **CA-17** (RF-13) — Dado 150 ids y respuestas con `deleted`, `not_found` y `conflict`, Cuando `batchDelete("places", ids)`, Entonces 2 peticiones (100 y 50) en orden, `deleted`/`notFound` con sus ids y `conflicts[].error` como `ApiError{status:409, code:"CONFLICT", details}`; un 422 de un lote rechaza con `ApiError`
- **CA-18** (RF-8) — Dado `ApiError{status:502, code:"OTP_DELIVERY_FAILED"}`, Entonces `ErrorMessages.for` devuelve el texto propio (no el genérico de 502) en es, en y es_AR

## 6. Diseño y restricciones técnicas

Crear: `master/js/modules/services/api_config.js`, `api_client.js`, `api_error.js`, `error_messages.js`, `master/jade/views/partials/list-state.jade`. Modificar: `server/server.js` (proxy con `http-proxy-middleware` antes de body-parser), `server/config.js`, `.env.example`, `app/i18n/{es,en,es_AR}.json` (`errors.*`). Pruebas: `tests/unit/core/*.spec.js`, `tests/e2e/proxy.e2e.mjs`.

**Pantallas y flujos.** Transversal: todos los listados muestran estados `cargando / vacío / error con Reintentar`. Componente/plantilla compartida `views/partials/list-state.jade`. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Prueba (`[FND-002 CA-n]`) |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | `tests/unit/api-core/api_client.spec.js` |
| T-2 | CA-2 | e2e | `tests/e2e/api-core.e2e.mjs` |
| T-3 | CA-2 | servidor | `tests/server/proxy.test.mjs` |
| T-4 | CA-2 | unitaria | `tests/unit/api-core/api_client.spec.js` |
| T-5 | CA-3 | servidor | `tests/server/proxy.test.mjs` |
| T-6 | CA-4 | servidor | `tests/server/proxy.test.mjs` |
| T-7 | CA-5 | servidor | `tests/server/proxy.test.mjs` |
| T-8 | CA-6 | contrato | `tests/integration/api-core/page.contract.spec.js` |
| T-9 | CA-6 | unitaria | `tests/unit/api-core/api_client.spec.js` |
| T-10 | CA-7 | sonda API | `tests/api/api-core.api.test.mjs` |
| T-11 | CA-7 | contrato | `tests/integration/api-core/page.contract.spec.js` |
| T-12 | CA-7 | unitaria | `tests/unit/api-core/api_client.spec.js` |
| T-13 | CA-8 | unitaria | `tests/unit/api-core/api_client.spec.js` |
| T-14 | CA-9 | unitaria | `tests/unit/api-core/api_client.spec.js` |
| T-15 | CA-10 | arnés | `tests/tools/i18n.test.mjs` |
| T-16 | CA-10 | unitaria | `tests/unit/api-core/api_client.spec.js` |
| T-17 | CA-10 | unitaria | `tests/unit/api-core/error_messages.spec.js` |
| T-18 | CA-11 | unitaria | `tests/unit/api-core/error_messages.spec.js` |
| T-19 | CA-12 | unitaria | `tests/unit/api-core/api_client.spec.js` |
| T-20 | CA-13 | sonda API | `tests/api/api-core.api.test.mjs` |
| T-21 | CA-13 | unitaria | `tests/unit/api-core/api_client.spec.js` |
| T-22 | CA-14 | e2e | `tests/e2e/api-core.e2e.mjs` |
| T-23 | CA-14 | servidor | `tests/server/proxy.test.mjs` |
| T-24 | CA-15 | servidor | `tests/server/proxy.test.mjs` |
| T-25 | CA-16 | sonda API | `tests/api/api-core.api.test.mjs` |
| T-26 | CA-16 | unitaria | `tests/unit/api-core/api_client.spec.js` |
| T-27 | CA-16 | unitaria | `tests/unit/api-core/auth_response_interceptor.spec.js` |
| T-28 | CA-17 | unitaria | Prueba `[FND-002 CA-17]` en `tests/unit/api-core/` |
| T-29 | CA-17 | contrato | Prueba `[FND-002 CA-17]` en `tests/integration/api-core/` |
| T-30 | CA-18 | unitaria | Prueba `[FND-002 CA-18]` en `tests/unit/api-core/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: FND-001.
- Riesgos: El servidor actual depende de MongoDB para Satellizer: arrancar sin Mongo debe seguir funcionando (proxy y estáticos no dependen de Mongo).
- Pregunta **bloqueante**: `app/` está en `.gitignore` y los diccionarios de runtime viven en `app/i18n/*.json` (no versionados). ¿Se mueven a `master/i18n/` y Gulp los copia? → Decisión propuesta: Sí: mover a `master/i18n/`, tarea de Gulp `i18n`, y versionarlos antes de que las specs añadan claves
- Pregunta no bloqueante: Timeout de planificación → Decisión propuesta: 60 s por defecto, configurable
- Pregunta no bloqueante: ¿CORS o proxy? → Decisión propuesta: Resuelta (E4): proxy del mismo origen; el backend no amplía CORS

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | `tests/unit/api-core/api_client.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-2 | `tests/e2e/api-core.e2e.mjs`, `tests/server/proxy.test.mjs`, `tests/unit/api-core/api_client.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-3 | `tests/server/proxy.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-4 | `tests/server/proxy.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-5 | `tests/server/proxy.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-6 | `tests/integration/api-core/page.contract.spec.js`, `tests/unit/api-core/api_client.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-7 | `tests/api/api-core.api.test.mjs`, `tests/integration/api-core/page.contract.spec.js`, `tests/unit/api-core/api_client.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-8 | `tests/unit/api-core/api_client.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-9 | `tests/unit/api-core/api_client.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-10 | `tests/tools/i18n.test.mjs`, `tests/unit/api-core/api_client.spec.js`, `tests/unit/api-core/error_messages.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-11 | `tests/unit/api-core/error_messages.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-12 | `tests/unit/api-core/api_client.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-13 | `tests/api/api-core.api.test.mjs`, `tests/unit/api-core/api_client.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-14 | `tests/e2e/api-core.e2e.mjs`, `tests/server/proxy.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-15 | `tests/server/proxy.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-16 | `tests/api/api-core.api.test.mjs`, `tests/unit/api-core/api_client.spec.js`, `tests/unit/api-core/auth_response_interceptor.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-20-implementador.md` |
| CA-17 | `tests/unit/api-core/api_client.spec.js`, `tests/integration/api-core/page.contract.spec.js`, `tests/server/proxy.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-23-implementador.md` |
| CA-18 | `tests/unit/api-core/error_messages.spec.js`, `tests/tools/i18n.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-002/2026-11-23-implementador.md` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §1, 16); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (E3, E4, B8, C1, D1, D11) | Documentación del backend | — |
| 2026-11-20 | v4: formato de la plantilla harness-engineering | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-20 | Implementación propuesta de F0 a petición del usuario (alcance «Arnés + F0 implementado»), antes de la aprobación formal de la spec: los gates G0 (Lista) y G5 (merge) siguen pendientes de una persona. | Pedido explícito del usuario 2026-11-20 | pendiente |
| 2026-11-20 | Resuelta la pregunta bloqueante de i18n: diccionarios versionados en `master/i18n/*.json` y tarea Gulp `i18n` que los copia a `app/i18n`; se autoriza `master/gulpfile.js`. | Decisión propuesta de la propia spec | pendiente |
| 2026-11-20 | Proxy con `http`/`https` nativos (`server/proxy.js`) en lugar de `http-proxy-middleware`: sin dependencia nueva y con control de timeouts por ruta. El ejemplo Satellizer/MongoDB se mueve sin cambios a `server/legacy-satellizer.js` (solo con `LEGACY_SATELLIZER=1`). | server.js dependía de MongoDB y servía la build de Angular 21 | pendiente |
| 2026-11-20 | Las pruebas de CA-2…CA-5 y CA-14/15 se hacen como pruebas de servidor (`tests/server/proxy.test.mjs`, node:test sobre mock-api) más E2E de navegador para CA-2 y CA-14. | Más rápidas y deterministas que E2E | pendiente |
| 2026-11-20 | `list-state.jade` se sustituye por la directiva `rw-list-state` de FND-005. | Un único componente de estados | pendiente |
| 2026-11-23 | `batchDelete` (M1) y código `OTP_DELIVERY_FAILED` en `ErrorMessages` | migration-guide §7, §15 | pendiente |
