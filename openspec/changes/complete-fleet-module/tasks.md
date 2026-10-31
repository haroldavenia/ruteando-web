# Tasks

Todas las rutas son relativas a `ng-ruteando/src/app/` salvo que se diga otra cosa. Cada fichero nuevo lleva su `*.spec.ts` al lado; la comprobación de cada tarea se hace con `npm --prefix ng-ruteando run test:ci` (o la prueba nombrada) salvo que diga otra cosa. Los datos de prueba salen de los fixtures reales; los que el gateway nunca devolvió (capacidad, posiciones con datos, zonas permitidas) salen de `src/testing/fleet.ts`, marcados como hipótesis.

**Orden de entrega**: secciones 1 a 9 = **lote A** (sin contratos nuevos, primer PR). Sección 2 = **fase 0** (necesita el gateway real; condiciona las secciones 10 y 11). Secciones 10 y 11 = **lote B** (segundo PR, después de cerrar los puntos de la fase 0 que cada tarea nombra). Secciones 12 y 13 cierran cada lote.

## 1. Preparación
- [x] 1.1 Crear la rama `feat/complete-fleet-module` desde `main` actualizada y comprobar `git config user.name` (debe ser `HectorCorredor9`); verificar con `git status` limpio y la rama activa
- [ ] 1.2 Anotar la línea base: `npm --prefix ng-ruteando run test:ci` (1948 correctas, 3 omitidas) y `npm --prefix ng-ruteando run build` (bundle inicial 492,8 kB, sin avisos); verificar que las cifras coinciden antes de tocar nada
- [ ] 1.3 Capturar en Chrome las tres pantallas actuales (listado y formulario de tipos, vehículos y conductores) en claro y oscuro a 1366 y 390 px como referencia «antes»; verificar que las capturas existen en el banco visual
- [ ] 1.4 Ampliar el gateway simulado `qa-visual/mock-gateway.mjs` (fuera del repo): tipos con y sin capacidad, vehículos con y sin conductor, con zonas permitidas, inactivos y con un depósito inexistente, 130 conductores (algunos inactivos, uno con documento), borrados en uso (409), duplicados (409) y `GET /positions` con 4 conductores (uno con señal de hace 40 min); verificar con `curl` a cada camino

## 2. Fase 0 — Comprobar el gateway real (condiciona el lote B)
Necesita el gateway activo (hoy responde 530) y una sesión de administrador **iniciada por la persona** en el navegador; desde aquí no se introducen contraseñas. Todo lo que se cree se borra al terminar. Cada resultado se anota en `.claude/skills/angular-ruteando/references/gateway-api.md` (sección Flota).
- [ ] 2.1 Sondear `GET /master-domains` con la clave del servidor y confirmar que ya no devuelve 530; verificar el estado HTTP y anotar la fecha
- [ ] 2.2 **Capacidad**: crear un tipo temporal enviando `capacity { weight, volume }`, `measure { height, width, depth }` y `restriction { minWeight, minVolume, maxWeight, maxVolume }`; anotar si responde 200 o 400, qué claves devuelve y cuáles ignora; si rechaza, probar variantes; verificar que lo anotado fija las claves de `capacity-codec.ts`
- [ ] 2.3 **Unidades**: con un tipo de capacidad 100 de peso y 1 de volumen, un vehículo de ese tipo y un paquete de peso 10 y volumen 0,1, planificar una jornada de prueba y leer `weightUsagePercent` y `volumeUsagePercent` de la ruta (deben dar 10 % si el gateway usa las mismas unidades en tipos y paquetes); verificar y borrar la jornada, el paquete, el vehículo y el tipo
- [ ] 2.4 **Consumo**: con `gasMileage` conocido, leer `fuelCost` de una ruta y deducir la unidad (km/l, l/100 km...); verificar que la etiqueta del campo queda con su unidad
- [ ] 2.5 **Sustitución en `PUT`**: crear un vehículo con `allowedZoneIds` y `allowedPackageTypes`, editarlo omitiendo esos campos y releer; repetir con un usuario (`identifierType`, `identifierValue`) y con un tipo; verificar si se borran, para confirmar D4
- [ ] 2.6 **Valores permitidos**: qué valores acepta `allowedPackageTypes`, si `allowedZoneIds` vacío significa «sin restricción» y si admite `null`; verificar con una captura de cada respuesta
- [ ] 2.7 **Activar y desactivar**: si `PUT` acepta `active` en vehículos, tipos y usuarios, qué hace `default` y cuál es el endpoint de `user.activate` / `user.deactivate`; verificar con una captura o anotar «no hay forma de escribirlo»
- [ ] 2.8 **Borrados en uso y duplicados**: estado y mensaje al borrar un tipo con vehículos, un conductor asignado, un vehículo asignado a una ruta y un lugar usado como depósito; y al crear una matrícula y un correo duplicados; verificar si coinciden con los 400 y 409 que mapean las pantallas
- [ ] 2.9 **Asignación**: qué responde asignar un conductor que ya conduce otro vehículo y uno inactivo (¿lo mueve?, ¿409?); verificar y ajustar el texto de aviso de D5/7.7
- [ ] 2.10 **Permisos**: qué responden a un agente `GET /resources`, `/resource-types`, `/users/drivers` y `/positions`; verificar para responder la pregunta abierta 2
- [ ] 2.11 **Posiciones**: significado del 202, forma de `GET /positions` con datos, zona horaria de `date` y si `userId` es el id del conductor; si no hay posiciones, dejar el punto como pendiente declarado
- [ ] 2.12 **Conductores**: política de contraseña de `POST /users` (probar 8 y 16 caracteres) y valores aceptados de `identifierType`; verificar si el mínimo de 8 caracteres del formulario es correcto
- [ ] 2.13 **Auditoría de tipos**: crear y editar un tipo y comprobar en `/auditoria` con qué `entityType` aparece (o si no aparece); verificar para habilitar o no «Ver historial» en la ficha de tipo
- [ ] 2.14 Resumir los resultados en `design.md` (D3, D4, D9) y marcar cada hipótesis como «verificada» o «corregida»; verificar con `openspec validate complete-fleet-module --strict`

