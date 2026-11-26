# Informe contendiente — FND-001 — 2026-11-26

- Agente / modelo efectivo: subagente `contendiente` (contexto limpio) / Claude Opus (Anthropic) · modelo de la sesión principal declarado por el orquestador: modelo Orchestrator de Antigravity (familia Google/Gemini; distinto de Claude)
- Commit evaluado: `a6b8f359344ae30933c652ab8a8d308caf691563`
- Rama / worktree: `feat/67-arnes-de-pruebas` (base `angularjs-main`)

## Veredicto
FAIL

## Resultado por criterio
| CA | Resultado | Evidencia (comando + salida resumida / archivo:línea) |
| --- | --- | --- |
| CA-1 | No verificado | `npm run test:unit` bloqueado en sandbox (`Cannot start ChromeHeadless`); `tests/helpers/bootstrap.spec.js:3-10`, `tests/helpers/app-shim.js:1-15` y `karma.conf.cjs:39-46` revisados por inspección |
| CA-2 | No cumple | `tests/tools/harness.test.mjs:82-90` y `tests/tools/mock-api.test.mjs:69-85` pasan en `npm test`; `fixture()` en Karma bloqueado por ChromeHeadless; fallo Media en `tests/tools/capture-fixture.mjs:14-18,62` (fuga de tokens de ruta en `fixture.name` y nombre de archivo; `ipAddress` y `taxId` sin sanear) |
| CA-3 | No cumple | `tests/tools/mock-api.test.mjs:22-56` y `npm run test:server` fallan en sandbox por `connect EACCES 127.0.0.1`; prueba en memoria contra `createMockApi()` confirma Bearer/401 y CRUD base, pero reproduce fallo Media en `tests/mock-api/server.mjs:45,87,90` (barra final `/id/` evade el 404 devolviendo 200 incluso tras `DELETE`, y URL mal formada tumba el proceso) |
| CA-4 | No verificado | `tests/tools/mock-api.test.mjs:58-67` y `npm run test:e2e` bloqueados por red local en sandbox (`EACCES`); prueba en memoria confirma `x-mock-scenario` (400–599, `409` → `CONFLICT`, `429` + `Retry-After: 30`), sin verificación vía proxy/navegador |
| CA-5 | No cumple | `npm run test:e2e` bloqueado en sandbox al levantar `webServer`; reproducción en directorio temporal demuestra fallo Alta en `master/gulpfile.js:115-118,138,143,181,219,230,341-351` y `tests/e2e/ensure-build.mjs:30-42` (`gulp build` sale 0 y escribe `app/.build-stamp` aunque fallen JS/LESS/Jade, y `ensure-build.mjs` comprueba `login.html` en lugar de `login2.html` de `master/js/modules/config.js:41`) |
| CA-6 | Cumple | `$env:BACKEND_URL=''; $env:SDD_NO_ENV_FILE='1'; npm run test:api` → exit 0 (6 skipped, `reports/junit-api.xml` con 6 `<skipped>` y 0 `<failure>`); comprobado también con `BACKEND_URL=''` sin `SDD_NO_ENV_FILE` (`exit 0`); `harness.test.mjs:16-30` y `mock-api.test.mjs:87-94` pasan. Observación Baja en `tests/api/_client.mjs:24-26` |
| CA-7 | No verificado | `tests/tools/harness.test.mjs:32-55` (`--spec FND-001` y `--spec=FND-001`) y validación con `node_modules/karma/lib/cli.js` pasan; ejecución real de Karma (`ChromeHeadless`) y `playwright test --grep` bloqueada por sandbox |
| CA-8 | Cumple | `tests/tools/harness.test.mjs:57-71` pasa en `npm test`; `node tools/specs.mjs dod FND-001` ejecutado (verifica todos los CA y etiqueta de pruebas) |
| CA-9 | Cumple | `npm run coverage:tools` → exit 0 (38/38; `master/gulp-node-compat.cjs` 100 %, `tools/diff-coverage.mjs` 98.60 %); `npm run coverage:merge` (`3/3 archivos`) + `npm run coverage:diff -- --base angularjs-main` → exit 0 (`100% (46/46 líneas)`). Limitación: `coverage/unit` y `coverage/server` preexistentes en `coverage/` al estar bloqueados en sandbox |
| CA-10 | No cumple | `tests/tools/ensure-build.test.mjs` (5/5) y `tests/tools/gulp-node-compat.test.mjs` (1/1) pasan; misma falla Alta reproducida en `master/gulpfile.js` (`handleError` + `build_stamp`) y `tests/e2e/ensure-build.mjs` (`login2.html`, `bootstrap.css` y `en.json` fuera de `REQUIRED_OUTPUTS`). Ejecución real en runner limpio (`bower install` + E2E) no verificable en sandbox |

