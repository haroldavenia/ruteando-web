# Informe calidad-seguridad — FND-001 — 2026-11-26

- Agente / modelo efectivo: `calidad-seguridad` (subagente con contexto limpio; `model: pro` en `.agents/agents/calidad-seguridad.md`)
- Commit evaluado: `a6b8f359344ae30933c652ab8a8d308caf691563`
- Rama / worktree: `feat/67-arnes-de-pruebas` (rama base: `angularjs-main`)
- Modalidad de revisión: subagente independiente con contexto limpio, ejecución estrictamente dentro del sandbox (`BypassSandbox: false`), sin lectura de informes previos de revisión en `specs/migracion-api-v1/f0-fundaciones/evidencia/FND-001/` ni modificación de archivos del repositorio.

## Veredicto
PASS WITH GAPS

## Resultado por criterio

| CA | Resultado | Evidencia (comando + salida resumida / archivo:línea) |
| --- | --- | --- |
| CA-1 | Cumple | En sandbox `npm run coverage:unit` -> exit 1 (`Cannot start ChromeHeadless`). Verificado en CI del commit `a6b8f359` (`specs/migracion-api-v1/f0-fundaciones/evidencia/FND-001/2026-11-26-ci-a6b8f359.md`: job `test-and-coverage` `success`). `tests/helpers/bootstrap.spec.js:3-10` tiene aserciones reales y etiqueta `[FND-001 CA-1]`. |
| CA-2 | Cumple | `npm test` en sandbox ejecutó `tests/tools/harness.test.mjs:82-90` y `tests/tools/mock-api.test.mjs:69-85` (ambos PASS). `tests/helpers/bootstrap.spec.js:12-16` cubierto en CI (`test-and-coverage` `success`). Observación Baja #1 en `tests/tools/capture-fixture.mjs:62` y `:14-18`. |
| CA-3 | Cumple | En sandbox `tests/tools/mock-api.test.mjs:22-56` y `npm run coverage:server` fallaron por bloqueo loopback TCP (`connect EACCES 127.0.0.1:<puerto>`). Verificado en CI del commit `a6b8f359` (`test-and-coverage` `success`, `e2e` `success`). `tests/mock-api/server.mjs:64-154` maneja errores 400/401/404/422/500. |
| CA-4 | Cumple | En sandbox loopback TCP bloqueado (`EACCES`). Verificado en CI del commit `a6b8f359` (`test-and-coverage` `success`, `e2e` `success`). `tests/mock-api/server.mjs:68-76` valida entero `400..599` y devuelve `400` fuera de rango. |
| CA-5 | Cumple | No ejecutado en sandbox (requiere navegador, puertos y build Gulp/bower). Verificado en CI del commit `a6b8f359`: job `e2e` `success`. `tests/e2e/arnes-de-pruebas.e2e.mjs:4-11` valida formulario y `pageerror` vacío. |
| CA-6 | Cumple | Ejecutado en sandbox en `npm test`: `tests/tools/harness.test.mjs:16-30` (sin `BACKEND_URL` omite sondas y valida `junit-api.xml`) y `tests/tools/mock-api.test.mjs:87-94` (PEM ausente en `tests/api/_client.mjs:24-34` omite sondas), ambos PASS. |
| CA-7 | Cumple | Ejecutado en sandbox en `npm test`: `tests/tools/harness.test.mjs:32-55` (incluye `--spec=FND-001` en `karma.conf.cjs:24-29`), PASS; ejecución en Karma verificada en CI (`test-and-coverage` `success`). |
| CA-8 | Cumple | Ejecutado en sandbox en `npm test`: `tests/tools/harness.test.mjs:57-71` (PASS). `node tools/specs.mjs dod FND-001` confirma 10/10 CAs etiquetados `[FND-001 CA-1..10]`, 0 pruebas enfocadas/omitidas, §10 completa y `legacy-scan` en 0 (`exit 1` solo por veredicto `FAIL` previo en `evidencia/FND-001/`). |
| CA-9 | Cumple | En sandbox `npm run coverage:tools` -> exit 0 (global 99.05 % líneas, 38/38 pass) y `diff-coverage` sobre `coverage/tools/lcov.info` -> exit 0 (100 %, 46/46 líneas). `coverage:unit`/`coverage:server`/`coverage:merge`/`coverage:diff` completos verificados en CI (`test-and-coverage` `success`), sin % globales de unit/server impresos en el resumen de CI. Observación Baja #2 en `FND-001 §8`. |
| CA-10 | Cumple | En sandbox `tests/tools/ensure-build.test.mjs:1-85` (5/5 PASS) y `tests/tools/gulp-node-compat.test.mjs:1-41` (1/1 PASS, 100 % cobertura). Build limpio Node 24 (`bower install` + `gulp`) y login E2E verificados en CI (`e2e` `success` en `2026-11-26-ci-a6b8f359.md`). |

