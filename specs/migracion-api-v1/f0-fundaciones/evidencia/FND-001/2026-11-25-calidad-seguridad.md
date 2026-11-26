# Informe calidad-seguridad — FND-001 — 2026-11-25

- Agente / modelo efectivo: `calidad-seguridad` (revisión ejecutada como subagente independiente con contexto limpio; `model: pro` en `.agents/agents/calidad-seguridad.md`, identificador exacto mostrado en UI no observable desde el subagente)
- Commit evaluado: `ce051fb3f9add895fb5ff870f6cea97e3211dd35`
- Rama / worktree: `feat/67-arnes-de-pruebas` (rama base: `angularjs-main`)

## Veredicto
PASS WITH GAPS

Resumen de controles del rol:
- **Cobertura del diff (umbral ≥ 90 %)**: Sobre la única suite ejecutable íntegramente sin sockets ni navegador en este entorno (`coverage:tools`), el diff alcanza **100 %** (46/46 líneas: `master/gulp-node-compat.cjs` 32/32 y `tools/diff-coverage.mjs` 14/14) aplicando el filtro canónico de `package.json` (`coverage:diff`, que excluye `master/gulpfile.js` por la excepción FND-001 §8 aprobada por Harold Avenia el 2026-11-25). Sin dicho filtro, `node tools/diff-coverage.mjs --lcov coverage/tools/lcov.info --base angularjs-main` da **68.66 %** (46/67: incluye `eslint.config.mjs` 0/3 y `master/gulpfile.js` 0/18). La ejecución de `coverage:unit`, `coverage:server`, `coverage:merge` y `diff-coverage` sobre el `coverage/lcov.info` completo falló o no pudo completarse por restricciones del sandbox.
- **Cobertura global (por separado)**:
  - `coverage:tools` (ejecutada en esta sesión): **99.05 %** líneas, **94.51 %** ramas, **93.10 %** funciones (`master/gulp-node-compat.cjs` 100.00 %, `tools/diff-coverage.mjs` 98.60 %, `tools/lint-diff.mjs` 97.06 %, `tools/merge-lcov.mjs` 93.10 %, `tools/specs.mjs` 100.00 %, `tools/validate-harness.mjs` 98.66 %).
  - `coverage:unit` y `coverage:server`: No verificado en esta sesión por bloqueo del sandbox (ChromeHeadless y sockets `127.0.0.1`).
