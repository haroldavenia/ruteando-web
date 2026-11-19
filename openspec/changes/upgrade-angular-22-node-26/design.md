# Design

## Versiones objetivo (medidas el 2026-11-18)

| Paquete | Ahora | Objetivo | Nota |
|---|---|---|---|
| Node (dev, CI, Docker) | 22 (`.nvmrc`), 24.16.0 local | **26** (LTS «Lithium», 26.13.1) | Angular 22 acepta `^22.22.3 \|\| ^24.15.0 \|\| >=26`. Si un alojamiento no ofrece 26, 24.22.3 también vale. |
| `engines.node` (raíz) | `^22.13.0 \|\| >=24.0.0` | `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` | El mínimo lo marca Angular 22; el servidor (`node:sqlite`) ya pedía ≥ 22.13. |
| `@angular/*`, `cdk`, `material`, `ssr`, `cli`, `devkit/build-angular` | 21.2.x | **22.3.0** | Material y CDK van fijados en exacto (`22.3.0`); el resto con `^`. |
| `typescript` | `~5.9.3` | **`~6.0.3`** | `>=6.0 <6.1` lo exigen `compiler-cli`, `build-angular` y `typescript-eslint` 8.73. |
| `angular-eslint` (raíz) | `^21.4.0` | **`^22.8.0`** | Acompaña a Angular 22; admite ESLint 9 y 10. |
| `typescript-eslint` | `^8.72.2` | `^8.73.0` | `typescript >=4.8.4 <6.1.0`. |
| `prettier` | `^3.10.1` | sin cambios | Ya está en `main` (PR 55); la rama parte de ahí. |
| `nodemailer` / `http-proxy-middleware` | 10.4.0 / 4.2.1 | 10.6.0 / 4.2.2 | Menores y parches. |
| `@types/node` | `^18.19.130` | `^22.20.5` | Los tipos siguen al **mínimo** soportado (22), no al más nuevo (26): así no se usa una API que el mínimo no tiene. |
| `rxjs`, `zone.js`, `tslib`, `ol`, `qrcode`, `karma*`, `jasmine-core`, `@types/jasmine` | — | **sin cambios** | Ya son la última versión compatible o están ignoradas a propósito (ver «Fuera de alcance»). `zone.js ~0.16` está en el peer de Angular 22. |

## Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Un solo PR | Rama `chore/upgrade-angular-22` desde `main` actualizado, commits por fase (Node → Angular+TypeScript → lint → menores → docs) | Preferencia de la persona: pocos PR. Las fases 2 y 3 no se pueden separar (Angular 22 exige TypeScript 6 y `angular-eslint` 22 sale con Angular 22); cada fase deja un commit para poder bisectar. |
| Orden | 1) Node, 2) `ng update` (Angular + CLI + Material) y TypeScript, 3) arreglos de código, 4) lint, 5) menores, 6) Dependabot y docs | Cada paso se verifica antes del siguiente; `ng update` ejecuta las migraciones con el árbol limpio. |
| `ng update` o a mano | `pnpm dlx @angular/cli@22 update @angular/core@22 @angular/cli@22 @angular/material@22` dentro de `ng-ruteando/`, y revisar el diff | Las migraciones automáticas (por ejemplo, fijar `changeDetection: Eager` donde falte) son la fuente oficial. Con pnpm hay que comprobar que respete `workspace:`/el lockfile único y no cree `package-lock.json`. |
| `@angular-devkit/build-angular` | Se mantiene (22.3.0 existe) | Migrar a `@angular/build` es otro change; mezclarlo con la subida suma una causa más de fallo. |
| ESLint | Se queda en **9.39.x** | `eslint-plugin-import` 2.32 (la última) declara peers hasta ESLint 9 y `@eslint/js` 10 exige ESLint 10. Subir exige antes cambiar o sustituir ese plugin (p. ej. `eslint-plugin-import-x`). |
| TypeScript 7 | No | `7.0.2` es el compilador nativo; `compiler-cli` 22 y `typescript-eslint` piden `<6.1`. Esperar a una versión de Angular que lo admita. |
| `paramsInheritanceStrategy` | Revisar, no fijar a ciegas | El valor por defecto pasa de `'emptyOnly'` a `'always'`: los hijos heredan los parámetros de todos los padres. Es un cambio de comportamiento solo si un hijo y un padre usan el mismo nombre de parámetro (`:id`, `:routeIndex`…). Comprobar `app.routes.ts` y las rutas de jornadas; si hay choque, fijar `'emptyOnly'` en `provideRouter(withRouterConfig({…}))`. |
| Zone.js | Se conserva (`provideZoneChangeDetection()`) | Sigue siendo parte del peer de Angular 22; pasar a zoneless es otro change. |

## Cambios incompatibles de Angular 22 que tocan este repo (CHANGELOG 22.0.0, 22.1, 22.2, 22.3)

