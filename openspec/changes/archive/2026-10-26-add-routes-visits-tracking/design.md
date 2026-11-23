# Design

## Context

Ver proposal.md (Why). Estado observado en el código y en los fixtures reales del gateway:

- El gateway **no tiene un recurso de visitas**. La jornada trae `routes[].waypoints[]` con `packageId` (nulo en depósitos) y `packageInfo` (tipado `unknown`, sin contrato). El estado vive en el paquete (`PackageStatus`) y se cambia con `PATCH /packages/{id}/status/{status}`, ya envuelto en `PackagesApi.setStatus`.
- `JourneysApi.get()` ya entrega `PlannedJourney` con `DomainRoute` (`geometry`, `LatLng`). `RoutesMapComponent` pinta varias rutas y acepta enfoque por ruta y parada; `package-list.component.ts` ya implementa el cambio de estado con confirmación al cancelar y `package-labels.ts` tiene las etiquetas en español.
- `/jornadas` es una ruta con `roleGuard` en el padre, así que una ruta hija hereda sesión y roles.
- Los fixtures de jornadas con rutas tienen pocas paradas con paquete; el comportamiento con paquetes reales hay que comprobarlo contra el gateway.

## Goals / Non-Goals

**Goals:**
- Ruta hija `/jornadas/:id/rutas/:routeIndex` con resumen, mapa de una ruta y tabla de visitas.
- Cambio de estado sin recargar la página, con el mismo comportamiento que en `/paquetes`.
- Tabla accesible: el estado y el avance se entienden sin color ni barra.

**Non-Goals:**
- No se crea ningún recurso de visitas ni se inventa un contrato: no se usan `/driver/packages/report`, `metrics` ni `navigations`.
- No hay actualización en vivo (sondeo o websockets): el estado se lee al abrir y se actualiza con las acciones del propio usuario.
- No se cambia el estado de la jornada (`planned`, `completed`) al completar sus visitas.

## Decisions

1. **La visita es una parada con `packageId`, y su estado es el del paquete.** Es lo único que el gateway expone. Alternativa descartada: `assigned-services`, que no está enlazado a rutas en los fixtures.
2. **Los paquetes se leen por id con `PackagesApi.get`, en paralelo con `forkJoin` y límite de concurrencia (6).** No hay endpoint para pedir varios ids y filtrar el listado paginado cargaría páginas ajenas. Un fallo individual se convierte en estado "No disponible" (`catchError` por paquete) para que no tumbe la ruta. Alternativa: leer `packageInfo`, descartada por no tener contrato.
3. **Un servicio de visitas por pantalla (`RouteVisitsStore`, con signals)**, que guarda visitas, filtros y cambios en curso. Los filtros y el avance son `computed`; el filtro por texto usa comparación sin acentos de `shared/format.ts` o, si no existe, un helper nuevo allí.
4. **El cambio de estado es pesimista**: la fila cambia cuando el gateway responde 200 y conserva el estado si falla. La acción de esa fila se deshabilita mientras dura; es la misma política que `package-list`. Se extrae a un helper compartido en `features/packages/` lo que hoy está dentro de `package-list.component.ts` (confirmar cancelación + `setStatus` + mensajes) para no duplicarlo.
5. **El mapa reutiliza `RoutesMapComponent` con un array de una sola ruta**, sin cambiar el componente. El color de la ruta se conserva (`routeIndex % 8`) para que coincida con el de la jornada.
6. **Carga de la jornada completa (`JourneysApi.get(id)`) y selección local por `routeIndex`**: el gateway no tiene un endpoint de una sola ruta, y la jornada ya trae todo. Se valida que `routeIndex` sea entero y exista.
7. **Archivos**: `features/journeys/route-detail.component.*`, `route-visits.component.*`, `route-visits.store.ts` y `route-visit-filters.ts` (funciones puras), todos con sus `.spec.ts`.

## Risks / Trade-offs

- [N peticiones por ruta grande (cientos de paradas)] → concurrencia limitada, carga progresiva con estado "Cargando" por fila y aviso de recuento; si resulta lento con datos reales, se documenta y se plantea un endpoint por lotes en el gateway.
- [`packageInfo` o el estado del paquete cambian fuera de la pantalla] → el estado mostrado puede quedar viejo; botón «Actualizar» que recarga las visitas.
- [El enum `PackageStatus` real difiere de las etiquetas por defecto] → se usan los valores de `MasterDomainsService` con `DEFAULT_PACKAGE_STATUSES` como respaldo, como en `/paquetes`.
- [Un paquete cancelado queda dentro de la ruta] → se muestra con su estado y cuenta en el total pero no como atendido; no se recalcula la ruta.
