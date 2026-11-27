# Informe implementador — FND-002 — 2026-11-27

- Agente / modelo efectivo: implementador (subagente de Antigravity) / No verificado (modelo `inherit`; Antigravity no lo expone al subagente)
- Commit evaluado: `d9f38660` (HEAD de `feat/80-api-core`) + cambios **sin confirmar** en el árbol de trabajo (ver «Commits propuestos»)
- Rama / worktree: `feat/80-api-core` (workspace principal; base `angularjs-main`)

## Veredicto
PASS WITH GAPS

Modo «verificar y completar» (regularización). D7 aplicado con prueba roja→verde; deuda de `try/finally` cerrada; CA-1 y CA-18 reforzados con pruebas sobre el resultado observable. Las suites que necesitan ChromeHeadless o conexiones a `127.0.0.1` no pueden ejecutarse en el sandbox (Chrome no arranca; `connect EACCES`), por eso varios CA quedan «No verificado» en esta sesión aunque tengan prueba etiquetada. `git commit` falló por permisos del sandbox sobre `.git/objects`: nada está confirmado.

## Archivos modificados (todos en §3 «Archivos autorizados»)
| Archivo | Cambio |
| --- | --- |
| `server/proxy.js` | D7: `planTimeoutMs` por defecto `180000` → `240000` (línea 47) |
| `.env.example` | `BACKEND_PLAN_TIMEOUT_MS=240000` |
| `docs/architecture/adr/0002-proxy-mismo-origen.md` | Timeouts: 60 s / 60 000 ms y 240 s / 240 000 ms por defecto (D7); fecha de actualización 2026-11-27 |
| `tests/server/proxy.test.mjs` | Nueva prueba `[FND-002 CA-15]` del valor por defecto (reloj simulado `t.mock.timers`); todas las pruebas que levantan servidores los cierran en `try/finally`; `after(() => stack?.close())` |
| `tests/server/helpers.mjs` | `startStack` cierra mock-api si falla el arranque de la app web |
| `tests/server/tls.test.mjs` | `through()` cierra el servidor en `try/finally`; `after` tolera `backend` sin crear |
| `tests/server/legacy-urls.test.mjs` (nuevo) | Prueba `[FND-002 CA-1]`: búsqueda de `hanoit:9000|app.ruteando.co` en `master/js` |
| `tests/tools/i18n.test.mjs` | Prueba `[FND-002 CA-18]`: texto propio de `OTP_DELIVERY_FAILED` ≠ genérico de 502 en es/en/es_AR |
| `specs/migracion-api-v1/f0-fundaciones/evidencia/FND-002/2026-11-27-implementador.md` | Este informe |

No se tocaron archivos fuera de §3 ni cambios ajenos (el árbol estaba limpio al empezar).

## Decisiones
1. **Prueba del valor por defecto (CA-15/D7) con reloj simulado.** Se invoca `createProxy` con `timeoutMs`/`planTimeoutMs` tomados de un `env` sin las variables (lo mismo que hace `server/app.js`) y peticiones `POST /api/v1/journeys/plan` y `GET /api/v1/journeys` contra un backend que nunca responde. Con `t.mock.timers` se avanza el reloj: la ruta general da 504 a los 60 000 ms y el plan sigue abierto a los 239 999 ms y da 504 `GATEWAY_TIMEOUT` con «240000 ms» al llegar a 240 000. Cubre también la lectura literal de CA-15 (90 s: el plan no corta, otra ruta responde 504 con el timeout general) con los valores por defecto. No depende de que la conexión al backend se establezca, por eso pasa también en el sandbox.
2. **CA-1 como prueba `node:test` en `tests/server/legacy-urls.test.mjs`.** La prueba previa (`api_client.spec.js`) solo comprobaba que `ApiClient` rechaza URL absolutas, no el «Entonces» del CA (búsqueda en `master/js`). Las rutas autorizadas que ejecuta node son `tests/server/**`, `tests/tools/i18n.test.mjs` y `tests/api/…`; se eligió `tests/server/**` porque `legacy-scan` también recorre `server/`. La prueba exige que cada coincidencia esté registrada en `legacy-scan` con un dueño distinto de FND-002 y que no esté `Hecha`/`Descartada`, que los servicios de la capa API no tengan `http(s)://` y que `apiConfig.baseUrl` sea `'/api/v1'`. Si el orquestador prefiere ubicarla en `tests/tools/`, hace falta ampliar §3.
3. **CA-18 en el arnés i18n.** La prueba unitaria previa solo comprobaba la clave; el CA pide el texto en los tres idiomas, así que se añadió la comprobación sobre `master/i18n/{es,en,es_AR}.json`.
4. CA-1 y CA-18 pasaron a la primera porque el código ya existía (regularización). Para comprobar que las pruebas detectan el fallo se hizo una **mutación temporal** (URL `http://hanoit:9000/...` añadida a `api_client.js`; texto de `en.OTP_DELIVERY_FAILED` igualado al de 502) → ambas en rojo; se restauraron los archivos byte a byte desde la copia de seguridad (`git status --short master/` vacío).

