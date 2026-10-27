# Proposal

## Why

Al comprobarlo contra el gateway real (2026-10-26), el dominio `PackageStatus` trae valores **inactivos** (`returned` y una clave de pruebas `demo_…`) y el gateway los rechaza: `PATCH /packages/{id}/status/returned` responde 400 «Unknown PackageStatus key». La aplicación ofrece todas las claves del dominio sin mirar `active`, así que en `/paquetes` y en las visitas de una ruta hay opciones que siempre fallan. Es un error visible con un clic. Además, los valores por defecto que se usan antes de cargar el catálogo incluyen `returned` como si estuviera activo.

## What Changes

- `MasterDomainsService` ofrece los valores **activos** de un dominio (`activeValues`) además de todos los valores, y los valores por defecto de `PackageStatus` dejan de incluir `returned`.
- El menú de cambio de estado de `/paquetes` y de las visitas ofrece solo estados activos; un paquete que ya tiene un estado inactivo lo sigue mostrando con su etiqueta.
- El filtro por estado de las visitas incluye los estados activos y, además, los inactivos que haya en la ruta (para poder encontrar esas visitas).
- Se actualiza `gateway-api.md` (se retira el «Pendiente» y se anota la corrección).
- Fuera de alcance: los demás dominios (`ServiceType`, `PlaceType`, `RouteTopology`, `OsrmProfile`…) usan `values()` en sus formularios y pueden tener el mismo problema, pero no se ha comprobado en el gateway real; se anota como siguiente comprobación.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities
- `package-management`: la acción de estado ofrece solo valores activos de `PackageStatus` y conserva a la vista los estados inactivos que ya tengan los paquetes.
- `route-visits`: igual para el cambio de estado de una visita, y el filtro por estado incluye los inactivos presentes en la ruta.

## Impact

- `ng-ruteando/src/app/core/api/data/master-domains.service.ts` (y su spec), `features/packages/package-list.component.ts`, `features/packages/package-labels.ts`, `features/journeys/route-visits.component.ts` y sus specs.
- `.claude/skills/angular-ruteando/references/gateway-api.md`.
- Sin dependencias nuevas ni cambios en el servidor.
