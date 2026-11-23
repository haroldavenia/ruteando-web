---
name: estado-migracion
description: Resume el estado de la migración - historias por estado, siguiente trabajo desbloqueado, trazabilidad y bloqueos del backend. Usar cuando preguntan "cómo vamos", "qué sigue" o al empezar una sesión.
---

# Estado de la migración

1. `node tools/specs.mjs status`, `next` y `trace`.
2. Lee la sección "Estado del backend" de `specs/migracion-api-v1/README.md` y `docs/contracts/contract-gaps.md`.
3. Responde: fase actual, historias en curso, siguiente recomendada (respetando solapes de archivos), bloqueos del backend y dispensas abiertas.
