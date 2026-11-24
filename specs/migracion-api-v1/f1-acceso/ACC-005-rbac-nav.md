# ACC-005: Roles, guardas de navegación, menú e inicio

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f1-acceso` |
| Clave anterior | F1-05 · `RBAC-NAV` |
| Depende de | ACC-004, FND-005 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-rbac-nav` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | — |
| Maqueta | `docs/ui/maquetas/index.html#acc-005` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Aplicar los roles del JWT (`super_admin`, `tenant_admin`, `agent`, `driver`) a estados, menú e inicio, con pantalla «Sin permiso» y manejo uniforme de 403.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Menú fijo de 9 entradas (Maps, Settings, Journeys, Routes, Places, Vehicle types, Vehicles, Drivers, catalog) | `server/sidebar-menu.json` | Cambia: menú por rol con todas las áreas nuevas |
| L2 | Estados sin control de acceso | `modules/config.js` | Cambia: `data.roles` |
| L3 | Home estática | `home.jade` | Cambia: accesos por rol (y resumen en fases posteriores) |
| L4 | Estado `app.submenu` y `app.test` de demostración | `config.js:85,453` | Se retira (CIE-001) |

### Contrato `/api/v1`

Sin endpoints propios (historia transversal).

## 2. Historia de usuario

Como administrador de la empresa, quiero que cada rol vea solo lo que puede usar, para evitar errores 403 y accesos indebidos.

## 3. Alcance

**Incluye**

- `data.roles` en todos los estados, guarda en `$stateChangeStart`, menú filtrado por rol, página `app.forbidden`, aviso para `driver` (usa la app móvil), home con accesos por rol.

**Excluye (no tocar)**

