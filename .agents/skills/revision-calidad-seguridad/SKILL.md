---
name: revision-calidad-seguridad
description: Procedimiento de calidad y seguridad - cobertura de diff >= 90 %, cobertura global informativa, lint de líneas cambiadas, dependencias, secretos y riesgos web del frontend.
---

# Revisión de calidad y seguridad

1. `npm run coverage:unit` (+ `coverage:server`) y `node tools/diff-coverage.mjs --lcov coverage/lcov.info --base <base>`. % del diff y % global por separado.
2. Pruebas: aserciones reales, etiquetas `[<ID> CA-n]`, sin `coverage ignore`, exclusiones, `fit/xit/.only/.skip`.
3. `npx -y eslint@10.15.0 -f json $(git diff --name-only --diff-filter=ACMR <base>...HEAD -- '*.js' '*.mjs' '*.cjs') > .tmp/eslint.json` y `node tools/lint-diff.mjs --report .tmp/eslint.json --base <base>`.
4. `npm audit --audit-level=high` (raíz y `master/`); distingue heredadas de introducidas.
5. Secretos: `gitleaks git . --log-opts="<base>..HEAD" --redact` si está instalado; si no, revisión manual y dilo.
6. Web: `ng-bind-html`/`$sce`, tokens en almacenamiento, redirecciones, CSV/XLSX, logs con datos personales.
7. Informe con veredicto y cada control Ejecutado / No ejecutado (motivo).

## Ejecución sin esperas (sandbox)
- **No pidas salir del sandbox** (`BypassSandbox`): la persona no está pendiente y la petición caduca.
- Ejecuta dentro del sandbox lo que funcione: lectura del diff y de la spec, `node tools/specs.mjs lint|dod|trace|legacy-scan`, `node tools/validate-harness.mjs .`, `npm run coverage:tools`, ESLint y `tools/lint-diff.mjs`, y pruebas sin puertos ni red.
- Para lo que necesita navegador, puertos locales o red (Karma, `test:server`, E2E, `npm audit`, gitleaks), **cita la evidencia de CI del commit evaluado**: `specs/<iniciativa>/<fase>/evidencia/<ID>/AAAA-MM-DD-ci-<sha>.md`. Si el SHA no coincide con `git rev-parse HEAD` o no existe, márcalo «No verificado (sin CI del commit)», sin esperar.
- Reproduce hallazgos invocando los módulos en proceso (sin abrir sockets) cuando sea posible.