## Hallazgos
| # | Severidad (Crítica/Alta/Media/Baja) | Criterio o regla | Archivo:línea | Cómo reproducir | Impacto |
| --- | --- | --- | --- | --- | --- |
| 1 | Alta | CA-5, CA-10, RF-9 | `master/gulpfile.js:115-118,138,143,181,193,209,219,230,341-351`; `tests/e2e/ensure-build.mjs:30-42`; `master/js/modules/config.js:41` | En un directorio temporal con copia de `master/{js,jade,i18n,less,sass}`, artefactos previos `app/js/app.js` y `app/css/app.css` y errores de sintaxis en `jade/views/pages/login2.jade`, `less/app.less` y `js/app.init.js`, ejecutar `gulp build` y luego `needsBuild(tmpRepo)`. Observado: `gulp build` sale con código `0`, escribe `app/.build-stamp`, conserva `/* stale js */` y `/* stale css */`, no genera `app/views/pages/login2.html` (`false`), y `needsBuild(tmpRepo)` devuelve `false` (`app/ al día`). Esperado: que `gulp build` falle con exit != 0 sin escribir `.build-stamp` y que `ensure-build.mjs` verifique `login2.html` (usado por `access.login`), `app/css/bootstrap.css` y todos los diccionarios i18n. | Un build roto (por error JS/Jade/LESS o falta de red en `styles_app`) termina en éxito falso, estampa `.build-stamp` y hace que `npm run test:e2e` omita compilar o corra sobre artefactos obsoletos o incompletos. |
| 2 | Media | CA-2, `.agents/rules/seguridad.md` | `tests/tools/capture-fixture.mjs:14-18,21,26-30,62` | Llamar a `fixtureName('GET', '/invitations/accept/my-real-invite-token-xyz123')`, `sanitizeRoute('/invitations/accept/short1234567')` y evaluar `fixture.name` (`capture-fixture.mjs:62`) con ruta de invitación, más `sanitize({ taxId: '900123456-1', ipAddress: '190.24.10.5', description: 'User Real Person (+573101234567) logged in' })`. Observado: `fixtureName` devuelve `get__invitations__accept__my-real-invite-token-xyz123` y `fixture.name` guarda `"GET /api/v1/invitations/accept/my-real-invite-token-xyz123"` con el token íntegro; `sanitizeRoute` no enmascara tokens `< 16` caracteres; `taxId`, `ipAddress` y teléfonos en texto libre permanecen sin sanear. Esperado: usar `sanitizeRoute` también en `fixture.name` y `fixtureName()`, cubrir tokens cortos/segmentos de token y enmascarar `taxId`/`ipAddress`. | Al capturar fixtures de invitaciones, auditoría o tenant se filtran tokens de invitación y datos de red/fiscales reales al repositorio dentro del nombre de archivo o `fixture.name`. |
| 3 | Media | CA-3, RF-3 | `tests/mock-api/server.mjs:45,54-59,87,90`; `tests/mock-api/store.mjs:25` | Invocar `createMockApi()` en memoria tras `POST /api/v1/places` + `DELETE /api/v1/places/{id}`: `GET /api/v1/places/{id}` devuelve `404`, pero `GET /api/v1/places/{id}/` (con barra final) y `GET /api/v1/{colección}/no-existe/` en las 8 colecciones devuelven `200` con el fixture `get__<col>__id.json`. Además, enviar `req.url = 'http://[bad'` lanza `TypeError: Invalid URL` fuera del `try/catch` (`server.mjs:45` vs `:54`), tumbando el proceso. Esperado: normalizar barras finales antes de `split('/')` (404 para id inexistente/borrado) y envolver `new URL()` en el manejo de errores para responder 400/500 sin caer. | Pruebas con barras finales reciben falsos `200` sobre recursos borrados o inexistentes, y una URL mal formada derriba el proceso `mock-api` contradiciendo `server.mjs:8`. |
| 4 | Baja | CA-6 | `tests/api/_client.mjs:24-26` | Ejecutar `node --test tests/api/arnes-de-pruebas.api.test.mjs` con `BACKEND_URL=https://localhost:8443`, `SDD_NO_ENV_FILE=1` y `BACKEND_CA_FILE` apuntando a un archivo existente sin PEM válido (`NOT A PEM CERT`). Observado: `backendAgent(caFile)` lanza al cargar el módulo (`exit 1`) antes de registrar los `probe()`. Esperado: capturar el error del PEM al cargar para omitir/fallar limpiamente dentro de `probe()` igual que cuando el archivo no existe. | Un certificado corrupto aborta toda la carga del archivo de sondas sin informe estructurado por sonda. |

