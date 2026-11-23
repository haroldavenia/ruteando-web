---
name: cerrar-fase
description: Comprueba que todas las historias de una fase están Hecha o Descartada, ejecuta la regresión completa y la trazabilidad de la fase, y deja el informe para la firma humana.
---

# Cerrar fase

1. `node tools/specs.mjs trace --fase <fase>`: 0 problemas.
2. Regresión: `npm test`, `npm run test:unit`, `npm run test:integration`, `npm run test:server`, `npm run test:e2e`.
3. `node tools/specs.mjs legacy-scan`: sin coincidencias de historias `Hecha`.
4. Escribe `specs/migracion-api-v1/<fase>/evidencia/cierre-<fase>.md` con resultados literales, dispensas abiertas (sondas sin backend) y riesgos; pide la firma del responsable humano.
