# Informe implementador — FND-001 — 2026-11-25

- Agente / modelo efectivo: Claude (Cowork) con Harold Avenia ejecutando los comandos en Windows (Node 24 LTS); CI de GitHub Actions (ubuntu-latest, Node 24)
- Commit evaluado: `40db6367` (rama `feat/67-arnes-de-pruebas`, PR #70, base `angularjs-main` = `6e024675`)
- Commits de la historia: `bbf7c8e6`, `49972773`, `567c6899`, `fdefc680`, `40db6367`
- CI del commit evaluado: run `ci` 45705320633, `security` 45705320651, `pr-conventions` 45705320767 — todos `success`

## Veredicto
PASS

## Resultado por criterio
| CA | Resultado | Evidencia (pruebas `[FND-001 CA-n]`) |
| --- | --- | --- |
| CA-1 | Cumple (CI `test-and-coverage`: Karma en ChromeHeadless, JUnit en `reports/`) | `tests/helpers/bootstrap.spec.js` |
| CA-2 | Cumple (local `npm test` y CI) | `tests/helpers/bootstrap.spec.js`, `tests/tools/harness.test.mjs` |
| CA-3 | Cumple (local E2E 7/7 y CI `e2e`) | `tests/e2e/arnes-de-pruebas.e2e.mjs`, `tests/server/proxy.test.mjs` |
| CA-4 | Cumple (local E2E 7/7 y CI `e2e`) | `tests/e2e/arnes-de-pruebas.e2e.mjs`, `tests/server/proxy.test.mjs` |
| CA-5 | Cumple: build real de Gulp + server.js + mock-api; `#/access/login` muestra el formulario (local, build limpio sin `vendor/` ni `app/` previos, y CI) | `tests/e2e/arnes-de-pruebas.e2e.mjs` |
| CA-6 | Cumple | `tests/api/arnes-de-pruebas.api.test.mjs`, `tests/tools/harness.test.mjs` |
| CA-7 | Cumple | `tests/tools/harness.test.mjs` |
| CA-8 | Cumple | `tests/tools/harness.test.mjs` |
| CA-9 | Cumple (CI `test-and-coverage` ejecuta `diff-coverage --base origin/angularjs-main` ≥ 90 %) | `tests/tools/harness.test.mjs`, `tools/test/diff-coverage.test.mjs` |
| CA-10 | Cumple: runner limpio de CI (Node 24 según §11) instala bower sin `ECONFLICT`, Gulp genera `app/` y pasa el humo de login | `tests/e2e/arnes-de-pruebas.e2e.mjs`, `tests/tools/ensure-build.test.mjs` |

## Hallazgos corregidos en esta iteración
| # | Severidad | Criterio | Archivo | Causa | Corrección (commit) |
| --- | --- | --- | --- | --- | --- |
| 1 | Alta | CA-9 | `tools/diff-coverage.mjs` | En Windows `toRelative()` no relativizaba rutas con letra de unidad (`npm test` 46/47) | Compara quitando la unidad (`49972773`) |
| 2 | Alta | CA-9 | `tools/diff-coverage.mjs` | `ENOBUFS` (exit 2) con diffs grandes | `--diff-filter=d` y `maxBuffer` 512 MB (`567c6899`) |
| 3 | Alta | CA-10 | `master/bower.json` | `bower install` no interactivo abortaba con `ECONFLICT d3` | 8 `resolutions` fijadas a lo que tenía instalado la app (`567c6899`) |
| 4 | Alta | CA-5, CA-10 | `master/gulpfile.js`, `master/gulp-node-compat.cjs`, `.nvmrc`, `ci.yml` | Node 23+ eliminó `util.is*` que usan plugins de Gulp de 2015 | Node 24 LTS + compat solo en el proceso de Gulp (`fdefc680`) |
| 5 | Crítica | CA-5, CA-10 | `master/gulpfile.js` | La concatenación de `app.js` unía `}])` legacy con `(function(){` de F0 → `App.factory(...) is not a function`, SPA en blanco | `concat` con `\n;\n` (`fdefc680`) |
| 6 | Media | CA-10 | `tests/e2e/ensure-build.mjs` | No recompilaba si solo cambiaba la configuración del build | Vigila `gulpfile.js`, `gulp-node-compat.cjs`, `bower.json`, `vendor*.json` (`fdefc680`) |
| 7 | Crítica | CA-5, CA-10 | `master/gulpfile.js` | Build limpio sin `vendor/bootstrap/js/bootstrap.js` (404): el estado `access` no resolvía | Tarea `vendor_fixed` (bootstrap.js y toastr) (`40db6367`) |

## Comandos ejecutados (literal, resumen de salida)
```
# Windows, Node 24 LTS, rama feat/67-arnes-de-pruebas
npm test                                   -> exit 0
ℹ tests 48
ℹ pass 48
ℹ fail 0
Rename-Item vendor vendor.bak; Rename-Item app app.bak   # build limpio, como en CI
npm run build                              -> Finished 'build' after 17 s (vendor_base 33/33, vendor_app 449/449, vendor_fixed OK)
npm run test:e2e                           -> 7 passed (9.3s)
  ✓ [FND-002 CA-14] … ✓ [FND-002 CA-2] … ✓ [FND-001 CA-5] [FND-001 CA-10] la SPA compilada carga #/access/login con el formulario
  ✓ [FND-001 CA-3] … ✓ [FND-001 CA-4] … ✓ [FND-005 CA-6] … ✓ [FND-005 CA-6] …
node tools/specs.mjs lint FND-001          -> Resultado: PASS

# CI (PR #70, commit 40db6367): run ci 45705320633
config              success   (validate-harness, specs lint --all, trace, lint-ui, JSON/YAML)
test-and-coverage   success   (coverage:tools, Karma unit + coverage, test:integration, coverage:server, merge, diff-coverage ≥ 90 %)
e2e                 success   (npm ci, bower install no interactivo, playwright, Gulp build + server.js + mock-api)
lint                success   (ESLint sobre líneas cambiadas)
security: gitleaks success · npm-audit success | pr-conventions: validate success · pr-size success
```

## Limitaciones y no verificado
- Sondas API (`npm run test:api`) no ejecutadas contra el backend real en esta iteración; sin `BACKEND_URL` se omiten con motivo (CA-6).
- `security.yml` sigue con `node-version: "22"` para `npm audit` (fuera de los archivos autorizados; no afecta al build).
- Secretos legacy en el historial (clave de Google en `index.html`/`master/jade/index.jade`, secreto de Facebook en `server/config.js`): fuera del alcance de FND-001; requieren rotación (Issue de seguridad aparte).
