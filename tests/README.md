# Pruebas de ruteando-web

Estrategia: `docs/engineering/estrategia-de-pruebas.md` · decisión: ADR-0005 · historia: FND-001.

| Carpeta | Qué contiene | Comando |
| --- | --- | --- |
| `unit/<slug>/*.spec.js` | Unitarias AngularJS (Karma + Jasmine + angular-mocks 1.3.15) | `npm run test:unit [-- --spec <ID>]` |
| `integration/<slug>/*.spec.js` | Contrato: fixtures reales por los mapeadores | `npm run test:integration` |
| `server/*.test.mjs` | Proxy, redirecciones (node:test + mock-api) | `npm run test:server` |
| `e2e/*.e2e.mjs` | Playwright: server.js + mock-api (o backend con `E2E_LIVE=1`) | `npm run test:e2e` |
| `api/*.api.test.mjs` | Sondas contra `BACKEND_URL` (`.env`); sin config se omiten | `npm run test:api` |
| `tools/*.test.mjs` | Pruebas del propio arnés | `npm test` |
| `helpers/` | `app-shim.js` (módulo `angle` de prueba), `fixtures.js` (`fixture()`), `sources.json` (código cargado por Karma) | — |
| `mock-api/` | Mock de `/api/v1` con fixtures + CRUD en memoria; `x-mock-scenario: 409`, `x-mock-delay: 500` | `npm run mock-api` |
| `fixtures/api-v1/` | Respuestas reales saneadas del backend | `node tests/tools/capture-fixture.mjs GET /ruta` |

Toda prueba que demuestra un criterio se nombra `[<ID> CA-<n>] …`.
