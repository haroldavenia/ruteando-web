# FND-003: Dominios maestros y unidades de medida de la plataforma

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f0-fundaciones` |
| Clave anterior | F0-03 · `MASTER-DOMAINS-SVC` |
| Depende de | FND-002 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-master-domains-svc` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /master-domains`, `GET /master-domains/{code}`, `GET /master-domains/{code}/values`, `GET /units` |
| Maqueta | — |
| ADR relacionados | ADR-0002, ADR-0004 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Sustituir constantes duras por los catálogos del backend (los 12 de enum son de solo lectura y siempre activos) y centralizar las unidades fijas de la plataforma (g, cm³, cm, m, s) con conversión para mostrar y capturar.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | `ROAD_RESTRICTION_TYPE` (TIME, RESOURCE_TIME, FIXED_ROUTES) y `TYPE_LENGTH_OF_STAY` (FIXED, DEFINE_ITINERARY) constantes | `modules/constants.js:30-40` | Cambia: dominios `RestrictionType`, `TypeLengthOfStay` |
| L2 | Estados de visita VISITED/VISIT_PENDING/VISIT_FINISHED | `custom/config/constant.js `visits.status`` | Cambia: dominio `PackageStatus` |
| L3 | Filtro de geocodificación MATCH/MEAN/MANUAL/UNMATCH con etiquetas en español | `custom/itinerary/itinerary_controller.js `statusFilter`` | Cambia: dominio `GeocodingStatus` (`match`, `mean`, `unmatch`, `manual`, `unprocessed`) |
| L4 | Tipos de usuario ANONIMUS/BASIC/PREMIER/ENTERPRISE | `custom/config/constant.js `user.type`` | Se retira: el plan vive en tenants/billing |
| L5 | Peso guardado en gramos y medidas en cm en el legacy | `pdf_exporter.js; vehicle_type_controller.js` | Se mantiene: la plataforma usa g, cm³ y cm (unidades fijas, no por tenant) |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/master-domains` | — | Arreglo de dominios `{code, values[{key,label,active}]}` | 401 | `get__master-domains.json` |
| GET | `/api/v1/master-domains/{code}` | — | Dominio | 404 | `get__master-domains__code.json` |
| GET | `/api/v1/master-domains/{code}/values` | — | Valores `{key,label,description,active,sortOrder}` | 404 | `get__master-domains__code__values.json` |
| GET | `/api/v1/units` | — | `{weight:{key:'g',…}, volume:{key:'cm3'…}, length:{key:'cm'}, distance:{key:'m'}, duration:{key:'s'}}` | 401 | — (capturar con sonda) |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como usuario del panel, quiero ver catálogos y unidades coherentes con lo que valida el backend, para no elegir valores que la API rechaza ni confundir gramos con kilos.

## 3. Alcance

**Incluye**

- `MasterDomains.values(code)`, `activeValues(code)`, `label(code,key)`, caché por sesión, fallback local si falla la carga, filtro `domainLabel`.

**Excluye (no tocar)**

