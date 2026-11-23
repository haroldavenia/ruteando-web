# PLA-001: Plataforma: gestión de empresas (super_admin, nuevo)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f7-plataforma` |
| Clave anterior | F7-01 · `TENANTS-ADMIN` |
| Depende de | ACC-005 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-tenants-admin` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /tenants`, `GET /tenants/{id}`, `GET /tenants/slug/{slug}`, `POST /tenants`, `PUT /tenants/{id}`, `PATCH /tenants/{id}` |
| Maqueta | `docs/ui/maquetas/index.html#pla-001` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Consola de plataforma para listar, buscar por slug, crear, editar y activar/desactivar empresas con motivo.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | No existe | `—` | Nuevo |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/tenants` | — | Lista/Page | 403 | `get__tenants.json` |
| GET | `/api/v1/tenants/{id}` | — | Tenant | 404 | `get__tenants__id.json` |
| GET | `/api/v1/tenants/slug/{slug}` | — | Tenant | 404 | `get__tenants__slug__slug.json` |
| POST | `/api/v1/tenants` | `{name,slug,taxId,country,timezone*,plan,config{maxDeposits,maxDrivers,maxRoutesMonthly,maxAdmins,maxAddressesPerFile,maxGeocodedAddresses,maxDefaultResources}}` (sin unidades: 400 si se envían) | 201 | 400, 409 slug | `post__tenants.json` |
| PUT | `/api/v1/tenants/{id}` | Tenant | 200 | 400 | `put__tenants__id.json` |
| PATCH | `/api/v1/tenants/{id}` | `{active,reason}` | 200 | 400 | `patch__tenants__id.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador de la plataforma, quiero gestionar las empresas cliente, para dar de alta, ajustar y suspender cuentas.

## 3. Alcance

**Incluye**

- Listado, ficha, alta, edición, activar/desactivar con motivo obligatorio.

**Excluye (no tocar)**

- Borrado físico (no existe).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/platform/**`
- `master/js/modules/config.js`
- `master/js/modules/services/tenants.api.js`
- `server/sidebar-menu.json`
- `tests/api/tenants-admin.api.test.mjs`
- `tests/e2e/tenants-admin.e2e.mjs`
- `tests/integration/tenants-admin/**`
- `tests/unit/tenants-admin/**`
- `specs/migracion-api-v1/f7-plataforma/evidencia/PLA-001/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar empresas
- **RF-2** — Buscar por slug
- **RF-3** — Crear y editar empresa (plan, límites)
- **RF-4** — Activar/desactivar con motivo

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado super_admin, Entonces listado de empresas con plan y estado
- **CA-2** (RF-2) — Dado slug `acme`, Entonces `GET /tenants/slug/acme`; 404 → «No existe»
- **CA-3** (RF-3) — Dado alta, Entonces `POST /tenants`; 409 → slug en uso
- **CA-4** (RF-4) — Dado desactivar sin motivo, Entonces no se envía; con motivo, `PATCH {active:false,reason}`
- **CA-5** (RF-3) — Dado slug `Acme Log`, Entonces validación local; dado `-1` en un límite, Entonces se muestra «Ilimitado»

## 6. Diseño y restricciones técnicas

Ampliar `tenants.api.js`; crear `custom/platform/*`.

**Pantallas y flujos.** Plataforma → Empresas. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.platform.tenants (nuevo)` | `pages/platform/tenants*.jade` | super_admin | Nuevo |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[PLA-001 CA-1]` en `tests/unit/tenants-admin/` |
| T-2 | CA-1 | contrato | Prueba `[PLA-001 CA-1]` en `tests/integration/tenants-admin/` |
| T-3 | CA-1 | e2e | Prueba `[PLA-001 CA-1]` en `tests/e2e/tenants-admin.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[PLA-001 CA-2]` en `tests/unit/tenants-admin/` |
| T-5 | CA-2 | contrato | Prueba `[PLA-001 CA-2]` en `tests/integration/tenants-admin/` |
| T-6 | CA-3 | unitaria | Prueba `[PLA-001 CA-3]` en `tests/unit/tenants-admin/` |
| T-7 | CA-3 | contrato | Prueba `[PLA-001 CA-3]` en `tests/integration/tenants-admin/` |
| T-8 | CA-4 | unitaria | Prueba `[PLA-001 CA-4]` en `tests/unit/tenants-admin/` |
| T-9 | CA-4 | contrato | Prueba `[PLA-001 CA-4]` en `tests/integration/tenants-admin/` |
| T-10 | CA-4 | e2e | Prueba `[PLA-001 CA-4]` en `tests/e2e/tenants-admin.e2e.mjs` |
| T-11 | CA-5 | unitaria | Prueba `[PLA-001 CA-5]` en `tests/unit/tenants-admin/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: ACC-005.
- Riesgos: —
- Preguntas abiertas: ninguna.

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/PLA-001/...` |
| CA-2 | | | `evidencia/PLA-001/...` |
| CA-3 | | | `evidencia/PLA-001/...` |
| CA-4 | | | `evidencia/PLA-001/...` |
| CA-5 | | | `evidencia/PLA-001/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §13); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (E5, D4) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
