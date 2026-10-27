# Design

## Context

Ver proposal.md (Why). Estado observado:

- No existe `.github/`. El remoto es `haroldavenia/ruteando-web` (público, rama por defecto `main`) y hay seis PR abiertos y apilados (#4 → `main`, #5 → #4, …, #9 → #8): las bases de los PR son ramas de trabajo, no `main`.
- Frontend: `ng-ruteando` (Node `^20.19 || ^22.12 || >=24`, `.nvmrc` = 22). `npm run test:ci` = `ng test --watch=false --browsers=ChromeHeadlessCI`; `karma.conf.js` ya define `ChromeHeadlessCI` con `--no-sandbox --disable-gpu`. `npm run build` compila y prerenderiza.
- Raíz: `npm ci`, `npm run test:server` (`node --test`, arranca `server.js` de verdad y usa un gateway falso propio), `npm run build:web` (= build del frontend). Dos `package-lock.json`.
- Gotcha documentado: `npm` 10.9 puede fallar al instalar desde cero con `Cannot read properties of null (reading 'edgesOut')`; con npm 11 funciona. Node 22 trae npm 10.9.
- CLI de specs: `@fission-ai/openspec` (1.14.3 en local; hay 1.15.0). Se usa `openspec validate --specs --strict`.
- Auditoría: raíz sin vulnerabilidades; frontend con 4 de producción (3 altas, 1 crítica): `@faker-js/faker` (declarada y sin usar en `src/` ni `server.ts`), `body-parser` (por `express`) y `dompurify` (por `jspdf`, también sin uso por ahora).
- Las pruebas no necesitan el gateway real ni secretos.

## Goals / Non-Goals

**Goals:**
- Que ningún cambio llegue a `main` sin pasar las pruebas, la compilación, la validación de specs y la auditoría.
- Un entorno de CI reproducible, con permisos mínimos y sin secretos.
- Llevar a `main` la cadena de PR y los changes pendientes de forma ordenada.

**Non-Goals:**
- Despliegue o publicación (CD), artefactos, caché de compilación de Angular.
- Matriz de versiones de Node o de navegadores (se prueba lo que se despliega: Node 22).
- Probar contra el gateway real.

## Decisions

1. **Un solo flujo `.github/workflows/ci.yml` con cuatro trabajos en paralelo**: `frontend` (instalar, `test:ci`, `build`), `server` (instalar la raíz, `test:server`), `specs` (`openspec validate --specs --strict`) y `audit` (`npm audit --omit=dev --audit-level=high` en la raíz y en el frontend); y un quinto, `ci`, con `needs` de los cuatro y `if: always()`, que falla si alguno falló o se canceló. La protección de `main` exige solo `ci`, de modo que añadir o renombrar trabajos no obliga a tocar la configuración del repositorio. Alternativa: exigir los cuatro por separado; descartada por frágil.
2. **Disparadores `pull_request` (sin filtro de ramas) y `push` solo a `main`.** Los PR apilados tienen bases que no son `main`, así que un filtro `branches: [main]` los dejaría sin verificar; y no se dispara con `push` a ramas de trabajo para no ejecutar dos veces lo mismo. `concurrency: group: ci-${{ github.workflow }}-${{ github.ref }}` con `cancel-in-progress: true` descarta las ejecuciones obsoletas. Con `pull_request` (no `pull_request_target`) las ramas externas no reciben secretos.
3. **Entorno:** `ubuntu-24.04` (fijado, no `ubuntu-latest`, que migra a Ubuntu 26 y cambiaría el entorno sin avisar; se sube a propósito), `actions/setup-node` con `node-version-file: ng-ruteando/.nvmrc` y `cache: npm` con `cache-dependency-path` de los dos lockfiles; antes de instalar, `npm install -g npm@11`; `npm ci` en cada paquete (`npm --prefix ng-ruteando ci` y `npm ci` en la raíz). Chrome viene instalado en el ejecutor y `ChromeHeadlessCI` ya lo lanza sin sandbox. Opcional: `--reporters=dots` para que el registro de Karma sea breve.
4. **CLI de specs fijado:** `npx --yes @fission-ai/openspec@1.14.3 validate --specs --strict`, con la versión que se usa en local, para que una versión nueva no rompa el CI sin cambio del repositorio. Se actualiza a mano junto con la de los desarrolladores.
5. **Seguridad del flujo:** `permissions: contents: read` a nivel de flujo, sin secretos, `timeout-minutes: 15` por trabajo y **acciones fijadas por SHA** (`actions/checkout`, `actions/setup-node`) con la versión en un comentario; el SHA se resuelve con `gh api repos/<acción>/git/ref/tags/<versión>` al aplicar, no de memoria. Dependabot (`github-actions`) las mantiene al día. Alternativa: etiquetas mayores (`@v7`); descartada porque son móviles y el repositorio ya tiene una política de seguridad.
6. **Dependencias seguras antes de la puerta:** primero se retira `@faker-js/faker` (sin uso, comprobado por búsqueda y por compilación), se ejecuta `npm audit fix` en el frontend y se revisa `jspdf` (sin uso hoy, pero reservado para la exportación a PDF: se actualiza dentro de su rango o se retira hasta que haga falta). Solo cuando `npm audit --omit=dev --audit-level=high` sale limpio en los dos paquetes se activa como puerta; si alguna vulnerabilidad no tiene arreglo, se documenta como excepción explícita en el flujo en lugar de bajar el umbral para todo.
7. **Dependabot** (`.github/dependabot.yml`): ecosistemas `npm` en `/` y en `/ng-ruteando` y `github-actions` en `/`, semanal, con agrupación de actualizaciones menores y de parche y un máximo de 5 PR abiertos por ecosistema. Los PR de Dependabot pasan por el mismo CI.
8. **Comprobación en un clon limpio:** antes de dar el CI por bueno se ejecutan los mismos comandos en un clon recién hecho (en el scratchpad), para detectar dependencias de ficheros sin versionar, y después se comprueba la primera ejecución real en GitHub.
9. **Integración de la cadena:** una vez el CI exista, los PR se fusionan de abajo arriba (#4, #5, #6, #7, #8, #9). Tras cada fusión se comprueba que GitHub cambia la base del siguiente a `main` (si la rama base se borra al fusionar) o se cambia a mano, y que el CI del siguiente sigue en verde. Los PR apilados no tienen CI hasta que se publica la rama con el flujo: por eso el flujo viaja en una rama nueva a partir de la última (#9) y se fusiona la cadena con ese flujo ya activo, no antes.
10. **Protección de `main` y avisos privados** son configuración del repositorio (no se versiona): exigir PR, la comprobación `ci` y una aprobación, bloquear pushes directos; y activar *Private vulnerability reporting*. Las hace quien administra el repositorio; la verificación es de solo lectura con `gh api`.

## Risks / Trade-offs

- [Pruebas intermitentes que dependen de esperas fijas (`wait(40)`)] → se ejecuta la suite varias veces antes de activar la puerta; si aparece una prueba inestable se arregla en lugar de reintentarla automáticamente.
- [Chrome del ejecutor cambia de versión] → asumido; el lanzador sin sandbox ya se usa localmente y el fallo, si ocurre, será visible.
- [Un `npm audit` que falla por una vulnerabilidad nueva sin arreglo bloquea todos los PR] → umbral solo en altas y críticas de producción, con salida clara y excepción documentada si hace falta; Dependabot abre el PR de arreglo.
- [Protección de `main` con una sola persona que mantiene el repositorio] → exigir una aprobación puede bloquear al propio autor; se decide al configurarla (permitir que administración omita la regla o usar una segunda cuenta).
- [Fusionar seis PR apilados puede dar conflictos en `package-lock.json`, `CLAUDE.md` o `tasks.md`] → se fusiona en orden y se resuelven conflictos en cada paso, no al final.
- [El CI tarda varios minutos] → trabajos en paralelo y caché de npm; no se añade matriz.

## Migration Plan

1. En una rama nueva a partir de la cabeza de la cadena (#9): dependencias seguras, flujo de CI, Dependabot y documentación; se abre su PR y se comprueba la primera ejecución.
2. Con el CI funcionando, fusionar la cadena en orden, comprobando cada paso.
3. Configurar la protección de `main` y los avisos privados.
4. Archivar los changes pendientes y retirar el escenario obsoleto de `access-screens`.
Reversión: borrar `.github/` y revertir los cambios de dependencias; la protección de `main` se desactiva desde la configuración del repositorio.

## Open Questions

- ¿Debe la protección de `main` exigir una aprobación cuando quien mantiene el repositorio es una sola persona? No cambia el flujo ni las tareas; se decide al configurarla.