## Controles de calidad y seguridad

| Control | Estado en sandbox / CI | Detalle observado |
| --- | --- | --- |
| 1a. Cobertura diff (umbral ≥ 90 %) | Parcial en sandbox + CI `success` (`a6b8f359`) | En sandbox, sobre `coverage/tools/lcov.info`: **100 %** (46/46 líneas — PASA: `master/gulp-node-compat.cjs` 32/32, `tools/diff-coverage.mjs` 14/14). `npm run coverage:unit` (ChromeHeadless) y `npm run coverage:server` (loopback `EACCES`) no ejecutables en sandbox; filtro unificado `npm run coverage:diff` pasó en CI (`test-and-coverage` `success`, con la excepción §8 de `master/gulpfile.js`). |
| 1b. Cobertura global por separado | Parcial (`coverage:tools` ejecutado; `unit`/`server` no verificado numéricamente) | `coverage:tools` (ejecutado): **99.05 %** líneas, **94.51 %** ramas, **93.10 %** funciones (`master/gulp-node-compat.cjs` 100.00 %, `tools/diff-coverage.mjs` 98.60 %, `tools/lint-diff.mjs` 97.06 %, `tools/merge-lcov.mjs` 93.10 %, `tools/specs.mjs` 100.00 %, `tools/validate-harness.mjs` 98.66 %). `coverage:unit` y `coverage:server`: No ejecutado en sandbox; el informe de CI `2026-11-26-ci-a6b8f359.md` confirma `success` pero no registra sus % globales numéricos. |
| 2. ESLint 10.15.0 + `tools/lint-diff.mjs` | Ejecutado (binario `eslint v10.15.0` cacheado en `_npx`) + CI `success` | `npx -y eslint@10.15.0` colgó sin red (`npx --offline` -> `ENOTCACHED`); ejecutado directamente `eslint@10.15.0` desde caché local sobre los 15 `.js`/`.mjs`/`.cjs` modificados + `tools/lint-diff.mjs`: **0 problemas en líneas cambiadas** (`exit 0`); **2 problemas heredados** en `master/gulpfile.js:21` (`ignored_files`) y `:94` (`vendorUglifyOpts`, `no-unused-vars`, informativos). Respaldado por CI job `lint` (`success`). |
| 3. `npm audit --audit-level=high` (raíz y `master/`) | No ejecutado en sandbox (red bloqueada) + CI `success` informativo | Raíz y `master/` fallaron con `ENOTFOUND registry.npmjs.org` (`exit 1`). El diff de FND-001 no añade ni modifica `package-lock.json`, `master/package-lock.json`, ni `dependencies`/`devDependencies` en `package.json`. En CI `2026-11-26-ci-a6b8f359.md`, `npm-audit` concluyó `success` (nota: `.github/workflows/security.yml:60-65` ejecuta `--omit=dev` y fuerza `exit 0` informativo; `dependency-review` quedó `skipped`). |
| 4. Secretos en el diff (`gitleaks` / manual) | Revisión manual completa + CI `gitleaks` `success` | `gitleaks` no instalado localmente; CI (`gitleaks 8.30.1` sobre los commits del PR) concluyó `success`. Revisión manual de `git diff angularjs-main...HEAD` y `git log -p angularjs-main..HEAD` (excluyendo `evidencia/FND-001/`): sin secretos reales, sin `X-Api-Key` real ni valores de `.env`. Hallazgo Baja #1 en `tests/tools/capture-fixture.mjs:62` y `:14-18`. |
| 5. Revisión manual web | Ejecutado (sin riesgo en el diff) | El diff no toca `master/js/`, `master/jade/` ni `server/`. 0 ocurrencias de `ng-bind-html`, `$sce`/`trustAsHtml`, `localStorage`/`sessionStorage`, redirecciones a URLs externas ni exportaciones CSV/XLSX. Los `console.log` en el diff/archivos tocados (`tests/e2e/ensure-build.mjs:46,48`, `tests/mock-api/server.mjs:171`, `tests/tools/capture-fixture.mjs:68`) solo emiten estado operativo/URL local/HTTP status sin secretos ni PII. `tests/api/_client.mjs` mantiene verificación TLS íntegra. |
| 6. Complejidad, duplicación, manejo de errores y calidad de pruebas | Ejecutado (satisfactorio) | Baja complejidad y duplicación. Manejo de errores correcto (`master/gulpfile.js:306-319` falla si falta un asset fijo o falla `stream.pipeline`; `tests/mock-api/server.mjs:54-86` captura excepciones con 500 y rechaza JSON/Content-Type/`x-mock-scenario` inválidos con 400; `tests/api/_client.mjs:24-34` omite sondas con motivo si falta PEM). Todas las pruebas nuevas/modificadas tienen aserciones reales y etiquetas `[FND-001 CA-n]`; 0 usos de `istanbul ignore`, `node:coverage ignore`, `c8 ignore`, `fit`, `xit`, `.only` o `.skip`. |

