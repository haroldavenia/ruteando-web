---
trigger: glob
globs: specs/**
---

# Specs
- Plantilla: `specs/_templates/spec-historia.md`. Una historia = una spec = un PR. IDs por fase: `FND` f0, `ACC` f1, `MAE` f2, `PAQ` f3, `JOR` f4, `SEG` f5, `EMP` f6, `PLA` f7, `CIE` f8, `HAR` arnés.
- Criterios en formato Dado … Cuando … Entonces, cada uno con caso de prueba en la sección 7. `node tools/specs.mjs lint <ID>` debe pasar.
- Cambiar alcance o CA exige una fila en la sección 11 (fecha, cambio, motivo, quién aprobó). `Lista`, `Hecha` y `Descartada` solo con `node tools/specs.mjs estado <ID> <Estado> --humano "<nombre>"` dicho por una persona en el chat.
- Al tocar endpoints de una spec, actualiza `specs/migracion-api-v1/trazabilidad/endpoint-coverage.json` y ejecuta `node tools/specs.mjs trace`.
