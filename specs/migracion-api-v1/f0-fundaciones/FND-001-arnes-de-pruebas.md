# FND-001: Arnés de pruebas del frontend (unit, contrato, E2E, sondas API)

| Campo | Valor |
| --- | --- |
| Estado | En progreso |
| Iniciativa / Fase | `migracion-api-v1` / `f0-fundaciones` |
| Clave anterior | F0-01 · `SDD-TOOLING` |
| Depende de | — |
| Issue | #67 |
| Rama | `feat/67-arnes-de-pruebas` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | — |
| Maqueta | — |
| ADR relacionados | ADR-0002, ADR-0004 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Dejar ejecutables las cuatro suites (unit, integración de contrato, E2E, sonda API), la captura de evidencias y el CLI de gates, para que todas las specs posteriores puedan cerrar G3–G5.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | `npm test` apunta a `karma.conf.js` inexistente con dependencias de 2015 | `package.json` | Cambia: karma 6 + jasmine + ChromeHeadless |
| L2 | Build Gulp `gulp build`/`sourcemaps` genera app/js/app.js, app/views | `master/gulpfile.js` | Se mantiene: los E2E compilan antes de ejecutar |
| L3 | Sin pruebas en el repo | `—` | Cambia: pirámide completa |

### Contrato `/api/v1`

Sin endpoints propios (historia transversal).

## 2. Historia de usuario

Como integrante del equipo de ingeniería, quiero ejecutar pruebas unitarias, de contrato, E2E y sondas API con un solo comando y en CI, para que cada historia demuestre sus criterios con evidencia reproducible.

## 3. Alcance

**Incluye**

- karma.conf.js, angular-mocks 1.3.15, ChromeHeadless, coverage y JUnit; Playwright; tests/mock-api con fixtures; node:test para sondas; scripts npm; helpers de fixtures; tests/tools/capture-fixture.mjs; validación del CLI tools/specs.mjs.

**Excluye (no tocar)**

