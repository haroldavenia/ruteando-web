# GitHub Flow y gestión del trabajo (ruteando-web)

## 0. Rama base de la línea AngularJS (ADR-0001)
`origin/main` contiene hoy la reescritura en Angular 21 (`ng-ruteando`) y no tiene `master/js`. Esta migración trabaja sobre la línea AngularJS, así que necesita su propia rama base protegida. Propuesta (ADR-0001, pendiente de aprobación): **`angularjs-main`**, creada desde el commit local actual de la línea AngularJS. Los workflows ya aceptan `main` y `angularjs-main`. Hasta que se decida, nada se empuja.

## 1. Jerarquía de trabajo en Issues
| Tipo (Issue form) | Etiqueta | Contiene | Se cierra cuando |
| --- | --- | --- | --- |
| Iniciativa | `tipo:iniciativa` | Objetivo, fases, enlace a `specs/migracion-api-v1/README.md` | Todas sus historias están `Done` |
| Historia | `tipo:historia` | Enlace a la spec `<ID>`, maqueta, endpoints, resumen de CA | Su PR se fusiona |
| Tarea | `tipo:tarea` | Trabajo sin cambio de comportamiento (docs, CI, chore) | Su PR se fusiona |

Etiquetas: `fase:f0`…`fase:f8`, `area:fnd|acc|mae|paq|jor|seg|emp|pla|cie|har`, `bloqueado`, `backend` (depende de un pendiente del backend), `codigo-heredado` (solo PR de incorporación o movimiento de código).

## 2. GitHub Projects
`Status`: `Backlog` → `Ready` (spec `Lista`) → `In Progress` (rama creada) → `Review` (PR listo) → `Done` (fusionado). `Blocked` siempre con comentario. Campos extra: `Fase`, `Spec`, `Maqueta`, `Prioridad`.

## 3. Ramas
- Desde la base actualizada: `git switch angularjs-main && git pull --ff-only && git switch -c <rama>`.
- Formato `<tipo>/<issue>-<slug>`; antes de existir el Issue, `<tipo>/<ID>-<slug>` (p. ej. `feat/MAE-005-lugares`). Tipos: `feat, fix, chore, docs, refactor, test, ci, perf, build, revert, hotfix`.
- Vida corta (≤ 3 días). Una rama = una historia.
- Windows/OneDrive: `git config core.fileMode false`; no cambiar los finales de línea de archivos legacy (CRLF).

## 4. Commits
Conventional Commits `<tipo>(<scope>): <descripción>` con pie `Refs: #<issue>` o `Spec: <ID>`. Scopes: `api`, `auth`, `lugares`, `paquetes`, `jornadas`, `ui`, `server`, `arnes`…

## 5. Pull Requests
- Título `<tipo>(<scope>): <descripción> (#<issue>)`; cuerpo con `.github/pull_request_template.md` (spec, maqueta, CA con evidencia, pruebas, capturas).
- Borrador hasta tener los 3 informes de revisión; objetivo 200–400 líneas.
- **Squash merge**, rama borrada al fusionar.

## 6. Protección de la rama base (ruleset manual)
Restrict deletions; block force pushes; PR obligatorio con 1 aprobación, *Dismiss stale approvals*, *Require review from Code Owners*, *Require conversation resolution*; checks obligatorios: `validate`, `config`, `test-and-coverage`, `e2e`, `lint`, `gitleaks`; historial lineal; solo squash.

## 7. Permisos
Agentes usan el `gh` del desarrollador; nunca aprueban, fusionan ni cambian rulesets. Workflows con `permissions` mínimos.

## 8. Ciclo completo
1. `/nueva-spec` o revisión de la spec → `/disenar-pantalla` → humano: `Lista`.
2. `/iniciar-historia` → `In Progress`.
3. Implementador → informe. 4. Validador, contendiente, calidad-seguridad → informes.
5. `/abrir-pr` → `Review`. 6. CI + humano → squash merge → `Done` → `estado <ID> Hecha --humano`.
