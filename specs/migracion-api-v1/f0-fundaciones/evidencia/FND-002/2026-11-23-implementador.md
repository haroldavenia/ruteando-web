# Informe implementador — FND-002 — 2026-11-23

- Agente / modelo efectivo: Claude (Cowork), fuera de Antigravity, a petición del usuario (refinamiento con la documentación del backend del 2026-11-23)
- Commit evaluado: sin commit (ADR-0001 pendiente)
- Rama / worktree: —

## Veredicto
PASS

## Resultado por criterio
| CA | Resultado | Evidencia |
| --- | --- | --- |
| CA-17 | Cumple | `tests/unit/api-core/api_client.spec.js` (150 ids → lotes 100 + 50; deleted/not_found/conflict; 422), `tests/integration/api-core/page.contract.spec.js` (forma de endpoints.md M1), `tests/server/proxy.test.mjs` (mock-api: batch-delete, `PATCH /packages/status`, `?q=`) |
| CA-18 | Cumple | `tests/unit/api-core/error_messages.spec.js`, `tests/tools/i18n.test.mjs` (`OTP_DELIVERY_FAILED` en es, en y es_AR) |
| CA-1…CA-16 | Sin cambios | Ver `2026-11-20-implementador.md`; la regresión sigue en verde |

## Hallazgos
| # | Severidad | Criterio o regla | Archivo:línea | Cómo reproducir | Impacto |
| --- | --- | --- | --- | --- | --- |
| 1 | Baja | Contrato | `tests/integration/api-core/page.contract.spec.js` | — | Usa el ejemplo documentado de batch-delete hasta capturar el fixture real |

## Comandos ejecutados (literal, resumen de salida)
```
npx karma start karma.conf.cjs --single-run --spec FND-002   -> TOTAL: 21 SUCCESS
npm run coverage:unit                                        -> TOTAL: 48 SUCCESS (api_client.js 100 % líneas)
SUITE=integration npx karma start karma.conf.cjs --single-run -> TOTAL: 16 SUCCESS
npm run test:server                                          -> 18 pass, 0 fail
npm test                                                     -> 45 pass, 0 fail
npm run coverage:tools                                       -> 35 pass; specs.mjs 100 % líneas
CI=1 E2E_SKIP_BUILD=1 npx playwright test --grep-invert CA-5 -> 6 passed
npx -y eslint@10.15.0 <archivos cambiados>                    -> sin errores
node tools/specs.mjs lint --all / trace / lint-ui             -> 41 specs cumplen / OK / PASS
```

## Limitaciones y no verificado
- Sin sonda contra `https://hanoit:8000` para batch-delete desde esta sesión (no alcanza el host): capturar `post__places__batch-delete` con `capture-fixture`.
