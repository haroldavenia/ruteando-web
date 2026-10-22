# Design

## Context

Estado de partida (ver `proposal.md` para la motivación):

- `core/api` tiene `JourneysApi` (`list`, `get` y `plan` devuelven ya el modelo de dominio `PlannedJourney` con las rutas decodificadas; `remove`, `metrics`, `navigations`), los modelos `Journey`, `JourneyRoute`, `Waypoint` y los fixtures reales (`get__journeys`, `get__journeys__id`, `post__journeys__plan`, `delete__journeys__id`).
- En los listados `routes` es `null`; solo el detalle y la planificación traen rutas. El gateway también devuelve estados `planned` y `completed` además de los del dominio `JourneyStatus`.
- Del ejemplo real: `distanceTraveled` 5928,5 y `duration` 532 en una ruta de cuatro paradas, y `stats {minTime, avgTime, maxTime}` en 532: se interpretan como **metros y segundos** (coherente con el trayecto); sin documentación oficial, se contrasta con el gateway real.
- `POST /journeys/plan` falla con ids hexadecimales de paquete (400 `For input string`), así que la planificación real depende de un arreglo del backend. El proxy corta a los 30 s (`GATEWAY_TIMEOUT_MS`) y responde 504.
- `shared/data` y `features/packages` (listado paginado, `fetchAllPackages`, etiquetas de estado) y `shared/time` (hora local) son las piezas reutilizables.

## Goals / Non-Goals

**Goals:**
- Producir y consultar jornadas desde la aplicación nueva con datos reales del gateway.
- Dejar el detalle listo para que el change siguiente pinte las rutas en el mapa sin rehacerlo.
- Que un fallo de planificación sea comprensible y reintentable.

**Non-Goals:**
- Dibujar rutas, navegación giro a giro, métricas, despachar o cancelar.
- Planificación en el cliente: la optimización es del servidor.

## Decisions

### 1. Tres pantallas, rutas diferidas
`/jornadas` (lista), `/jornadas/nueva` (planificar) y `/jornadas/:id` (detalle), con `loadChildren`, `roleGuard(OPERATIONS_ROLES)` y, en `nueva`, `unsavedChangesGuard`. La planificación termina navegando a `/jornadas/:id` con el id devuelto.

### 2. Selección de paquetes que sobrevive a la paginación
Un componente `PackagePickerComponent` con un `ListState<Package>` (paginado desde el servidor) y un `Set<string>` de ids seleccionados que vive fuera de la página. Las casillas leen y escriben ese conjunto, así que cambiar de página no pierde nada. «Seleccionar todos los pendientes» usa `fetchAllPackages` (de 200 en 200, con progreso) y marca los de estado `pending`. Salida: `selectedIds` (señal) para el formulario.
- *Alternativa descartada:* un `mat-select` múltiple con todos los paquetes. No escala y no permite ver estado ni dirección.
- *Alternativa descartada:* seleccionar solo en la página actual. Obligaría a planificar de a 20 paquetes.

### 3. Planificar: estado de la petición y errores
`SubmitState` cubre el progreso y el botón desactivado. Los mensajes por estado: 400 y 422 → «No se pudo planificar la jornada» + el mensaje del gateway (`error.details.message` si existe); 404 → configuración o paquete inexistente; 502 y 504 → texto de tiempo agotado. La selección y los campos se conservan al fallar. El mensaje técnico del gateway se muestra tal cual porque es lo único que identifica el defecto de los ids hexadecimales.
- *Tiempo de espera:* se documenta en `.env.example` y en `gateway-api.md` que `GATEWAY_TIMEOUT_MS` debe subirse si la planificación tarda más de 30 s.

### 4. Detalle como composición de presentadores
`JourneyDetailComponent` (carga con `RecordLoader<PlannedJourney>`) compone `JourneySummaryComponent` (cifras), `JourneyRoutesTableComponent` (rutas, con filas expandibles a sus paradas) y la lista de paquetes no planificables. Las paradas se renderizan desde `DomainWaypoint` (ya con `LatLng`), y las rutas desde `DomainRoute` (ya con `geometry`), de modo que el change del mapa solo añade un componente que lea esos mismos datos.

### 5. Formatos
`shared/format.ts`: segundos → «Xh Ym» (menos de una hora: «Ym»; menos de un minuto: «Ys»), metros → kilómetros con un decimal («5,9 km»), fechas UTC → hora local con `Intl` (`es`), porcentajes con `null` → «—». Todo con pruebas de tabla.

### 6. Listado
Columnas: nombre (enlace al detalle), estado, configuración (`settings.name`), servicios, vehículos y fecha. Etiquetas de `JourneyStatus` con `planned` y `completed` incluidas. Borrado con `DeleteFlow` (sin mensaje especial: no se conoce un caso «en uso»).

## Risks / Trade-offs

- [El defecto de ids hexadecimales impide planificar en real] → Se construye y verifica con fixtures; el mensaje del gateway llega al usuario; verificación real pendiente de autorización y de arreglo del backend.
- [Planificaciones largas cortadas por el proxy] → Mensaje de 504 y documentación de `GATEWAY_TIMEOUT_MS`.
- [Unidades de distancia y duración supuestas] → Interpretación coherente con el fixture, anotada como pendiente de contraste.
- [Seleccionar muchos paquetes exige varias peticiones] → Progreso visible y páginas de 200.
- [Detalle con muchas rutas y paradas] → Paradas solo al abrir una ruta; tabla simple sin virtualización mientras los tamaños sean moderados.

## Migration Plan

1. Formatos y etiquetas con pruebas.
2. Listado y borrado.
3. Selector de paquetes y formulario de planificación.
4. Detalle (resumen, rutas, paradas, no planificables).
5. Rutas, menú, verificación (build, navegador real) y documentación.

Reversión: aditivo; revertir las rutas y el menú oculta las pantallas.

## Open Questions

- ¿Unidades reales de `distanceTraveled`, `duration` y `stats`? Se asumen metros y segundos.
- ¿Estados y transiciones completos de `JourneyStatus` y si hay endpoints para despachar o cancelar? No se usan en esta fase.
- ¿Cuándo se corrige el defecto de ids hexadecimales en `journeys/plan`?
