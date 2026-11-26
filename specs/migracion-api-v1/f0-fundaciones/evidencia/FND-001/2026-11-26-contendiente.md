# Informe contendiente — FND-001 — 2026-11-26

- Agente / modelo efectivo: subagente `contendiente` (contexto limpio) / nivel `pro` de Antigravity (familia Google/Gemini; versión concreta no expuesta al subagente) · modelo de la sesión principal declarado por el orquestador: modelo Orchestrator de Antigravity (familia Google/Gemini; no es Claude)
- Commit evaluado: `e52772a641f3c66b4f5439824a2b969dbe49cefb`
- Rama / worktree: `feat/67-arnes-de-pruebas` (base `angularjs-main`)

## Veredicto
PASS

## Resultado por criterio
| CA | Resultado | Evidencia (comando + salida resumida / archivo:línea) |
| --- | --- | --- |
| CA-1 | No verificado | Fuera del alcance de la verificación focalizada (`C-1..C-4`); ejecución de Karma en `ChromeHeadless` bloqueada en sandbox y **No verificado (sin CI del commit)** para `e52772a6` |
| CA-2 | Cumple | Corrección de `C-2` verificada en proceso sobre `tests/tools/capture-fixture.mjs:14-18,21,26-31,43,62-66` (`fixtureName`, `sanitizeRoute`, `fixture.name` y `sanitize`) y mediante `tests/tools/mock-api.test.mjs:72-94` (`✔` en `npm test`). Limitación: `fixture()` en Karma queda fuera del alcance focalizado y **No verificado (sin CI del commit)** |
| CA-3 | Cumple | Corrección de `C-3` verificada en memoria contra `createMockApi()` en `tests/mock-api/server.mjs:44-51` (`404` con `/` final tras `DELETE` y en las 8 colecciones para `/no-existe/`, `400` ante `http://[bad` sin derribar el proceso). Limitación: las 5 pruebas HTTP de `tests/tools/mock-api.test.mjs` fallan en sandbox por `connect EACCES 127.0.0.1` y la suite de red (`test:server`/`test:e2e`) queda **No verificado (sin CI del commit)** |
| CA-4 | No verificado | Fuera del alcance de la verificación focalizada (`C-1..C-4`); prueba HTTP en `tests/tools/mock-api.test.mjs:61-70` bloqueada por `EACCES` en sandbox y **No verificado (sin CI del commit)** |
| CA-5 | No verificado | Corrección de `C-1` verificada en `$env:TEMP` sobre `master/gulpfile.js:115-120,343-351` y `tests/e2e/ensure-build.mjs:30-31,36-42` (`gulp build` falla con `exit 1` sin escribir `.build-stamp` o caducándolo a `mtimeMs = 0`, y `needsBuild()` devuelve `true`). La prueba E2E real en navegador (`npm run test:e2e`) queda **No verificado (sin CI del commit)** |
| CA-6 | Cumple | Corrección de `C-4` verificada en `tests/api/_client.mjs:25-40`: `node --test --test-reporter=tap tests/api/arnes-de-pruebas.api.test.mjs` con `BACKEND_URL=https://localhost:8443`, `SDD_NO_ENV_FILE=1` y `BACKEND_CA_FILE` o `NODE_EXTRA_CA_CERTS` apuntando a un PEM inválido sale `0` con `# SKIP BACKEND_CA_FILE no es un certificado PEM válido`, y `tests/tools/mock-api.test.mjs:106-121` pasa (`✔`) en `npm test` |
| CA-7 | No verificado | Fuera del alcance de la verificación focalizada (`C-1..C-4`); `harness.test.mjs` (`--spec`) pasa en `npm test`, pero Karma/Playwright quedan **No verificado (sin CI del commit)** |
| CA-8 | No verificado | Fuera del alcance de la verificación focalizada (`C-1..C-4`); `node tools/specs.mjs dod FND-001` devolvió `exit 1` únicamente por el veredicto `FAIL` previo del 2026-11-25 en `evidencia/FND-001/` |
| CA-9 | Cumple | `npm run coverage:tools` → `exit 0` (`38/38`, `gulp-node-compat.cjs` `100.00 %`, `diff-coverage.mjs` `98.60 %`); `npm run coverage:merge` (`3/3 archivos`) + `npm run coverage:diff -- --base angularjs-main` → `exit 0` (`100% (46/46 líneas)`). Salvedad en Limitaciones: `coverage/unit` y `coverage/server` son los preexistentes en `coverage/` |
| CA-10 | No verificado | Corrección de `C-1` verificada en `$env:TEMP` (`gulp build` + `needsBuild()`) y con `tests/tools/ensure-build.test.mjs:46-58` (`5/5` en `npm test`, exige `login2.html`, `bootstrap.css` y `es.json`/`en.json`/`es_AR.json`). La ejecución completa en runner limpio (`bower install` + E2E) queda **No verificado (sin CI del commit)** |

