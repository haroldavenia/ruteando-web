# ADR-0003: Arnés agéntico de Antigravity a partir de harness-engineering

- Estado: Propuesto
- Fecha: 2026-11-20
- Specs: HAR-001

## Contexto
La primera estructura (`sdd/`, `.agents/workflows/`) usaba *workflows*, deprecados en Antigravity, y un formato de spec propio. El equipo ya tiene una plantilla probada (harness-engineering, aplicada en isesgeotraking) con roles, reglas, skills, GitHub Flow y CI.

## Decisión
- Adoptar la plantilla: `AGENTS.md`; `.agents/agents` (orquestador, implementador, validador, contendiente `pro`, calidad-seguridad `pro`); `.agents/rules` con `trigger`; `.agents/skills`; specs `specs/<iniciativa>/<fase>/<ID>-<slug>.md` con secciones 1–11; evidencia por rol; estados Borrador→Lista→En progreso→En revisión→Hecha|Descartada; veredictos PASS / PASS WITH GAPS / FAIL.
- Adaptaciones de ruteando-web: reglas `angularjs`, `contrato-api-v1`, `alcance`; skills `disenar-pantalla`, `sincronizar-contrato`, `cerrar-fase`, `estado-migracion`; campos de spec `Endpoints /api/v1`, `Maqueta`, `Clave anterior`; `tools/specs.mjs` como gate mecánico (DoR, DoD, trazabilidad legacy/endpoint, legacy-scan, lint-ui, contract-diff).
- Las 40 specs anteriores se migraron con un mapa de IDs (`specs/migracion-api-v1/trazabilidad/mapa-ids.json`); se añadió FND-005 (sistema UI).
- `tools/validate-harness.mjs` rechaza `.agents/workflows/*.md`.

## Consecuencias
- Un único flujo para todos los repositorios del equipo.
- `sdd/` y `.agents/workflows/` se eliminan al instalar el arnés (su contenido vive en `specs/`, `docs/contracts/` y `docs/architecture/adr/`).