## Hallazgos

| # | Severidad (Crítica/Alta/Media/Baja) | Criterio o regla | Archivo:línea | Cómo reproducir | Impacto |
| --- | --- | --- | --- | --- | --- |
| 1 | Baja | CA-2 / Seguridad operativa (saneamiento de fixtures) | `tests/tools/capture-fixture.mjs:62` y `tests/tools/capture-fixture.mjs:14-18` | `node -e "import('./tests/tools/capture-fixture.mjs').then(m => { const r = '/invitations/accept/SECRET_INVITE_TOKEN_123456?x=1'; console.log('name:', 'GET /api/v1' + r.split('?')[0]); console.log('url:', '/api/v1' + m.sanitizeRoute(r)); console.log('fname:', m.fixtureName('GET', r)); })"` -> `request.url` se sanea a `token-ficticio`, pero `fixture.name` y `fixtureName` conservan `SECRET_INVITE_TOKEN_123456`. | Si se captura manualmente una ruta de invitación sin `--name`, el campo `name` del JSON y el nombre de archivo sugerido retendrían el token de ruta (los fixtures actuales en `tests/fixtures/api-v1/` usan `{token}` / `{invitation_token}` y no están afectados). |
| 2 | Baja | CA-9 / Trazabilidad §8 | `specs/migracion-api-v1/f0-fundaciones/FND-001-arnes-de-pruebas.md:150` | Comparar §8 (`carga de gulp-node-compat.cjs, newLine de concat, tarea vendor_fixed`) contra `master/gulpfile.js:341-344,350` (`build_stamp`, añadida en el ciclo 2). | Desfase documental menor: el filtro `^master/gulpfile\.js$` ya excluye todo el archivo, pero el paréntesis descriptivo de §8 no menciona `build_stamp`. |

## Comandos ejecutados (literal)