## Hallazgos
| # | Severidad (Crítica/Alta/Media/Baja) | Criterio o regla | Archivo:línea | Cómo reproducir | Impacto |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | Verificación focalizada sobre `C-1`, `C-2`, `C-3` y `C-4`: los 4 hallazgos del informe del 2026-11-25 quedaron reproducidos y confirmados como corregidos en `e52772a6` (ver detalle abajo); no se buscaron hallazgos nuevos | Ninguno |

### Verificación focalizada de `C-1..C-4`
1. **`C-1` (Corregido — `master/gulpfile.js:115-120,343-351`; `tests/e2e/ensure-build.mjs:30-31`)**:
   - `handleError` acumula errores en `buildErrors` y `build_stamp` falla con error cuando `buildErrors.length > 0`, caducando `app/.build-stamp` si existía (`utimesSync(stamp, 0, 0)`) en lugar de escribir una marca vigente. `REQUIRED_OUTPUTS` exige ahora `app/views/pages/login2.html`, `app/css/bootstrap.css` y `app/i18n/{es,en,es_AR}.json`.
   - Reproducción ejecutada en `$env:TEMP`: (a) con artefactos obsoletos `app/js/app.js`/`app/css/app.css` y errores de sintaxis en `login2.jade`, `app.less` y `app.init.js`, `gulp build` salió `1` (`build con 4 error(es): no se escribe app/.build-stamp`), `app/.build-stamp` y `app/views/pages/login2.html` no se crearon (`false`), y `needsBuild(tmpRepo)` devolvió `true`; (b) con artefactos y `.build-stamp` previos válidos (retirando solo en la copia temporal el `@import` remoto de `fonts.googleapis.com` en `typo.less` para compilar offline) y error en `login2.jade`, `gulp build` salió `1` (`build con 1 error(es)`), dejó `stampMtimeMs = 0` y `needsBuild(tmpRepo)` devolvió `true`; (c) con fuentes válidas (sin `@import` remoto), `gulp build` salió `0`, escribió `.build-stamp` y `needsBuild(tmpRepo)` devolvió `false` (con el `@import` remoto original sin red, `$.minifyCss()` abortó en `styles_app` con `exit 1` sin escribir `.build-stamp`).
2. **`C-2` (Corregido — `tests/tools/capture-fixture.mjs:14-18,21,26-31,43,62-66`)**:
   - `fixtureName()` y `fixture.name` aplican `sanitizeRoute(route)`; `sanitizeRoute` reemplaza cualquier token en `/invitations/accept/<token>` sin mínimo de longitud (`[^/?]+`); `PERSON_KEYS` enmascara `taxId`, `nit`, `ipAddress` e `ip`; y `sanitize()` sustituye teléfonos en texto libre (`/\+\d{10,13}\b/g`).
   - Reproducción ejecutada en proceso: `fixtureName('GET', '/invitations/accept/my-real-invite-token-xyz123')` → `'get__invitations__accept__token'`; `sanitizeRoute('/invitations/accept/short1234567')` → `'/invitations/accept/token'`; `fixture.name` con esa ruta → `'GET /api/v1/invitations/accept/token'`; `sanitize({ taxId: '900123456-1', ipAddress: '190.24.10.5', description: 'User Real Person (+573101234567) logged in' })` → `{"taxId":"000000000-0","ipAddress":"0.0.0.0","description":"User Real Person (+570000000000) logged in"}`.
3. **`C-3` (Corregido — `tests/mock-api/server.mjs:44-51`)**:
   - `handler` envuelve `new URL(req.url, 'http://mock')` en `try/catch` respondiendo HTTP `400` (`BAD_REQUEST`, `'URL mal formada'`) y recorta barras finales en `url.pathname` (`replace(/\/+$/, '')`) antes de enrutar `respond()`.
   - Reproducción ejecutada en memoria sobre `createMockApi().server.emit('request', req, res)`: tras `POST /api/v1/places` (`201`) + `DELETE /api/v1/places/{id}` (`204`), `GET /api/v1/places/{id}`, `GET /api/v1/places/{id}/` y `GET /api/v1/places/{id}///` devolvieron `404`; `GET /api/v1/{col}/no-existe/` en las 8 colecciones devolvió `404` en todas; `GET` con `req.url = 'http://[bad'` respondió `400` sin lanzar excepción y `GET /api/v1/places` posterior devolvió `200`.
