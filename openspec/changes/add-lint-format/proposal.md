# Proposal

## Why

El proyecto no tenía lint ni formato automáticos: el estilo dependía de la costumbre y de la revisión. Se aplica la guía `LINT_FORMAT_ANGULAR21` (ESLint 9 con `angular-eslint` + Prettier con pnpm) para que el estilo, el orden de los imports y las buenas prácticas básicas se comprueben solos, en local y en la CI.

## What Changes

- ESLint 9 con flat config (`eslint.config.js` en la raíz): `typescript-eslint` (recomendado + estilístico), `angular-eslint` (TypeScript, plantillas y accesibilidad de plantillas), `simple-import-sort`, `import` y `eslint-config-prettier`; reglas de buenas prácticas de la guía (`no-var`, `prefer-const`, `no-eval`…).
- Prettier (`.prettierrc`, `.prettierignore`) con `parser: angular` para `*.html`.
- Scripts de la raíz: `lint`, `lint:fix`, `format`, `format:fix`.
- La CI ejecuta `pnpm lint` y `pnpm format` antes de las pruebas (trabajo `frontend`).
- Formateo masivo y `eslint --fix` aplicados en commits aparte; `.git-blame-ignore-revs` con el del formato.
- Documentación: `CLAUDE.md`, `README.md` y la spec vigente `continuous-integration`.

## Fuera de alcance

Husky y lint-staged (opcionales en la guía), el endurecimiento de `pnpm-workspace.yaml` (`allowBuilds`, `minimumReleaseAge`, `trustPolicy`), `engine-strict`, el lint con tipos (`recommendedTypeChecked`) y pasar a pnpm 11. ESLint no cubre `server/` ni `scripts/` (JavaScript de Node): solo Prettier.