## 3. Herramientas de prueba
- [ ] 3.1 `src/testing/fleet.ts`: constructores `resourceType`, `resource`, `driver`, `fleetPosition` con valores por defecto sensatos y un comentario «hipótesis, no capturado del gateway» en los campos que lo son; verificar con una prueba que los constructores producen objetos que pasan `expectSameContract` contra los fixtures reales en los campos reales

## 4. Lógica pura (lote A)
- [ ] 4.1 `features/fleet/fleet-labels.ts`: `IDENTIFIER_LABELS` e `identifierLabel` (clave desconocida tal cual), `hasCapacity(type)` (capacidad no nula y con claves; en el lote A el listado muestra «Definida» o «Sin capacidad» sin interpretar claves) y `isInactive`; verificar un caso por cada clave de `IdentifierType`, una desconocida y los tres estados de capacidad
- [ ] 4.2 `features/fleet/fleet-relations.ts`: `driverOf`, `vehicleOf`, `vehiclesOfType`, `depotName` (o «Depósito no disponible»), `shiftRange` («08:00–16:00» en hora local con `shift-time`, y qué pasa si el turno cruza la medianoche); verificar con vehículos con y sin conductor, depósito inexistente, conductor eliminado y turno de más de 24 h
- [ ] 4.3 `features/fleet/fleet-readiness.ts`: `fleetReadiness` (requeridas: depósito, tipo, vehículo; recomendadas: capacidad en tipos en uso, conductor en vehículos activos) y `fleetAttention` (grupos y sus primeros diez); verificar los escenarios de «Preparación para planificar» y «Elementos que requieren atención», incluida la flota vacía
- [ ] 4.4 `features/fleet/fleet-export.ts`: `vehiclesToCsv`, `driversToCsv`, `typesToCsv` sobre `shared/data/csv.ts`; verificar columnas, nombre de archivo con fecha y protección de fórmulas (`=`, `+`, `-`, `@`)
- [ ] 4.5 `shared/data/bulk-run.ts`: operación sobre N registros con concurrencia 4, sin detenerse ante un fallo, con `{ done, failed[] }`; verificar con 10 registros y 3 fallos, con concurrencia máxima 4 observada y con lista vacía
- [ ] 4.6 `shared/ui/query-dialog.ts`: sincroniza una modal con un parámetro de la dirección (abrir al llegar, cerrar quita el parámetro, `Location.back()` si se empujó al abrir, `closeOnNavigation: false`); verificar con `RouterTestingHarness` + `provideLocationMocks()` + `router.initialNavigation()` los escenarios «Abrir la ficha», «Cerrar» y «Registro inexistente»
- [ ] 4.7 Comprobar que `ClientPaging.fetch` funciona con `FullListState` (130 conductores = dos páginas de 100 sin repetir `GET /users/drivers`); verificar con una prueba en `shared/data/`

