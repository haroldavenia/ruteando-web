# Reglas del proyecto para agentes (Antigravity)

Proyecto: **ruteando-web** — panel web de planificación de rutas en **AngularJS 1.3.15** (`master/js`, vistas Jade en `master/jade`, compilado con Gulp a `app/`) servido por Express (`server/server.js`). Objetivo vigente: migrar las 47 llamadas legacy al backend **`/api/v1`** de Hanoit y construir las pantallas nuevas que abre la API, **salvo la app móvil del conductor** (`/api/v1/driver/*`). Iniciativa: `specs/migracion-api-v1/README.md`.

## 1. Principios no negociables
1. **Si no está en el repositorio, no existe.** Requisitos, contrato, decisiones y estado se leen de specs, `docs/contracts/`, ADR, Issues y PR; nunca de memoria de chat ni de un índice de código.
2. **Sin spec no hay código.** Todo cambio corresponde a una historia con spec atómica (`specs/<iniciativa>/<fase>/<ID>-<slug>.md`), criterios de aceptación verificables y rama propia.
3. **Nunca trabajes en la rama base.** Rama corta → Pull Request → CI → aprobación humana → squash merge. Los agentes no aprueban, no fusionan y no cambian reglas de GitHub. La rama base de esta línea AngularJS se define en ADR-0001.
4. **No inventes** endpoints, campos, códigos de error, comandos, resultados de pruebas ni cumplimiento de criterios. Lo no verificado se reporta como "No verificado". El contrato del backend está en `docs/contracts/source/` (canónico: `migration-guide.md`).
5. **Alcance cerrado.** Solo se editan los "Archivos autorizados" de la spec. Un cambio de alcance se registra primero en la sección 11 y lo aprueba un humano.
6. **Seguridad.** Nunca escribas, copies ni imprimas secretos, tokens, contraseñas (tampoco las de `.env`) ni datos personales en código, evidencia o logs. Nunca ejecutes acciones destructivas contra el backend compartido ni `push --force`/`reset --hard` en ramas compartidas.

## 2. Jerarquía de fuentes de verdad
1. ADR aceptados (`docs/architecture/adr/`)
2. Contrato del backend (`docs/contracts/source/`, índice `docs/contracts/api-v1-catalog.md`)
3. Spec de la historia activa y su Issue
4. Sistema UI y maquetas (`docs/ui/`)
5. Guías (`docs/engineering/`, `docs/agent-workflow/`)
6. Código y pruebas existentes
Si el código o la spec contradicen una fuente superior, **reporta** el hallazgo antes de modificar nada.

## 3. Roles (definidos en `.agents/agents/`)
| Rol | Archivo | Modelo | Edita archivos |
| --- | --- | --- | --- |
| Orquestador | `orquestador.md` | sesión (`inherit`) | Specs, evidencia, Issues/PR vía `gh` |
| Implementador | `implementador.md` | `inherit` | Solo archivos autorizados por la spec |
| Validador | `validador.md` | `inherit`, contexto limpio | No |
| Contendiente | `contendiente.md` | `pro` (distinto de la sesión) | No (solo temporales fuera del repo) |
| Calidad y seguridad | `calidad-seguridad.md` | `pro` | No |
Flujo: `docs/agent-workflow/README.md`. Modelos: `docs/agent-workflow/modelos.md`.

## 4. Pruebas y evidencia
- Unitarias y de contrato: Karma + Jasmine + `angular-mocks@1.3.15` (`tests/unit`, `tests/integration`). Karma carga solo el código migrado listado en `tests/helpers/sources.json` sobre un módulo `angle` de prueba: cada historia añade ahí sus archivos. E2E: Playwright contra `server/server.js` + `tests/mock-api` (`tests/e2e`). Sondas contra el backend real: `node:test` (`tests/api`, requieren `.env`). Servidor y herramientas: `node --test`.
- Cada prueba lleva en el nombre la historia y el criterio: `it('[MAE-001 CA-3] …')`. Sin `fit`, `xit`, `.only`, `.skip`.
- Cobertura ≥ 90 % en líneas nuevas o modificadas (`tools/diff-coverage.mjs`); sin `coverage ignore`, sin pruebas vacías, sin excluir archivos.
- Cada rol deja un informe en `specs/<iniciativa>/<fase>/evidencia/<ID>/AAAA-MM-DD-<rol>.md` con los comandos literales y su resultado.

## 5. Comandos verificados
```
npm start                                  # server/server.js (lee .env): SPA + proxy /api/v1
npm test                                   # arnés (tools/ y tests/tools) con node --test
npm run test:unit | test:integration       # Karma (ChromeHeadless); -- --spec <ID> filtra por historia
npm run coverage:unit | coverage:server | coverage:tools && npm run coverage:merge   # → coverage/lcov.info
npm run test:server                        # server/ (proxy, redirecciones) con node --test sobre mock-api
npm run mock-api                           # mock de /api/v1 con fixtures reales (:4010)
npm run test:e2e                           # Playwright (compila con Gulp y levanta mock-api)
npm run test:api                           # sondas contra BACKEND_URL (.env); sin backend: no ejecutadas
node tools/validate-harness.mjs .          # valida .agents/ y AGENTS.md
node tools/specs.mjs lint <ID>             # Definition of Ready mecánica
node tools/specs.mjs dod <ID>              # Definition of Done mecánica
node tools/specs.mjs trace | next | status | legacy-scan
node tools/specs.mjs issue <ID> --write    # cuerpo del Issue desde la spec → gh issue create …
node tools/specs.mjs contract-diff --postman <colección.json>   # cobertura vs colección Postman del backend
node tools/diff-coverage.mjs --lcov coverage/lcov.info --base <rama-base>
npx -y eslint@10.15.0 -f json <archivos> > .tmp/eslint.json && node tools/lint-diff.mjs --report .tmp/eslint.json --base <rama-base>
gh issue view <n> · gh pr create --draft    # requiere gh autenticado
```

## 6. Skills del flujo (`.agents/skills/`, invocables con `/<nombre>`)
`/entregar-historia` (de punta a punta) · `/nueva-spec` · `/iniciar-historia` · `/implementar-spec` · `/validar-spec` · `/revision-contendiente` · `/revision-calidad-seguridad` · `/abrir-pr` · `/disenar-pantalla` · `/sincronizar-contrato` · `/cerrar-fase` · `/estado-migracion`

## 7. Memoria
Orientación en el código: servidor MCP `codebase-memory` (si está instalado) antes de leer archivos completos; si no, `grep_search`. El índice orienta, **no decide**: ante conflicto mandan spec, contrato y ADR. Lecciones durables van a `docs/agent-workflow/lecciones.md` o a un ADR mediante PR.
