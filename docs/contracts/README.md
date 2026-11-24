# Contratos

**Fuente canónica para redactar specs: [`source/migration-guide.md`](source/migration-guide.md)** (contrato de integración frontend: rol, request, response, estados vacíos y errores por pantalla; §16 = cruce de las 47 llamadas del AngularJS).

| Fichero | Qué es | Estado |
|---|---|---|
| `source/migration-guide.md` | Contrato frontend por módulo + cruce legacy | Vigente (canónico, 2026-11-24: G19–G23 cerradas) |
| `source/BACKEND_PENDIENTES_RESPUESTA.md` | Respuesta del backend ítem por ítem a los pendientes (B, C, D, E) y cambios de contrato | Vigente |
| `source/LEGACY_SUNSET_PLAN.md` | Retiro del legacy en el backend | Vigente |
| `source/backend-docs/` | Resto de la documentación del backend (ADR, datos, flujos, operación, pruebas, `compliance/SMS_OTP_OPT_IN.md`) | Referencia |
| `source/endpoints.md` | Catálogo de rutas `/api/v1` | Vigente |
| `source/API_ROUTING_V3.md` | Motor de ruteo y `journeys/plan` | Vigente |
| `source/GEOCODING_API.md` | Geocoding, reverse, CSV de paquetes, config del motor | Vigente |
| `source/AUTHENTICATION_ENDPOINTS.md` | Auth, RBAC por patrón de URL, rate limit, lockout, OTP | Vigente (rutas sin `/v1` en el texto: leer como `/api/v1`) |
| `source/ENDPOINT_MIGRATION_MAP.md` | Corte de controllers del backend | Vigente (backend) |
| `source/postman/` | Colección Postman y entornos (Local, Staging; secretos vacíos). Mapeo: [`postman-mapping.md`](postman-mapping.md) | Referencia (2026-11-24, v2) |
| `source/secuencias/*.md` | Diagramas: login, geocoding, plan, upload | Referencia |
| `source/historico/*.md` | `AUTH_USER`, `FLUJO_AUTENTICACION_DETALLADO` (OAuth legacy), `APPLICATION_CONFIG` (config del backend) | **Histórico: no usar para contrato** |
| `api-v1-catalog.md` | Índice por dominio, reglas transversales, roles y errores | — |
| `known-backend-defects.md` | Defectos observados del backend | — |
| `contract-gaps.md` | Lo que aún falta | — |

Los docs históricos describen OAuth2 (`/auth/*`, `/oauth/*`, `/hanoit/api/v1/user/*`), retirado el 2026-07-18: esas rutas responden 403. Su consejo útil vigente (access token en memoria, renovación híbrida proactiva + ante 401, una sola renovación concurrente) ya está en ADR-F002 y ACC-001.

Última actualización de fuentes: 2026-11-19 (ramas backend `f4-12`, `f4-13`, `f4-18`).

Contraste con el contrato vivo: `GET https://hanoit:8000/v3/api-docs` (sin token) → `docs/contracts/openapi.snapshot.json` y `node tools/specs.mjs contract-diff --openapi docs/contracts/openapi.snapshot.json` (`/sincronizar-contrato`). No sustituye a la guía.

Contraste con Postman: `node tools/specs.mjs contract-diff --postman docs/contracts/source/postman/Hanoit-API.postman_collection.json` (falla si trae endpoints sin cobertura). Hallazgos en [`postman-mapping.md`](postman-mapping.md).
