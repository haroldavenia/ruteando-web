# MAE-009: Motivos de estado de paquete por empresa (nuevo)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f2-maestros` |
| Clave anterior | F2-09 · `STATUS-REASONS` |
| Depende de | FND-003, ACC-005 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-status-reasons` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /package-status-reasons`, `POST /package-status-reasons`, `PUT /package-status-reasons/{key}`, `PATCH /package-status-reasons/{key}/toggle` |
| Maqueta | `docs/ui/maquetas/index.html#mae-009` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Cada empresa define por qué un paquete queda no atendido o cancelado (D14). Esta spec crea la administración de motivos y el selector reutilizable que usan paquetes (PAQ-002) y visitas (JOR-006).

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Las visitas no registraban motivo de no atención | `visits_controller.js` | Nuevo: motivo por tenant al cambiar estado |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/package-status-reasons` | `?status&active` | Lista ordenada por `sortOrder` y `key` | 401 | — (capturar) |
| POST | `/api/v1/package-status-reasons` | `{key,label,description,appliesTo[],sortOrder}` | 201 | 400, 403, 409 clave duplicada | — (capturar) |
| PUT | `/api/v1/package-status-reasons/{key}` | `{label,description,appliesTo,sortOrder}` | 200 | 400, 403, 404 | — (capturar) |
| PATCH | `/api/v1/package-status-reasons/{key}/toggle` | — | Motivo con `active` invertido | 403, 404 | — (capturar) |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador de la empresa, quiero definir los motivos por los que un paquete no se atiende o se cancela, para registrar causas homogéneas y medirlas.

## 3. Alcance

**Incluye**

- Listado por estado con orden, alta (clave, etiqueta, descripción, estados a los que aplica, orden), edición, activar/desactivar, directiva `status-reason-picker` reutilizable.

**Excluye (no tocar)**

- Reporte de entrega del conductor (app móvil).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/status_reasons/**`
- `master/js/custom/visits/visits_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/package_status_reasons.api.js`
- `master/js/modules/services/status_reason_picker.js`
- `server/sidebar-menu.json`
- `tests/api/status-reasons.api.test.mjs`
- `tests/e2e/status-reasons.e2e.mjs`
- `tests/integration/status-reasons/**`
- `tests/unit/status-reasons/**`
- `specs/migracion-api-v1/f2-maestros/evidencia/MAE-009/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar los motivos del tenant filtrando por estado y activos
- **RF-2** — Crear un motivo indicando a qué estados aplica (`unattended`, `cancelled`…)
- **RF-3** — Editar etiqueta, descripción, estados y orden (la clave es inmutable)
- **RF-4** — Activar y desactivar motivos (no hay borrado)
- **RF-5** — Ofrecer un selector reutilizable de motivos activos para un estado

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado el listado, Entonces `GET /package-status-reasons` y tabla con clave, etiqueta, estados y activo, ordenada por `sortOrder`
- **CA-2** (RF-2) — Dado clave `customer_absent` aplicable a `unattended`, Entonces `POST` con `appliesTo:['unattended']`; dado 409, Entonces «Ya existe esa clave»
- **CA-3** (RF-2) — Dado clave con espacios o mayúsculas, Entonces validación local (snake_case)
- **CA-4** (RF-3) — Dado edición, Entonces `PUT /package-status-reasons/{key}` sin cambiar la clave
- **CA-5** (RF-4) — Dado desactivar, Entonces `PATCH …/toggle` y el motivo deja de salir en el selector; los paquetes que ya lo tienen lo conservan
- **CA-6** (RF-5) — Dado `status-reason-picker` con `status='cancelled'`, Entonces pide `?status=cancelled&active=true` y, si no hay motivos, el cambio de estado no lo exige
- **CA-7** (RF-1) — Dado `agent`, Entonces ve el listado en solo lectura; crear/editar no se ofrece (403 manejado)

## 6. Diseño y restricciones técnicas

Crear `package_status_reasons.api.js`, `custom/status_reasons/*`, directiva `status_reason_picker.js`, vistas y menú.

**Pantallas y flujos.** Configuración → Motivos de estado → listado → nuevo/editar → activar/desactivar. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.statusReasons (nuevo)` | `pages/status_reasons/*` | lectura: todos los roles web; escritura: tenant_admin, super_admin | Nuevo |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[MAE-009 CA-1]` en `tests/unit/status-reasons/` |
| T-2 | CA-1 | contrato | Prueba `[MAE-009 CA-1]` en `tests/integration/status-reasons/` |
| T-3 | CA-1 | e2e | Prueba `[MAE-009 CA-1]` en `tests/e2e/status-reasons.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[MAE-009 CA-2]` en `tests/unit/status-reasons/` |
| T-5 | CA-2 | contrato | Prueba `[MAE-009 CA-2]` en `tests/integration/status-reasons/` |
| T-6 | CA-2 | e2e | Prueba `[MAE-009 CA-2]` en `tests/e2e/status-reasons.e2e.mjs` |
| T-7 | CA-3 | unitaria | Prueba `[MAE-009 CA-3]` en `tests/unit/status-reasons/` |
| T-8 | CA-4 | unitaria | Prueba `[MAE-009 CA-4]` en `tests/unit/status-reasons/` |
| T-9 | CA-4 | contrato | Prueba `[MAE-009 CA-4]` en `tests/integration/status-reasons/` |
| T-10 | CA-5 | unitaria | Prueba `[MAE-009 CA-5]` en `tests/unit/status-reasons/` |
| T-11 | CA-5 | e2e | Prueba `[MAE-009 CA-5]` en `tests/e2e/status-reasons.e2e.mjs` |
| T-12 | CA-6 | unitaria | Prueba `[MAE-009 CA-6]` en `tests/unit/status-reasons/` |
| T-13 | CA-7 | unitaria | Prueba `[MAE-009 CA-7]` en `tests/unit/status-reasons/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: FND-003, ACC-005.
- Riesgos: —
- Pregunta no bloqueante: ¿Motivos iniciales sugeridos? → Decisión propuesta: Ofrecer plantilla: cliente ausente, dirección errada, rechazado, reprogramado

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/MAE-009/...` |
| CA-2 | | | `evidencia/MAE-009/...` |
| CA-3 | | | `evidencia/MAE-009/...` |
| CA-4 | | | `evidencia/MAE-009/...` |
| CA-5 | | | `evidencia/MAE-009/...` |
| CA-6 | | | `evidencia/MAE-009/...` |
| CA-7 | | | `evidencia/MAE-009/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-19 | Spec nueva por D14 (respuesta del backend) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