4. **`C-4` (Corregido — `tests/api/_client.mjs:25-40`)**:
   - `backendAgent(caFile)` se ejecuta dentro de `try/catch` al cargar el módulo; si el PEM es inválido, `caError` se expone vía `missing()` para omitir las sondas con `# SKIP` en lugar de abortar el proceso al importar.
   - Reproducción ejecutada: `node --test --test-reporter=tap tests/api/arnes-de-pruebas.api.test.mjs` con `BACKEND_URL=https://localhost:8443`, `SDD_NO_ENV_FILE=1` y `BACKEND_CA_FILE` (y también `NODE_EXTRA_CA_CERTS`) apuntando a un archivo temporal con `NOT A PEM CERT` → `exit 0`, `# SKIP BACKEND_CA_FILE no es un certificado PEM válido (...): sonda no ejecutada`, `# fail 0`, `# skipped 1`.

## Comandos ejecutados (literal)
```
git rev-parse HEAD -> exit 0 (e52772a641f3c66b4f5439824a2b969dbe49cefb)
node tools/validate-harness.mjs . -> exit 0 (Configuración de Antigravity válida)
node tools/specs.mjs lint FND-001 -> exit 0 (Resultado: PASS)
node tools/specs.mjs trace -> exit 0 (Trazabilidad: OK)
node tools/specs.mjs dod FND-001 -> exit 1 (falla únicamente por veredicto de contendiente: FAIL previo en evidencia/FND-001/)
npm test -> exit 1 (60 tests: 55 pass, 5 fail en tests/tools/mock-api.test.mjs por connect EACCES 127.0.0.1 en sandbox; ensure-build, gulp-node-compat, capture-fixture y sondas PEM inválido/ausente pasan)
npm run coverage:tools -> exit 0 (38 pass, 0 fail; master/gulp-node-compat.cjs 100.00%, tools/diff-coverage.mjs 98.60%)
npm run coverage:merge -> exit 0 (lcov: 3/3 archivos -> coverage/lcov.info)
npm run coverage:diff -- --base angularjs-main -> exit 0 (100% 46/46 líneas -> PASA)
node "$env:TEMP\contendiente-c1-detail.mjs" -> exit 0 (eliminado tras ejecución; probó C-1 con gulp build real y needsBuild() en $env:TEMP: casos A, C offline, D0 limpio sin Google Fonts y D1 con marca previa y login2.jade roto)
node "$env:TEMP\contendiente-c234-repro.mjs" -> exit 0 (eliminado tras ejecución; verificó C-2 en capture-fixture.mjs, C-3 en memoria sobre createMockApi() y C-4 con node --test sobre PEM inválido)
```

## Limitaciones y no verificado
- **Independencia del modelo (no simulada):** El subagente `contendiente` (`model: pro`) pertenece a la familia Google/Gemini y el modelo de la sesión principal declarado por el orquestador (`modelo Orchestrator de Antigravity`) también pertenece a la familia Google/Gemini (no es Claude). Ambos pertenecen a la misma familia y pueden corresponder al mismo modelo subyacente, por lo que **no existe independencia entre familias** en esta verificación.
- **Sin CI del commit evaluado (`e52772a6`):** Al comprobar `specs/migracion-api-v1/f0-fundaciones/evidencia/FND-001/2026-11-26-ci-e52772a6.md` justo antes de emitir este informe, el archivo no existe (solo consta `2026-11-26-ci-a6b8f359.md` de un commit anterior). Por las restricciones del sandbox (`BypassSandbox: false`), todo lo que requiere puertos loopback, navegador o red queda **No verificado (sin CI del commit)** para `e52772a6`: las 5 pruebas HTTP de `tests/tools/mock-api.test.mjs` (fallidas en sandbox por `connect EACCES 127.0.0.1`), `npm run test:server`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `bower install` / `styles_app` con red real hacia `fonts.googleapis.com` en runner limpio, `eslint@10.15.0` / `lint-diff.mjs`, `npm audit` y `gitleaks`.
- **Cobertura de `unit` y `server`:** `npm run coverage:merge` usó `coverage/unit/lcov.info` y `coverage/server/lcov.info` preexistentes en `coverage/` al no poder ejecutarse Karma ni `test:server` en sandbox.
- **Alcance focalizado y contexto limpio:** Por decisión humana aprobada para esta revisión tras el ciclo 3, solo se verificaron `C-1`, `C-2`, `C-3` y `C-4` sin buscar hallazgos nuevos ni leer los informes de `implementador`, `validador` ni `calidad-seguridad` en `evidencia/FND-001/`. Todos los archivos temporales en `$env:TEMP` fueron eliminados y no se modificó ningún archivo del repositorio.
