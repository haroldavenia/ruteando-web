# Controles de calidad y CI (ruteando-web)

Decisión: ADR-0005. Node 24 LTS (`.nvmrc`; el build legacy usa `master/gulp-node-compat.cjs`), `permissions` mínimos.

| Control | Workflow / job | Herramienta | Bloqueante |
| --- | --- | --- | --- |
| Rama, título, Issue y spec | `pr-conventions / validate` | github-script | **Sí** |
| Arnés y specs | `ci / config` | `tools/validate-harness.mjs`, `specs.mjs lint --all`, `trace`, `lint-ui`, JSON/YAML | **Sí** |
| Herramientas del arnés | `ci / test-and-coverage` | `node --test` (tools/, tests/tools) | **Sí** |
| Unitarias AngularJS | `ci / test-and-coverage` | Karma 6 + Jasmine + angular-mocks 1.3.15 (ChromeHeadless) | **Sí** |
| Contrato con fixtures reales | `ci / test-and-coverage` | Karma, suite `integration` | **Sí** |
| Servidor (proxy, redirecciones) | `ci / test-and-coverage` | `node --test` sobre mock-api | **Sí** |
| Cobertura de líneas nuevas/modificadas ≥ 90 % | `ci / test-and-coverage` | LCOV (Karma + node) → `tools/merge-lcov.mjs` → `tools/diff-coverage.mjs` | **Sí** |
| E2E | `ci / e2e` | bower + Gulp build + Playwright (server.js + mock-api) | **Sí** |
| Lint de líneas cambiadas | `ci / lint` | ESLint 10.15.0 + `tools/lint-diff.mjs` | **Sí** |
| Secretos | `security / gitleaks` | gitleaks 8.30.1 | **Sí** |
| Dependencias | `security / npm-audit` | `npm audit --audit-level=high` | No (informativo: deuda heredada) |
| Sondas contra el backend real | local / manual | `npm run test:api` (`.env`) | No en CI (sin backend accesible) |

## Cobertura
1. Karma instrumenta solo los archivos de `tests/helpers/sources.json`; un archivo de `master/js` cambiado que no está en esa lista aparece "sin LCOV" y cuenta como 0 %: hay que añadirlo y probarlo.
2. El servidor mide `server/app.js` y `server/proxy.js`; `server/server.js` es el punto de arranque (13 líneas) y `server/legacy-satellizer.js` es código movido sin cambios (se excluye del cálculo; se retira en CIE-001).
3. Prohibido: `istanbul ignore`, `node:coverage ignore`, exclusiones ad hoc, pruebas sin aserciones. Excepciones: sección 8 de la spec + aprobación humana.

## Etiqueta `codigo-heredado`
Convierte en aviso la cobertura y el lint del diff en PR que solo mueven o incorporan código. La pone y aprueba un humano.

## Ejecución local
```
npm ci --ignore-scripts
npm test && npm run test:unit && npm run test:integration && npm run test:server
npm run coverage:unit && npm run coverage:server && npm run coverage:tools && npm run coverage:merge
node tools/diff-coverage.mjs --lcov coverage/lcov.info --base angularjs-main
npm run test:e2e        # requiere master/bower_components (bower install) o app/ ya compilado
npm run test:api        # requiere .env con BACKEND_URL y la cuenta de pruebas
```
Chrome: Karma usa `CHROME_BIN` o, si no existe, el Chromium de Playwright (`npx playwright install chromium`).
