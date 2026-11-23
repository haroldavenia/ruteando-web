# Informe implementador — FND-001 — 2026-11-20

- Agente / modelo efectivo: implementación en Claude (Cowork), fuera de Antigravity, por pedido del usuario (alcance «Arnés + F0 implementado»)
- Commit evaluado: sin commit (pendiente de ADR-0001: rama base); árbol de trabajo en `ruteando-web`
- Rama / worktree: — (se creará `feat/<issue>-arnes-de-pruebas`)

## Veredicto
PASS WITH GAPS

## Resultado por criterio
| CA | Resultado | Evidencia (pruebas `[FND-001 CA-n]`) |
| --- | --- | --- |
| CA-1 | Cumple | `tests/helpers/bootstrap.spec.js` |
| CA-2 | Cumple | `tests/helpers/bootstrap.spec.js`, `tests/tools/harness.test.mjs` |
| CA-3 | Cumple | `tests/e2e/arnes-de-pruebas.e2e.mjs`, `tests/server/proxy.test.mjs` |
| CA-4 | Cumple | `tests/e2e/arnes-de-pruebas.e2e.mjs`, `tests/server/proxy.test.mjs` |
| CA-5 | No verificado: requiere la app compilada (bower + Gulp). Se ejecuta en `ci / e2e` o en el equipo con `npm run test:e2e`. | `tests/e2e/arnes-de-pruebas.e2e.mjs` |
| CA-6 | Cumple (sin BACKEND_URL las 6 sondas se omiten con motivo, exit 0). | `tests/api/arnes-de-pruebas.api.test.mjs`, `tests/tools/harness.test.mjs` |
| CA-7 | Cumple | `tests/tools/harness.test.mjs` |
| CA-8 | Cumple | `tests/tools/harness.test.mjs` |
| CA-9 | Cumple | `tests/tools/harness.test.mjs` |
| CA-10 | No verificado: job `ci / e2e` aún no corrió (sin rama publicada, ADR-0001). | `tests/e2e/arnes-de-pruebas.e2e.mjs`, `tests/tools/ensure-build.test.mjs` |

## Hallazgos
| # | Severidad | Criterio o regla | Archivo:línea | Cómo reproducir | Impacto |
| --- | --- | --- | --- | --- | --- |
| 1 | Media | CA-5/CA-10 | `tests/e2e/arnes-de-pruebas.e2e.mjs` | `npm run test:e2e` | Sin verificar la carga completa de la SPA compilada |

## Comandos ejecutados (literal, resumen de salida)
```
npm test                               -> exit 0
# tests 44
# pass 44
# fail 0
# skipped 0
npm run coverage:unit                  -> exit 0
TOTAL: 45 SUCCESS
Statements   : 97.14% ( 409/421 )
Branches     : 96.62% ( 344/356 )
Functions    : 99.24% ( 131/132 )
Lines        : 96.85% ( 369/381 )
npm run test:integration               -> exit 0
TOTAL: 15 SUCCESS
npm run coverage:server                -> exit 0
ℹ tests 11
ℹ pass 11
ℹ fail 0
ℹ  app.js   | 100.00 |    91.67 |  100.00 | 
ℹ  proxy.js | 100.00 |    84.62 |   90.91 |
npm run coverage:tools                 -> exit 0
ℹ tests 34
ℹ pass 34
ℹ fail 0
ℹ all files             |  99.02 |    94.56 |   91.91 |
npm run coverage:merge                 -> lcov: 3/3 archivos → coverage/lcov.info
CI=1 E2E_SKIP_BUILD=1 npx playwright test --grep-invert "CA-5"   -> exit 0
✓  1 [chromium] › tests/e2e/api-core.e2e.mjs:4:1 › [FND-002 CA-14] el enlace del correo /verify-email?token= abre la SPA con el token (413ms)
  ✓  2 [chromium] › tests/e2e/api-core.e2e.mjs:9:1 › [FND-002 CA-2] la SPA llama a /api/v1 en el mismo origen (sin CORS) (315ms)
  ✓  3 [chromium] › tests/e2e/arnes-de-pruebas.e2e.mjs:13:1 › [FND-001 CA-3] el proxy entrega páginas del mock-api al navegador (39ms)
  ✓  4 [chromium] › tests/e2e/arnes-de-pruebas.e2e.mjs:20:1 › [FND-001 CA-4] los escenarios de error del mock llegan por el proxy (29ms)
  ✓  5 [chromium] › tests/e2e/sistema-ui.e2e.mjs:8:1 › [FND-005 CA-6] cada pantalla de la maqueta abre por su ancla sin errores y con estados de error documentados (4.0s)
  ✓  6 [chromium] › tests/e2e/sistema-ui.e2e.mjs:24:1 › [FND-005 CA-6] el selector de rol filtra el menú (agent no ve usuarios ni plataforma) (467ms)
  6 passed (6.5s)
BACKEND_URL= npm run test:api          -> exit 0 (omitidas con motivo)
ℹ tests 6
ℹ pass 0
ℹ fail 0
ℹ skipped 6
node tools/diff-coverage.mjs --lcov coverage/lcov.info --base <base> (simulado en un repo temporal: base = archivos originales del equipo)
**98.43%** (1313/1334 líneas) — umbral 90% → PASA
npx -y eslint@10.15.0 -f json <archivos cambiados> && node tools/lint-diff.mjs --report … --base <base>
Lint del diff: 0 problema(s) en líneas cambiadas; 3 heredado(s) en esos archivos (informativo).
node tools/specs.mjs lint --all        -> 41 specs: todas cumplen
node tools/specs.mjs trace             -> Trazabilidad: OK
node tools/validate-harness.mjs .      -> ✔ Configuración de Antigravity válida
```

## Limitaciones y no verificado
- CA-5 y CA-10 sin ejecutar: el contenedor de la sesión no alcanza el registro de bower; la parte de E2E sin build (CA-3, CA-4) sí corrió.
- Sondas API no ejecutadas contra el backend real: `hanoit` no es alcanzable desde el contenedor (TLS autofirmado/red).
- Faltan los informes independientes de validador, contendiente y calidad-seguridad: se generan en Antigravity con `/validar-spec`, `/revision-contendiente` y `/revision-calidad-seguridad`.
