---
trigger: glob
globs: "**/*.js, **/*.mjs, **/*.cjs, tests/**"
---

# Pruebas y cobertura
- TDD: primero la prueba que falla para cada CA. Nombre obligatorio: `[<ID> CA-<n>] <qué demuestra>`.
- AngularJS: Karma + Jasmine + `angular-mocks@1.3.15`; `module('angle')`, `$httpBackend` con respuestas de `tests/fixtures/api-v1/*.json` (`fixture('<nombre>')`); `$controller` con servicios falsos basados en `$q`; `jasmine.clock()` para tiempo.
- Contrato (`tests/integration`): la respuesta real del fixture pasa por `toDomain` sin `undefined` en campos que la pantalla usa, y `toRequest` produce las claves del contrato.
- E2E (`tests/e2e`): Playwright con `getByRole`/`getByLabel` contra `tests/mock-api`; escenarios de error con `x-mock-scenario`.
- Servidor: `node:test` + `node:assert/strict`; separa la lógica pura del `listen`.
- Cobertura ≥ 90 % de líneas nuevas/modificadas (`tools/diff-coverage.mjs`); prohibido `coverage ignore`, exclusiones y pruebas sin aserciones. Sin `fit`, `xit`, `.only`, `.skip`.
- No declares un CA cumplido sin la salida real del comando de prueba.
