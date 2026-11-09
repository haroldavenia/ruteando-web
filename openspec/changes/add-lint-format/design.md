# Design

## Decisiones (y en qué se aparta de la guía)

| Tema | Decisión | Por qué |
|---|---|---|
| Ancho de línea | `printWidth: 120` (la guía usa 80 y menciona 100) | El código se escribió a ~120: con 80 se reflujaban 6.800 líneas y con 100, 3.400; con 120, 1.550. Menos diff y código legible. |
| Fin de línea | `endOfLine: auto` (la guía usa `lf`) | En Windows el disco tiene CRLF (autocrlf): con `lf`, `prettier --check` fallaría en todos los ficheros de cada persona. En la CI (Linux) todo es LF. |
| Comillas de claves | `quoteProps: preserve` (la guía usa `as-needed`) | `scripts/i18n-check.mjs` lee las claves de `dictionaries/en.ts` y `pt.ts` con comillas (`'Cerrar': …`); con `as-needed` las quitaba y el verificador daba 424 fallos. |
| Dónde se instala | Raíz del workspace (`devDependencies`) | Un solo `eslint.config.js` y `.prettierrc`; Prettier cubre también `server/` y `scripts/`. |
| Alcance de ESLint | `ng-ruteando/**/*.ts` y `*.html` | Es la guía de Angular; el servidor es JavaScript de Node sin reglas propias. Se ignoran `dist`, `.angular`, fixtures, `qa-visual`, `openspec` y `.claude`. |
| Alcance de Prettier | Código y configuración; no `*.md`, `openspec`, `.claude`, fixtures, capturas, iconos ni `qa-visual` | Reformatear 234 documentos Markdown no es lint y ensuciaría el historial. |
| Lint con tipos | Desactivado | Más lento y los `tsconfig` están separados; sin necesidad concreta. |
| Husky / lint-staged | No | Opcional en la guía; la CI ya bloquea. Se puede añadir después. |
| Endurecimiento de pnpm | No | La guía lo plantea para pnpm 11; aquí pnpm 10.34.9 con `ignoredBuiltDependencies` (ver `migrate-to-pnpm`). |
| `engine-strict` | No | `engines` de `ng-ruteando` y `.nvmrc` ya fijan Node; forzarlo rompería instalaciones en otras versiones sin necesidad. |
| pnpm | Se mantiene 10.34.9 (la guía cita 11.4.0) | Cambiar de versión es otro change. |

## Avisos que se dejaron con `eslint-disable` (siempre con motivo)

- `no-script-url` en dos pruebas de `javascript:`, `no-control-regex` en `return-url.ts` y `no-irregular-whitespace` en una prueba de formato de números: es justo lo que se comprueba o se rechaza.
- `directive-selector` en `ActionTitleDirective` (`[mat-icon-button]`, se engancha a los botones de icono de Material) y `template/interactive-supports-focus` en el selector de idioma (el teclado lo gestionan los radios hijos, enfocables).
- `no-console` en el registro de arranque de `server.ts`.
- Se eliminaron los imports sin usar (8 avisos).

## Efectos del formato en las pruebas

Prettier parte los títulos de las plantillas en varias líneas (Angular colapsa esos espacios al pintar); cuatro pruebas comparaban `textContent` exacto y ahora lo recortan con `trim()`. Compilación, bundle inicial (598,95 kB), presupuestos de hojas de componente, verificador de idiomas y de iconos no cambian.

## Riesgos

- `eslint --fix` reordena imports: no hay efectos secundarios entre ellos (los imports de efecto, grupo 1, conservan su orden) y compilación, SSR y pruebas lo confirman.
- Un `git blame` normal atribuye las líneas al commit de formato; `git config blame.ignoreRevsFile .git-blame-ignore-revs` (GitHub ya lo usa solo).
