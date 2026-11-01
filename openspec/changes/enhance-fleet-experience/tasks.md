# Tasks

Segunda fase de la flota. Se implementa **después** de `complete-fleet-module` (paridad con la app anterior), cuyo código usa: `capacity-codec`, `fleet-labels`, `bulk-run`, `fleet-export`, los listados con `FullListState` y las pruebas de `src/testing/fleet.ts`. Todas las rutas son relativas a `ng-ruteando/src/app/` salvo que se diga otra cosa. Cada fichero nuevo lleva su `*.spec.ts` al lado; la comprobación de cada tarea se hace con `npm --prefix ng-ruteando run test:ci` (o la prueba nombrada). Los datos que el gateway nunca devolvió (zonas permitidas, posiciones con datos) salen de `src/testing/fleet.ts`, marcados como hipótesis.

**Orden de entrega**: secciones 1 a 6 = **lote A** (sin contratos nuevos); secciones 7 y 8 = **lote B**, tras comprobar contra el gateway real los puntos de la sección 0 que cada tarea nombra.

## 0. Fase 0 — Comprobar el gateway real (condiciona el lote B)
Necesita el gateway activo (hoy responde 530) y una sesión de administrador **iniciada por la persona**; desde aquí no se introducen contraseñas. Todo lo que se cree se borra al terminar. Los resultados se anotan en `.claude/skills/angular-ruteando/references/gateway-api.md` (sección Flota). La comprobación de la capacidad y de las unidades está en `complete-fleet-module` (sección 9).
- [ ] 0.1 **Valores permitidos**: qué valores acepta `allowedPackageTypes`, si `allowedZoneIds` vacío significa «sin restricción» y si admite `null`; verificar con una captura de cada respuesta
- [ ] 0.2 **Activar y desactivar**: si `PUT` acepta `active` en vehículos, tipos y usuarios, qué hace `default` y cuál es el endpoint de `user.activate` / `user.deactivate`; verificar con una captura o anotar «no hay forma de escribirlo»
- [ ] 0.3 **Asignación**: qué responde asignar un conductor que ya conduce otro vehículo y uno inactivo (¿lo mueve?, ¿409?); verificar y ajustar el texto de aviso de la tarea 4.4
- [ ] 0.4 **Permisos**: qué responden a un agente `GET /resources`, `/resource-types`, `/users/drivers` y `/positions`; verificar para responder la pregunta abierta de los agentes
- [ ] 0.5 **Posiciones**: significado del 202, forma de `GET /positions` con datos, zona horaria de `date` y si `userId` es el id del conductor; si no hay posiciones, dejar el punto como pendiente declarado
- [ ] 0.6 **Auditoría de tipos**: crear y editar un tipo y comprobar en `/auditoria` con qué `entityType` aparece (o si no aparece); verificar para habilitar o no «Ver historial» en la ficha de tipo

- [ ] 0.7 **Límites del plan**: qué responde crear un conductor o un vehículo por encima del cupo (`maxDrivers`, `maxDefaultResources`, `seats` de `GET /tenants/me`) y qué rol puede leer `GET /tenants/me` (hoy `TENANT_ADMIN`); verificar para decidir si el resumen muestra «Conductores: 12 de 50»

## 1. Preparación
- [ ] 1.1 Crear la rama desde `main` actualizada con `complete-fleet-module` ya fusionado y comprobar `git config user.name` (`HectorCorredor9`); verificar con `git status` limpio
- [ ] 1.2 Resincronizar los deltas de este change con el spec vigente de `fleet-management` que dejó la primera fase; verificar con `openspec validate enhance-fleet-experience --strict`
- [ ] 1.3 Ampliar el gateway simulado con vehículos con y sin conductor, con zonas permitidas, inactivos y con un depósito inexistente, y `GET /positions` con 4 conductores (uno con señal de hace 40 min); verificar con `curl`

