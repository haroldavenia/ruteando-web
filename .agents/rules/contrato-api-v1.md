---
trigger: model_decision
description: Aplicar al leer, escribir o probar cualquier llamada al backend, servicio de datos, fixture o endpoint /api/v1.
---

# Contrato `/api/v1` (canónico: docs/contracts/source/migration-guide.md)
- Superficie única `/api/v1`, base relativa por el proxy de `server/server.js` (ADR-0002). Las rutas legacy responden 403; `node tools/specs.mjs legacy-scan` las detecta.
- Sesión: `Authorization: Bearer`; refresh rota en cada uso (una sesión por usuario) → una sola renovación en vuelo y sincronización entre pestañas (ACC-001).
- Página `{content,totalElements,totalPages,page,size}` (base 0). `sort=campo,asc|desc` solo con la lista blanca de `endpoints.md`. `PUT` sustituye el registro (reenvía todo sin campos de solo lectura).
- Errores `{error,message,timestamp,path,details}`: decide por `error`. 409 con `details{referencedBy,ids}` al borrar algo en uso; 429 con `Retry-After`; 423 con `lockedUntil`.
- Unidades fijas: peso g, volumen cm³, medidas cm, distancia m, duración s (`GET /units`). Coordenadas GeoJSON `[lon,lat]`; posiciones con `longitude`/`latitude` planos.
- Retirados (404): `/assigned-services`, `/admin/migrate*`, `/driver/assignments`. Fuera de alcance: `/driver/*`.
- Endpoint sin fixture en `tests/fixtures/api-v1/` → la sonda API de la historia lo captura saneado. Defectos y huecos: `docs/contracts/known-backend-defects.md`, `contract-gaps.md`.