## Comandos ejecutados (literal)
```
git diff angularjs-main...HEAD -- . ":(exclude)specs/migracion-api-v1/f0-fundaciones/evidencia/FND-001" -> exit 0
git diff angularjs-main...HEAD -- master/js -> exit 0 (vacío)
node tools/validate-harness.mjs . -> exit 0 (Configuración de Antigravity válida)
node tools/specs.mjs lint --all -> exit 0 (41 specs: todas cumplen)
node tools/specs.mjs trace -> exit 0 (Trazabilidad: OK)
node tools/specs.mjs dod FND-001 -> exit 1 (falla únicamente por veredicto contendiente: FAIL previo en evidencia/FND-001/)
npm test -> exit 1 (54 pass, 4 fail en tests/tools/mock-api.test.mjs por connect EACCES 127.0.0.1 en sandbox)
npm run test:server -> cancelado tras 13 fallos por connect EACCES 127.0.0.1 (1 pass)
npm run test:unit -> exit 1 (Cannot start ChromeHeadless en sandbox)
npm run test:integration -> exit 1 (Cannot start ChromeHeadless en sandbox)
npm run test:e2e -> cancelado tras timeout de espera (webServer bloqueado por sandbox)
npx -y eslint@10.15.0 ... -> cancelado por bloqueo de salida al registro npm en sandbox
npm run coverage:tools -> exit 0 (38 pass, 0 fail; master/gulp-node-compat.cjs 100%, tools/diff-coverage.mjs 98.60%)
npm run coverage:merge -> exit 0 (lcov: 3/3 archivos -> coverage/lcov.info)
npm run coverage:diff -- --base angularjs-main -> exit 0 (100% 46/46 líneas -> PASA)
$env:BACKEND_URL=''; $env:SDD_NO_ENV_FILE='1'; npm run test:api -> exit 0 (6 skipped, reports/junit-api.xml sin falsos verdes)
node "$env:TEMP\contendiente-probe.mjs" -> exit 0 (eliminado tras ejecución; probó mock-api en memoria, capture-fixture, ensure-build y karma cli)
node "$env:TEMP\contendiente-probe2.mjs" -> exit 0 (eliminado tras ejecución; probó _client.mjs con BACKEND_URL='' y PEM inválido)
node "$env:TEMP\contendiente-probe3.mjs" -> exit 0 (eliminado tras ejecución; reprodujo gulp build saliendo 0 y escribiendo .build-stamp con JS/LESS/Jade rotos)
node "$env:TEMP\contendiente-final-repro.mjs" -> exit 0 (eliminado tras ejecución; reconfirmó bypass /id/ en deleted id, crash Invalid URL y fuga capture-fixture)
```

## Limitaciones y no verificado
- **Restricciones del sandbox (`BypassSandbox: false`):**
  - El sandbox impide conexiones TCP loopback (`connect EACCES 127.0.0.1`), por lo que no se pudieron ejecutar en red real `tests/tools/mock-api.test.mjs` (4/4 fallidas por `EACCES`), `npm run test:server` (13/14 fallidas por `EACCES`), ni `npm run test:e2e` (Playwright `webServer`). La lógica de `tests/mock-api/server.mjs` y `store.mjs` se verificó en memoria invocando el listener `'request'` sin abrir sockets.
  - El sandbox impide lanzar ChromeHeadless (`Cannot start ChromeHeadless`), por lo que `npm run test:unit`, `npm run test:integration` y `npm run coverage:unit` no se pudieron verificar en navegador real (CA-1, CA-7 en Karma y `fixture()` en Karma quedan sin verificar en ejecución real; `npm run coverage:merge` usó `coverage/unit/lcov.info` y `coverage/server/lcov.info` preexistentes en `coverage/`).
  - El sandbox bloquea la descarga de paquetes npm, por lo que no se ejecutó `eslint@10.15.0` ni `tools/lint-diff.mjs`, ni `bower install` en un runner limpio (CA-10).
- **Backend real:** No se ejecutaron sondas contra el backend real configurado en `.env` (no se leyeron secretos ni valores de `.env`, y `E2E_LIVE=1` no se ejecutó).
- **Observación diferida en §11 (no bloqueante en FND-001):** `tests/mock-api/server.mjs:135` y `store.mjs:57` devuelven HTTP `200` con `"totalPages": null` ante `?page=0&size=0` o `?page=abc&size=xyz`, y `"page": -1` ante `?page=-1`; junto con `bootstrap: 5.3.7` en `master/bower.json:125`, figuran explícitamente diferidos en `FND-001` §11 (2026-11-25).
- **Contexto limpio:** Revisión ejecutada íntegramente en subagente con contexto limpio, sin consultar ningún archivo en `specs/migracion-api-v1/f0-fundaciones/evidencia/FND-001/` y con todos los scripts temporales eliminados de `$env:TEMP`.