| Cambio | ¿Afecta? | Qué hacer |
|---|---|---|
| Componentes sin `changeDetection` pasan a `OnPush` | No: los **86 componentes** ya lo declaran (comprobado) | Verificar que la migración no añada nada y que los componentes nuevos de la rama sigan declarándolo. |
| `withFetch` deprecado (`provideHttpClient`) | Sí: `app.config.ts:28` | Quitar `withFetch()`. Comprobar SSR y que ningún interceptor dependa del backend XHR. `reportProgress` no se usa. |
| Diagnósticos nuevos `nullishCoalescingNotNullable` y `optionalChainNotNullable` | Posible | La compilación estricta de plantillas puede avisar o fallar: corregir las plantillas (la CI exige 0 avisos); desactivarlos en `tsconfig` solo como último recurso y con comentario. |
| Errores en `in` de plantillas, entradas/salidas duplicadas, selectores duplicados (NG8023) | Posible | Se ven al compilar; arreglar en el componente. |
| Atributos `data-*` ya no enlazan entradas/salidas | No: solo `[attr.data-…]` | Nada. |
| Validadores `min`/`max` ya no admiten cadenas | No: `Validators.min(0)`/`min(1)` con `number` | Nada; revisar pruebas que pasen texto. |
| Hammer.js eliminado, `ComponentFactoryResolver`, `createNgModuleRef`, `provideRoutes`, `ChangeDetectorRef.checkNoChanges` | No (grep sin resultados) | Nada. |
| `CanMatchFn` con `currentSnapshot` obligatorio | No: no hay `canMatch` (grep) | Nada. |
| Estilos de componentes: se retiran los que ya no usa su `host` | Posible (los componentes usan `ViewEncapsulation.None`) | Revisar visualmente; el banco `qa-visual` cubre las pantallas. |
| `@angular/animations` | Solo `provideAnimationsAsync` en `app.config.ts` | Comprobar que Material 22 no exija cambiarlo; no quitarlo en esta subida. |
| Material 22: `sidenav` marca el contenido como `inert` al abrirse, y cambios en `menu`, `list`, `sort`, `select`, `aria` | Posible en el shell (menú móvil), selects, menús | Probar en navegador: menú desplegable bajo 960 px, foco y tabulación del sidenav, selects con búsqueda, menú de usuario. |

## Hallazgos de la ejecución (2026-11-19)

- **`ng update` es ruidoso**: añade `withXhr()` a todos los `provideHttpClient()` de los specs, `$safeNavigationMigration()` a plantillas con `?.` y suprime los diagnósticos nuevos en `tsconfig`. Con este código nada de eso hacía falta; se revirtió y quedó solo lo que sí aporta (ver tareas 2.1).
- **Angular 22 pesa menos, Material 22 pesa más si se importa mal**: sin el provider de `form-field` en la raíz el bundle inicial baja de 634 a 561 kB; con él sube a 719 kB.
- **Node 26 ya no trae Corepack** (Node 25+): `Dockerfile.dev` lo instala con npm; el README y Render deben tenerlo en cuenta.
- **La prueba intermitente era contaminación entre pruebas, y ya estaba en Angular 21**: la vista por defecto de las listas es «tarjetas» salvo que `localStorage` guarde `ruteando-list-view = table`, y los specs de auditoría la dejan guardada; con el orden aleatorio de Jasmine, a veces `fleet-lists.spec.ts` (vista de tarjetas de vehículos, 3 pruebas) corría después y fallaba (1 de 4 corridas en la base, y en Docker). Arreglo: `beforeEach(() => localStorage.removeItem('ruteando-list-view'))`, como ya hacía `resource-list.component.spec.ts`. Tras él: 4 corridas locales y 1 en Docker sin fallos.
- **Lighthouse 12 falla con Chrome 157** (`NO_NAVSTART`); se mide con 13.6.0, cuya puntuación no es comparable con la de 2026-11-02 (73).

## TypeScript 6: qué revisar

- `tsconfig.json` ya usa `moduleResolution: "bundler"`, `target`/`module: ES2022`, `strict` y `esModuleInterop` (nada deprecado). Revisar que no queden `baseUrl`, `target: ES5` ni `moduleResolution: node10`.
- En TS 6 `types` ya no carga todos los `@types/*` por defecto: `tsconfig.app.json` declara `["node"]` y `tsconfig.spec.json` `["jasmine"]`; comprobar `server.ts`, los specs y `src/testing/` (si falta un global, añadirlo a `types`, no desactivar `strict`).
- `@types/node` `^22` frente a `^18`: pueden aparecer cambios de tipos en `server.ts`, `fs`, `crypto` o `fetch`; se arreglan en el código.

## Node 26: qué revisar