```text
git rev-parse HEAD -> exit 0 (a6b8f359344ae30933c652ab8a8d308caf691563)
npm test -> exit 1 (54/58 pass; 4 fallos en tests/tools/mock-api.test.mjs por connect EACCES 127.0.0.1:56907 en sandbox)
npm run coverage:tools -> exit 0 (38/38 pass; global 99.05 % líneas, 94.51 % ramas, 93.10 % funciones)
node tools/diff-coverage.mjs --lcov coverage/tools/lcov.info --base angularjs-main --threshold 90 --include "^((master/js|server|tools)/.*|master/[^/]+)\.(c|m)?js$" --exclude "(^|/)(node_modules|bower_components|tests?|coverage)/|\.(test|spec)\.(c|m)?js$|^server/legacy-satellizer\.js$|^master/gulpfile\.js$" -> exit 0 (100%, 46/46 líneas)
npm run coverage:unit -> exit 1 (Cannot start ChromeHeadless en sandbox)
npm run coverage:server -> cancelado tras quedar colgado luego de fallar las pruebas de red local por connect EACCES en loopback
npx --offline -y eslint@10.15.0 --version -> exit 1 (ENOTCACHED; npx -y eslint@10.15.0 sin --offline quedó colgado esperando red)
node "$env:LOCALAPPDATA\npm-cache\_npx\c92e9954e85c1641\node_modules\eslint\bin\eslint.js" -f json -o C:\Users\harol\.gemini\antigravity\brain\610e23ca-0153-40be-bc42-6bda19e72215\scratch\eslint.json @files -> exit 1 (2 errores heredados en master/gulpfile.js:21,94)
node tools/lint-diff.mjs --report C:\Users\harol\.gemini\antigravity\brain\610e23ca-0153-40be-bc42-6bda19e72215\scratch\eslint.json --base angularjs-main -> exit 0 (Lint del diff: 0 problema(s) en líneas cambiadas; 2 heredado(s))
npm audit --audit-level=high -> exit 1 (getaddrinfo ENOTFOUND registry.npmjs.org)
npm --prefix master audit --audit-level=high -> exit 1 (getaddrinfo ENOTFOUND registry.npmjs.org)
node tools/validate-harness.mjs . -> exit 0
node tools/specs.mjs lint FND-001 -> exit 0
node tools/specs.mjs dod FND-001 -> exit 1 (solo por veredicto FAIL de informe previo de contendiente en evidencia/FND-001/)
node tools/specs.mjs trace -> exit 0
node tools/specs.mjs legacy-scan -> exit 0 (Total 335; bloqueantes 0)
git grep -n -E "istanbul ignore|node:coverage|c8 ignore|\b(fit|xit|fdescribe|xdescribe)\b|\.(only|skip)\(" -- tools/ tests/ master/ server/ -> exit 0 (0 exclusiones ni pruebas omitidas/enfocadas en pruebas reales)
node -e "import('./tests/tools/capture-fixture.mjs').then(m => { const r = '/invitations/accept/SECRET_INVITE_TOKEN_123456?x=1'; console.log('name:', 'GET /api/v1' + r.split('?')[0]); console.log('url:', '/api/v1' + m.sanitizeRoute(r)); console.log('fname:', m.fixtureName('GET', r)); })" -> exit 0 (reproduce Hallazgo #1)
```

## Limitaciones y no verificado

- `npm run coverage:unit`: No ejecutado con éxito en sandbox (ChromeHeadless no puede arrancar en el entorno restringido, `exit 1`). Respaldado por CI del commit `a6b8f359` (`test-and-coverage: success` en `2026-11-26-ci-a6b8f359.md`), aunque dicho resumen no detalla el porcentaje numérico de cobertura global de Karma.
- `npm run coverage:server`: No ejecutado hasta completar en sandbox (bloqueo de conexiones TCP en `127.0.0.1` con `EACCES`; el proceso quedó colgado y fue cancelado). Respaldado por CI del commit `a6b8f359` (`test-and-coverage: success`), sin porcentaje global numérico impreso en el resumen de CI.
- `npm run coverage:merge` y `npm run coverage:diff -- --base angularjs-main` (sobre la unión unit+server+tools): No ejecutado localmente por depender de `coverage:unit` y `coverage:server`; verificado localmente sobre `coverage/tools/lcov.info` (100 %, 46/46 líneas) y en CI del commit `a6b8f359` (`test-and-coverage: success`).
- `npm run test:e2e`: No ejecutado en sandbox (requiere navegador, puertos locales y red/`bower_components`). Respaldado por CI del commit `a6b8f359` (`e2e: success`).
- `npm audit --audit-level=high` (raíz y `master/`): No ejecutado por ausencia de red en sandbox (`ENOTFOUND registry.npmjs.org`). El diff no modifica lockfiles ni dependencias npm; el job `npm-audit` de CI (`2026-11-26-ci-a6b8f359.md`) concluyó `success` ejecutando `--omit=dev` con `exit 0` informativo (`.github/workflows/security.yml:60-65`), y `dependency-review` estuvo `skipped` por configuración.
- `gitleaks`: No ejecutado localmente (`gitleaks` no está instalado en el equipo); sustituido por revisión manual del diff y del historial `angularjs-main..HEAD` más la evidencia de CI del commit `a6b8f359` (`gitleaks: success`).
- `npm run test:api`: No ejecutado contra backend compartido en esta revisión (sondas omitidas en `npm test` verificadas por `harness.test.mjs` y `mock-api.test.mjs`).
