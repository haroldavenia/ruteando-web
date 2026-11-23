# ADR-006 — Quality gates: JaCoCo 90% + análisis estático en `mvn verify`

**Estado:** Aceptado  
**Fecha:** 2026-07-21  
**Supersedes:** Umbral JaCoCo Fase 2 (85% clases / 80% métodos en `specs/fase2/TASK_F2_11_TESTING.md`)

## Contexto

Tras completar Fase 4, el bundle activo (`com/hanoit/routing/**` + JWT/security) requería umbral de cobertura más estricto y gates de calidad estática bloqueantes antes de merge/CI.

## Decisión

| Gate | Umbral / regla | Config |
|---|---|---|
| **JaCoCo** | LINE, CLASS, METHOD ≥ **90%** | `pom.xml` + whitelist `docs/testing/JACOCO_EXCLUSIONS.md` |
| **Checkstyle** | `failOnViolation=true`; `IllegalCatch` permite `RuntimeException` | `config/checkstyle/checkstyle.xml` |
| **SpotBugs** | `failOnError=true`; effort Max | `config/spotbugs/exclude-filter.xml` |
| **PMD** | `failOnViolation=true`; ruleset curado | `config/pmd/ruleset.xml` |
| **CI** | Job `quality.yml` ejecuta `mvn verify` | `.github/workflows/quality.yml` |

**Alcance JaCoCo/PMD (includes):** Fase 4 routing + `Jwt*`, `SecurityConfig`, `exception/**`, `converter/**`.

**Excluido (legacy/JNI/externos):** ver tabla completa en `docs/testing/JACOCO_EXCLUSIONS.md`.

**Perfiles Maven opcionales:**

- `-Prun-osrm-jni` — tests JNI OSRM (job CI separado)
- `-Pload` — smoke carga geocoding

## Consecuencias

- **Positivo:** CI bloquea regresiones de estilo/bugs; cobertura Fase 4 ≥ 90%.
- **Negativo:** Specs Fase 2 citaban 85%/80% — actualizados con banner superseded (Jul 2026).
- **Riesgo:** `catch(RuntimeException)` no captura checked exceptions en jobs async — ver `docs/operations/SECRETS_ROTATION.md` y Obsidian `Risks.md` R-14.

## Validación

- `mvn verify` verde: 1088 tests, 0 fallos, JaCoCo+Checkstyle+SpotBugs+PMD = 0 violaciones (Jul 2026).

## Enlaces

- `docs/testing/README.md` — fuente canónica comandos y gates
- `docs/testing/STATIC_ANALYSIS.md` — detalle herramientas
- `.cursorrules` — Definition of Done del producto
