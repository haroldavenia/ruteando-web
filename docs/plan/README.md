# Plan de la migración

- Fases, historias, dependencias y olas: [`specs/migracion-api-v1/README.md`](../../specs/migracion-api-v1/README.md) (fuente única; `node tools/specs.mjs status` y `next` dan el estado vivo).
- Pendientes del backend: `docs/contracts/contract-gaps.md` y `docs/contracts/known-backend-defects.md`.
- Decisiones abiertas que bloquean publicar: ADR-0001 (rama base).

## Orden recomendado tras F0
1. Ola 3: ACC-001 (sesión) y MAE-004 (geocodificación).
2. Ola 4–5: ACC-002…ACC-005 (registro, recuperación, perfil, roles y menú).
3. Ola 6 en paralelo sin solapes: MAE-001, MAE-003, MAE-006, MAE-007, MAE-009, EMP-003.
4. Después: MAE-005 → PAQ-002 → MAE-002 → PAQ-001/PAQ-003 → JOR-001 … (ver olas).
