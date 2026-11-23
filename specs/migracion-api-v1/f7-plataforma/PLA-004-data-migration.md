# PLA-004: Plataforma: migración de datos heredados

| Campo | Valor |
| --- | --- |
| Estado | Descartada |
| Iniciativa / Fase | `migracion-api-v1` / `f7-plataforma` |
| Clave anterior | F7-04 · `DATA-MIGRATION` |
| Depende de | PLA-003 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-data-migration` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | — |
| Maqueta | — |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Infraestructura & DevOps |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

> **Descartada (2026-11-19):** el backend eliminó `/api/v1/admin/migrate*` (404): la plataforma arranca en limpio, sin migración de datos legacy. Se conserva como registro; no se implementa.

## 1. Objetivo y contexto

Ejecutar y validar la migración de colecciones heredadas al esquema nuevo (pasos idempotentes).

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | No existe | `—` | Nuevo |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/admin/migrate` | — | `{paso: resultado}` | 403,500 | — |
| POST | `/api/v1/admin/migrate/{step}` | — | `{paso: resultado}` | 404 paso | — |
| GET | `/api/v1/admin/migrate/validate` | — | `{coleccion: conteo}` | 403 | — |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador de la plataforma, quiero migrar datos heredados (retirada: el backend arranca en limpio), para —.

## 3. Alcance

**Incluye**

- Ejecutar todo, ejecutar un paso, validar conteos; resultados por paso.

**Excluye (no tocar)**

- —
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/modules/config.js`
- `master/js/modules/services/admin.api.js`
- `server/sidebar-menu.json`
- `tests/api/data-migration.api.test.mjs`
- `tests/e2e/data-migration.e2e.mjs`
- `tests/integration/data-migration/**`
- `tests/unit/data-migration/**`
- `specs/migracion-api-v1/f7-plataforma/evidencia/PLA-004/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Ejecutar todos los pasos con confirmación reforzada
- **RF-2** — Ejecutar un paso concreto
- **RF-3** — Validar conteos por colección
- **RF-4** — Mostrar resultados por paso

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado «Ejecutar todo», Entonces confirmación escribiendo «MIGRAR» y `POST /admin/migrate`
- **CA-2** (RF-2) — Dado paso `places`, Entonces `POST /admin/migrate/places`
- **CA-3** (RF-3) — Dado «Validar», Entonces tabla colección/conteo
- **CA-4** (RF-4) — Dado resultado, Entonces tabla paso/resultado

## 6. Diseño y restricciones técnicas

Ampliar `admin.api.js`.

**Pantallas y flujos.** Plataforma → Migración. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.platform.migration (nuevo)` | `pages/platform/migration.jade` | super_admin | Nuevo |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[PLA-004 CA-1]` en `tests/unit/data-migration/` |
| T-2 | CA-1 | e2e | Prueba `[PLA-004 CA-1]` en `tests/e2e/data-migration.e2e.mjs` |
| T-3 | CA-2 | unitaria | Prueba `[PLA-004 CA-2]` en `tests/unit/data-migration/` |
| T-4 | CA-3 | unitaria | Prueba `[PLA-004 CA-3]` en `tests/unit/data-migration/` |
| T-5 | CA-3 | e2e | Prueba `[PLA-004 CA-3]` en `tests/e2e/data-migration.e2e.mjs` |
| T-6 | CA-4 | unitaria | Prueba `[PLA-004 CA-4]` en `tests/unit/data-migration/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: PLA-003.
- Riesgos: Operación sensible; solo en ventana de mantenimiento.
- Pregunta no bloqueante: Lista de pasos → Decisión propuesta: Ejemplos documentados: tenants, users, drivers…; leer del resultado de `POST /admin/migrate`

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/PLA-004/...` |
| CA-2 | | | `evidencia/PLA-004/...` |
| CA-3 | | | `evidencia/PLA-004/...` |
| CA-4 | | | `evidencia/PLA-004/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §13); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (retirada: el backend eliminó `/api/v1/admin/migrate*` (404): la plataforma arranca en limpio, sin migración de datos legacy) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
