# CIE-001: Retiro del legacy, regresión completa y cierre de trazabilidad

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f8-cierre` |
| Clave anterior | F8-01 · `LEGACY-SUNSET` |
| Depende de | MAE-002, MAE-009, JOR-007, SEG-001, EMP-006, PLA-003 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-legacy-sunset` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | — |
| Maqueta | — |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Eliminar todo resto del backend antiguo y del código muerto, y demostrar con la regresión completa y la trazabilidad que el 100 % de lo funcional está cubierto.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Estado de pruebas `app.test` con llamadas a localhost:3000/server/* | `test_controller.js; config.js:453` | Se retira |
| L2 | Satellizer configurado (Facebook/Google) sin uso | `modules/config.js; custom/config/config.js` | Se retira |
| L3 | server.js con MongoDB y `/auth/*` social | `server/server.js` | Se retira (queda proxy + estáticos) |
| L4 | `server/services/route.js` sin uso | `server/services/route.js` | Se retira |
| L5 | Mocks `json/*.json` | `json/` | Se retira |
| L6 | `path.api.*`, `clientId`, `clientSecret`, `AppFaceId`, `AppGoogleId` | `custom/config/constant.js` | Se retira |

### Contrato `/api/v1`

Sin endpoints propios (historia transversal).

## 2. Historia de usuario

Como equipo de ingeniería, quiero retirar todo el código heredado y demostrar la cobertura completa, para cerrar la migración sin deuda.

## 3. Alcance

**Incluye**

- Borrar `test_controller` y `app.test`, `app.submenu`, Satellizer (`$authProvider`, social), MongoDB del servidor, `server/services/*`, mocks `json/*`, `server/response/*`, shims de compatibilidad (`resincTknRefresh`), constantes legacy; `legacy-scan` = 0 en todo `master/js`; regresión E2E completa; TRACEABILITY 100 %.

**Excluye (no tocar)**

- —
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/config/config.js`
- `master/js/custom/config/constant.js`
- `master/js/custom/test/test_controller.js`
- `master/js/modules/config.js`
- `package.json`
- `server/sidebar-menu.json`
- `tests/api/legacy-sunset.api.test.mjs`
- `tests/e2e/legacy-sunset.e2e.mjs`
- `tests/integration/legacy-sunset/**`
- `tests/unit/legacy-sunset/**`
- `specs/migracion-api-v1/f8-cierre/evidencia/CIE-001/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Eliminar código, estados y dependencias legacy sin uso
- **RF-2** — Dejar `legacy-scan` en 0 sobre todo el repo
- **RF-3** — Ejecutar la regresión completa (unit, integración, E2E por rol)
- **RF-4** — Cerrar TRACEABILITY al 100 % (legacy y endpoints)
- **RF-5** — Actualizar README de arranque y `.env.example`

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado el build, Entonces `$state.get()` no contiene `app.test`, `app.submenu`, `app.itinerary.*`, `app.routes.*`, `app.catalogs.*` salvo redirecciones declaradas
- **CA-2** (RF-2) — Dado `node tools/specs.mjs legacy-scan`, Entonces 0 coincidencias
- **CA-3** (RF-3) — Dado los 4 roles, Cuando corre la suite E2E de recorrido por menú, Entonces cada entrada abre su pantalla sin errores de consola
- **CA-4** (RF-4) — Dado `node tools/specs.mjs trace`, Entonces 0 elementos sin cubrir y todas las specs `accepted`
- **CA-5** (RF-5) — Dado un clon limpio, Cuando sigo el README, Entonces la app arranca contra mock-api

## 6. Diseño y restricciones técnicas

Eliminar ficheros listados; limpiar `bower.json`/`package.json` de dependencias sin uso (satellizer, mongoose, jwt-simple, faker…).

**Pantallas y flujos.** No aplica. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.test, app.submenu` | `—` | — | Se eliminan |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[CIE-001 CA-1]` en `tests/unit/legacy-sunset/` |
| T-2 | CA-2 | unitaria | Prueba `[CIE-001 CA-2]` en `tests/unit/legacy-sunset/` |
| T-3 | CA-3 | e2e | Prueba `[CIE-001 CA-3]` en `tests/e2e/legacy-sunset.e2e.mjs` |
| T-4 | CA-4 | unitaria | Prueba `[CIE-001 CA-4]` en `tests/unit/legacy-sunset/` |
| T-5 | CA-5 | e2e | Prueba `[CIE-001 CA-5]` en `tests/e2e/legacy-sunset.e2e.mjs` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: MAE-002, MAE-009, JOR-007, SEG-001, EMP-006, PLA-003.
- Riesgos: Borrar algo aún referenciado: la regresión lo detecta.
- Preguntas abiertas: ninguna.

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/CIE-001/...` |
| CA-2 | | | `evidencia/CIE-001/...` |
| CA-3 | | | `evidencia/CIE-001/...` |
| CA-4 | | | `evidencia/CIE-001/...` |
| CA-5 | | | `evidencia/CIE-001/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (dependencias tras retiros) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