## Resultado por criterio
| CA | Resultado | Evidencia (comando + salida resumida / archivo:línea) |
| --- | --- | --- |
| CA-1 | Cumple | `node --test tests/server/legacy-urls.test.mjs` → `✔ [FND-002 CA-1] …` (pass 1). Rojo por mutación: `AssertionError: api_client.js`. Hoy solo quedan 3 coincidencias en `osrmHttp.js:90,145,265` (dueños en legacy-scan: JOR-001/CIE-001, no cerradas). La prueba unitaria `api_client.spec.js` `[FND-002 CA-1]` no se ejecutó (Karma). |
| CA-2 | No verificado | Pruebas `proxy.test.mjs` `[FND-002 CA-2] reenvía sin Origin…` y `api-core.e2e.mjs`: `connect EACCES` en sandbox / E2E no ejecutado. `tls.test.mjs`: pasan las 2 pruebas de `resolveCaFile`/`backendAgent`; el bloque HTTPS se omite (`openssl no disponible`). |
| CA-3 | No verificado | `proxy.test.mjs` `[FND-002 CA-3]` → `fetch failed … EACCES`. |
| CA-4 | No verificado | `proxy.test.mjs` `[FND-002 CA-4]` (×2) → `EACCES`. |
| CA-5 | No verificado | `[FND-002 CA-5] backend lento → 504; caído → 502` → `EACCES`. `[FND-002 CA-5] si el backend corta…` sale ✔ pero en el sandbox es un falso positivo (`assert.rejects` acepta el `EACCES`); ver Hallazgo 2. |
| CA-6 | No verificado | `api_client.spec.js` y `page.contract.spec.js` `[FND-002 CA-6]`: Karma no arranca (`ChromeHeadless failed 2 times (cannot start)`). |
| CA-7 | No verificado | Karma no arranca; sonda `tests/api` no ejecutada. |
| CA-8 | No verificado | Karma no arranca. |
| CA-9 | No verificado | Karma no arranca. |
| CA-10 | No verificado | `npm test` → `✔ [FND-002 CA-10] cada código de ErrorMessages tiene texto en es, en y es_AR` (diccionarios con `{{seconds}}`); la parte de `ErrorMessages.for` con 30 s (`error_messages.spec.js`) es Karma y no se ejecutó. |
| CA-11 | No verificado | `error_messages.spec.js` `[FND-002 CA-11]` (×3): Karma no arranca. |
| CA-12 | No verificado | `api_client.spec.js` `[FND-002 CA-12]`: Karma no arranca. |
| CA-13 | No verificado | `api_client.spec.js` `[FND-002 CA-13]`: Karma no arranca; sonda no ejecutada. |
| CA-14 | No verificado | `proxy.test.mjs` `[FND-002 CA-14]` → `EACCES`; E2E no ejecutado. |
| CA-15 | Cumple | Rojo (antes de D7): `node --test --test-name-pattern="240 000" tests/server/proxy.test.mjs` → exit 1, `AssertionError: el plan no debe cortarse antes de 240 000 ms — 504 !== null`. Verde (tras D7): exit 0, `✔ [FND-002 CA-15] sin BACKEND_PLAN_TIMEOUT_MS el plan corta a los 240 000 ms y el resto a los 60 000 ms`. La prueba con variables explícitas (`BACKEND_PLAN_TIMEOUT_MS: '2000'`) → `EACCES` en sandbox. |
| CA-16 | No verificado | `api_client.spec.js` (×2) y `auth_response_interceptor.spec.js` (×2): Karma no arranca; sonda no ejecutada. |
| CA-17 | No verificado | Unitarias/contrato (Karma) no ejecutadas; `proxy.test.mjs` `[FND-002 CA-17]` (×2) → `EACCES`. Fixture real de `post__places__batch-delete` sin capturar. |
| CA-18 | Cumple (parte i18n) | `npm test` → `✔ [FND-002 CA-18] OTP_DELIVERY_FAILED tiene texto propio, distinto del genérico de 502, en es, en y es_AR`. Rojo por mutación: `AssertionError: en: igual al genérico de 502`. La parte `ErrorMessages.for` → clave propia (`error_messages.spec.js`) es Karma y no se ejecutó. |

