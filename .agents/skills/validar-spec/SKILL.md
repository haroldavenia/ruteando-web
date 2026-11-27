---
name: validar-spec
description: Procedimiento del validador - contrastar cada criterio de aceptación con el diff, con pruebas etiquetadas ejecutadas, con el contrato y con la maqueta, incluida regresión.
---

# Validar spec

1. Lee la spec, su contrato y `git diff <base>...HEAD`.
2. Por CA: localiza `[<ID> CA-<n>]`, lee la prueba y confirma que sus aserciones demuestran el "Entonces". Ejecútala.
3. Regresión: `npm run test:unit`, `npm run test:integration`, `npm run test:server`, `npm run test:e2e`.
4. Archivos cambiados ⊂ "Archivos autorizados"; `node tools/specs.mjs legacy-scan --id <ID>` = 0.
5. Interfaz: `npm start` con `BACKEND_URL` de `tests/mock-api`, recorre los flujos en el navegador de Antigravity y compáralos con `docs/ui/maquetas/index.html#<id>`; capturas en `evidencia/<ID>/`.
6. Informe con veredicto PASS / PASS WITH GAPS / FAIL.

## Ejecución sin esperas (sandbox)
- **No pidas salir del sandbox** (`BypassSandbox`): la persona no está pendiente y la petición caduca.
- Ejecuta dentro del sandbox lo que funcione: lectura del diff y de la spec, `node tools/specs.mjs lint|dod|trace|legacy-scan`, `node tools/validate-harness.mjs .`, `npm run coverage:tools`, ESLint y `tools/lint-diff.mjs`, y pruebas sin puertos ni red.
- Para lo que necesita navegador, puertos locales o red (Karma, `test:server`, E2E, `npm audit`, gitleaks), **cita la evidencia de CI del commit evaluado**: `specs/<iniciativa>/<fase>/evidencia/<ID>/AAAA-MM-DD-ci-<sha>.md`. Si el SHA no coincide con `git rev-parse HEAD` o no existe, márcalo «No verificado (sin CI del commit)», sin esperar.
- Reproduce hallazgos invocando los módulos en proceso (sin abrir sockets) cuando sea posible.
