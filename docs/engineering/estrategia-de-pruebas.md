# Estrategia de pruebas (FND-001)

| Nivel | Qué prueba | Dónde | Herramienta | Contra qué | Cuándo |
| --- | --- | --- | --- | --- | --- |
| Unitaria | Servicios, `toDomain`/`toRequest`, controladores, directivas | `tests/unit/<slug>/` | Karma + Jasmine + `$httpBackend` | Dobles; fixtures reales como respuesta | Cada commit |
| Contrato | Que los fixtures reales del backend pasan por los mapeadores sin perder campos | `tests/integration/<slug>/` | Karma | `tests/fixtures/api-v1/*.json` | Cada commit |
| Servidor | Proxy, timeouts, redirecciones | `tests/server/` | `node --test` | mock-api | Cada commit |
| E2E | Flujos de pantalla de la spec, igual a la maqueta | `tests/e2e/<slug>.e2e.mjs` | Playwright | server.js + mock-api (`E2E_LIVE=1`: backend real) | Cada PR |
| Sonda API | Que el backend real cumple lo que la spec asume | `tests/api/<slug>.api.test.mjs` | `node --test` | `BACKEND_URL` + cuenta de pruebas | Antes de `Lista` y al cerrar la historia |
| Arnés | Las propias herramientas | `tools/test/`, `tests/tools/` | `node --test` | — | Cada commit |

## Reglas
- Nombre `[<ID> CA-<n>] …` en toda prueba que demuestre un criterio; `node tools/specs.mjs dod <ID>` lo exige para cada CA.
- Un CA de interfaz se demuestra con E2E (rol/etiqueta accesible, no selectores CSS frágiles) y su lógica con unitarias.
- Errores del contrato: cada código relevante de `migration-guide.md` §15 tiene CA y prueba (`$httpBackend.respond(409, {...})` o `x-mock-scenario`).
- Sondas: nunca crean datos fuera del tenant de pruebas y limpian lo que crean; sin backend se **omiten con motivo** (no hay falsos verdes).
- Fixtures nuevos: `node tests/tools/capture-fixture.mjs GET /ruta` (saneado automático de emails, teléfonos, nombres y tokens).
- Karma: añade los archivos migrados a `tests/helpers/sources.json` (orden del gulpfile).
