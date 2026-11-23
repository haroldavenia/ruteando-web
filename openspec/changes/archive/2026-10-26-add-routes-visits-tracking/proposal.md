# Proposal

## Why

Hoy se puede planificar una jornada y ver sus rutas, pero no se puede trabajar una ruta concreta ni saber qué visitas se han atendido: el legacy lo resolvía con `route_detail`, `route_tab` y `visits_controller`. Es la última pieza de negocio sin migrar y la que cierra el ciclo de operación (planificar → seguir → marcar).

## What Changes

- Nueva pantalla de detalle de ruta en `/jornadas/:id/rutas/:routeIndex`, con resumen, mapa de una sola ruta y tabla de paradas.
- Las **visitas** de una ruta son sus paradas con paquete (`packageId`). El gateway no tiene un recurso de visitas: el estado de cada visita es el `PackageStatus` del paquete y se lee con `PackagesApi`.
- Cambio de estado de una visita con `PATCH /packages/{id}/status/{status}` (ya expuesto en `PackagesApi.setStatus`), con confirmación al cancelar y errores en español.
- Lista de visitas con filtro de texto por estado y por nombre o dirección, y resumen de avance (atendidas sobre total).
- Enlace «Ver ruta» desde la tabla de rutas del detalle de la jornada.
- Fuera de alcance: métricas de la jornada (`/journeys/{id}/metrics`, vienen casi vacías), instrucciones de navegación, informe del conductor (`/driver/packages/report`), la pantalla de `assigned-services`, gráficos y PDF (fases posteriores).

## Capabilities

### New Capabilities
- `route-detail`: pantalla de una ruta de una jornada con su resumen, su mapa y sus paradas ordenadas.
- `route-visits`: seguimiento de las visitas de una ruta (estado de cada paquete, filtro, avance y cambio de estado).

### Modified Capabilities
- `journey-planning`: el detalle de la jornada enlaza cada ruta con su pantalla de detalle.

## Impact

- `ng-ruteando/src/app/features/journeys/`: nuevo `route-detail.component` y componentes de visitas, ruta hija en `journeys.routes.ts` y enlace en `journey-routes.component`.
- Reutiliza `RoutesMapComponent`, `PackagesApi`, `MasterDomainsService` (`PackageStatus`), `shared/format.ts` y `ConfirmDialogComponent`; sin dependencias nuevas ni cambios en `server/`.
- Documentación: `CLAUDE.md` y `.claude/skills/angular-ruteando/references/gateway-api.md`.