## 5. Almacén de flota
- [ ] 5.1 `features/fleet/fleet.store.ts` (no `providedIn: 'root'`): carga perezosa y con `FullListState` de tipos, vehículos, conductores y lugares, mapas por id, vistas derivadas con `computed` y `invalidate(kind?)`; verificar que dos pestañas seguidas no repiten las cargas y que `invalidate` recarga solo lo pedido
- [ ] 5.2 `fleet.routes.ts`: ruta padre sin componente con `providers: [FleetStore]` y los hijos actuales; verificar que `/flota` sigue redirigiendo a `vehiculos`, que los tres `canDeactivate` siguen activos y que las pruebas de rutas pasan
- [ ] 5.3 Los formularios y el borrado llaman a `invalidate()` tras guardar o eliminar; verificar que un vehículo recién creado aparece en el resumen sin recargar la página

## 6. Conservar datos y conductores
- [ ] 6.1 `resources/resource-form.component.ts`: al editar, reenviar `allowedPackageTypes` y `allowedZoneIds` del registro cargado; verificar con `HttpTestingController` que el cuerpo del `PUT` los incluye y que el `POST` no
- [ ] 6.2 `drivers/driver-form.component.ts`: tipo de documento (`IdentifierType` desde `MasterDomainsService`, etiquetado) y valor, error si falta uno de los dos, y reenvío de `identifierType` / `identifierValue` al editar; verificar los escenarios «Documento de identidad», «Documento incompleto» y «Conductor con documento»
- [ ] 6.3 `resource-types/resource-type-form.component.ts`: prueba de que el `PUT` incluye `capacity`, `measure` y `restriction` completas con una clave desconocida; verificar el escenario «Tipo con estructuras»
- [ ] 6.4 Mostrar `active` en el modelo de vista de conductores y vehículos (etiqueta «Inactivo» con `StatusBadgeComponent`); verificar que `statusTone` da neutro para inactivo y que ninguna pantalla promete activar o desactivar

## 7. Listados
- [ ] 7.1 Tipos y conductores pasan a `FullListState` (conductores con `ClientPaging.fetch`); verificar «Búsqueda sobre todo» (130 conductores) y «Más de 1000 registros»
- [ ] 7.2 Vehículos: columnas depósito, turno y estado (la tarjeta lo conserva todo), y chips «Con conductor», «Sin conductor», «Inactivos» con recuento; verificar los escenarios de «Columnas de relación» y «Chips de vehículos», incluido «Depósito que ya no existe»
- [ ] 7.3 Conductores: columna «Vehículo», estado, tarjeta con avatar de iniciales, y chips «Activos», «Inactivos», «Sin vehículo»; verificar «Chips de conductores» y «Listado» de conductores
- [ ] 7.4 Tipos: columnas «Capacidad» (definida o sin ella) y «Vehículos que lo usan», y chips por categoría y «Sin capacidad»; verificar «Tipo en uso» y «Chips de tipos»
- [ ] 7.5 Selección y borrado en lote en los tres listados con `bulk-run` y una sola confirmación, con el informe «Se eliminaron 3 de 4» y los motivos por registro; verificar los tres escenarios de «Selección y borrado en lote» (incluido que cancelar no envía nada)
- [ ] 7.6 «Exportar CSV» en los tres listados (lo filtrado o lo seleccionado); verificar «Exportar lo filtrado» y «Protección de fórmulas»
- [ ] 7.7 `resources/assign-driver-dialog.component.ts`: «Conduce: <vehículo>» en quien ya conduce otro, conductores inactivos deshabilitados, aviso al elegir uno ocupado y texto de rechazo del gateway; verificar los tres escenarios de «Disponibilidad al asignar conductor»
- [ ] 7.8 Todo botón de solo icono nuevo lleva `title` (`ActionTitleDirective`); verificar con `iconButtonsWithoutTitle` y el barrido `titulos` del banco visual