Inventario de etiquetas: los 18 CA tienen al menos una prueba `[FND-002 CA-n]` (`git grep -o "\[FND-002 CA-[0-9]+\]" -- tests`). Revisadas las aserciones: todas comprueban el resultado observable del CA; las dos que no lo hacían del todo (CA-1, CA-18) se completaron.

## Hallazgos
| # | Severidad | Criterio o regla | Archivo:línea | Cómo reproducir | Impacto |
| --- | --- | --- | --- | --- | --- |
| 1 | Baja | Coherencia documental con D7 | `docs/contracts/known-backend-defects.md:20`; `specs/migracion-api-v1/f4-jornadas/JOR-001-journey-plan.md:164` | `git grep -n -E "180000\|180 000\|180 s"` | Siguen diciendo 180 s; están fuera de §3 de FND-002, no se tocaron. Que el orquestador los actualice (o los registre en JOR-001). |
| 2 | Baja | Pruebas deterministas | `tests/server/proxy.test.mjs` (`[FND-002 CA-5] si el backend corta tras enviar cabeceras…`) | Ejecutar en un entorno sin red local: pasa porque `assert.rejects` acepta cualquier error, incluido `EACCES` | Falso positivo posible; se podría afinar la aserción (p. ej. comprobar que hubo respuesta 200 antes del corte). No se cambió para no alterar el alcance. |
| 3 | Info | Cobertura de diff | — | `npm run coverage:diff -- --base angularjs-main` | Mide `angularjs-main...HEAD`; con los cambios sin confirmar da «N/A». Hay que repetirla tras confirmar. |

## Comandos ejecutados (literal)
```
node --test --test-name-pattern="240 000" "tests/server/proxy.test.mjs"   -> exit 1 (ROJO antes de D7: 504 !== null)
node --test --test-name-pattern="240 000" "tests/server/proxy.test.mjs"   -> exit 0 (VERDE tras D7: pass 1)
node --test tests/server/legacy-urls.test.mjs                             -> exit 0 (pass 1)
node --test --test-name-pattern="CA-1\]|CA-18\]" tests/server/legacy-urls.test.mjs tests/tools/i18n.test.mjs   -> exit 1 (mutación temporal: CA-1 y CA-18 en rojo; luego se restauró)
npm test                                         -> exit 1 (tests 61, pass 56, fail 5; los 5 fallos son [FND-001 CA-3/CA-4] de mock-api por "connect EACCES 127.0.0.1" del sandbox; [FND-002 CA-10] y [FND-002 CA-18] ✔)
npm run test:unit -- --spec FND-002              -> exit 1 (ChromeHeadless failed 2 times (cannot start); 0 pruebas ejecutadas)
npm run test:integration                         -> exit 1 (ChromeHeadless failed 2 times (cannot start); 0 pruebas ejecutadas)
npm run test:server                              -> exit 1 (tests 16, pass 4, fail 12; los 12 fallos son "connect EACCES 127.0.0.1:<puerto>"; bloque HTTPS omitido: openssl no disponible; la suite termina en ~0,7 s sin colgarse)
npm run coverage:unit                            -> exit 1 (ChromeHeadless no arranca; coverage/unit/lcov.info NO se regeneró, es del 2026-11-25)
npm run coverage:server                          -> exit 1 (mismos 12 EACCES; lcov regenerado: proxy.js 86,49 % líneas, app.js 89,66 %)
npm run coverage:tools                           -> exit 0
npm run coverage:merge                           -> exit 0 ("lcov: 3/3 archivos → coverage/lcov.info"; incluye el lcov unitario antiguo)
npm run coverage:diff -- --base angularjs-main   -> exit 0 ("N/A: el diff no contiene líneas ejecutables de código fuente": compara angularjs-main...HEAD y los cambios no están confirmados)
node tools/specs.mjs legacy-scan --id FND-002    -> exit 0 ("Total 0; bloqueantes 0")
git hash-object -w … / git commit                -> exit 128 ("insufficient permission for adding an object to repository database .git/objects")
npx --no-install eslint@10.15.0 -f json …        -> cancelado (se quedó colgado en el sandbox; no se obtuvo informe)
```
Comprobación manual de la línea modificada: `coverage/lcov.info`, `SF:server/proxy.js` → `DA:47,9` (la única línea ejecutable cambiada, `planTimeoutMs … || 240000`, está cubierta: 1/1).

