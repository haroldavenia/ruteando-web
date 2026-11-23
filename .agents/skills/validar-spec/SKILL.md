---
name: validar-spec
description: Procedimiento del validador - contrastar cada criterio de aceptación con el diff, con pruebas etiquetadas ejecutadas, con el contrato y con la maqueta, incluida regresión.
---

# Validar spec

1. Lee la spec, su contrato y `git diff <base>...HEAD`.
2. Por CA: localiza `[<ID> CA-<n>]`, lee la prueba y confirma que sus aserciones demuestran el "Entonces". Ejecútala.
3. Regresión: `npm run test:unit`, `npm run test:integration`, `npm run test:server`, `npm run test:e2e`.
4. Archivos cambiados ⊂ "Archivos autorizados"; `node tools/specs.mjs legacy-scan --id <ID>` = 0.
5. Interfaz: `npm start` con `BACKEND_URL` de `tests/mock-api`, recorre los flujos en el navegador de Antigravity y compáralos con `docs/ui/maquetas/index.html#<id>`; capturas en `evidencia/<ID>/`.
6. Informe con veredicto PASS / PASS WITH GAPS / FAIL.
