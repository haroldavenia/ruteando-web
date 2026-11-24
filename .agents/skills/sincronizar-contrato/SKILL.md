---
name: sincronizar-contrato
description: Sincroniza docs/contracts con la documentación y el OpenAPI vigentes del backend, detecta cambios que afectan specs y propone su actualización. Usar cuando el backend publica documentación nueva o cambia /v3/api-docs.
---

# Sincronizar contrato

1. Copia la documentación nueva del backend a `docs/contracts/source/` (sin tocar `historico/`).
2. Si `BACKEND_URL` responde (TLS verificado; nunca desactivar la verificación), descarga `${BACKEND_URL}/v3/api-docs` a `docs/contracts/openapi.snapshot.json`.
3. `node tools/specs.mjs contract-diff --openapi docs/contracts/openapi.snapshot.json`; si llegó colección Postman, también `contract-diff --postman docs/contracts/source/postman/<colección>.json` y actualiza `docs/contracts/postman-mapping.md`.
4. Por cada endpoint nuevo, retirado o con contrato cambiado: identifica las specs (`grep_search` del endpoint en `specs/`), propón el cambio (sección 11) y, si la spec ya está `Lista` o más avanzada, pide reaprobación humana.
5. Si la spec tiene Issue, regenera su cuerpo (`node tools/specs.mjs issue <ID> --write`) y propón `gh issue edit`.
6. Actualiza `docs/contracts/known-backend-defects.md`, `contract-gaps.md` y `trazabilidad/*.json`; `node tools/specs.mjs trace` en PASS.