- `server/` usa `node:sqlite` (2FA y SSO): correr las pruebas del servidor en 26 (`pnpm run test:server`).
- Dependencias con binarios nativos opcionales (esbuild, lmdb, `@parcel/watcher`, `msgpackr-extract`): comprobar que `pnpm install --frozen-lockfile` instale el binario de Node 26 y que `ng serve`, la compilación y SSR arranquen.
- Imagen `Dockerfile.dev`: `node:26-bookworm-slim`; reconstruirla (una imagen vieja no se reconstruye sola).
- Alojamientos (acciones manuales, fuera del repositorio): **Render** (`NODE_VERSION` y comprobar que ofrezca 26) y **Coolify** (versión de Node/Nixpacks). Si no hay 26, dejar 24.22.3 allí; `engines` lo permite.
- Karma lanza Chrome sin interfaz: sin cambios por Node.

## Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| `pnpm install --force` o la extensión *Console Ninja* dañan `@angular/build/…/javascript-transformer-worker.js` (visto el 2026-11-13) | Tras instalar, `wc -c` de ese archivo (sano ≈ 7255 bytes) y `pnpm run build:web`; si falla, reinstalar con `--frozen-lockfile --force`. Desactivar la extensión en este repo si reaparece. |
| Prueba intermitente en `test:ci` (2221 de 2222 en una de 4 corridas, sin identificar) | Correr `test:ci` cuatro veces en la línea base **antes** de empezar y cuatro después; si falla alguna, identificar la prueba y compararla con `main`. |
| Aviso `NG0205` en el registro de pruebas | Anotar en la línea base si ya sale en 21.2; si es nuevo, es una regresión de la subida. |
| Presupuesto del bundle inicial (aviso a 650 kB; hoy ~599 kB) | Medir antes y después; Angular 22 y Material 22 pueden moverlo. Si pasa de 650 kB, revisar qué cambió (no subir el presupuesto sin motivo). |
| Rendimiento (Lighthouse móvil `/access`: 73) | Medir producción con `pnpm run build:web` + `pnpm start` antes y después (ver la trampa de medición de Windows en `CLAUDE.md`). |
| PWA: el service worker cachea la carcasa | Verificar que `ngsw.json` se genere y que la actualización muestre «Hay una versión nueva». |
| Dependabot reabre PR de TypeScript 6.1+/7, ESLint 10, etc. | Añadir sus `ignore` a `dependabot.yml` en la misma subida (con el motivo en un comentario). |
| Rollback | Revertir el PR (un solo merge) y, si ya se desplegó, volver al commit anterior; el lockfile viaja con el código. `packageManager`/pnpm no cambian, así que no hay migración de almacén. |

## Fuera de alcance — cada uno, su change y el motivo

| Tema | Estado hoy | Por qué no ahora |
|---|---|---|
| TypeScript 7 (nativo, `7.0.2`) | Último, pero fuera del rango de Angular 22 | Angular y `typescript-eslint` piden `<6.1`. Revisar en cuanto salga una versión que lo admita. |
| ESLint 10 (`10.15.0`) y `@eslint/js` 10 | Bloqueado por `eslint-plugin-import` | Sustituir el plugin o esperar su soporte. |
| Express 5 (`5.3.0`) y `@types/express` 5 | Hay `4.22.3` (con parches) | Cambia la sintaxis de rutas: `app.get('*', …)` en `server/server.js:96` y `server.get('*.*'…)`/`'*'` en `ng-ruteando/server.ts` pasan a `'/{*splat}'`; además hay que repasar `http-proxy-middleware`, `morgan`, `compression` y las pruebas del servidor. Es un change aparte con revisión de seguridad (2FA y SSO viven en esas rutas). |
| pnpm 12 (`12.21.0`) | `packageManager: pnpm@10.34.9` | No es necesario para Angular 22; cambia valores por defecto (scripts de instalación, lockfile). Decidido en `migrate-to-pnpm`: «subir es otro change». |
| Jasmine 7 / Karma → Vitest | `jasmine-core ~5.1.2`, `karma-jasmine 5.1.0` | Hay comentario en `dependabot.yml`: `karma-jasmine` 5.1 no funciona con `jasmine-core` 7 y con la 6 ensucia la salida. Karma está en desuso upstream: el cambio real es migrar el ejecutor de pruebas (2222 pruebas). Subir a `jasmine-core ~5.13` (misma 5.x) puede hacerse dentro de este change si no cambia la salida. |
| Modo sin zone.js (zoneless) | `provideZoneChangeDetection()` | Cambia la detección de cambios de toda la app. |
| `@angular/build` en lugar de `@angular-devkit/build-angular` | devkit 22.3.0 funciona | Migración del builder y del ejecutor de pruebas juntos. |
| CLI de OpenSpec 2.1.0 (`OPENSPEC_VERSION: 1.14.3` en la CI) | Fijado | Es una herramienta, no una dependencia; probar la validación `--strict` con la nueva antes de subir. |
| Acciones de GitHub | Fijadas por SHA | Las sube Dependabot (`chore(ci)`). |
