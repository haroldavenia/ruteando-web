# Informe validador — FND-001 — 2026-11-25

- Agente / modelo efectivo: validador ejecutado en la sesión del orquestador (Antigravity, Claude Opus 5.5) a petición del usuario (`/validar-spec FND-001`). No hubo subagente con contexto limpio: esta sesión vio el bloqueo previo de la base (merge `bb278bc7`) y la petición del cambio de `toRelative()`, pero no el razonamiento ni las sesiones del implementador. El informe del implementador se leyó solo al final, para contrastarlo; no se usa como evidencia.
- Commit evaluado: `7aa029b0` (HEAD de `feat/67-arnes-de-pruebas`, PR #70 en borrador)
- Base: `origin/angularjs-main` = `6e024675` (incluye la restauración de la línea AngularJS, #69)
- Entorno local: Windows, Node v24.22.3 (`.nvmrc` = 24), Chrome Headless 153. CI: run `CI` 45706181427 sobre `7aa029b0`.

## Veredicto
PASS WITH GAPS

Los 10 CA tienen prueba etiquetada y los comprobé ejecutando sus comandos (local y/o CI). Quedan hallazgos de alcance y cobertura (1 y 2) que debe decidir una persona antes de `Hecha`.

## Resultado por criterio
| CA | Resultado | Evidencia (comando + salida resumida / archivo:línea) |
| --- | --- | --- |
| CA-1 | Cumple con matiz (hallazgo 1) | `npm run test:unit` → `Executed 48 of 48 SUCCESS`; `reports/junit-unit.xml` existe. `tests/helpers/bootstrap.spec.js:3` comprueba AngularJS 1.3.15 y el módulo `angle` (inyecta `ApiClient` y `MasterDomains`), **no `$state`** como dice el CA; la reinterpretación está en la §11 (2026-11-20) con "Aprobó: pendiente". |
| CA-2 | Cumple | `tests/helpers/bootstrap.spec.js:12` asserts `response.status` 200 y `response.body.location.coordinates.length` 2 sobre `fixture('get__places__id')`; pasa dentro de los 48/48 de Karma. `tests/tools/harness.test.mjs:74` (capture-fixture) pasa en `npm test` 48/48. |
| CA-3 | Cumple | `npm run test:server` → 15/15 (`tests/server/proxy.test.mjs:18`, `:38`). E2E `tests/e2e/arnes-de-pruebas.e2e.mjs:13` (200 con claves `content,page,size,totalElements,totalPages`; 401 sin Bearer) → ok, local y CI. |
| CA-4 | Cumple | `tests/server/proxy.test.mjs:28` y E2E `arnes-de-pruebas.e2e.mjs:20` (409 y `error: 'CONFLICT'`) → ok, local y CI. |
| CA-5 | Cumple | Build forzado en local (borrado `app/js/app.js`): `npm run test:e2e` → `ensure-build: compilando con Gulp` · `Finished 'build' after 18 s` · `ok 3 … [FND-001 CA-5] [FND-001 CA-10] la SPA compilada carga #/access/login con el formulario` · `7 passed (12.1s)`. La prueba exige `form` y `input[type=password]` visibles y 0 `pageerror`. |
| CA-6 | Cumple | `BACKEND_URL=''`, `SDD_NO_ENV_FILE=1`, `npm run test:api` → exit 0; las 6 sondas salen `# BACKEND_URL no está definido (.env): sonda no ejecutada`; `ℹ pass 0 · skipped 6`; `reports/junit-api.xml`: 6 testcase, 6 skipped, 0 failures (sin falsos verdes). `tests/tools/harness.test.mjs:16` pasa. |
| CA-7 | Cumple | `npm run test:unit -- --spec FND-001` → `Executed 2 of 48 (skipped 46) SUCCESS`; `tests/tools/harness.test.mjs:25` (grep `[FND-001 `, JUnit `junit-unit.xml` / `junit-integration.xml`) pasa. |
| CA-8 | Cumple | `tests/tools/harness.test.mjs:49`: en un repo temporal, `specs.mjs dod FND-004` sale ≠ 0 y lista `CA-2 tiene prueba etiquetada [FND-004 CA-2]` → pasa en `npm test`. |
| CA-9 | Cumple | `npm run coverage:unit` → `coverage/unit/lcov.info` con rutas relativas (`SF:master\js\modules\…`, 0 rutas absolutas). `coverage:server`, `coverage:tools`, `coverage:merge` → exit 0. `node tools/diff-coverage.mjs --lcov coverage/lcov.info --base origin/angularjs-main` lo procesa sin error (exit 1 = umbral, no error de proceso; ver hallazgo 2). `tools/test/diff-coverage.test.mjs` y `harness.test.mjs:65` pasan. |
| CA-10 | Cumple | CI run 45706181427 (`7aa029b0`), job `e2e` success: `node-version: 24`, `bower install` no interactivo resuelve sin `ECONFLICT`, `ensure-build: compilando con Gulp` · `Finished 'build' after 19 s` · `✓ [FND-001 CA-5] [FND-001 CA-10] …` · `7 passed`. `tests/tools/ensure-build.test.mjs:8`, `:23` pasan. |

## Hallazgos
| # | Severidad | Criterio o regla | Archivo:línea | Cómo reproducir | Impacto |
| --- | --- | --- | --- | --- | --- |
| 1 | Media | CA-1 vs prueba; §11 | `tests/helpers/bootstrap.spec.js:3`; spec §5 CA-1 y §11 (2026-11-20) | Leer el CA-1 ("inyecta `$state` del módulo `angle`") y la prueba (inyecta `ApiClient`/`MasterDomains` sobre `tests/helpers/app-shim.js`) | El texto del CA no coincide con lo que se demuestra. La reinterpretación figura en la §11 con aprobación "pendiente". Hace falta que una persona la apruebe y se reescriba el CA-1, o añadir la aserción de `$state`. |
| 2 | Media | AGENTS.md §4 (cobertura ≥ 90 % en líneas nuevas o modificadas, "sin excluir archivos") | `master/gulp-node-compat.cjs` (21 líneas, 0 %), `master/gulpfile.js` (15 líneas, 0 %) | `node tools/diff-coverage.mjs --lcov coverage/lcov.info --base origin/angularjs-main` → **16.28 % (7/43) FALLA**; con el filtro de CI (`--include '^(master/js|server|tools)/…'`) → 100 % (7/7) PASA | La CI pasa porque su filtro deja fuera `master/*.cjs|js` de raíz, no porque esas líneas estén cubiertas. Su comportamiento solo se demuestra de forma indirecta en el E2E (el build funciona). Opciones: prueba `node:test` para `gulp-node-compat.cjs` (polyfills puros) incluida en la cobertura, o excepción en la §8 con aprobador. Lo traslado a calidad-seguridad. |
| 3 | Baja | §11 | spec §11, filas 2026-11-20 (×4) | Revisar la columna "Aprobó" | 4 decisiones siguen con "Aprobó: pendiente" (implementación previa a `Lista`, CA-1, archivos autorizados, CA-5/CA-10). Necesitan firma humana antes de `Hecha`. |
| 4 | Baja | CA-6 (aserción parcial) | `tests/tools/harness.test.mjs:16-23` | Leer la prueba | Comprueba la salida TAP (`# SKIP`, `# pass 0`), pero no `junit-api.xml`, que el CA menciona. Lo verifiqué a mano (6 skipped, 0 failures). Una regresión en el reporter JUnit no la detectaría. |
| 5 | Observación | RF-5 (fuera de CA-6) | `.env` (valores no leídos) | `node --test tests/api/arnes-de-pruebas.api.test.mjs` con el `.env` local | Contra `BACKEND_URL` real la sonda se ejecuta, pero el login responde `HTTP 401 INVALID_CREDENTIALS`. Es un problema de credenciales del entorno, no del arnés; CA-6 solo cubre la ausencia de `BACKEND_URL`. |
| 6 | Observación | CA-5 en local | `tests/e2e/ensure-build.mjs` | `npm run test:e2e` con `app/` al día → `ensure-build: app/ al día` | En local, con `app/` reciente, la corrida no recompila. Para evidencia de CA-5 en local hay que forzar el build, como hice aquí. En CI siempre compila. |

Archivos del diff ⊂ "Archivos autorizados": sí. 12 archivos de producto y pruebas, todos en la lista (con las ampliaciones del 2026-11-25 aprobadas en la §11), más la propia spec. `legacy-scan --id FND-001` → `Total 0; bloqueantes 0`. Sin interfaz propia (maqueta "—"): no se recorrió pantalla, salvo el humo de `#/access/login` del E2E.

## Comandos ejecutados (literal)
```
git diff origin/angularjs-main...HEAD --stat                    -> 13 files changed, 192 insertions(+), 28 deletions(-)
npm test                                                         -> exit 0 · tests 48 · pass 48 · fail 0
npm run test:unit                                                -> exit 0 · Executed 48 of 48 SUCCESS · reports/junit-unit.xml=True
npm run test:unit -- --spec FND-001                              -> exit 0 · Executed 2 of 48 (skipped 46) SUCCESS
npm run test:integration                                         -> exit 0 · Executed 16 of 16 SUCCESS · reports/junit-integration.xml=True
npm run test:server                                              -> exit 0 · tests 15 · pass 15 · fail 0
npm run coverage:unit                                            -> exit 0 · coverage/unit/lcov.info (SF relativas, 0 absolutas)
npm run coverage:server / coverage:tools / coverage:merge        -> exit 0 / 0 / 0 · lcov: 3/3 archivos → coverage/lcov.info
node tools/diff-coverage.mjs --lcov coverage/lcov.info --base origin/angularjs-main
                                                                 -> exit 1 · 16.28% (7/43) FALLA (gulp-node-compat.cjs 0/21, gulpfile.js 0/15, diff-coverage.mjs 7/7)
node tools/diff-coverage.mjs … --threshold 90 --include '^(master/js|server|tools)/.*\.(c|m)?js$' --exclude '<filtro de ci.yml>'
                                                                 -> exit 0 · 100% (7/7) PASA
npx -y eslint@10.15.0 -f json -o .tmp/val/eslint.json <6 archivos JS cambiados>
node tools/lint-diff.mjs --report .tmp/val/eslint.json --base origin/angularjs-main
                                                                 -> exit 0 · 0 problema(s) en líneas cambiadas; 0 heredado(s)
npm run test:e2e                     (app/ al día)               -> exit 0 · ensure-build: app/ al día · 7 passed (8.7s)
Remove-Item app/js/app.js; npm run test:e2e   (build forzado)    -> exit 0 · Finished 'build' after 18 s · 7 passed (12.1s)
BACKEND_URL='' SDD_NO_ENV_FILE=1 npm run test:api                -> exit 0 · pass 0 · skipped 6 · junit-api.xml 6 testcase / 6 skipped / 0 failures
node --test tests/api/arnes-de-pruebas.api.test.mjs  (.env real) -> exit 1 · login de la cuenta de pruebas: HTTP 401 INVALID_CREDENTIALS
gh run view 45706181427 (CI sobre 7aa029b0)                       -> config, test-and-coverage, e2e, lint: success; e2e con node-version 24, Finished 'build', 7 passed
node tools/specs.mjs lint FND-001                                -> PASS
node tools/specs.mjs dod FND-001                                 -> FAIL solo por faltar informes de validador, contendiente y calidad-seguridad
node tools/specs.mjs legacy-scan --id FND-001                    -> Total 0; bloqueantes 0
node tools/specs.mjs trace                                       -> Trazabilidad: OK
node tools/validate-harness.mjs .                                -> ✔ Configuración de Antigravity válida
git status --porcelain                                           -> vacío (sin cambios en el repo tras la validación)
```

## Limitaciones y no verificado
- Validación sin contexto limpio (ver cabecera); conviene que contendiente y calidad-seguridad la hagan en sesiones independientes.
- Karma, servidor, E2E y `npx` se ejecutaron fuera del sandbox: dentro de él ChromeHeadless no arranca, los puertos locales se cuelgan y `npx` no tiene red (`ENOTFOUND`). Son limitaciones del entorno, no del código.
- Sondas contra el backend real: **No verificado** (401 por credenciales de `.env`; hallazgo 5).
- CA-10 con Node 22: no aplica (el CA ya exige Node 24 tras la §11 del 2026-11-25).