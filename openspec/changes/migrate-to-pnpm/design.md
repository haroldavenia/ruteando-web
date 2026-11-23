# Design

## Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Estructura | Workspace con un lockfile (`.` + `ng-ruteando`) | Un solo `install`, un solo `audit`, un solo hash en Docker. La alternativa (dos proyectos pnpm sueltos, dos lockfiles) conserva la estructura anterior pero duplica todo. |
| Versión de pnpm | `10.34.9` (última 10.x), en `packageManager` | pnpm 11 y 12 existen, pero 10 es lo verificado aquí (la máquina tiene 10.30.3) y evita cambios de valores por defecto a la vez que se cambia de gestor. Subir es otro change. |
| Conservar versiones | `pnpm import` por proyecto (desde cada `package-lock.json`) y fusión de los dos `pnpm-lock.yaml` en uno; después `pnpm install` normaliza | Un `pnpm install` desde cero resolvió **102 paquetes** a versiones más nuevas dentro del rango (Angular 21.2.25 → 21.2.26, rollup, babel…). Con la fusión, 0 diferencias frente a lo que había. |
| Única diferencia de versión | Las transitivas de `express` del **servidor** (`send` 0.19.0 → 0.19.2, `serve-static` 1.16.2 → 1.16.3, `cookie`, `finalhandler`, `mime-db`) pasan a las del frontend | Con un solo lockfile, `express@4.22.3` tiene un único conjunto de dependencias. Son parches dentro del rango (los del frontend ya llevaban esas versiones) y las 52 pruebas del servidor y el arranque real pasan. |
| Scripts de instalación | `ignoredBuiltDependencies`: `@parcel/watcher`, `esbuild`, `lmdb`, `msgpackr-extract` | pnpm 10 no ejecuta scripts de dependencias salvo aprobación. Los cuatro traen el binario como paquete opcional por plataforma y todo funciona sin ejecutarlos (pruebas, compilación, `ng serve`, servidor y SSR). Aprobarlos «por si acaso» ejecutaría código de terceros sin necesidad. |
| Dependencias fantasma | Nada que hacer | Pruebas (2127), compilación y arranque pasan con el `node_modules` estricto de pnpm; no había imports sin declarar. |
| Argumentos de scripts | Sin `--`: `pnpm start --host 0.0.0.0 --poll 2000` | Verificado con `ng serve` real. |
| OpenSpec en CI | Sigue con `npx --yes @fission-ai/openspec@…` | Es una herramienta, no una dependencia; el trabajo `specs` no necesita pnpm. |
| `package-lock.json` | En `.gitignore` | Un `npm install` accidental no debe colar un lockfile paralelo. |
| Dependabot | Sin cambios de configuración (`package-ecosystem: npm` detecta pnpm) | Sin verificar hasta su primera ejecución (lunes). |

## Docker de desarrollo

`Dockerfile.dev` copia solo `package.json` y ejecuta `corepack enable && corepack install`: la imagen trae la versión exacta de `packageManager`. `npm_config_store_dir=/pnpm-store` y un volumen `pnpm_store` conservan lo descargado. Las carpetas `node_modules` siguen en volúmenes con nombre (raíz y `ng-ruteando`); los enlaces relativos de pnpm entre ambas funcionan porque en el contenedor están montadas en las mismas rutas relativas. El hash de reinstalación es ahora el de `pnpm-lock.yaml`.

## Despliegue (Coolify) — acción manual, fuera del repositorio

El repositorio no contiene la configuración de producción. Tras fusionar, los comandos de build/arranque configurados en Coolify que usen `npm ci` o `npm run …` **fallarán** (ya no hay `package-lock.json`). Hay que cambiarlos antes de desplegar `main`:

- Instalación/compilación: `pnpm install --frozen-lockfile && pnpm run build:web` (en el repositorio raíz; instala servidor y frontend, que la compilación necesita).
- Arranque: `pnpm start` (o `node server/server.js`).
- Si usa Nixpacks, detecta `pnpm-lock.yaml` y toma la versión de `packageManager`; revisar que no haya comandos fijos de npm en la configuración.
- Variables y `GATEWAY_*` sin cambios.

## Riesgos y retroceso

- CI en Linux no se ha ejecutado aún (se verifica en el pull request): si faltara algún binario por no ejecutar scripts de instalación, se vería ahí; la salida es aprobar solo ese paquete con `pnpm approve-builds`.
- Retroceso: `git revert` del merge restituye ambos `package-lock.json` (siguen en el historial) y los comandos de npm; en Coolify, volver a los comandos anteriores.
