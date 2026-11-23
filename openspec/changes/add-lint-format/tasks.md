# Tasks

## 1. Configuración

- [x] 1.1 Dependencias de desarrollo en la raíz (eslint 9, @eslint/js, typescript-eslint, angular-eslint 21, prettier, eslint-config-prettier, simple-import-sort, import)
- [x] 1.2 `eslint.config.js`, `.prettierrc`, `.prettierignore` y scripts `lint`, `lint:fix`, `format`, `format:fix`
- [x] 1.3 CI: pasos `Lint` y `Formato` en el trabajo `frontend`
- [x] 1.4 Documentación (`CLAUDE.md`, `README.md`, spec `continuous-integration`)

## 2. Aplicación (commits aparte)

- [x] 2.1 `prettier --write` a todo el código (311 ficheros) y `.git-blame-ignore-revs`
- [x] 2.2 `eslint --fix` (orden de imports en 241 ficheros) y resolver a mano los 15 avisos restantes

## 3. Verificación

- [x] 3.1 `pnpm lint`: 0 errores y 0 avisos; `pnpm format`: «All matched files use Prettier code style!»
- [x] 3.2 `pnpm run build:web`: bundle inicial 598,95 kB, sin avisos, 26 rutas prerenderizadas
- [x] 3.3 `pnpm --filter ng-ruteando run test:ci`: 2127 de 2130 (3 omitidas), tres ejecuciones seguidas; `pnpm run test:server`: 52
- [x] 3.4 `node scripts/i18n-check.mjs` (con y sin `--spanish`) e `icon-names.mjs` en verde
- [ ] 3.5 CI del pull request en verde (Linux)