## 8. Resumen de la flota
- [ ] 8.1 Ruta `/flota/resumen` (diferida, bajo la ruta padre), pestaña «Resumen» como primera de `FleetTabsComponent` y entrada de búsqueda «Resumen de flota» en `layout/nav-items.ts`; verificar la guarda de rol (agente y conductor a `/sin-permiso`), que `nav-items.spec`, `nav-rail.spec` y `global-search.spec` se actualizan y que `/flota` sigue yendo a vehículos
- [ ] 8.2 `features/fleet/overview/fleet-figures.component.ts`: cifras enlazadas a los listados ya filtrados (`?filtro=`), flota vacía con el siguiente paso y fallo parcial con «Reintentar»; verificar los cuatro escenarios de «Resumen de la flota»
- [ ] 8.3 `features/fleet/overview/fleet-readiness.component.ts`: lista de comprobaciones requeridas y recomendadas con su consecuencia y enlace; verificar «Requeridas», «Recomendadas» y «Todo listo»
- [ ] 8.4 `features/fleet/overview/fleet-attention.component.ts`: grupos con los diez primeros y «Ver todos»; verificar «Grupos» y «Nada que revisar»
- [ ] 8.5 Hojas de estilo de cada componente por debajo de 2 kB (`npx sass --style=compressed --no-source-map <archivo> | wc -c`) y bundle inicial sin crecer; verificar con `npm --prefix ng-ruteando run build` sin avisos

## 9. Fichas y vínculos
- [ ] 9.1 `features/fleet/detail/fleet-facts.component.ts` (rejilla etiqueta–valor) y cabecera propia con tono por `data-tone`; verificar con una prueba que pinta HTML de un nombre como texto
- [ ] 9.2 `VehicleDetailDialog` (`?vehiculo=<id>`): identificación, tipo con su capacidad, depósito enlazado a `/lugares/:id`, turno en hora local, conductor, estado y fechas, con acciones editar, asignar o retirar conductor y ver historial; verificar «Ficha de vehículo» y que la modal se carga con `import()`
- [ ] 9.3 `DriverDetailDialog` (`?conductor=<id>`): nombre, correo, teléfono, documento, estado, último acceso, vehículo y las acciones editar y enviar restablecimiento; verificar «Ficha de conductor»
- [ ] 9.4 `TypeDetailDialog` (`?tipo=<id>`): capacidad, medidas, restricciones, consumo y vehículos que lo usan; verificar «Ficha de tipo»
- [ ] 9.5 Ojo siempre visible en cada fila y tarjeta de los tres listados (`title`), apertura por la dirección y cierre sin entrada de historial de más; verificar «Abrir la ficha», «Cerrar» y «Registro inexistente»
- [ ] 9.6 «Ver historial» en las fichas de vehículo (`/auditoria?entidad=resource&id=`) y conductor (`entidad=user`), visible solo para quien accede a Auditoría; verificar los tres escenarios de «Enlace al historial de auditoría» y que el filtro de `/auditoria` reconoce los parámetros
- [ ] 9.7 Cada hoja de estilo de la modal por debajo de 2 kB y la modal fuera del bundle inicial; verificar con el build

## 10. Lote B — Tipos completos y zonas (después de 2.2 a 2.7)
- [ ] 10.1 `resource-types/capacity-codec.ts`: `decode` / `encode` con las claves y unidades confirmadas en 2.2 y 2.3, y `mergeOpaque` (D2); verificar que un objeto con claves desconocidas las conserva, que vaciar un campo quita solo su clave y que un objeto sin claves se envía como `null`
- [ ] 10.2 `resource-types/capacity-rules.ts`: validaciones mín ≤ máx ≤ capacidad y positivos, con mensajes en español; verificar el escenario «Restricciones coherentes» con cada combinación
- [ ] 10.3 Formulario de tipo: secciones «Capacidad» (por volumen o por medidas, con el volumen calculado y de solo lectura), «Restricciones de carga» y «Consumo» con su unidad (2.4), y la vista previa «Así quedará» (`.with-summary`); verificar los escenarios de capacidad, vista previa y unidad del consumo
- [ ] 10.4 `fleet-labels.ts`: `capacitySummary` («1 200 kg · 8 m³») usado en el listado y la ficha de tipos en lugar de «Definida»; verificar los dos estados
- [ ] 10.5 Zonas permitidas en el formulario de vehículo (selector múltiple de `ZonesApi.list()`, «Zona eliminada», sin zonas y enlace a `/zonas/nueva`) con la semántica confirmada en 2.5 y 2.6, y en la ficha («Todas las zonas»); verificar los cuatro escenarios de «Restricciones de zona de un vehículo»
- [ ] 10.6 Tipos de paquete permitidos solo si 2.6 confirma el dominio de valores; si no, dejar `allowedPackageTypes` solo en reenvío y anotarlo como pendiente

