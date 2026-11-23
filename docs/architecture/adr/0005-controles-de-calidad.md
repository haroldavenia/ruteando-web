# ADR-0005: Pruebas AngularJS, CI y cobertura de diff ≥ 90 %

- Estado: Propuesto (FND-001)
- Fecha: 2026-11-20

## Contexto
El repositorio no tenía pruebas (`npm test` apuntaba a un `karma.conf.js` inexistente). La app depende de ~20 módulos de bower y se compila con Gulp; `app/` y `master/bower_components/` no se versionan.

## Decisión
- **Unitarias y contrato**: Karma 6 + Jasmine + `angular`/`angular-mocks` 1.3.15 de npm, ChromeHeadless (`CHROME_BIN` o el Chromium de Playwright). Se carga un módulo `angle` de prueba (`tests/helpers/app-shim.js`) y solo el código migrado (`tests/helpers/sources.json`); los fixtures reales se sirven a las pruebas (`fixture()`). La carga completa de la app se cubre en E2E.
- **Servidor**: `node --test` sobre `tests/mock-api` (fixtures + CRUD en memoria + escenarios de error).
- **E2E**: Playwright contra `server/server.js` + mock-api; `tests/e2e/ensure-build.mjs` compila con Gulp si hace falta; en CI se instalan las dependencias de `master/` con `--ignore-scripts` (node-sass no compila en Node 22 y no se usa sin `--usesass`) y `bower install`.
- **Sondas**: `node --test` contra `BACKEND_URL`; sin configuración se omiten con motivo.
- **Cobertura**: LCOV de Karma, servidor y herramientas, unidos con `tools/merge-lcov.mjs`; `tools/diff-coverage.mjs` exige ≥ 90 % en líneas nuevas/modificadas de `master/js`, `server` y `tools`. Sin `ignore` ni exclusiones ad hoc.
- **Lint**: ESLint 10.15.0 sin plugins (`eslint.config.mjs`: ES5/script para `master/js`, Node para el resto) solo sobre líneas cambiadas.
- **Finales de línea**: los archivos legacy son CRLF; se conservan al editarlos. Propuesta: añadir `.gitattributes` (`* text=auto`) en un PR propio tras ADR-0001.

## Consecuencias
- Cada historia añade sus archivos a `sources.json`; un archivo de `master/js` tocado y no cargado por Karma cuenta como no cubierto.
- La deuda heredada no bloquea; lo que se toca queda probado.
