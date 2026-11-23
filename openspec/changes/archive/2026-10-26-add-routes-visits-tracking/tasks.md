# Tasks

## 1. Datos y lógica de visitas

- [x] 1.1 Extraer a un helper compartido de `features/packages/` el cambio de estado de `package-list.component.ts` (confirmar la cancelación, `PackagesApi.setStatus`, mensajes) y verificar que `package-list.component.spec.ts` sigue pasando sin cambios de comportamiento
- [x] 1.2 Crear `route-visit-filters.ts` con el filtro por estado y por texto (sin mayúsculas ni acentos) y el cálculo de avance, y verificar con `route-visit-filters.spec.ts` (coincidencias, sin resultados, 0 visitas, paquetes «No disponible»)
- [x] 1.3 Crear `RouteVisitsStore` (signals): carga de paquetes por `packageId` con concurrencia limitada, fallos individuales como «No disponible», cambios en curso por visita y recarga; verificar con `route-visits.store.spec.ts` (carga parcial, cambio correcto, cambio rechazado conserva el estado, doble cambio bloqueado)

## 2. Detalle de ruta

- [x] 2.1 Crear `RouteDetailComponent` con resumen, mapa de una ruta (`RoutesMapComponent`), carga de la jornada y selección por `routeIndex` (404, `routeIndex` inválido o inexistente → «El registro ya no existe»); verificar con `route-detail.component.spec.ts`
- [x] 2.2 Añadir la ruta hija `:id/rutas/:routeIndex` en `journeys.routes.ts` antes de `:id` y verificar en el spec de rutas que `driver` va a `/sin-permiso` y un anónimo a `/acceso`
- [x] 2.3 Añadir el enlace «Ver ruta» en `journey-routes.component.html` con `aria-label` que nombra la ruta, y verificar con una prueba que apunta a `/jornadas/:id/rutas/:routeIndex`

## 3. Visitas en pantalla

- [x] 3.1 Crear `RouteVisitsComponent` con tabla accesible (orden, tipo, nombre o dirección, llegada, salida, estado), paradas sin paquete sin acción, y «Ver en el mapa» por parada; verificar con su spec, incluido el foco del mapa
- [x] 3.2 Añadir filtros (estado y texto), mensaje de «sin coincidencias» con «Limpiar filtros» y botón «Actualizar»; verificar con el spec que los filtros no vuelven a pedir paquetes
- [x] 3.3 Añadir el avance «X de N visitas atendidas» en texto accesible y la acción de estado con confirmación al cancelar, aviso de resultado y acción deshabilitada mientras dura el cambio; verificar con el spec que el avance se recalcula tras cambiar un estado

## 4. Documentación e integración

- [x] 4.1 Documentar la ruta, la definición de «visita» y sus limitaciones (N peticiones, sin contrato de visitas) en `CLAUDE.md` y en `.claude/skills/angular-ruteando/references/gateway-api.md`; verificar que la documentación cita rutas y archivos que existen
- [x] 4.2 Ejecutar `npm run test:ci` y `npm run build` en `ng-ruteando/` y verificar que pasan sin errores ni avisos nuevos
- [ ] 4.3 Probar en el navegador con el gateway real (`npm start`): abrir una ruta, cambiar un estado y comprobar el avance, anotando cualquier diferencia de contrato en `gateway-api.md`

## Workflow follow-up

- Archivar el change con `/opsx:archive` tras la revisión.