## Commits propuestos (no se pudo confirmar desde el sandbox)
1. `fix(FND-002): timeout de planificación del proxy a 240 000 ms por defecto (#80)` — `server/proxy.js`, `.env.example`, `docs/architecture/adr/0002-proxy-mismo-origen.md` y `tests/server/proxy.test.mjs` **solo con la prueba nueva `[FND-002 CA-15] sin BACKEND_PLAN_TIMEOUT_MS…` y el import `PassThrough`**. Versión intermedia ya preparada en `C:\Users\harol\.gemini\antigravity\brain\289900a8-9eea-4c23-8365-7e8b20e65508\scratch\proxy.test.mid.mjs` (HEAD + esa prueba); se puede preparar con `git update-index --cacheinfo 100644,$(git hash-object -w <ruta>),tests/server/proxy.test.mjs`, o sin más usar `git add -p`. Cuerpo: `Spec: FND-002` / `Refs: #80`.
2. `test(FND-002): cierra los servidores de prueba en try/finally (#80)` — el resto de `tests/server/proxy.test.mjs`, `tests/server/helpers.mjs` y `tests/server/tls.test.mjs`.
3. `test(FND-002): pruebas observables de CA-1 y CA-18 (#80)` — `tests/server/legacy-urls.test.mjs` y `tests/tools/i18n.test.mjs`.
4. `docs(FND-002): informe del implementador 2026-11-27 (#80)` — este archivo.

Después de confirmar: `npm run coverage:merge && npm run coverage:diff -- --base angularjs-main`.

## Limitaciones y no verificado
- **No verificado: sandbox.** Karma (`test:unit`, `test:integration`, `coverage:unit`) porque ChromeHeadless no arranca; las pruebas de servidor y de mock-api que abren conexiones a `127.0.0.1` porque fallan con `connect EACCES`. La persona tiene que ejecutar fuera del sandbox: `npm test`, `npm run test:unit -- --spec FND-002`, `npm run test:integration`, `npm run test:server`, cobertura completa y `coverage:diff`.
- **No verificado: E2E** `npm run test:e2e -- --grep FND-002` (Playwright + puertos locales), no ejecutado.
- **No verificado: sondas** `npm run test:api` contra el backend real (necesita `.env` y red), no ejecutadas.
- **No verificado:** captura del fixture real de `post__places__batch-delete` contra el backend; la prueba de contrato sigue usando el ejemplo documentado (M1).
- **No verificado:** lint del diff (`eslint` + `tools/lint-diff.mjs`); `npx` se colgó en el sandbox.
- Pendiente fuera de §3: actualizar 180 s → 240 s en `docs/contracts/known-backend-defects.md:20` y `JOR-001-journey-plan.md:164` (Hallazgo 1).
- §10 (Trazabilidad) de la spec no se tocó: la spec no está en «Archivos autorizados». Cuando se confirme, el orquestador debería añadir `tests/server/legacy-urls.test.mjs` (CA-1) y `tests/tools/i18n.test.mjs` (CA-18) y los nuevos commits.

