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
- Lotes: `POST /{recurso}/batch-delete {ids}` (máx. 100; 200 con `results[]` `deleted|not_found|conflict`) en places, resource-types, resources, settings, users y journeys → `ApiClient.batchDelete`. Paquetes: borrado uno a uno (`runBulk`) y estado por lote `PATCH /packages/status`.
- Plan de jornada: síncrono 201 hasta `apiConfig.planAsyncThreshold` (500); por encima `async=true` → 202 `{jobId}` y `GET /journeys/plan/jobs/{jobId}`; 429 = cola llena.
- OTP: 502 `OTP_DELIVERY_FAILED` sin `otpId`; el texto de consentimiento SMS sigue `backend-docs/compliance/SMS_OTP_OPT_IN.md`.
- Retirados (404): `/assigned-services`, `/admin/migrate*`, `/driver/assignments`. Fuera de alcance: `/driver/*`.
- Endpoint sin fixture en `tests/fixtures/api-v1/` → la sonda API de la historia lo captura saneado. Defectos y huecos: `docs/contracts/known-backend-defects.md`, `contract-gaps.md`.