- Contenido de cada módulo.
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/jade/views/pages/forbidden.jade/**`
- `master/jade/views/pages/home.jade`
- `master/js/modules/config.js`
- `master/js/modules/services/config.js`
- `master/js/modules/services/nav_items.js`
- `master/js/modules/services/role_guard.js`
- `master/js/modules/services/sidebar-menu.js`
- `server/sidebar-menu.json`
- `tests/api/rbac-nav.api.test.mjs`
- `tests/e2e/rbac-nav.e2e.mjs`
- `tests/integration/rbac-nav/**`
- `tests/unit/rbac-nav/**`
- `specs/migracion-api-v1/f1-acceso/evidencia/ACC-005/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Declarar roles permitidos en cada estado ui-router
- **RF-2** — Impedir la navegación a estados no permitidos llevando a `app.forbidden`
- **RF-3** — Filtrar el menú lateral por rol
- **RF-4** — Mostrar a `driver` un aviso de que su uso es la app móvil y cerrar sesión
- **RF-5** — Tratar cualquier 403 `FORBIDDEN` con un aviso y sin romper la pantalla
- **RF-6** — Mostrar en home los accesos del rol

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado `$state.get()`, Cuando recorro los estados `app.*`, Entonces todos tienen `data.roles` no vacío
- **CA-2** (RF-2) — Dado un `agent`, Cuando navego a `#/app/users`, Entonces termino en `app.forbidden`
- **CA-3** (RF-3) — Dado un `tenant_admin`, Entonces el menú muestra operación + Usuarios, Conductores, Empresa, Facturación, Auditoría; dado `agent`, Entonces muestra operación (incluidas Flota, Lugares, Zonas, Configuraciones, Asignaciones) y no Usuarios, Conductores, Empresa, Facturación, Invitaciones
- **CA-4** (RF-3) — Dado `super_admin`, Entonces el menú incluye Plataforma y operación, y no Empresa, Facturación ni Invitaciones (son de `tenant_admin`)
- **CA-5** (RF-4) — Dado un login de `driver`, Entonces ve el aviso de app móvil y vuelve a login
- **CA-6** (RF-5) — Dado un 403 en una acción, Entonces aviso «No tienes permiso» y la pantalla sigue operativa
- **CA-7** (RF-6) — Dado cada rol, Cuando abro home, Entonces solo veo accesos permitidos
- **CA-8** (RF-2) — Dado las cuentas del tenant `sdd-test` (`SDD_TEST_AGENT_*`, `SDD_TEST_DRIVER_*`, `SDD_TEST_SUPERADMIN_*` en `.env`), Cuando la sonda inicia sesión con cada una, Entonces el `role` del JWT es el esperado y `GET /users` responde 403 para `agent` y 200 para `tenant_admin`

## 6. Diseño y restricciones técnicas

Crear `modules/services/role_guard.js`, `pages/forbidden.jade`, `nav_items.js` (menú por rol desde `sidebar-menu.json` con `roles`). Modificar `config.js`, `sidebar-menu.js`, `server/sidebar-menu.json`, `home.jade`. Matriz (migration-guide §2): **operación** (lugares, zonas, tipos de vehículo, vehículos, configuraciones, paquetes, geocodificación, jornadas, ruteo, seguimiento, asignaciones) = super_admin, tenant_admin, agent; **empresa** (mi empresa, facturación, invitaciones, usuarios, conductores, auditoría de empresa) = tenant_admin (usuarios y conductores también super_admin); **plataforma** (empresas, auditoría global, migración, geocodificación) = super_admin; **cuenta** (perfil, preferencias, mi actividad) = todos; dominios maestros = tenant_admin, super_admin; `driver` sin acceso web.

**Pantallas y flujos.** Login → `CurrentUser` → menú y guardas. Matriz rol×estado en `## Diseño técnico`. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.forbidden (nuevo)` | `pages/forbidden.jade` | autenticado | Nueva |
| `app.home` | `home.jade` | web | Accesos por rol |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[ACC-005 CA-1]` en `tests/unit/rbac-nav/` |
| T-2 | CA-2 | unitaria | Prueba `[ACC-005 CA-2]` en `tests/unit/rbac-nav/` |
| T-3 | CA-2 | e2e | Prueba `[ACC-005 CA-2]` en `tests/e2e/rbac-nav.e2e.mjs` |
| T-4 | CA-3 | unitaria | Prueba `[ACC-005 CA-3]` en `tests/unit/rbac-nav/` |
| T-5 | CA-3 | e2e | Prueba `[ACC-005 CA-3]` en `tests/e2e/rbac-nav.e2e.mjs` |
| T-6 | CA-4 | e2e | Prueba `[ACC-005 CA-4]` en `tests/e2e/rbac-nav.e2e.mjs` |
| T-7 | CA-5 | e2e | Prueba `[ACC-005 CA-5]` en `tests/e2e/rbac-nav.e2e.mjs` |
| T-8 | CA-6 | unitaria | Prueba `[ACC-005 CA-6]` en `tests/unit/rbac-nav/` |
| T-9 | CA-7 | e2e | Prueba `[ACC-005 CA-7]` en `tests/e2e/rbac-nav.e2e.mjs` |
| T-10 | CA-8 | sonda API | Prueba `[ACC-005 CA-8]` en `tests/api/rbac-nav.api.test.mjs` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: ACC-004, FND-005.
- Riesgos: El backend es la autoridad: cualquier 403 se maneja aunque el menú lo oculte.
- Pregunta no bloqueante: ¿`agent` gestiona maestros, paquetes y jornadas? → Decisión propuesta: Resuelta: sí (migration-guide §2); usuarios, invitaciones, billing y empresa no (403)

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/ACC-005/...` |
| CA-2 | | | `evidencia/ACC-005/...` |
| CA-3 | | | `evidencia/ACC-005/...` |
| CA-4 | | | `evidencia/ACC-005/...` |
| CA-5 | | | `evidencia/ACC-005/...` |
| CA-6 | | | `evidencia/ACC-005/...` |
| CA-7 | | | `evidencia/ACC-005/...` |
| CA-8 | | | `evidencia/ACC-005/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §2); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-23 | E2 resuelto: tenant `sdd-test` con `tenant_admin`, `agent`, `driver` y `super_admin`; sonda por rol | BACKEND_PENDIENTES E2 | pendiente |
