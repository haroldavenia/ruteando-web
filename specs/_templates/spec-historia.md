# <ID>: <Título en imperativo>

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `<fN-slug>` |
| Clave anterior | — |
| Depende de | — |
| Issue | #<n> (pendiente) |
| Rama | `<tipo>/<n>-<slug>` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /ruta`, `POST /ruta` |
| Maqueta | `docs/ui/maquetas/index.html#<id>` (o —) |
| ADR relacionados | — |
| Responsable | <persona> |
| Autor / Fecha | <rol o persona> / AAAA-MM-DD |

## 1. Objetivo y contexto
<Problema, por qué ahora, comportamiento actual vs. esperado. Hechos con ruta de archivo.>

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | | `master/js/...` | Se mantiene / Cambia / Se retira |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/...` | — | | 401, 403, 404 | `get__....json` o «capturar» |

## 2. Historia de usuario
Como <rol>, quiero <capacidad>, para <beneficio>.

## 3. Alcance
**Incluye**
- 

**Excluye (no tocar)**
- 

**Archivos autorizados**
- `ruta/archivo` — motivo

## 4. Requisitos
**Funcionales**
- RF-1:

**No funcionales (solo los pertinentes)**
- RNF-1 (seguridad / rendimiento / compatibilidad):

## 5. Criterios de aceptación
- **CA-1** (RF-1) — Dado <contexto>, Cuando <acción>, Entonces <resultado observable>.
- **CA-2** — 

## 6. Diseño y restricciones técnicas
<Servicio `<entidad>.api.js` con `toDomain`/`toRequest`, componentes `rw-*`, conversiones con `Units`/`GeoUtils`.>

**Pantallas y flujos.** <Flujo>. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.<modulo>.list` | `pages/<modulo>/*` | | |

## 7. Casos de prueba esperados
| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | |

## 8. Excepciones de cobertura
Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas
- Dependencias:
- Riesgos:
- Preguntas abiertas:

## 10. Trazabilidad (se completa al cerrar)
| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/<ID>/...` |

## 11. Registro de decisiones y cambios de alcance
| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
