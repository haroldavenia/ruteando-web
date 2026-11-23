# PLA-003: Plataforma: configuración de geocodificación (singleton)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f7-plataforma` |
| Clave anterior | F7-03 · `GEOCODING-CONFIG` |
| Depende de | ACC-005 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-geocoding-config` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /admin/geocoding-config`, `PUT /admin/geocoding-config` |
| Maqueta | `docs/ui/maquetas/index.html#pla-003` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Leer y reemplazar la configuración de proveedores de geocodificación.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | No existe | `—` | Nuevo |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/geocoding-config` | — | Config | 403 | `get__admin__geocoding-config.json` |
| PUT | `/api/v1/admin/geocoding-config` | `{geocodingStrategyClassName,arcGisMaxAddressesPerRequest,arcGisMaxThreads,geocentrixMaxAddressesPerRequest,geocentrixMaxThreads}` (enteros ≥1) | 200 | 400 VALIDATION_ERROR (`details`), 403 | — |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador de la plataforma, quiero ajustar la configuración del motor de geocodificación, para equilibrar costo y rendimiento.

## 3. Alcance

**Incluye**

- Formulario con la estructura del singleton; nunca mostrar claves en claro si el backend las devuelve enmascaradas.

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
- `tests/api/geocoding-config.api.test.mjs`
- `tests/e2e/geocoding-config.e2e.mjs`
- `tests/integration/geocoding-config/**`
- `tests/unit/geocoding-config/**`
- `specs/migracion-api-v1/f7-plataforma/evidencia/PLA-003/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Ver la configuración
- **RF-2** — Reemplazarla completa con confirmación

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado super_admin, Entonces `GET /admin/geocoding-config` sin `{id}`
- **CA-2** (RF-2) — Dado guardar, Entonces confirmación y `PUT` con el objeto completo
- **CA-3** (RF-2) — Dado un entero en 0, Entonces validación local; dado 400 `VALIDATION_ERROR`, Entonces error junto al campo de `details`

## 6. Diseño y restricciones técnicas

Crear `admin.api.js`, vista.

**Pantallas y flujos.** Plataforma → Geocodificación. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.platform.geocoding (nuevo)` | `pages/platform/geocoding.jade` | super_admin | Nuevo |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[PLA-003 CA-1]` en `tests/unit/geocoding-config/` |
| T-2 | CA-1 | contrato | Prueba `[PLA-003 CA-1]` en `tests/integration/geocoding-config/` |
| T-3 | CA-1 | e2e | Prueba `[PLA-003 CA-1]` en `tests/e2e/geocoding-config.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[PLA-003 CA-2]` en `tests/unit/geocoding-config/` |
| T-5 | CA-2 | contrato | Prueba `[PLA-003 CA-2]` en `tests/integration/geocoding-config/` |
| T-6 | CA-3 | unitaria | Prueba `[PLA-003 CA-3]` en `tests/unit/geocoding-config/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: ACC-005.
- Riesgos: Secretos de proveedores.
- Pregunta no bloqueante: ¿El GET devuelve claves? → Decisión propuesta: Resuelta: no hay claves en el singleton

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/PLA-003/...` |
| CA-2 | | | `evidencia/PLA-003/...` |
| CA-3 | | | `evidencia/PLA-003/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §GEOCODING_API §5); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