- **Lint (`ESLint 10.15.0` + `tools/lint-diff.mjs`)**: **0 problemas** en líneas añadidas o modificadas del diff (`lint-diff` exit `0`); **2 errores heredados** informativos en `master/gulpfile.js:21` (`ignored_files`) y `master/gulpfile.js:94` (`vendorUglifyOpts`) por `no-unused-vars`. (Se usó el binario local en caché de ESLint `10.15.0` al no haber red para `npx -y`).
- **Dependencias (`npm audit --audit-level=high`)**: No ejecutado con éxito por falta de red hacia `registry.npmjs.org` en el sandbox (exit `1` en raíz y `master/`). El diff no añade ni modifica dependencias npm en `package.json` ni `master/package.json`; solo añade `resolutions` en `master/bower.json` (ver hallazgo #3).
- **Secretos en el diff**: `gitleaks` no está instalado en el entorno (No ejecutado). Revisión manual completa del diff `angularjs-main..HEAD` (excluyendo `evidencia/`), `.env.example` y `tests/fixtures/api-v1/`: **0 secretos**, **0 credenciales** y **0 correos reales** (todos los fixtures usan `@example.invalid`).
- **Revisión manual web**: El diff de FND-001 no modifica `master/js`, `master/jade` ni `server/`.
  - `ng-bind-html`/`$sce`: 0 usos en código nuevo o migrado (`api_client.js`); deuda heredada sin migrar en `master/jade/views/pages/assigned_services/form.jade:23,34`.
  - `localStorage`: 0 cambios nuevos; deuda heredada en `master/js/modules/services/tokenStorage.js:26,35,47` y `tokenManager.js:7` (access token en variable en memoria, refresh en `localStorage`, pendiente de sustitución en `ACC-001`/ADR-0004).
  - Redirecciones externas: 0 cambios; `server/app.js:13-24` restringe `res.redirect(302, ...)` a rutas internas fijas de la SPA (`/#/access/verify`, `/#/access/reset`, `/#/access/invitation`) con `encodeURIComponent(token)`.
  - CSV/XLSX sin protección de fórmulas: 0 cambios; deuda heredada en `master/js/custom/itinerary/itinerary_controller.js:224-284` (`imprimirCsv`) y `master/js/modules/services/xlsx_exporter.js:72-80` (`alasql`).
  - `console.log` con datos: 0 en el diff con datos personales o secretos (solo mensajes operativos en `tests/e2e/ensure-build.mjs:42,44`, `tests/mock-api/server.mjs:160` y `tests/tools/capture-fixture.mjs:61`); deuda heredada en `master/js/` y `server/legacy-satellizer.js`.
- **Complejidad, duplicación, manejo de errores y calidad de pruebas**: Sin `istanbul ignore`, `c8 ignore`, `node:coverage`, `fit`, `xit`, `.only` ni `.skip` en las pruebas; todas las pruebas nuevas/modificadas del diff tienen aserciones reales (`assert.*`) y etiquetas `[FND-001 CA-n]`. Se identificó 1 defecto de validación de rango en `tests/mock-api/server.mjs:62` y 1 caso borde menor en `tests/tools/capture-fixture.mjs:23`.

## Resultado por criterio
| CA | Resultado | Evidencia (comando + salida resumida / archivo:línea) |
| --- | --- | --- |
| CA-1 | No verificado | `npm run coverage:unit -> exit 1` (`Cannot start ChromeHeadless` en sandbox; reintento `BypassSandbox` expiró a los 60s). `tests/helpers/bootstrap.spec.js:3-10` tiene aserciones reales con etiqueta `[FND-001 CA-1]`. |
| CA-2 | Cumple (parcial) | `npm test` ejecutó `[FND-001 CA-2]` en `tests/tools/harness.test.mjs:81-89` y `tests/tools/mock-api.test.mjs:61-65` (ambos pasaron); 0 correos reales en `tests/fixtures/api-v1/`. Prueba Karma `tests/helpers/bootstrap.spec.js:12-16` no verificada en sandbox. |
| CA-3 | No verificado | Revisión estática de `tests/mock-api/server.mjs:17-27,69-142` conforme (rutas públicas exactas, Bearer en `/auth/me` y `/auth/change-password`, 400 en cuerpo no-objeto/ids no-array, 404 en GET por id inexistente o lote en `packages`/`zones`); las 3 pruebas de red en `tests/tools/mock-api.test.mjs:22-49` y las de `tests/server/proxy.test.mjs` fallaron en sandbox por `connect EACCES 127.0.0.1`. |
| CA-4 | No cumple (parcial) / No verificado en red | Hallazgo en `tests/mock-api/server.mjs:60-64`: valida `scenario > 599` pero no `scenario < 400` ni cadena vacía (`x-mock-scenario: 200` o `""` no responde `400`). Prueba de red `tests/tools/mock-api.test.mjs:50-56` falló por `connect EACCES 127.0.0.1`. |
| CA-5 | No verificado | Fuera de la batería directa del rol; revisión de `master/gulpfile.js:136,300-321` y `tests/e2e/ensure-build.mjs:24-38` sin problemas de lint en diff ni errores silenciados (`vendor_fixed` propaga errores sin `handleError`). |
| CA-6 | Cumple | `npm test`: `[FND-001 CA-6]` pasó en `tests/tools/harness.test.mjs:16-30` (omisión sin `BACKEND_URL` y verificación de `junit-api.xml` con `<skipped>` y 0 `<failure>`) y en `tests/tools/mock-api.test.mjs:66-74` (omisión si falta `BACKEND_CA_FILE`). |
| CA-7 | Cumple (configuración) | `npm test`: `[FND-001 CA-7]` pasó en `tests/tools/harness.test.mjs:32-54` (`--spec` filtra `[<ID> ` y separa `junit-unit.xml` / `junit-integration.xml`). Ejecución real de Karma no verificada en sandbox. |
| CA-8 | Cumple | `npm test`: `[FND-001 CA-8]` pasó en `tests/tools/harness.test.mjs:56-70`. `node tools/specs.mjs dod FND-001` verificó 10/10 CAs etiquetados y 0 pruebas omitidas/enfocadas (salió `1` solo por leer el veredicto previo `FAIL` en archivo de evidencia anterior). |
| CA-9 | No verificado (completo) | `npm run coverage:tools -> exit 0` (38/38 pasaron, 99.05 % global); sobre ese LCOV, `coverage:diff` (filtro §8) da **100 %** (46/46). `coverage:unit`, `coverage:server` y `coverage:merge` completo no verificados en sandbox. |
| CA-10 | Cumple (compatibilidad y detección de build) | `npm test` y `coverage:tools`: `tests/tools/gulp-node-compat.test.mjs` (1/1, 100 % cobertura de `master/gulp-node-compat.cjs`) y `tests/tools/ensure-build.test.mjs` (4/4) pasaron. Compilación Gulp + E2E completo no ejecutados en esta sesión. |

## Hallazgos
| # | Severidad (Crítica/Alta/Media/Baja) | Criterio o regla | Archivo:línea | Cómo reproducir | Impacto |
| --- | --- | --- | --- | --- | --- |
| 1 | Media | Calidad / manejo de entradas (`CA-4`) | `tests/mock-api/server.mjs:60-64` | Enviar `x-mock-scenario: 200` o `x-mock-scenario: ""` al mock-api; `Number("200")` y `Number("")` son enteros `<= 599`, por lo que supera `if (!Number.isInteger(scenario) || scenario > 599)` y no entra en `if (scenario >= 400)`. | Ignora silenciosamente la cabecera fuera de rango en lugar de devolver `400` como indican el comentario de la línea 6 y el mensaje de error de la línea 63 (`entre 400 y 599`). |
| 2 | Baja | Seguridad / privacidad en utilidades de prueba (`CA-2`) | `tests/tools/capture-fixture.mjs:23` | Ejecutar `sanitize({ users: [{ name: 'Nombre Real' }] })`: al propagar `key` en arreglos (`línea 27`), el objeto hijo recibe `parent = 'users'` (plural), que no casa con `PERSON_PARENTS` en singular (`user\|driver\|customer\|contact`). | Si una futura respuesta del backend incluye objetos con clave `name` dentro de una lista llamada `users`, `drivers` o similar (en lugar de `firstName`/`lastName`), `capture-fixture` conservaría el nombre sin anonimizar. |
| 3 | Baja (diferido en §11 B) | Dependencias / compatibilidad UI | `master/bower.json:125` | Revisar `resolutions`: fija `"bootstrap": "5.3.7"` mientras la app AngularJS 1.3 usa plantillas Bootstrap 3 y `vendor_fixed` copia `bootstrap.js` en `master/gulpfile.js:301`. | Posible incompatibilidad JS/CSS de modales o tooltips de Bootstrap 5 sobre markup Bootstrap 3; ya registrado como ítem diferido fuera de FND-001 en la sección 11 (`B, fuera`). |
| 4 | Informativa (heredada) | ESLint 10.15.0 (fuera del diff) | `master/gulpfile.js:21,94` | Ejecutar ESLint 10.15.0 sobre `master/gulpfile.js`: reporta 2 `no-unused-vars` (`ignored_files` y `vendorUglifyOpts`). | No bloquea porque `tools/lint-diff.mjs` devuelve `0` problemas en líneas cambiadas; queda registrado como deuda heredada. |

## Comandos ejecutados (literal)
```
git status -sb; git rev-parse HEAD; node -v; git diff angularjs-main...HEAD --stat -> exit 0 (HEAD ce051fb3f9add895fb5ff870f6cea97e3211dd35, Node v24.22.3)
npm run coverage:unit -> exit 1 (Cannot start ChromeHeadless)
npm run coverage:unit (BypassSandbox: true) -> error de herramienta (Permission prompt timed out after 60s)
npm run coverage:server -> tarea cancelada tras colgar esperando cierre; 12 fallos / 1 acierto observados en tests/server/*.test.mjs (bloqueo loopback EACCES 127.0.0.1)
npm run coverage:tools -> exit 0 (38/38 pass; cobertura global: 99.05 % líneas, 94.51 % ramas, 93.10 % funciones; master/gulp-node-compat.cjs 100.00 %; tools/diff-coverage.mjs 98.60 %)
node tools/diff-coverage.mjs --lcov coverage/tools/lcov.info --base angularjs-main -> exit 1 (68.66 %, 46/67 líneas; incluye eslint.config.mjs 0/3 y master/gulpfile.js 0/18)
node tools/diff-coverage.mjs --lcov coverage/tools/lcov.info --base angularjs-main --threshold 90 --include "^((master/js|server|tools)/.*|master/[^/]+)\.(c|m)?js$" --exclude "(^|/)(node_modules|bower_components|tests?|coverage)/|\.(test|spec)\.(c|m)?js$|^server/legacy-satellizer\.js$|^master/gulpfile\.js$" -> exit 0 (100 %, 46/46 líneas)
npm test -> exit 1 (53/57 pass; 4 fallos en tests/tools/mock-api.test.mjs por connect EACCES 127.0.0.1:58768)
npx -y eslint@10.15.0 --version -> tarea cancelada tras colgar sin red; npx --offline -y eslint@10.15.0 --version -> ENOTCACHED
node "$env:LocalAppData\npm-cache\_npx\c92e9954e85c1641\node_modules\eslint\bin\eslint.js" -f json -o .tmp/eslint.json @files -> exit 1 (13 archivos del diff; 2 errores heredados en master/gulpfile.js:21,94)
node tools/lint-diff.mjs --report .tmp/eslint.json --base angularjs-main -> exit 0 (Lint del diff: 0 problema(s) en líneas cambiadas; 2 heredado(s) en esos archivos)
npm audit --audit-level=high -> exit 1 (getaddrinfo ENOTFOUND registry.npmjs.org)
npm --prefix master audit --audit-level=high -> exit 1 (getaddrinfo ENOTFOUND registry.npmjs.org)
gitleaks --version -> exit 1 (no instalado)
node tools/validate-harness.mjs . -> exit 0
node tools/specs.mjs lint FND-001 -> exit 0
node tools/specs.mjs dod FND-001 -> exit 1 (10/10 CAs con prueba etiquetada; falla solo por veredicto previo FAIL en evidencia)
node -e "<revisión de secretos en git log -p angularjs-main..HEAD y emails en tests/fixtures/api-v1/>" -> exit 0 (0 secretos en commits del diff; 0 emails fuera de @example.invalid)
```

## Limitaciones y no verificado
- `npm run coverage:unit`: No ejecutado con éxito — `Cannot start ChromeHeadless` en el sandbox y solicitud `BypassSandbox: true` expirada tras 60s sin respuesta interactiva en el subagente. Cobertura global unitaria no verificada.
- `npm run coverage:server` y pruebas de socket en `tests/tools/mock-api.test.mjs`: No ejecutados con éxito — el sandbox bloquea conexiones loopback (`connect EACCES 127.0.0.1`), provocando 12/13 fallos y bloqueo al cerrar en `coverage:server` y 4/6 fallos en `mock-api.test.mjs`. Cobertura global del servidor no verificada.
- `npm run coverage:merge` y `node tools/diff-coverage.mjs --lcov coverage/lcov.info --base angularjs-main` sobre la unión completa (`unit + server + tools`): No ejecutados por los fallos anteriores de `coverage:unit` y `coverage:server` en esta sesión (solo se verificó `diff-coverage` sobre el LCOV fresco de `coverage:tools`).
- `npm audit --audit-level=high` (raíz y `master/`): No ejecutado contra el registro — sin resolución DNS/red (`ENOTFOUND registry.npmjs.org`) en el sandbox.
- `npx -y eslint@10.15.0`: No ejecutado vía `npx` por falta de red hacia el registro (`ENOTCACHED` en `--offline`); sustituido por ejecución directa del binario en caché local de ESLint `v10.15.0`.
- `gitleaks git . --log-opts="angularjs-main..HEAD" --redact`: No ejecutado — `gitleaks` no está instalado en el entorno; sustituido por revisión manual del diff, historial de commits de la rama y fixtures.
- `npm run test:e2e` y `npm run test:api`: No ejecutados en este rol (y bloqueados en sandbox por puertos/navegador/red).
