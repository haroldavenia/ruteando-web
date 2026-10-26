# Tasks

## 1. Catálogo de estados

- [x] 1.1 Añadir `activeValues(code)` a `MasterDomainsService`, quitar `returned` de los valores por defecto de `PackageStatus` y hacer que `DEFAULT_PACKAGE_STATUSES` sea la lista de cuatro estados activos; verificar con `master-domains.spec.ts` (activos sin inactivos, mismo orden, dominio inexistente da lista vacía, valores por defecto sin `returned`) y con `package-labels.spec.ts`, que sigue etiquetando `returned` como «Devuelto»

## 2. Listado de paquetes

- [x] 2.1 Hacer que el menú de estado de `/paquetes` parta de los valores activos (sin el actual); verificar con `package-list.component.spec.ts` (con un catálogo que trae `returned` inactivo no se ofrece, un paquete con estado `returned` se sigue mostrando como «Devuelto» y su menú ofrece los activos)

## 3. Visitas de la ruta

- [x] 3.1 Hacer que el cambio de estado de las visitas parta de los valores activos y que el filtro por estado sea los activos más los inactivos presentes en las visitas cargadas; verificar con `route-visits.component.spec.ts` (el menú no ofrece `returned`; una ruta con una visita `returned` la muestra, ofrece «Devuelto» en el filtro y sigue sin ofrecerlo como destino; sin visitas inactivas el filtro no lo incluye)

## 4. Documentación e integración

- [x] 4.1 En `gateway-api.md` retirar el «Pendiente» de los estados inactivos, anotar la corrección y añadir como comprobación pendiente el resto de dominios que usan `values()` (`ServiceType`, `PlaceType`, `RouteTopology`, `OsrmProfile`); verificar con `grep` que la sección «Verificado contra el gateway real (2026-10-26)» no dice ya que la interfaz ofrece estados inactivos
- [x] 4.2 Ejecutar `npm run test:ci` y `npm run build` en `ng-ruteando/` y `openspec validate --specs --strict`; verificar que pasan sin errores ni avisos nuevos

## Workflow follow-up

- Si se dispone de un usuario con acceso al gateway, comprobar a mano que `/paquetes` ya no ofrece «Devuelto» y que atender, cancelar y dejar pendiente un paquete funcionan.
- Archivar el change con `/opsx:archive` tras la revisión.
