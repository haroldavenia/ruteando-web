# ADR-004 — Convenciones REST y versionado de endpoints

**Estado:** Aceptado
**Fecha:** 2026-07-17
**Contexto:** Reorganización de la arquitectura de endpoints (dominio + Swagger + best practices).

## Contexto

La API tenía dos superficies HTTP vivas en `src/`:

- **Actual** `com.hanoit.routing.controller.*` → `/api/*` (sin versión explícita), ~110 rutas / 19 controllers.
- **Legacy** `com.hanoit.controller.api.rest.v1.*` → `/hanoit/api/v1/*`, `/hanoit/v2|v3/*` (aún montada, sin plan de retiro formal).

Problemas detectados (Graphify + Codebase Memory, 234 nodos `Route`):

1. **Sin versión** en `/api/*` → imposible evolucionar sin romper clientes.
2. **Filtros por sub-path** en vez de query params: `/api/packages/status/{status}`, `/api/packages/service-type/{serviceType}`, `/api/journeys/status/{status}`, `/api/resources/active`, `/api/resource-types/active`, `/api/settings/active`.
3. **Activación con 3 variantes** en tenants: `PATCH /{id}/activate`, `/deactivate`, `/toggle-active`.
4. **Swagger poco claro**: tags mezclando actual, migrated y legacy sin jerarquía de dominio.
5. **Doble superficie viva** sin deprecación declarada.

## Decisión

### 1. Versión explícita `/api/v1` (implementación final)

- La superficie **única** es **`/api/v1/*`**. Los controllers usan `@RequestMapping("/api/v1/...")` de forma nativa.
- **Sin producción/clientes** → corte limpio: el prefijo sin versión `/api/*` y el filtro de reescritura transitorio (`ApiVersionRewriteFilter`) fueron **eliminados**.
- `SecurityConfig`, `RateLimitRule` y `WebMvcConfig` (interceptor) operan sobre `/api/v1/**`.

> Nota histórica: durante la transición se usó un `ApiVersionRewriteFilter` (`/api/v1/**` → `/api/**`) para no romper tests; una vez confirmado que no hay clientes, se migraron los controllers de forma nativa y se eliminó el filtro y el alias.

### 2. Filtros por query param (aditivo)

- Las colecciones aceptan filtros opcionales: `GET /api/v1/packages?status=&serviceType=`, `GET /api/v1/journeys?status=`, `GET /api/v1/resources?active=true`, etc.
- Los sub-paths de filtro (`/status/{status}`, `/active`, …) fueron **removidos**.

### 3. Activación unificada

- `PATCH /api/v1/tenants/{id}` con body `{ "active": bool, "reason": "..." }`.
- `activate` / `deactivate` / `toggle-active` quedan deprecados (delegan al mismo servicio).

### 4. Swagger por dominio

- Tags 1:1 con bounded contexts, ordenados por flujo (Onboarding → Operación → Billing → Notificaciones → Plataforma).
- `operationId`, ejemplos y descripciones consistentes.
- Cada tag declarado en `OpenAPIConfig` debe corresponder a un tag realmente usado por un controller, y viceversa.

## Convenciones (resumen normativo)

- Recurso en plural, kebab-case: `/api/v1/resource-types`.
- Colección `GET /r`, item `GET /r/{id}`, crear `POST /r`, reemplazar `PUT /r/{id}`, parche `PATCH /r/{id}`, borrar `DELETE /r/{id}`.
- Filtros/orden/paginación por **query params** (`?status=&page=&size=&sort=`), nunca en el path.
- Sub-recursos solo para relaciones de pertenencia reales (`/r/{id}/children`).
- Verbos de estado como parche del recurso (`PATCH`), no endpoints-acción salvo operaciones no idempotentes justificadas (`/checkout`, `/upload`, `/plan`).
- Errores unificados vía `ErrorResponse`.
- **Un solo paquete de controllers:** `com.hanoit.routing.controller`. No se crean paquetes por versión ni por motor.
- **Nunca entidades de persistencia en el contrato:** siempre DTOs `{Recurso}Request` / `{Recurso}Response` con mappers estáticos.
- **La propiedad del dato viene del JWT:** el `tenantId` se lee de `TenantContext`, nunca del `Principal` ni de un parámetro de la petición.
- **Recursos singleton sin `{id}`:** si el recurso es único (p. ej. `admin/geocoding-config`), solo `GET` y `PUT` sobre la ruta base.

## Consecuencias

- Superficie única `/api/v1/*`; no hay alias sin versión.
- Endpoints deprecados (sub-paths de filtro + variantes de activación de tenant) **removidos**.
- Legacy `/hanoit/api/v1/*` con equivalente **removido**; el resto en `docs/api/LEGACY_SUNSET_PLAN.md`.
- Mapa completo: `docs/api/ENDPOINT_MIGRATION_MAP.md`.
- `mvn test`: 1104 tests, 0 fallos.

## Validación

- `mvn test` verde (1104 tests). Suite de tests migrada a `/api/v1/*`.

> **Nota (Jul 2026):** Conteo histórico al aprobar este ADR. Gate vigente: [ADR-006](ADR-006-quality-gates-static-analysis.md) — `mvn verify`, JaCoCo 90%.

## Actualización (Nov 2026) — unificación completada

La decisión queda plenamente implementada. Además de las URLs, se unificaron los **internals**:

- Desaparecen `com.hanoit.controller.api.rest.v1|v2` y `com.hanoit.routing.v3.*.controller`;
  todos los controllers viven en `com.hanoit.routing.controller`.
- No queda ningún endpoint con `deprecated = true`: los que no se usaban fueron eliminados
  y el resto se modernizó (DTOs + `TenantContext`).
- Los tags fantasma de Swagger (`Migrated: *`, `Legacy: *`, `Route Planning`) se retiraron y
  se declararon los realmente usados (`Routing`, `Positions`, `Driver`, `Assigned Services`,
  `Admin: Geocoding Config`). El 2026-11-19 se retiraron `Assigned Services` y `Migration` junto
  con el resto del legacy ([`../api/ENDPOINT_MIGRATION_MAP.md`](../api/ENDPOINT_MIGRATION_MAP.md) §7).

Detalle de endpoints retirados y cambios de contrato:
[`../api/LEGACY_SUNSET_PLAN.md`](../api/LEGACY_SUNSET_PLAN.md) §2 y
[`../api/ENDPOINT_MIGRATION_MAP.md`](../api/ENDPOINT_MIGRATION_MAP.md) §5.
