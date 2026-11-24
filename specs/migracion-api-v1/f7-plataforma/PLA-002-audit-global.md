# PLA-002: Plataforma: auditoría global (super_admin, nuevo)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f7-plataforma` |
| Clave anterior | F7-02 · `AUDIT-GLOBAL` |
| Depende de | EMP-006, PLA-001 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-audit-global` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /audit-logs/admin` |
| Maqueta | `docs/ui/maquetas/index.html#pla-002` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Seguridad de la Información |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Consultar auditoría de todas las empresas con filtro de empresa y actor.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | No existe | `—` | Nuevo |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/audit-logs/admin` | `?page&size&action&entityType&tenantId&actorId&dateFrom&dateTo` (Instant UTC, inclusivos) | `PageResponse` (`page`) | 400 `dateFrom` > `dateTo`; 403 | `get__audit-logs__admin.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador de la plataforma, quiero consultar la auditoría de todas las empresas, para investigar incidentes transversales.

## 3. Alcance

**Incluye**

- Reutiliza la vista de EMP-006 con ámbito global y selector de empresa.

**Excluye (no tocar)**

- —
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/modules/config.js`
- `master/js/modules/services/audit_logs.api.js`
- `server/sidebar-menu.json`
- `tests/api/audit-global.api.test.mjs`
- `tests/e2e/audit-global.e2e.mjs`
- `tests/integration/audit-global/**`
- `tests/unit/audit-global/**`
- `specs/migracion-api-v1/f7-plataforma/evidencia/PLA-002/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar eventos de todas las empresas
- **RF-2** — Filtrar por empresa, acción, entidad y actor
- **RF-3** — Filtrar por rango de fechas (desde/hasta) además de empresa, acción, entidad y actor

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado super_admin, Entonces `GET /audit-logs/admin` y columna Empresa
- **CA-2** (RF-2) — Dado empresa X, Entonces `tenantId=X` en la consulta
- **CA-3** (RF-1) — Dado tenant_admin, Entonces el estado no es accesible (ACC-005)
- **CA-4** (RF-3) — Dado un rango de fechas y una empresa, Entonces la consulta lleva `tenantId`, `dateFrom` y `dateTo` en UTC (inicio y fin del día local, inclusivos) con la misma utilidad que EMP-006; «desde» posterior a «hasta» no se envía

## 6. Diseño y restricciones técnicas

Ampliar `audit_logs.api.js`.

**Pantallas y flujos.** Plataforma → Auditoría. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.platform.audit (nuevo)` | `pages/audit/*` | super_admin | Ámbito global |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[PLA-002 CA-1]` en `tests/unit/audit-global/` |
| T-2 | CA-1 | contrato | Prueba `[PLA-002 CA-1]` en `tests/integration/audit-global/` |
| T-3 | CA-1 | e2e | Prueba `[PLA-002 CA-1]` en `tests/e2e/audit-global.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[PLA-002 CA-2]` en `tests/unit/audit-global/` |
| T-5 | CA-3 | unitaria | Prueba `[PLA-002 CA-3]` en `tests/unit/audit-global/` |
| T-6 | CA-4 | unitaria | Prueba `[PLA-002 CA-4]` en `tests/unit/audit-global/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: EMP-006, PLA-001.
- Riesgos: —
- Preguntas abiertas: ninguna.

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/PLA-002/...` |
| CA-2 | | | `evidencia/PLA-002/...` |
| CA-3 | | | `evidencia/PLA-002/...` |
| CA-4 | | | `evidencia/PLA-002/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (C4) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-23 | Filtros `dateFrom`/`dateTo` (M4) | endpoints.md (M4) | pendiente |
