---
name: revision-contendiente
description: Procedimiento de revisión adversarial de una historia de la migración - errores del contrato, sesión y concurrencia, datos límite, unidades y coordenadas, seguridad de la UI; con reproducción ejecutable y sin tocar datos reales.
---

# Revisión contendiente

1. Declara modelo propio y de la sesión principal; si coinciden, es una limitación.
2. Lee la spec, el contrato y el diff. Hipótesis por categoría: errores HTTP del contrato, sesión/refresh, concurrencia y doble envío, paginación y vacíos, unidades y coordenadas, XSS/CSV, navegación.
3. Reproduce cada hipótesis con una prueba temporal (Karma con `$httpBackend`, Playwright con `page.route`, o `x-mock-scenario` en `tests/mock-api`) en el directorio temporal. Límite 60 s por prueba.
4. Solo `tests/mock-api` o el tenant de pruebas; nunca datos reales ni carga contra el backend compartido.
5. Informe con severidad, reproducción, impacto y veredicto. Hipótesis no reproducidas no bloquean.

## Ejecución sin esperas (sandbox)
- **No pidas salir del sandbox** (`BypassSandbox`): la persona no está pendiente y la petición caduca.
- Ejecuta dentro del sandbox lo que funcione: lectura del diff y de la spec, `node tools/specs.mjs lint|dod|trace|legacy-scan`, `node tools/validate-harness.mjs .`, `npm run coverage:tools`, ESLint y `tools/lint-diff.mjs`, y pruebas sin puertos ni red.
- Para lo que necesita navegador, puertos locales o red (Karma, `test:server`, E2E, `npm audit`, gitleaks), **cita la evidencia de CI del commit evaluado**: `specs/<iniciativa>/<fase>/evidencia/<ID>/AAAA-MM-DD-ci-<sha>.md`. Si el SHA no coincide con `git rev-parse HEAD` o no existe, márcalo «No verificado (sin CI del commit)», sin esperar.
- Reproduce hallazgos invocando los módulos en proceso (sin abrir sockets) cuando sea posible.