## Adenda (2026-11-27)
Encargo del orquestador con decisiones de Harold Avenia (2026-11-27). Sin commits ni `BypassSandbox`. Archivos tocados en esta adenda: `tests/server/proxy.test.mjs`, `docs/contracts/known-backend-defects.md` y este informe.

### 1. CA-5: se endurece «si el backend corta tras enviar cabeceras…» (`tests/server/proxy.test.mjs`)
- **Antes:** `await assert.rejects(async () => { const r = await fetch(...); await r.text(); })` aceptaba cualquier rechazo, también el `connect EACCES` del sandbox (falso positivo).
- **Ahora:** (a) `fetch` tiene que resolver, así que un error de conexión local rechaza ahí y la prueba falla; (b) se exige `status === 200` y `content-type: application/json`, es decir, que el proxy reenvíe las cabeceras del backend; (c) la lectura del cuerpo tiene que rechazar con `TypeError('terminated')` (undici, Node v24.22.3) y una `cause.code` que no sea `EACCES`/`ECONNREFUSED`/`EPERM`. Se conservan los dos `try/finally`.
- **Desviación del encargo (hay que decidir):** el encargo pedía exigir 502 o 504 con su campo `error`. **En este caso no es posible:** el backend ya envió `200` + cabeceras y `server/proxy.js` (l. 83-86) ya hizo `res.writeHead(200, …)` antes del corte. Por eso solo puede destruir el socket (`res.destroy()`), no cambiar el estado ni mandar un cuerpo JSON. Los casos 502 (`BAD_GATEWAY`) y 504 (`GATEWAY_TIMEOUT`) ya los exige con estado y `error` la prueba `[FND-002 CA-5] backend lento → 504; backend caído → 502` (l. 100-118). Si se quiere 502 también aquí, habría que cambiar `server/proxy.js` y quizá el criterio. Decide un humano.
- Comando, **antes** del cambio (pasa con EACCES en el resto del archivo; es el falso positivo):
  ```
  node --test tests/server/proxy.test.mjs
  ✔ [FND-002 CA-5] si el backend corta tras enviar cabeceras se cierra la conexión (2.9886ms)
  ℹ pass 2  ℹ fail 12   (los 12 fallos: [cause]: Error: connect EACCES 127.0.0.1:<puerto>)
  ```
- Comando, **después** del cambio (ahora falla por EACCES):
  ```
  node --test --test-name-pattern="corta tras enviar" tests/server/proxy.test.mjs
  ✖ [FND-002 CA-5] si el backend corta tras enviar cabeceras se cierra la conexión (23.8096ms)
  ℹ tests 1  ℹ pass 0  ℹ fail 1
    [TypeError [Error]: fetch failed] {
      [cause]: Error: connect EACCES 127.0.0.1:62796 … code: 'EACCES', syscall: 'connect'
  ```
- **No verificado: verde.** El sandbox bloquea las conexiones a `127.0.0.1` (EACCES). Hay que ejecutar fuera del sandbox: `node --test --test-name-pattern="corta tras enviar" tests/server/proxy.test.mjs` y `npm run test:server`.
- **Decisión de Harold Avenia (2026-11-27), opción A:** se acepta esta aserción (200 + `content-type` + cuerpo cortado; rechaza `EACCES`, `ECONNREFUSED` y `EPERM`). Los 502/504 de CA-5 los cubre la prueba `[FND-002 CA-5] backend lento → 504; backend caído → 502`. No se cambia `server/proxy.js`.

### 2. D9: `docs/contracts/known-backend-defects.md:20`
- Único cambio: «el timeout de 180 s» → «el timeout de 240 s».
- `git diff --stat -- docs/contracts/known-backend-defects.md` → `1 file changed, 1 insertion(+), 1 deletion(-)`.
- `Select-String -Path docs/contracts/known-backend-defects.md -Pattern "180 s"` → sin coincidencias.
- No se tocó `JOR-001-journey-plan.md`: no formaba parte de este encargo. Su diff ya estaba en el árbol antes de esta adenda.
