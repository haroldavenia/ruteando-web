# Tasks

## 0. Preparación y línea base (antes de tocar nada)

- [x] 0.1 Rama `chore/upgrade-angular-22` creada desde `origin/main` (c9552f9: incluye el PR 55 y Prettier 3.10.1), **separada** de `feat/fixed-routes-shifts-and-sms-consent` (PR 59), que no se toca; este spec vive en la rama nueva. Commits locales; push y PR solo cuando la persona lo pida
- [x] 0.2 Node 26.13.1: `nvm` 1.1.10 (nvm-windows) responde «not yet released or available», así que se usa el zip oficial (SHA-256 verificado contra `SHASUMS256.txt`) extraído en `C:	mp
ode26
ode-v26.13.1-win-x64`; se activa solo por `PATH` en cada comando (`PATH=/c/tmp/node26/node-v26.13.1-win-x64:$PATH`), sin tocar el Node del sistema. `node:sqlite` carga. Pendiente para 6.10: Node 22.22.3+ y 24.15+ (hoy hay 22.20.0 y 24.16.0 en `nvm`; 24.16 cumple el mínimo de 24, 22.20 no cumple el de 22)
- [x] 0.3 (hecho el 2026-11-18, Node 24.16.0, pnpm 10.34.9, Chrome 157; ver «Línea base medida» abajo) Línea base con el entorno actual: `pnpm run test:server`, `pnpm --filter ng-ruteando run test:ci` **cuatro veces** (cifra y, si falla alguna, qué prueba; mirar si sale `NG0205`), `pnpm run build:web` (bundle inicial, avisos, rutas prerenderizadas), `pnpm lint`, `pnpm format`, `node scripts/i18n-check.mjs`, `node scripts/icon-names.mjs`, `pnpm audit --prod --audit-level=high`
- [x] 0.4 Lighthouse móvil de `/access` en producción (87 y 89 con Lighthouse 13.6.0; el 73 de 2026-11-02 era Lighthouse 12 y no es comparable; `pnpm run build:web` + `pnpm start`, ver la trampa de medición de Windows) y copia de `ngsw.json`
- [x] 0.5 `wc -c` de `node_modules/.pnpm/@angular+build…/javascript-transformer-worker.js` (sano ≈ 7255 bytes) y comprobar que *Console Ninja* no lo haya reescrito

### Línea base medida (rama `chore/upgrade-angular-22` en `c9552f9`)

| Medida | Resultado |
|---|---|
| `pnpm install --frozen-lockfile` | OK (9,9 s); worker de `@angular/build` 21.2.29 y 21.2.30 sanos (7255 bytes) |
| `pnpm run test:server` | **135 de 135** |
| `pnpm --filter ng-ruteando run test:ci` ×4 | **2222 de 2225 (3 omitidas)** en 3 corridas; la **corrida 1 falló 3 pruebas** (ver abajo) |
| `pnpm run build:web` | OK en ~50 s, **sin avisos**, bundle inicial **634,27 kB** (162,96 kB comprimido; aviso a 650 kB), **32 rutas prerenderizadas** |
| `pnpm lint` / `pnpm format` | 0 errores y 0 avisos / todo formateado |
| `node scripts/i18n-check.mjs` / `node scripts/icon-names.mjs` | completas (pt: 1095 textos) / «Iconos al día» (140 en `index.html`, 84 en el código) |
| `pnpm audit --prod --audit-level=high` | sin vulnerabilidades |
| Lighthouse móvil `/access` (13.6.0, producción en modo simulado, UA sin «Chrome») | **87 y 89** (FCP 1,1–1,2 s, LCP 1,1–1,2 s, TBT 400–490 ms, CLS 0,003, 1.099 KiB); una corrida de tres falló con `NO_NAVSTART` (con Lighthouse 12 fallan todas con Chrome 157) |
| `NG0205` en el registro de `test:ci` | **156 apariciones en cada corrida de la línea base**: ya existe en 21.2, no es de la subida |
| `ngsw.json` | copia en `%TEMP%ase
gsw-base.json` (para comparar en 6.7) |

**Prueba intermitente identificada**: en la corrida 1 fallaron tres pruebas de `src/app/features/fleet/fleet-lists.spec.ts`, todas de la **vista de tarjetas de vehículos** («borra los vehículos elegidos desde las tarjetas con una sola confirmación», «cada una tiene su casilla y elegirla muestra la barra», «pinta como texto el nombre y la matrícula…»): `Expected 0 to be 3` y `Cannot read properties of undefined/null` al no encontrar las tarjetas (líneas 351, 365 y 406). Esa corrida fue la más lenta (1 min 10 s frente a ~1 min) y coincidió con una descarga y extracción en la misma máquina, por lo que apunta a una carrera de tiempos bajo carga y no a un fallo de la lógica. Está en la base (Angular 21.2): si reaparece tras la subida no se atribuye a ella sin repetir en `main`.

## 1. Node 26

