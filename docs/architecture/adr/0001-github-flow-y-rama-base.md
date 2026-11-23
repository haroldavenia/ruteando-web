# ADR-0001: GitHub Flow y rama base de la línea AngularJS

- Estado: **Propuesto — requiere decisión humana**
- Fecha: 2026-11-20

## Contexto
- El repositorio local `ruteando-web` contiene la app AngularJS 1.3.15 (`master/js`) que se migra a `/api/v1`.
- `origin/main` del repositorio de GitHub contiene hoy la reescritura en Angular 21 (`ng-ruteando`): no tiene `master/js`. Abrir PR de esta migración contra `main` mezclaría dos aplicaciones distintas.
- GitHub Flow exige una rama base protegida, ramas cortas y PR con CI.

## Decisión propuesta
1. Crear la rama protegida **`angularjs-main`** desde el commit actual de la línea AngularJS y usarla como base de todas las ramas `<tipo>/<issue>-<slug>` de esta iniciativa.
2. Los workflows (`ci`, `pr-conventions`, `security`) se disparan en `main` y `angularjs-main`.
3. Ruleset de `angularjs-main` igual al descrito en `docs/engineering/github-flow.md` §6.

## Alternativas
- **Repositorio separado** (`ruteando-web-legacy`): aislamiento total, pero duplica Issues/Projects y CI. Válida si Angular 21 sustituirá a AngularJS a corto plazo.
- **Usar `main`**: solo si se decide abandonar la línea Angular 21; hoy rompería esa línea.

## Consecuencias
- Hasta aceptar este ADR no se hace `push` ni se abren PR; el trabajo queda en local.
- Cuando la línea Angular 21 sustituya a AngularJS, `angularjs-main` se archiva (solo lectura).
