---
name: nueva-spec
description: Crea o completa una spec atómica de historia a partir de la plantilla, del inventario legacy y del contrato /api/v1. Usar cuando llega una necesidad nueva o una pantalla sin spec.
---

# Nueva spec

1. Fase e ID: `specs/migracion-api-v1/README.md`; siguiente `<AREA>-<NNN>` libre (`grep_search "^# MAE-" specs/`).
2. Copia `specs/_templates/spec-historia.md` a `specs/migracion-api-v1/<fase>/<ID>-<slug>.md`.
3. **Comportamiento actual**: lee el controlador, servicio, vista Jade, estado ui-router y menú legacy; anota cada comportamiento observable con su fichero y destino (se mantiene / cambia / se retira).
4. **Contrato**: copia de `docs/contracts/source/migration-guide.md` y `endpoints.md` el request, response, errores y rol de cada endpoint; cita el fixture o marca "capturar".
5. RF, CA (Dado … Cuando … Entonces, uno por error relevante del contrato), casos de prueba (unitaria, contrato, e2e, sonda API), archivos autorizados.
6. Si hay interfaz, `/disenar-pantalla <ID>` y enlaza la maqueta.
7. Registra endpoints y legacy en `specs/migracion-api-v1/trazabilidad/*.json`; `node tools/specs.mjs lint <ID>` y `trace` en PASS.
8. Issue: `node tools/specs.mjs issue <ID> --write` y el comando `gh issue create …` que imprime (con confirmación humana); anota el número en la spec. Deja `Borrador`; un humano la pasa a `Lista`. Si la spec cambia, actualiza el Issue con `gh issue edit <n> --body-file .tmp/issues/<ID>.md`.