- [x] 1.1 `ng-ruteando/.nvmrc` a `26` y `engines.node` de `package.json` (raíz) **y de `ng-ruteando/package.json`** a `^22.22.3 || ^24.15.0 || >=26.0.0`
- [x] 1.2 `Dockerfile.dev` a `node:26-bookworm-slim`; **Node 25+ ya no trae Corepack** (la construcción falló con `corepack: not found`, exit 127): se instala con `npm install -g corepack@0.36.0` antes de `corepack enable`. Imagen reconstruida y comprobada: Node 26.13.1 y, con el `package.json` montado, pnpm 10.34.9 (sin él, Corepack baja la 12.21.0: es un artefacto de la prueba, en uso real el código va montado)
- [x] 1.3 Con Node 26.13.1 y las dependencias actuales (Angular 21): `pnpm install --frozen-lockfile` OK, `pnpm run test:server` **135 de 135** (2FA y SSO con `node:sqlite`) y `pnpm run build:web` OK con las mismas cifras que la base (634,27 kB, 32 rutas, 0 avisos de compilación). Ruido nuevo solo en consola: `DEP0205 module.register() is deprecated` (herramientas de Angular 21; ver si desaparece con 22) y `ExperimentalWarning: localStorage is not available` durante el prerenderizado (en Node 26 `typeof localStorage` vale `undefined`, así que la guarda de `i18n.ts` sigue funcionando; el servidor de producción sirve la versión de cliente, no SSR)
- [x] 1.4 Commit «chore: Node 26 como version de desarrollo»

## 2. Angular 22 y TypeScript 6

- [ ] 2.1 En `ng-ruteando/`: `pnpm dlx @angular/cli@22 update @angular/core@22 @angular/cli@22 @angular/material@22`; revisar el diff de las migraciones y que no cree `package-lock.json`
- [ ] 2.2 Dejar en `ng-ruteando/package.json`: todos los `@angular/*` en 22.3.0 (Material y CDK en exacto), `@angular-devkit/build-angular` y `@angular/cli` 22.3.0, `@angular/ssr` 22.3.0, `typescript ~6.0.3`, `@types/node ^22.20.5`; `pnpm install` y comprobar que no queden dos versiones de Angular (`pnpm why @angular/core`)
- [ ] 2.3 Revisar `tsconfig*.json` (nada de `baseUrl`, `target ES5`, `moduleResolution node10`; `types` explícitos en app y spec) y `angular.json`
- [ ] 2.4 Quitar `withFetch()` de `provideHttpClient` en `app.config.ts`
- [ ] 2.5 Compilar (`pnpm run build:web`): arreglar los errores y los diagnósticos nuevos de plantillas (`nullishCoalescingNotNullable`, `optionalChainNotNullable`, NG8023…) sin desactivarlos; 0 avisos
- [ ] 2.6 `paramsInheritanceStrategy`: revisar las rutas de `app.routes.ts` (jornadas, rutas, auditoría, ajustes) por parámetros con el mismo nombre entre padre e hijo; si chocan, `withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' })`
- [ ] 2.7 `pnpm --filter ng-ruteando run test:ci` (2222 pruebas, mismas omitidas que la base) y arreglar lo que falle; pruebas que pasen texto a `Validators.min/max`, `ChangeDetectorRef` o fábricas de componentes, si las hubiera
- [ ] 2.8 SSR: `pnpm --filter ng-ruteando run serve:ssr:ng-ruteando` sirve `/access`; el interceptor y la restauración de sesión no rompen sin `window`
- [ ] 2.9 Comparar bundle inicial (≤ 650 kB sin aviso) y presupuestos con la línea base
- [ ] 2.10 Commit «chore(deps): Angular 22.3, TypeScript 6.0 y Material 22»

## 3. Lint y formato

- [ ] 3.1 En la raíz: `angular-eslint ^22.8.0`, `typescript-eslint ^8.73.0`, (`prettier ^3.10.1` ya está en `main`); ESLint y `@eslint/js` se quedan en 9.x (motivo en `design.md`)
- [ ] 3.2 `pnpm lint` y `pnpm format`: 0 errores y 0 avisos; arreglar reglas nuevas con `lint:fix`/`format:fix` o a mano (un `eslint-disable` lleva siempre su motivo)
- [ ] 3.3 `node scripts/i18n-check.mjs` (con y sin `--spanish`) y `node scripts/icon-names.mjs`
- [ ] 3.4 Commit «chore(lint): angular-eslint 22 y typescript-eslint 8.73»

## 4. Menores y parches

- [ ] 4.1 `nodemailer ^10.6.0`, `http-proxy-middleware 4.2.2` (exacto, como hoy) y cualquier otro menor que `pnpm outdated -r` marque dentro de rango
- [ ] 4.2 `pnpm run test:server` y `pnpm audit --prod --audit-level=high` limpios
- [ ] 4.3 Opcional: `jasmine-core ~5.13` y `@types/jasmine ~5.1` solo si `test:ci` mantiene la misma salida (si no, se queda como está)
- [ ] 4.4 Commit «chore(deps): parches y menores del servidor»

