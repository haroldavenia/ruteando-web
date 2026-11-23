# Decisiones de arquitectura (ADR)

Una decisión = un archivo `NNNN-titulo.md` (plantilla `0000-plantilla.md`). Nunca se borra: se reemplaza con otro ADR que lo indique. Estados: Propuesto → Aceptado | Rechazado | Reemplazado por ADR-NNNN.

| ADR | Título | Estado |
| --- | --- | --- |
| [0001](0001-github-flow-y-rama-base.md) | GitHub Flow y rama base de la línea AngularJS | Propuesto (decisión humana pendiente) |
| [0002](0002-proxy-mismo-origen.md) | Consumir `/api/v1` por un proxy del mismo origen | Propuesto (se aprueba con FND-002) |
| [0003](0003-arnes-agentico-antigravity.md) | Arnés agéntico de Antigravity a partir de harness-engineering | Propuesto |
| [0004](0004-capa-api-y-sesion.md) | `ApiClient` único, servicios por entidad y sesión JWT | Propuesto (FND-002, ACC-001) |
| [0005](0005-controles-de-calidad.md) | Pruebas AngularJS, CI y cobertura de diff ≥ 90 % | Propuesto (FND-001) |
| [0006](0006-sistema-ui.md) | Sistema UI `rw-*` y maquetas navegables | Propuesto (FND-005) |

Las ADR del backend viven en `docs/contracts/source/backend-docs/adr/` y no se editan aquí.