## 2. Lógica pura
- [ ] 2.1 `features/fleet/fleet-relations.ts`: `driverOf`, `vehicleOf`, `vehiclesOfType`, `depotName` (o «Depósito no disponible») y `shiftRange` («08:00–16:00» en hora local, turno que cruza la medianoche); verificar con vehículos con y sin conductor, depósito inexistente y conductor eliminado
- [ ] 2.2 `features/fleet/fleet-readiness.ts`: `fleetReadiness` (requeridas: depósito, tipo, vehículo; recomendadas: capacidad en tipos en uso, conductor en vehículos activos) y `fleetAttention`; verificar los escenarios de preparación y atención, incluida la flota vacía
- [ ] 2.3 `shared/ui/query-dialog.ts`: sincroniza una modal con un parámetro de la dirección (abrir al llegar, cerrar quita el parámetro, `Location.back()` si se empujó, `closeOnNavigation: false`); verificar con `RouterTestingHarness` + `provideLocationMocks()` + `router.initialNavigation()` «Abrir la ficha», «Cerrar» y «Registro inexistente»

## 3. Almacén de flota
- [ ] 3.1 `features/fleet/fleet.store.ts` (no `providedIn: 'root'`): carga perezosa con `FullListState` de tipos, vehículos, conductores y lugares, mapas por id, vistas derivadas con `computed` e `invalidate(kind?)`; verificar que dos pestañas seguidas no repiten las cargas
- [ ] 3.2 `fleet.routes.ts`: ruta padre sin componente con `providers: [FleetStore]`; verificar que `/flota` sigue redirigiendo a `vehiculos`, que los `canDeactivate` siguen activos y que las pruebas de rutas pasan
- [ ] 3.3 Los formularios y el borrado llaman a `invalidate()`; verificar que un vehículo recién creado aparece en el resumen sin recargar

## 4. Chips, columnas y asignación
- [ ] 4.1 Vehículos: columnas depósito, turno y estado, y chips «Con conductor», «Sin conductor», «Inactivos»; verificar «Chips de vehículos» y «Columnas de relación», incluido «Depósito que ya no existe»
- [ ] 4.2 Conductores: columna «Vehículo» y chips «Activos», «Inactivos», «Sin vehículo»; verificar «Chips de conductores»
- [ ] 4.3 Tipos: columna «Vehículos que lo usan» y chips por categoría y «Sin capacidad»; verificar «Chips de tipos» y «Tipo en uso»
- [ ] 4.4 `resources/assign-driver-dialog.component.ts`: «Conduce: <vehículo>», inactivos deshabilitados, aviso al elegir uno ocupado y texto de rechazo del gateway; verificar los tres escenarios de «Disponibilidad al asignar conductor»

- [ ] 4.5 Cupos del plan en el resumen y en el listado de conductores («12 de 50 conductores») a partir de `tenant.config` y `seats`, con aviso al acercarse al límite; verificar con un tenant de prueba al 90 % del cupo y con el dato ausente (no se muestra nada)

## 5. Resumen de la flota
- [ ] 5.1 Ruta `/flota/resumen`, pestaña «Resumen» (primera) y entrada de búsqueda «Resumen de flota» en `layout/nav-items.ts`; verificar la guarda de rol, que `nav-items.spec`, `nav-rail.spec` y `global-search.spec` se actualizan y que `/flota` sigue yendo a vehículos
- [ ] 5.2 `overview/fleet-figures.component.ts`: cifras enlazadas a los listados ya filtrados, flota vacía con el siguiente paso y fallo parcial con «Reintentar»; verificar los escenarios de «Resumen de la flota»
- [ ] 5.3 `overview/fleet-readiness.component.ts`: comprobaciones requeridas y recomendadas con su consecuencia y enlace; verificar «Requeridas», «Recomendadas» y «Todo listo»
- [ ] 5.4 `overview/fleet-attention.component.ts`: grupos con los diez primeros y «Ver todos»; verificar «Grupos» y «Nada que revisar»
- [ ] 5.5 Hojas de estilo por debajo de 2 kB y bundle inicial sin crecer; verificar con `npm --prefix ng-ruteando run build` sin avisos