## 5. Dependabot y documentación

- [ ] 5.1 `.github/dependabot.yml`: ignorar `typescript` (mayores y menores ≥ 6.1 hasta que Angular lo admita), `eslint` y `@eslint/js` (mayores), `angular-eslint` (mayores: acompañan a Angular), `@types/node` (mayores: siguen al mínimo de Node), cada uno con su motivo en un comentario; mantener los ignores de Angular y Jasmine
- [ ] 5.2 `CLAUDE.md`, `README.md`, `ng-ruteando/README.md`: «Angular 21.2» → 22.3, «Node ^20.19 || ^22.12 || >=24» y `.nvmrc` = 26, TypeScript 6.0, mínimos nuevos de Node; **Corepack ya no viene con Node 25+** (`npm install -g corepack` o `npm install -g pnpm@10.34.9`; el README dice «viene con Node 20 a 24»)
- [ ] 5.3 Habilidades de `.claude/` (`angular-ruteando`, `convenciones-codigo-ruteando`, `references/angular-21-standalone-ssr.md`) y specs vigentes (`continuous-integration`, `frontend-platform`) que citen las versiones viejas; `npx --yes @fission-ai/openspec@1.14.3 validate --specs --strict` y `validate upgrade-angular-22-node-26`
- [ ] 5.4 Commit «docs: versiones de Angular 22, Node 26 y TypeScript 6»

## 6. Verificación final (mismas cifras que la línea base o mejores)

- [ ] 6.1 `pnpm install --frozen-lockfile` en una copia limpia (solo ficheros versionados): servidor y frontend compilan y pasan
- [ ] 6.2 `pnpm run test:server`, `pnpm --filter ng-ruteando run test:ci` (cuatro corridas sin fallos intermitentes), `pnpm lint`, `pnpm format`, `node scripts/i18n-check.mjs`, `node scripts/icon-names.mjs`, `pnpm audit --prod --audit-level=high`
- [ ] 6.3 Producción: `pnpm run build:web` + `pnpm start` (modo mock): `/`, `/access`, `/ngsw.json` 200, `/gateway` 401, `/api/x` 404, brotli y CSP presentes; con `CSP_MODE=enforce` sin violaciones en consola
- [ ] 6.4 `ng serve` (`pnpm start` en `ng-ruteando`) con el simulado: acceso, inicio, planificar jornada, detalle de ruta con mapa, auditoría con su modal, flota, lugares, ajustes, perfil y seguridad (2FA)
- [ ] 6.5 Material 22 en navegador: menú desplegable bajo 960 px (foco, tabulación y `inert` del sidenav), selects, menús, ordenación de tablas, tema claro y oscuro, tres idiomas
- [ ] 6.6 Banco visual `qa-visual/qa.mjs` (suites `scroll` y `titulos`, y las capturas de las pantallas) sin regresiones
- [ ] 6.7 PWA: `ngsw.json` generado, funcionamiento sin conexión y aviso «Hay una versión nueva»
- [ ] 6.8 Lighthouse móvil de `/access` en producción: ≥ 73 (FCP/LCP no peor que la base)
- [ ] 6.9 Docker (Linux): `docker compose up` sirve :4200 y proxifica `/gateway`; perfiles `test` (Chromium) y `prod-like` (:3000) en verde
- [ ] 6.10 Mínimos de Node: compilar y correr las pruebas del servidor con 22.22.3 y 24.15 (los mínimos de `engines`), además de 26
- [ ] 6.11 CI del pull request en verde (Linux, Chrome de GitHub, Node 26)

## 7. Después del merge (manual, fuera del repositorio)

- [ ] 7.1 Render: variable `NODE_VERSION` (26 si lo ofrece, si no 24.22.3) y redeploy; **con Node 26 no hay Corepack: comprobar cómo instala pnpm el build de Render** (si usa `corepack enable`, fallará); comprobar `/healthCheck` y el 2FA (el almacén `node:sqlite` necesita Node ≥ 22.13)
- [ ] 7.2 Coolify (si se usa): versión de Node/Nixpacks
- [ ] 7.3 Tag de versión y release a cargo de quien mantiene (¿v1.22.0?); registrar el trabajo en la hoja de seguimiento
- [ ] 7.4 Archivar este change cuando 6.11 y 7.x estén hechos

## 8. Changes aparte (no hacer aquí; abrir cuando toque)

- [ ] 8.1 Express 5 (+ `@types/express` 5): rutas `'*'` y `'*.*'` en `server/server.js` y `ng-ruteando/server.ts`, con revisión de seguridad del 2FA/SSO
- [ ] 8.2 ESLint 10: sustituir o actualizar `eslint-plugin-import`
- [ ] 8.3 pnpm 12, TypeScript 7, Karma → Vitest (o Jasmine 7), zoneless, `@angular/build`, CLI de OpenSpec 2.x (ver motivos en `design.md`)