## 11. Lote B — Seguimiento (después de 2.11 y de decidir la pregunta abierta 4)
- [ ] 11.1 `core/api/models/position.ts` y `core/api/data/positions.api.ts` (`list`, `last`) tolerante al 202 y al cuerpo vacío; verificar contra `get__positions__driverId.json` y `get__positions.json` con `expectSameContract`
- [ ] 11.2 Servicio `PageVisibility` (seguro en SSR) y `features/fleet/tracking/positions-poller.ts` (30 s, pausa con la pestaña oculta, reanuda con petición inmediata, conserva lo último ante un fallo); verificar con reloj simulado los escenarios «Sondeo», «Pestaña oculta», «Fallo de red» y «Actualizar a mano»
- [ ] 11.3 `features/fleet/tracking/drivers-map.component.ts` sobre `shared/map/` con marcadores por conductor (tokens y `map-palette`), atenuado a los 15 min y tabla alternativa que enfoca el marcador; verificar «Con posiciones», «Sin posiciones», «Alternativa en texto» y «Posición antigua»
- [ ] 11.4 Ruta `/flota/mapa`, pestaña «Mapa» y entrada de búsqueda «Mapa de flota»; verificar guarda de rol y que las pestañas (5) no desbordan a 320 px
- [ ] 11.5 Línea «Visto hace 3 min» con enlace al mapa centrado en el conductor en la ficha del vehículo; verificar «Con posición» y «Sin posición»
- [ ] 11.6 Zona horaria de `date` según 2.11; verificar que no se muestra nunca una hora futura

## 12. Calidad
- [ ] 12.1 `npm --prefix ng-ruteando run test:ci`, `npm --prefix ng-ruteando run build` y `npm run test:server` en verde; verificar las cifras frente a la línea base (1.2) y que el bundle inicial no crece
- [ ] 12.2 `npx --yes @fission-ai/openspec@1.14.3 validate --specs --strict` y `validate complete-fleet-module --strict`; verificar que ambos pasan
- [ ] 12.3 Banco visual (`qa-visual/qa.mjs`): resumen, listados, formularios y modales en 8 anchos (320 a 1536 px), claro y oscuro, y al 200 % de texto, sin desbordes; verificar que las pestañas caben o se desplazan a 320 px
- [ ] 12.4 Accesibilidad: foco al abrir y cerrar cada modal, nombres accesibles de ojos y casillas, tabla alternativa del mapa, recuentos anunciados; verificar con el barrido `titulos` y `iconButtonsWithoutTitle`
- [ ] 12.5 Seguridad: nombres, matrículas y correos con HTML se pintan como texto (pruebas que fallan si se usa `[innerHTML]`), CSV con protección de fórmulas y ningún dato del gateway en la dirección salvo ids; verificar las pruebas
- [ ] 12.6 Prueba manual en Chrome con administrador, agente (sin acceso a `/flota`) y superadministrador contra el gateway simulado; verificar flujos de crear, asignar, borrar en lote y exportar

## 13. Cierre
- [ ] 13.1 Actualizar `CLAUDE.md` (párrafo de Flota), `.claude/skills/angular-ruteando/references/gateway-api.md` (sección Flota: contratos confirmados, corregidos o pendientes) y el spec vigente `fleet-management`; verificar que lo escrito coincide con lo implementado
- [ ] 13.2 Dejar abiertas, con motivo, las tareas de la fase 0 que no se hayan podido ejecutar (gateway caído, sin posiciones) y declararlas como pendientes en el PR
- [ ] 13.3 Sin commit, sin PR, sin fusión y sin tag hasta que la persona lo pida; tras fusionar, tag `vX.Y.0` sobre el commit de fusión y actualización de la hoja de seguimiento
- [ ] 13.4 Archivar el change (`/opsx:archive`) cuando el lote B esté cerrado o se descarte explícitamente
