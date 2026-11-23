# MAE-007: Catálogos → administración de dominios maestros

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f2-maestros` |
| Clave anterior | F2-07 · `MASTER-DOMAINS-ADMIN` |
| Depende de | FND-003, ACC-005 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-master-domains-admin` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /master-domains`, `GET /master-domains/{code}`, `GET /master-domains/{code}/values`, `POST /master-domains/{code}/values`, `PATCH /master-domains/{code}/values/{key}/toggle` |
| Maqueta | `docs/ui/maquetas/index.html#mae-007` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

La pantalla de catálogos se divide en: lista de dominios (solo lectura para los 12 de enum y `MeasurementUnit`) y edición de valores del único catálogo editable (`audit_actions`). Los motivos de estado por tenant viven en MAE-009.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Listado de catálogos con buscar/paginar/borrar | `catalogs_controller.js` | Cambia: lista de dominios sin borrado |
| L2 | Crear/editar catálogo con name/parent/ancestors | `catalog_controller.js; catalogs/form.jade` | Cambia: no se crean ni editan dominios (sin equivalente); solo añadir valor `{key,label,description,sortOrder}`; la jerarquía se retira |
| L3 | `DELETE /catalogs/:id` | `catalogs_http.js` | Se retira: sustituido por desactivar valor |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/master-domains` | — | Arreglo | 401 | `get__master-domains.json` |
| GET | `/api/v1/master-domains/{code}` | — | Dominio | 404 | `get__master-domains__code.json` |
| GET | `/api/v1/master-domains/{code}/values` | — | Valores | 404 | `get__master-domains__code__values.json` |
| POST | `/api/v1/master-domains/{code}/values` | `{key,label,description,sortOrder}` | 201 valor | 400,409 | `post__master-domains__code__values.json` |
| PATCH | `/api/v1/master-domains/{code}/values/{key}/toggle` | — | Valor con `isActive` invertido | 404 | `patch__master-domains__code__values__key__toggle.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador de la empresa, quiero consultar los catálogos y mantener los valores editables, para que los formularios ofrezcan opciones válidas.

## 3. Alcance

**Incluye**

- Lista de dominios, detalle con valores (clave, etiqueta, activo), añadir valor, alternar activo; invalidación de caché de FND-003.

**Excluye (no tocar)**

- Editar o borrar dominios/valores (no hay endpoint).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/catalogs/catalog_controller.js`
- `master/js/custom/catalogs/catalogs_controller.js`
- `master/js/custom/domains/**`
- `master/js/modules/config.js`
- `master/js/modules/services/catalogs_http.js`
- `master/js/modules/services/master_domains.api.js`
- `server/sidebar-menu.json`
- `tests/api/master-domains-admin.api.test.mjs`
- `tests/e2e/master-domains-admin.e2e.mjs`
- `tests/integration/master-domains-admin/**`
- `tests/unit/master-domains-admin/**`
- `specs/migracion-api-v1/f2-maestros/evidencia/MAE-007/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar dominios
- **RF-2** — Ver valores de un dominio
- **RF-3** — Añadir un valor
- **RF-4** — Activar/desactivar un valor
- **RF-5** — Refrescar la caché tras cambios

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado `get__master-domains.json`, Entonces lista con código y nº de valores
- **CA-2** (RF-2) — Dado un dominio, Entonces tabla de valores ordenada por `sortOrder` con clave, etiqueta, descripción y estado
- **CA-3** (RF-3) — Dado `audit_actions`, Cuando añado clave, etiqueta, descripción y orden, Entonces `POST /master-domains/audit_actions/values`; en un catálogo de solo lectura el botón no aparece y un 422 `details.readOnlyCodes` se explica
- **CA-4** (RF-4) — Dado un valor de `audit_actions` activo, Cuando lo desactivo, Entonces `PATCH …/toggle`; dado `agent`, Entonces la acción no se ofrece (403 manejado)
- **CA-5** (RF-5) — Dado un cambio, Entonces `MasterDomains` invalida ese código

## 6. Diseño y restricciones técnicas

Crear `master_domains.api.js` (o ampliar FND-003), `custom/domains/*`. Eliminar `catalogs/*`, `catalogs_http.js`. Redirigir estados antiguos.

**Pantallas y flujos.** Dominios → detalle → añadir valor / alternar. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.catalogs.list → app.domains.list; app.catalogs.add/edit → app.domains.detail` | `pages/domains/*` | tenant_admin, super_admin | División de interfaz |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[MAE-007 CA-1]` en `tests/unit/master-domains-admin/` |
| T-2 | CA-1 | contrato | Prueba `[MAE-007 CA-1]` en `tests/integration/master-domains-admin/` |
| T-3 | CA-1 | e2e | Prueba `[MAE-007 CA-1]` en `tests/e2e/master-domains-admin.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[MAE-007 CA-2]` en `tests/unit/master-domains-admin/` |
| T-5 | CA-2 | e2e | Prueba `[MAE-007 CA-2]` en `tests/e2e/master-domains-admin.e2e.mjs` |
| T-6 | CA-3 | unitaria | Prueba `[MAE-007 CA-3]` en `tests/unit/master-domains-admin/` |
| T-7 | CA-3 | contrato | Prueba `[MAE-007 CA-3]` en `tests/integration/master-domains-admin/` |
| T-8 | CA-3 | e2e | Prueba `[MAE-007 CA-3]` en `tests/e2e/master-domains-admin.e2e.mjs` |
| T-9 | CA-4 | unitaria | Prueba `[MAE-007 CA-4]` en `tests/unit/master-domains-admin/` |
| T-10 | CA-4 | contrato | Prueba `[MAE-007 CA-4]` en `tests/integration/master-domains-admin/` |
| T-11 | CA-4 | e2e | Prueba `[MAE-007 CA-4]` en `tests/e2e/master-domains-admin.e2e.mjs` |
| T-12 | CA-5 | unitaria | Prueba `[MAE-007 CA-5]` en `tests/unit/master-domains-admin/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: FND-003, ACC-005.
- Riesgos: Dominios del sistema que no deberían alterarse.
- Pregunta no bloqueante: ¿Qué catálogos son editables? → Decisión propuesta: Resuelta (D6): solo `audit_actions`; escritura solo tenant_admin y super_admin

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/MAE-007/...` |
| CA-2 | | | `evidencia/MAE-007/...` |
| CA-3 | | | `evidencia/MAE-007/...` |
| CA-4 | | | `evidencia/MAE-007/...` |
| CA-5 | | | `evidencia/MAE-007/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §14, 16.1); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (D6, B6) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