- Cambios funcionales en master/js.
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `.env.example`
- `.github/workflows/ci.yml`
- `eslint.config.mjs`
- `karma.conf.cjs`
- `package.json`
- `package-lock.json`
- `playwright.config.mjs`
- `tools/merge-lcov.mjs`
- `tools/diff-coverage.mjs`
- `tools/test/diff-coverage.test.mjs`
- `master/bower.json`
- `.nvmrc`
- `master/gulpfile.js`
- `master/gulp-node-compat.cjs`
- `docs/engineering/calidad-y-ci.md`
- `tools/test/merge-lcov.test.mjs`
- `tests/README.md`
- `tests/helpers/**`
- `tests/mock-api/**`
- `tests/api/_client.mjs`
- `tests/api/arnes-de-pruebas.api.test.mjs`
- `tests/tools/**`
- `tests/e2e/ensure-build.mjs`
- `tests/e2e/arnes-de-pruebas.e2e.mjs`
- `tests/fixtures/api-v1/**` (solo lectura; nuevos con capture-fixture)
- `docs/engineering/estrategia-de-pruebas.md`
- `docs/engineering/calidad-y-ci.md`
- `docs/architecture/adr/0005-controles-de-calidad.md`
- `specs/migracion-api-v1/f0-fundaciones/evidencia/FND-001/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Ejecutar pruebas unitarias de AngularJS con el orden de carga real de base.js + app.js (bower + módulos) en ChromeHeadless
- **RF-2** — Cargar fixtures reales `tests/fixtures/api-v1/*.json` desde las pruebas con `fixture(nombre)`
- **RF-3** — Levantar `tests/mock-api` (Express) que sirva `/api/v1/**` desde fixtures con CRUD en memoria y escenarios de error
- **RF-4** — Ejecutar E2E Playwright contra `server/server.js` + mock-api, y opcionalmente contra backend real (`E2E_LIVE=1`)
- **RF-5** — Ejecutar sondas API `node:test` con credenciales de `.env`
- **RF-6** — Producir JUnit y `coverage-summary.json` por suite y filtrar por spec (`--spec <ID>`)
- **RF-7** — Etiquetar cada prueba con `[<ID> CA-<n>]` para que `node tools/specs.mjs dod <ID>` verifique que todo CA tiene prueba
- **RF-8** — Generar `coverage/lcov.info` de la suite unitaria (Karma + istanbul) y de las pruebas de servidor (`node --test`) para `tools/diff-coverage.mjs` (≥ 90 % en líneas nuevas o modificadas)
- **RF-9** — Compilar la app de forma reproducible en CI con Node 24 LTS (bower + Gulp: scripts y plantillas Jade) para los E2E

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado el repo limpio, Cuando ejecuto `npm run test:unit`, Entonces una prueba de humo que inyecta `$state` del módulo `angle` pasa en ChromeHeadless y se genera `reports/junit-unit.xml`
- **CA-2** (RF-2) — Dado `get__places__id.json`, Cuando una prueba llama `fixture('get__places__id')`, Entonces recibe el objeto con `response.body.location.coordinates` de longitud 2
- **CA-3** (RF-3) — Dado mock-api arrancado, Cuando hago `GET /api/v1/places?page=0&size=20` con Bearer, Entonces responde 200 con forma de página; sin Bearer responde 401
- **CA-4** (RF-3) — Dado mock-api y la cabecera `x-mock-scenario: 409`, Cuando hago `POST /api/v1/places`, Entonces responde 409 `{error:'CONFLICT'}`
- **CA-5** (RF-4) — Dado `npm run test:e2e`, Cuando corre la prueba de humo, Entonces compila con Gulp, arranca server.js con `BACKEND_URL` del mock y la página `#/access/login` muestra el formulario
- **CA-6** (RF-5) — Dado `BACKEND_URL` sin definir, Cuando ejecuto `npm run test:api`, Entonces las sondas se marcan como no ejecutadas con mensaje claro y el proceso sale 0 sin generar falsos verdes en `junit-api.xml`
- **CA-7** (RF-6) — Dado `--spec FND-001`, Cuando ejecuto una suite, Entonces solo corren las pruebas cuyo nombre contiene `[FND-001 ` y se genera JUnit en `reports/`
- **CA-8** (RF-7) — Dado una historia con un CA sin prueba etiquetada, Cuando `node tools/specs.mjs dod <ID>`, Entonces falla y lista el CA
- **CA-9** (RF-8) — Dado `npm run coverage:unit`, Entonces existe `coverage/lcov.info` con rutas relativas a la raíz del repo y `node tools/diff-coverage.mjs --lcov coverage/lcov.info --base angularjs-main` lo procesa sin error
- **CA-10** (RF-9) — Dado un runner limpio con Node 24, Cuando corre el job `e2e` de CI, Entonces `bower install` y `gulp` generan `app/js/app.js` y las vistas, y la prueba de humo de login pasa

## 6. Diseño y restricciones técnicas

Crear: `karma.conf.cjs`, `playwright.config.mjs`, `tests/helpers/fixtures.js`, `tests/helpers/bootstrap.spec.js`, `tests/mock-api/server.mjs`, `tests/mock-api/store.mjs`, `tests/tools/capture-fixture.mjs`, `tests/api/_client.mjs`, `.env.example`. Modificar: `package.json` (scripts `test:unit`, `test:integration`, `test:e2e`, `test:api`, devDependencies karma 6, karma-jasmine, karma-chrome-launcher, karma-coverage, karma-junit-reporter, angular-mocks@1.3.15, @playwright/test, express). No tocar `master/js`. CI: jobs `unit`, `e2e` en `.github/workflows/ci.yml`.

**Pantallas y flujos.** No aplica (infraestructura). Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Prueba (`[FND-001 CA-n]`) |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | `tests/helpers/bootstrap.spec.js` |
| T-2 | CA-2 | unitaria | `tests/helpers/bootstrap.spec.js` |
| T-3 | CA-2 | arnés | `tests/tools/harness.test.mjs` |
| T-4 | CA-3 | e2e | `tests/e2e/arnes-de-pruebas.e2e.mjs` |
| T-5 | CA-3 | servidor | `tests/server/proxy.test.mjs` |
| T-6 | CA-4 | e2e | `tests/e2e/arnes-de-pruebas.e2e.mjs` |
| T-7 | CA-4 | servidor | `tests/server/proxy.test.mjs` |
| T-8 | CA-5 | e2e | `tests/e2e/arnes-de-pruebas.e2e.mjs` |
| T-9 | CA-6 | sonda API | `tests/api/arnes-de-pruebas.api.test.mjs` |
| T-10 | CA-6 | arnés | `tests/tools/harness.test.mjs` |
| T-11 | CA-7 | arnés | `tests/tools/harness.test.mjs` |
| T-12 | CA-8 | arnés | `tests/tools/harness.test.mjs` |
| T-13 | CA-9 | arnés | `tests/tools/harness.test.mjs` |
| T-14 | CA-10 | e2e | `tests/e2e/arnes-de-pruebas.e2e.mjs` |
| T-15 | CA-10 | arnés | `tests/tools/ensure-build.test.mjs` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: —.
- Riesgos: Versiones de karma modernas con AngularJS 1.3 (sin problemas conocidos). `base.js`/`app.js` compilados por Gulp: la suite unit carga las fuentes `master/js/**` en el orden del gulpfile + `app/js/base.js` (vendor).
- Pregunta no bloqueante: ¿Node de referencia en los equipos? (Playwright exige ≥18) → Decisión propuesta: Resuelta (2026-11-25): Node 24 LTS (`.nvmrc`)
- Pregunta no bloqueante: ¿CI disponible (GitHub Actions/Jenkins)? → Decisión propuesta: Añadir workflow en spec posterior; las suites corren en local

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | `tests/helpers/bootstrap.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-001/2026-11-20-implementador.md` |
| CA-2 | `tests/helpers/bootstrap.spec.js`, `tests/tools/harness.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-001/2026-11-20-implementador.md` |
| CA-3 | `tests/e2e/arnes-de-pruebas.e2e.mjs`, `tests/server/proxy.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-001/2026-11-20-implementador.md` |
| CA-4 | `tests/e2e/arnes-de-pruebas.e2e.mjs`, `tests/server/proxy.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-001/2026-11-20-implementador.md` |
| CA-5 | `tests/e2e/arnes-de-pruebas.e2e.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-001/2026-11-20-implementador.md` — **pendiente de ejecutar** (requiere build) |
| CA-6 | `tests/api/arnes-de-pruebas.api.test.mjs`, `tests/tools/harness.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-001/2026-11-20-implementador.md` |
| CA-7 | `tests/tools/harness.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-001/2026-11-20-implementador.md` |
| CA-8 | `tests/tools/harness.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-001/2026-11-20-implementador.md` |
| CA-9 | `tests/tools/harness.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-001/2026-11-20-implementador.md` |
| CA-10 | `tests/e2e/arnes-de-pruebas.e2e.mjs`, `tests/tools/ensure-build.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-001/2026-11-20-implementador.md` — **pendiente de ejecutar** (requiere build) |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-20 | v4: alineada al arnés harness-engineering (diff-coverage 90 %, CI) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-20 | Implementación propuesta de F0 a petición del usuario (alcance «Arnés + F0 implementado»), antes de la aprobación formal de la spec: los gates G0 (Lista) y G5 (merge) siguen pendientes de una persona. | Pedido explícito del usuario 2026-11-20 | pendiente |
| 2026-11-20 | CA-1: Karma carga angular/angular-mocks 1.3.15 de npm y un módulo `angle` de prueba (`tests/helpers/app-shim.js`) con el código de `tests/helpers/sources.json`; la carga completa de la app (base.js de bower + app.js) pasa a E2E (CA-5/CA-10). RF-1 se lee así. | Bower no está en npm ni en CI sin `bower install`; las unitarias deben correr en cualquier equipo (ADR-0005) | pendiente |
| 2026-11-20 | Archivos autorizados ajustados a lo implementado (CI, ESLint, `tools/merge-lcov.mjs`, `tests/e2e/ensure-build.mjs`, `tests/tools/**`); `master/js` no se toca. | Implementación F0 | pendiente |
| 2026-11-20 | CA-5 y CA-10 requieren la app compilada (bower + Gulp): no ejecutables en el contenedor de la sesión; quedan pendientes de ejecución en el equipo o en CI (`ci / e2e`). | Entorno sin registro de bower | pendiente |
| 2026-11-24 | Estado → Lista | — | Harold Avenia |
| 2026-11-24 | CA-9: la rama base de `diff-coverage` pasa de `--base main` a `--base angularjs-main` | La rama base de la línea AngularJS es `angularjs-main` (ADR-0001); `main` es la línea Angular 22 | Harold Avenia (instrucción del 2026-11-24) |
| 2026-11-25 | Alcance: se añaden `tools/diff-coverage.mjs` y su prueba. En Windows `toRelative()` no relativizaba rutas cuando la letra de unidad difiere o falta (`tools/test/diff-coverage.test.mjs:131`, 1 !== 0) | `npm test` 46/47 en Windows (Node 25) | Harold Avenia |
| 2026-11-25 | Alcance: se añade `master/bower.json` (bloque `resolutions`) para que `bower install` no interactivo de CI no aborte con `ECONFLICT` (d3, angular-ui-router, bootstrap, jspdf, angular-ui-utils, modernizr, angular-animate, angular-touch fijados a la versión que tenía instalada la app). `diff-coverage` excluye borrados y amplía el búfer (ENOBUFS en #69) | CI de #69: job e2e (`ECONFLICT d3`) y test-and-coverage (`ENOBUFS`) | Harold Avenia |
| 2026-11-25 | Entorno: Node 24 LTS para desarrollo y CI (`.nvmrc` = 24, `engines` `^24`, `NODE_VERSION` 24 en `ci.yml`). El build legacy (Gulp + `gulp-minify-css`, 2015) usa `util.isRegExp` y otras `util.is*`, eliminadas en Node 23+; se añade `master/gulp-node-compat.cjs` (cargado al inicio de `master/gulpfile.js`) que las define solo si faltan y solo en el proceso de Gulp. Retirarlo al actualizar o sustituir esos plugins (deuda técnica) | `npm run test:e2e` con Node 25: `TypeError util.isRegExp is not a function`; con Node 24 + compat el build supera `vendor_app` | Harold Avenia |
| 2026-11-25 | Build: `scripts_app` concatena con `\n;\n` entre archivos. Un archivo legacy termina en `}])` sin `;` y el siguiente archivo de F0 empieza por `(function(){`: en `app/js/app.js` quedaba `App.factory(...)(function(){…})`, la SPA no arrancaba (`App.factory(...) is not a function`, luego `Unknown provider: RouteHelpersProvider`) y CA-5/CA-10 fallaban con la página en blanco | Traza de Playwright de `npm run test:e2e` (Node 24, Windows) y job `e2e` de #70 | Harold Avenia (cambio dentro de `master/gulpfile.js`, ya autorizado) |