## 6. Fichas y vínculos
- [ ] 6.1 `detail/fleet-facts.component.ts` (rejilla etiqueta–valor) y cabecera con tono por `data-tone`; verificar que pinta HTML de un nombre como texto
- [ ] 6.2 `VehicleDetailDialog` (`?vehiculo=<id>`), `DriverDetailDialog` (`?conductor=<id>`) y `TypeDetailDialog` (`?tipo=<id>`) cargadas con `import()`; verificar los escenarios de «Fichas con el detalle completo»
- [ ] 6.3 Ojo siempre visible en cada fila y tarjeta de los tres listados (`title`), apertura por la dirección y cierre sin entrada de historial de más; verificar «Abrir la ficha», «Cerrar» y «Registro inexistente»
- [ ] 6.4 «Ver historial» en las fichas de vehículo (`/auditoria?entidad=resource&id=`) y conductor (`entidad=user`), solo para quien accede a Auditoría; verificar los escenarios de «Enlace al historial de auditoría»

## 7. Lote B — Zonas permitidas (después de 0.1)
- [ ] 7.1 Selector múltiple de `ZonesApi.list()` en el formulario de vehículo («Zona eliminada», sin zonas con enlace a `/zonas/nueva`) con la semántica confirmada, y «Todas las zonas» en la ficha; verificar los cuatro escenarios de «Restricciones de zona de un vehículo»
- [ ] 7.2 Tipos de paquete permitidos solo si la fase 0 confirma el dominio de valores; si no, `allowedPackageTypes` queda solo en reenvío

## 8. Lote B — Seguimiento (después de 0.5 y de decidir si se construye ahora)
- [ ] 8.1 `core/api/models/position.ts` y `core/api/data/positions.api.ts` (`list`, `last`) tolerante al 202 y al cuerpo vacío; verificar contra `get__positions__driverId.json` y `get__positions.json` con `expectSameContract`
- [ ] 8.2 Servicio `PageVisibility` (seguro en SSR) y `tracking/positions-poller.ts` (30 s, pausa con la pestaña oculta, reanuda con petición inmediata, conserva lo último ante un fallo); verificar con reloj simulado «Sondeo», «Pestaña oculta», «Fallo de red» y «Actualizar a mano»
- [ ] 8.3 `tracking/drivers-map.component.ts` sobre `shared/map/` con marcadores por conductor, atenuado a los 15 min y tabla alternativa que enfoca el marcador; verificar «Con posiciones», «Sin posiciones», «Alternativa en texto» y «Posición antigua»
- [ ] 8.4 Ruta `/flota/mapa`, pestaña «Mapa» y entrada de búsqueda «Mapa de flota»; verificar la guarda de rol y que las 5 pestañas no desbordan a 320 px
- [ ] 8.5 Línea «Visto hace 3 min» con enlace al mapa en la ficha del vehículo y zona horaria de `date` según la fase 0; verificar «Con posición», «Sin posición» y que nunca se muestra una hora futura

## 9. Calidad y cierre
- [ ] 9.1 `test:ci`, `build` y `test:server` en verde y bundle inicial sin crecer; `validate --specs --strict` y `validate enhance-fleet-experience --strict`
- [ ] 9.2 Banco visual: resumen, listados, fichas y mapa en 8 anchos (320 a 1536 px), claro y oscuro y al 200 % de texto, sin desbordes; accesibilidad (foco de cada modal, nombres de ojos y casillas, tabla alternativa del mapa)
- [ ] 9.3 Seguridad: nombres, matrículas y correos con HTML se pintan como texto; ningún dato del gateway en la dirección salvo ids
- [ ] 9.4 Actualizar `CLAUDE.md`, `references/gateway-api.md` (sección Flota) y el spec vigente; sin commit, PR, fusión ni tag hasta que se pidan; archivar al cerrar
