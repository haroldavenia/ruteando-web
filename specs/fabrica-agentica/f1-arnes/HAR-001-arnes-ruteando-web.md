# HAR-001: Instalar el arnés agéntico en ruteando-web (Antigravity + GitHub Flow)

| Campo | Valor |
| --- | --- |
| Estado | En revisión |
| Iniciativa / Fase | `fabrica-agentica` / `f1-arnes` |
| Issue | #<n> (pendiente) |
| Rama | `chore/HAR-001-arnes-ruteando-web` |
| Pull Request | #<n> (pendiente, tras ADR-0001) |
| Repo / componente | ruteando-web (línea AngularJS) |
| ADR relacionados | 0001, 0003, 0005, 0006 |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto
La estructura anterior (`sdd/`, `.agents/workflows/`) usaba *workflows* deprecados y un formato propio. Se sustituye por la plantilla harness-engineering adaptada a AngularJS, al contrato `/api/v1` y a las maquetas.

## 2. Historia de usuario
Como responsable de ingeniería, quiero que la migración se ejecute con gates de spec, implementación, pruebas y verificación independientes, para entregar cada módulo con trazabilidad y sin depender de conocimiento tácito.

## 3. Alcance
**Incluye**: `AGENTS.md`, `.agents/**`, `.github/**`, `docs/agent-workflow/**`, `docs/engineering/**`, `docs/architecture/adr/**`, `docs/contracts/**` (movido desde `sdd/contracts`), `docs/ui/**`, `specs/**`, `tools/**`, `eslint.config.mjs`, `package.json`.
**Excluye**: configuración en GitHub (rama base, rulesets, Projects) y en Antigravity (modelos): pasos manuales.

**Archivos autorizados**
- Los de «Incluye»; eliminar `sdd/` y `.agents/workflows/`.

## 4. Requisitos
- RF-1: Configuración de Antigravity en formatos documentados (reglas con `trigger`, skills, 5 subagentes, MCP), sin *workflows*.
- RF-2: 41 specs de la migración en el formato de la plantilla, con trazabilidad legacy → spec y endpoint → spec.
- RF-3: Gates mecánicos de DoR/DoD, trazabilidad, legacy-scan, sistema UI y diferencias de contrato (`tools/specs.mjs`).
- RF-4: CI con controles bloqueantes y cobertura de diff ≥ 90 %.
- RNF-1: Herramientas propias sin dependencias de terceros y con cobertura ≥ 90 %.

## 5. Criterios de aceptación
- **CA-1** — Dado el repo, Cuando se ejecuta `node tools/validate-harness.mjs .`, Entonces termina con código 0 (y falla si existe `.agents/workflows/*.md`).
- **CA-2** — Dado el repo, Cuando se ejecuta `node tools/specs.mjs lint --all` y `trace`, Entonces las 41 specs cumplen la DoR mecánica y no hay legacy ni endpoints sin spec.
- **CA-3** — Dado `npm run coverage:tools`, Entonces las pruebas pasan y la cobertura de líneas de `tools/*.mjs` es ≥ 90 %.
- **CA-4** — Dado los YAML y JSON versionados, Cuando se parsean, Entonces no hay errores.

## 6. Diseño y restricciones técnicas
ADR-0003 (mapa plantilla → ruteando-web) y ADR-0005 (controles).

## 7. Casos de prueba esperados
| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | arnés | `tools/test/validate-harness.test.mjs` + ejecución en `ci / config` |
| T-2 | CA-2 | arnés | `tools/test/specs.test.mjs` + ejecución en `ci / config` |
| T-3 | CA-3 | arnés | `npm run coverage:tools` |
| T-4 | CA-4 | CI | `ci / config` (JSON/YAML) |

## 8. Excepciones de cobertura
Ninguna.

## 9. Dependencias, riesgos y preguntas abiertas
- Dependencias: ADR-0001 (rama base) para publicar.
- Riesgos: modelos `pro`/`flash` sin mapeo documentado (ver `docs/agent-workflow/modelos.md`).

## 10. Trazabilidad (se completa al cerrar)
| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | `tools/test/validate-harness.test.mjs` | sin commit | `evidencia/HAR-001/2026-11-20-implementador.md` |
| CA-2 | `tools/test/specs.test.mjs` | sin commit | `evidencia/HAR-001/2026-11-20-implementador.md` |
| CA-3 | `npm run coverage:tools` | sin commit | `evidencia/HAR-001/2026-11-20-implementador.md` |
| CA-4 | parseo JSON/YAML | sin commit | `evidencia/HAR-001/2026-11-20-implementador.md` |

## 11. Registro de decisiones y cambios de alcance
| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-20 | Spec creada | Adopción de harness-engineering | pendiente |
