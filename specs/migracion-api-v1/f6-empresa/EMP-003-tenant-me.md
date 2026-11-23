# EMP-003: Mi empresa: datos, asientos y datos de facturación (nuevo)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f6-empresa` |
| Clave anterior | F6-03 · `TENANT-ME` |
| Depende de | ACC-005 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-tenant-me` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /tenants/me`, `PUT /tenants/me`, `PUT /tenants/me/billing` |
| Maqueta | `docs/ui/maquetas/index.html#emp-003` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Pantalla para que el administrador vea y edite los datos de su empresa, el uso de asientos/límites del plan y sus datos de facturación.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | No existe | `—` | Nuevo |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/tenants/me` | — | … + `config{maxDeposits,maxDrivers,maxRoutesMonthly,maxAdmins,maxAddressesPerFile,maxGeocodedAddresses,maxDefaultResources}` (sin unidades) | 403 | `get__tenants__me.json` |
| PUT | `/api/v1/tenants/me` | `{name*(≤200),country,timezone,companySize,industry}` | 200 | 400 | `put__tenants__me.json` |
| PUT | `/api/v1/tenants/me/billing` | `{billingEmail,taxId(≤50),billingAddress{line1,line2,city,state,postalCode,country}}` | 200 | 400 | `put__tenants__me__billing.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador de la empresa, quiero ver y editar los datos, límites y facturación de mi empresa, para mantener la cuenta en regla.

## 3. Alcance

**Incluye**

- Datos de empresa, límites (`config`), asientos, edición de datos y de facturación.

**Excluye (no tocar)**

- Suscripción Stripe (EMP-004).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/company/**`
- `master/js/modules/config.js`
- `master/js/modules/services/tenants.api.js`
- `server/sidebar-menu.json`
- `tests/api/tenant-me.api.test.mjs`
- `tests/e2e/tenant-me.e2e.mjs`
- `tests/integration/tenant-me/**`
- `tests/unit/tenant-me/**`
- `specs/migracion-api-v1/f6-empresa/evidencia/EMP-003/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Ver datos, plan, límites y asientos de la empresa
- **RF-2** — Editar datos de la empresa
- **RF-3** — Editar datos de facturación

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado el fixture, Entonces se ven nombre, plan, asientos usados/disponibles y límites
- **CA-2** (RF-2) — Dado cambio de nombre, Entonces `PUT /tenants/me`
- **CA-3** (RF-3) — Dado datos fiscales, Entonces `PUT /tenants/me/billing`; 400 marca campos
- **CA-4** (RF-1) — Dado `seats.limit = -1`, Entonces «Ilimitado»; dado `trial.expired:true`, Entonces aviso de prueba terminada con enlace a Facturación
- **CA-5** (RF-1) — Dado `config`, Entonces la ficha lista los límites del plan con «Ilimitado» para -1

## 6. Diseño y restricciones técnicas

Crear `tenants.api.js`, `custom/company/*`.

**Pantallas y flujos.** Menú → Empresa. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.company (nuevo)` | `pages/company/company.jade` | tenant_admin | Nuevo |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[EMP-003 CA-1]` en `tests/unit/tenant-me/` |
| T-2 | CA-1 | contrato | Prueba `[EMP-003 CA-1]` en `tests/integration/tenant-me/` |
| T-3 | CA-1 | e2e | Prueba `[EMP-003 CA-1]` en `tests/e2e/tenant-me.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[EMP-003 CA-2]` en `tests/unit/tenant-me/` |
| T-5 | CA-2 | contrato | Prueba `[EMP-003 CA-2]` en `tests/integration/tenant-me/` |
| T-6 | CA-3 | unitaria | Prueba `[EMP-003 CA-3]` en `tests/unit/tenant-me/` |
| T-7 | CA-3 | contrato | Prueba `[EMP-003 CA-3]` en `tests/integration/tenant-me/` |
| T-8 | CA-3 | e2e | Prueba `[EMP-003 CA-3]` en `tests/e2e/tenant-me.e2e.mjs` |
| T-9 | CA-4 | unitaria | Prueba `[EMP-003 CA-4]` en `tests/unit/tenant-me/` |
| T-10 | CA-5 | unitaria | Prueba `[EMP-003 CA-5]` en `tests/unit/tenant-me/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: ACC-005.
- Riesgos: —
- Preguntas abiertas: ninguna.

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/EMP-003/...` |
| CA-2 | | | `evidencia/EMP-003/...` |
| CA-3 | | | `evidencia/EMP-003/...` |
| CA-4 | | | `evidencia/EMP-003/...` |
| CA-5 | | | `evidencia/EMP-003/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §5); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (D4) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
