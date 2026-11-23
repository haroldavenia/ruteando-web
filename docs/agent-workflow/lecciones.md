# Lecciones aprendidas

Cada entrada: fecha, historia, lección, acción. Se borra cuando la acción queda incorporada a una regla, plantilla o ADR.

| Fecha | Historia | Lección | Acción |
| --- | --- | --- | --- |
| 2026-11-20 | FND-001 | La app real (`app.init.js`) depende de ~20 módulos de bower que no están en npm ni en CI sin `bower install`. | Karma carga un módulo `angle` de prueba + `tests/helpers/sources.json`; la carga completa se prueba en E2E. Incorporado (ADR-0005). |
| 2026-11-20 | FND-001 | Lanzar `node --test` dentro de otra prueba hereda `NODE_TEST_CONTEXT` y el hijo no imprime nada. | Borrar `NODE_TEST_CONTEXT` del entorno del hijo (`tests/tools/harness.test.mjs`). |
| 2026-11-20 | FND-002 | Los archivos legacy usan CRLF; reescribirlos con LF convierte todo el archivo en "modificado" y hunde la cobertura de diff. | Editar conservando CRLF (`.gitattributes` propuesto en ADR-0005). |
| 2026-11-20 | FND-002 | Los servidores HTTP de prueba no cierran con conexiones keep-alive abiertas por `fetch`. | `shut()` con `closeAllConnections()` en `tests/server/helpers.mjs`. |
| 2026-11-20 | FND-003 | Los fixtures capturados antes del contrato v3 traen `Role` en mayúsculas y `JourneyStatus.planned`. | Recapturar con `tests/tools/capture-fixture.mjs` en ACC-005/JOR-002 (anotado en `contract-gaps.md`). |
| 2026-11-20 | FND-002 | `/zones` no es paginado (arreglo) aunque el resto de listados sí. | Prueba de contrato lo fija; MAE-004 lee `/zones` con `ApiClient.get` (sin `page()`). |
