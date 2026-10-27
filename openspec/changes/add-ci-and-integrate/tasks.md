# Tasks

## 1. Dependencias seguras

- [x] 1.1 Retirar `@faker-js/faker` de `ng-ruteando/package.json` tras comprobar que nada la importa (`grep -rn "faker" ng-ruteando/src ng-ruteando/server.ts`) y revisar las demás dependencias declaradas por si alguna más no se usa; verificar con `npm run test:ci` y `npm run build` en `ng-ruteando/` sin errores ni avisos nuevos
- [x] 1.2 Ejecutar `npm audit fix` en `ng-ruteando/` y resolver lo que quede (subir `express` y `jspdf` dentro de su rango, o retirar `jspdf` hasta que haga falta); verificar que `npm audit --omit=dev --audit-level=high` termina con éxito en la raíz y en `ng-ruteando/`, y que pasan las pruebas y la compilación. Si alguna vulnerabilidad no tiene arreglo, anotarla como excepción explícita en el flujo en lugar de bajar el umbral

## 2. Flujo de integración continua

- [x] 2.1 Resolver con `gh api repos/actions/checkout/git/ref/tags/<versión>` y `repos/actions/setup-node/git/ref/tags/<versión>` el SHA de cada acción y crear `.github/workflows/ci.yml` con los trabajos `frontend`, `server`, `specs`, `audit` y `ci` (disparadores `pull_request` sin filtro de ramas y `push` a `main`, `concurrency` con cancelación, `permissions: contents: read`, `timeout-minutes`, Node de `ng-ruteando/.nvmrc`, `npm@11`, caché de npm de los dos lockfiles y el CLI de OpenSpec fijado a 1.14.3); verificar que el YAML es válido (`actionlint` si está disponible o un análisis con Python), que no hay secretos ni acciones sin SHA, y que el trabajo `ci` falla si un `needs` falla o se cancela
- [x] 2.2 Crear `.github/dependabot.yml` (npm en `/` y en `/ng-ruteando`, `github-actions` en `/`, semanal, agrupando menores y parches, máximo 5 PR abiertos); verificar que el YAML es válido y que los directorios citados existen
- [x] 2.3 Hacer un clon limpio del repositorio en el scratchpad y ejecutar en él los mismos comandos del flujo (instalación con `npm ci`, `test:ci`, `build`, `test:server`, validación de specs y auditoría); verificar que pasan sin depender de ficheros sin versionar, y ejecutar la suite del frontend dos veces más para descartar pruebas intermitentes

## 3. Documentación

- [x] 3.1 Documentar en `README.md` y `CLAUDE.md` qué verifica el CI, cómo ejecutar lo mismo en local, cuál es la comprobación obligatoria (`ci`) y cómo se actualizan el CLI de OpenSpec fijado y las acciones; verificar que cada comando citado se ejecuta tal cual y que los ficheros citados existen

## 4. Primera ejecución y fusión de la cadena

- [x] 4.1 Publicar la rama, abrir su PR y comprobar con `gh run list` y `gh pr checks` que el flujo se ejecuta en verde y que `ci` aparece como una sola comprobación; si falla, corregir el flujo (no desactivar pasos) y volver a ejecutarlo
- [ ] 4.2 Fusionar con quien mantiene el repositorio los PR de la cadena en orden (#4, #5, #6, #7, #8, #9 y el de este change), comprobando tras cada uno que la base del siguiente pasa a `main` (o cambiándola a mano), resolviendo los conflictos que aparezcan y viendo el CI en verde; verificar con `gh pr list --state merged` y con `git log main` que todo está en `main`
- [ ] 4.3 Configurar en GitHub la protección de `main` (pull request obligatorio, comprobación `ci` en verde, una aprobación o la excepción acordada y sin pushes directos) y activar los avisos privados de seguridad; verificar con `gh api repos/haroldavenia/ruteando-web/branches/main/protection` y `.../private-vulnerability-reporting`, y con un pull request de prueba cuya verificación falla y no puede fusionarse

## 5. Cierre de los changes abiertos

- [ ] 5.1 Con `modernize-access-ui` ya en `main`, archivarlo y, con `access-screens` ya sincronizada, retirar el escenario «El resto de la aplicación no cambia» (tarea 1.1 de `modernize-app-ui`) mediante un delta de ese change; verificar con `openspec validate --specs --strict` y que el CI sigue en verde
- [ ] 5.2 Archivar `modernize-app-ui`, `validate-against-gateway` y este change, anotando en cada uno lo que sigue sin verificar (movimiento reducido y colores forzados, y las visitas con datos reales); verificar con `openspec list` que no queda ningún change abierto y con `openspec validate --specs --strict`

## Workflow follow-up

- Cuando el gateway vuelva y arreglen `journeys/plan`, verificar las visitas con datos reales.
- Siguientes fases posibles: exportación a PDF, interruptor manual de tema y servicios asignados.