- Pantalla de administración de dominios (MAE-007).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `master/js/modules/services/master_domains.js`
- `master/js/modules/services/units.js`
- `master/js/modules/filters/domain_label.js`
- `tests/helpers/sources.json`
- `tests/unit/master-domains-svc/**`
- `tests/integration/master-domains-svc/**`
- `tests/api/master-domains-svc.api.test.mjs`
- `specs/migracion-api-v1/f0-fundaciones/evidencia/FND-003/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Cargar un dominio por código una sola vez por sesión y servirlo desde caché
- **RF-2** — Devolver solo los valores activos para formularios y menús de cambio de estado
- **RF-3** — Resolver la etiqueta de una clave (incluidas las inactivas, para mostrar registros antiguos)
- **RF-4** — Usar un fallback local documentado si el backend no responde, y avisar en consola
- **RF-5** — Invalidar la caché al cerrar sesión o al cambiar de tenant
- **RF-6** — Cargar `GET /units` una vez por sesión y ofrecer conversión de visualización y captura: peso g↔kg, volumen cm³↔m³, longitud cm↔m

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado dos llamadas a `values('PackageStatus')`, Cuando resuelven, Entonces solo hubo una petición HTTP
- **CA-2** (RF-2) — Dado `MeasurementUnit` o `audit_actions` con un valor `active:false`, Cuando `activeValues`, Entonces no lo incluye y el resto sale ordenado por `sortOrder`; los 12 catálogos de enum llegan siempre activos
- **CA-3** (RF-3) — Dado una clave inactiva, Cuando `label`, Entonces devuelve su etiqueta
- **CA-4** (RF-4) — Dado un 500, Cuando `values('RestrictionType')`, Entonces devuelve el fallback y registra `console.warn`
- **CA-5** (RF-5) — Dado el evento `session:ended`, Cuando vuelvo a pedir un dominio, Entonces se hace una nueva petición
- **CA-6** (RF-6) — Dado 2 500 000 g y 12 000 000 cm³, Cuando `Units.display`, Entonces '2 500 kg' y '12 m³'; dado '2,5' kg capturado, Cuando `Units.toApi`, Entonces 2500 g (enteros, sin pérdida)
- **CA-7** (RF-6) — Dado el dominio `Role`, Entonces sus claves llegan en minúsculas y se usan tal cual (`tenant_admin`)

## 6. Diseño y restricciones técnicas

Crear `master/js/modules/services/master_domains.js`, `master/js/modules/filters/domain_label.js`. Modificar `modules/constants.js` (marcar constantes como fallback). Pruebas `tests/unit/core/master_domains.spec.js`, `tests/integration/core/master_domains.contract.spec.js`.

**Pantallas y flujos.** No aplica (servicio). Lo consumen F2–F6. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Prueba (`[FND-003 CA-n]`) |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | `tests/unit/master-domains-svc/master_domains.spec.js` |
| T-2 | CA-2 | contrato | `tests/integration/master-domains-svc/master_domains.contract.spec.js` |
| T-3 | CA-2 | unitaria | `tests/unit/master-domains-svc/master_domains.spec.js` |
| T-4 | CA-3 | unitaria | `tests/unit/master-domains-svc/master_domains.spec.js` |
| T-5 | CA-4 | contrato | `tests/integration/master-domains-svc/master_domains.contract.spec.js` |
| T-6 | CA-4 | unitaria | `tests/unit/master-domains-svc/master_domains.spec.js` |
| T-7 | CA-5 | unitaria | `tests/unit/master-domains-svc/master_domains.spec.js` |
| T-8 | CA-6 | sonda API | `tests/api/master-domains-svc.api.test.mjs` |
| T-9 | CA-6 | unitaria | `tests/unit/master-domains-svc/units.spec.js` |
| T-10 | CA-7 | sonda API | `tests/api/master-domains-svc.api.test.mjs` |
| T-11 | CA-7 | unitaria | `tests/unit/master-domains-svc/master_domains.spec.js` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: FND-002.
- Riesgos: D2 (valores inactivos en PackageStatus).
- Pregunta no bloqueante: Códigos de dominio → Decisión propuesta: Resuelta: 12 de enum (solo lectura) + `audit_actions` (editable) + `MeasurementUnit` (solo lectura)
- Pregunta no bloqueante: ¿Unidad de presentación? → Decisión propuesta: kg, m³ y m en pantalla; g, cm³ y cm hacia la API

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | `tests/unit/master-domains-svc/master_domains.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-003/2026-11-20-implementador.md` |
| CA-2 | `tests/integration/master-domains-svc/master_domains.contract.spec.js`, `tests/unit/master-domains-svc/master_domains.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-003/2026-11-20-implementador.md` |
| CA-3 | `tests/unit/master-domains-svc/master_domains.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-003/2026-11-20-implementador.md` |
| CA-4 | `tests/integration/master-domains-svc/master_domains.contract.spec.js`, `tests/unit/master-domains-svc/master_domains.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-003/2026-11-20-implementador.md` |
| CA-5 | `tests/unit/master-domains-svc/master_domains.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-003/2026-11-20-implementador.md` |
| CA-6 | `tests/api/master-domains-svc.api.test.mjs`, `tests/unit/master-domains-svc/units.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-003/2026-11-20-implementador.md` |
| CA-7 | `tests/api/master-domains-svc.api.test.mjs`, `tests/unit/master-domains-svc/master_domains.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-003/2026-11-20-implementador.md` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §14); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (E5, D4, D6, B6) | Documentación del backend | — |
| 2026-11-20 | v4: formato de la plantilla harness-engineering | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-20 | Implementación propuesta de F0 a petición del usuario (alcance «Arnés + F0 implementado»), antes de la aprobación formal de la spec: los gates G0 (Lista) y G5 (merge) siguen pendientes de una persona. | Pedido explícito del usuario 2026-11-20 | pendiente |
| 2026-11-20 | `Units` (GET /units y conversiones) vive en `units.js`, compartido con FND-004. | Una sola fuente de conversión | pendiente |
| 2026-11-20 | Fixture `get__master-domains.json` anterior al contrato v3 (Role en mayúsculas): CA-7 se prueba con datos del contrato v3 y la sonda API lo verifica en vivo; recaptura pendiente. | contract-gaps.md | pendiente |
