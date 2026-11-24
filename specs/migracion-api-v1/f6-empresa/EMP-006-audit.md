# EMP-006: Auditoría del tenant y mi actividad (nuevo)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f6-empresa` |
| Clave anterior | F6-06 · `AUDIT` |
| Depende de | ACC-005 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-audit` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /audit-logs`, `GET /audit-logs/me`, `GET /audit-logs/{id}` |
| Maqueta | `docs/ui/maquetas/index.html#emp-006` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Seguridad de la Información |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Consultar el registro de auditoría de la empresa (administradores) y la actividad propia (todos).

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | No existe | `—` | Nuevo |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/audit-logs` | `?page&size&action&entityType&actorId&dateFrom&dateTo` (Instant UTC, inclusivos) | `PageResponse` estándar (`page`) | 400 `dateFrom` > `dateTo`; 403 | `get__audit-logs.json` |
| GET | `/api/v1/audit-logs/me` | `?page&size&action&entityType&dateFrom&dateTo` | Page sin `ipAddress` | 400 `dateFrom` > `dateTo` | `get__audit-logs__me.json` |
| GET | `/api/v1/audit-logs/{id}` | — | Evento | 403,404 | `get__audit-logs__id.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador de la empresa, quiero consultar la auditoría de mi empresa y mi actividad, para rendir cuentas y detectar cambios indebidos.

## 3. Alcance

**Incluye**

- Listados paginados (página `number`) con filtros `action`, `entityType`, `actorId`, detalle con cambios antes/después, «Mi actividad» sin IP.

**Excluye (no tocar)**

- Global (PLA-002).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/audit/**`
- `master/js/modules/config.js`
- `master/js/modules/services/audit_logs.api.js`
- `server/sidebar-menu.json`
- `tests/api/audit.api.test.mjs`
- `tests/e2e/audit.e2e.mjs`
- `tests/integration/audit/**`
- `tests/unit/audit/**`
- `specs/migracion-api-v1/f6-empresa/evidencia/EMP-006/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar eventos de la empresa con filtros
- **RF-2** — Listar mi actividad
- **RF-3** — Ver el detalle con cambios antes/después
- **RF-4** — Normalizar roles y descripciones heterogéneas
- **RF-5** — Filtrar por rango de fechas (desde/hasta) en «Empresa» y «Mi actividad»

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado filtro `entityType=package`, Entonces `GET /audit-logs?page=0&size=20&entityType=package` y paginación leída de `page` (`ApiClient.page` también acepta el `number` antiguo)
- **CA-2** (RF-2) — Dado agente, Entonces solo «Mi actividad» y sin columna IP
- **CA-3** (RF-3) — Dado un evento con `changes`, Entonces tabla campo/antes/después; textos del servidor como texto plano
- **CA-4** (RF-4) — Dado `actorRole` `TENANT_ADMIN` y `tenant_admin`, Entonces misma etiqueta
- **CA-5** (RF-5) — Dado desde 2026-11-01 y hasta 2026-11-23 en la zona horaria de la empresa (America/Bogota), Entonces `dateFrom=2026-11-01T05:00:00.000Z&dateTo=2026-11-24T04:59:59.999Z` (inicio y fin del día local en UTC, ambos inclusivos)
- **CA-6** (RF-5) — Dado «desde» posterior a «hasta», Entonces el botón Filtrar se deshabilita con «La fecha inicial debe ser anterior a la final» y no se envía; si aun así llega 400, se muestra el mismo texto

## 6. Diseño y restricciones técnicas

Crear `audit_logs.api.js`, `custom/audit/*`.

**Pantallas y flujos.** Menú → Auditoría. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.audit (nuevo)` | `pages/audit/*` | tenant_admin (empresa); todos los roles web (mi actividad) | Nuevo |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[EMP-006 CA-1]` en `tests/unit/audit/` |
| T-2 | CA-1 | contrato | Prueba `[EMP-006 CA-1]` en `tests/integration/audit/` |
| T-3 | CA-1 | e2e | Prueba `[EMP-006 CA-1]` en `tests/e2e/audit.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[EMP-006 CA-2]` en `tests/unit/audit/` |
| T-5 | CA-2 | contrato | Prueba `[EMP-006 CA-2]` en `tests/integration/audit/` |
| T-6 | CA-3 | unitaria | Prueba `[EMP-006 CA-3]` en `tests/unit/audit/` |
| T-7 | CA-3 | e2e | Prueba `[EMP-006 CA-3]` en `tests/e2e/audit.e2e.mjs` |
| T-8 | CA-4 | unitaria | Prueba `[EMP-006 CA-4]` en `tests/unit/audit/` |
| T-9 | CA-5 | unitaria | Prueba `[EMP-006 CA-5]` en `tests/unit/audit/` |
| T-10 | CA-5 | contrato | Prueba `[EMP-006 CA-5]` en `tests/integration/audit/` |
| T-11 | CA-6 | unitaria | Prueba `[EMP-006 CA-6]` en `tests/unit/audit/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: ACC-005.
- Riesgos: Datos heterogéneos.
- Preguntas abiertas: ninguna.

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/EMP-006/...` |
| CA-2 | | | `evidencia/EMP-006/...` |
| CA-3 | | | `evidencia/EMP-006/...` |
| CA-4 | | | `evidencia/EMP-006/...` |
| CA-5 | | | `evidencia/EMP-006/...` |
| CA-6 | | | `evidencia/EMP-006/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §12); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (C4) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-23 | Filtros `dateFrom`/`dateTo` (M4); paginación por `page` (contrato v3) | migration-guide §12, endpoints.md (M4) | pendiente |
