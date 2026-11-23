---
name: implementar-spec
description: Procedimiento del implementador para una spec de la migración - TDD por criterio con Karma/Playwright/node:test, cambios mínimos en archivos autorizados, retiro del legacy sustituido, cobertura de diff e informe.
---

# Implementar spec

1. Lista CA, archivos autorizados, contrato y maqueta. Archivo fuera de la lista → no lo toques; repórtalo.
2. Por CA: prueba roja `[<ID> CA-<n>]` → código mínimo → verde. Guarda ambas salidas.
3. Datos en `master/js/modules/services/<entidad>.api.js` sobre `ApiClient`; controladores sin transformación de contrato; vistas con componentes `rw-*` iguales a la maqueta.
4. Ejecuta:
   - `npm run test:unit -- --spec <ID>` y `npm run test:integration`
   - `npm run coverage:unit` (y `coverage:server` si tocaste `server/`)
   - `node tools/diff-coverage.mjs --lcov coverage/lcov.info --base <base>`
   - `npx -y eslint@10.15.0 -f json <archivos cambiados> > .tmp/eslint.json` y `node tools/lint-diff.mjs --report .tmp/eslint.json --base <base>`
   - `npm run test:e2e -- --grep <ID>` si hay vistas
   - `node tools/specs.mjs legacy-scan --id <ID>` = 0
5. Commits Conventional con `Spec: <ID>`. Mide la cobertura de diff **después** de confirmar.
6. Informe con `specs/_templates/informe-rol.md`. Nada de "Cumple" sin salida de prueba.
