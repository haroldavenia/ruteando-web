# Tasks

Todas las rutas son relativas a `ng-ruteando/src/app/` salvo que se diga otra cosa. Cada fichero nuevo lleva su `*.spec.ts` al lado; la comprobación de cada tarea se hace con `npm --prefix ng-ruteando run test:ci` (o la prueba nombrada) salvo que diga otra cosa. Los datos de prueba salen de los fixtures reales (`get__resource-types.json`, `get__resources.json`, `get__users__drivers.json`); los que el gateway nunca devolvió (capacidad con valores) salen de `src/testing/fleet.ts`, marcados como hipótesis. El plan de la segunda fase está en `enhance-fleet-experience`.

## 1. Preparación
- [x] 1.1 Crear la rama `feat/complete-fleet-module` desde `main` actualizada y comprobar `git config user.name` (debe ser `HectorCorredor9`); verificar con `git status` limpio y la rama activa
- [x] 1.2 Anotar la línea base: `npm --prefix ng-ruteando run test:ci` (1948 correctas, 3 omitidas) y `npm --prefix ng-ruteando run build` (bundle inicial 492,8 kB, sin avisos); verificar que las cifras coinciden antes de tocar nada
- [ ] 1.3 Capturar en Chrome las pantallas actuales de flota (tipos, vehículos y conductores, listado y formulario) en claro y oscuro como referencia «antes»; verificar que las capturas existen en el banco visual

## 2. Gateway simulado con estado (fuera del repo)
- [x] 2.1 Ampliar `qa-visual/mock-gateway.mjs` con un CRUD en memoria de `/resource-types`, `/resources` (con asignar y retirar conductor), `/users` y `/users/drivers`, con la forma de los fixtures; tipos con capacidad en modo volumen y en modo medidas, y sin capacidad; vehículos con y sin conductor; unos 30 conductores (algunos inactivos, algunos con documento); verificar con `curl` crear, editar, borrar y listar
- [x] 2.2 409 al borrar un tipo con vehículos y un conductor asignado, y 409 por correo duplicado; registro del cuerpo completo de las peticiones de flota en `GET /__requests`; verificar con `curl` los tres 409 y que el registro enseña los cuerpos
- [x] 2.3 Reiniciar el gateway simulado y comprobar que la app en `:4200` lo usa; verificar en Chrome que `/flota/tipos` y `/flota/conductores` listan los datos nuevos

## 3. Lógica pura
- [x] 3.1 `features/fleet/resource-types/capacity-codec.ts`: constante de unidad (kg, cm³, cm), `decode(type) → CapacityValues`, `encode(values, current)` y `mergeOpaque` (D2, D3, D4); verificar que ida y vuelta conserva los valores, que las claves desconocidas sobreviven, que vaciar un campo quita solo su clave, que un objeto sin claves se envía como `null` y que el modo medidas se deduce
- [x] 3.2 `features/fleet/resource-types/capacity-rules.ts`: capacidad incompleta, medidas con alguna a 0 y las tres reglas cruzadas (mín ≤ máx, máx peso ≤ peso, máx volumen ≤ volumen) con sus mensajes en español; verificar un caso por regla y por combinación límite (igualdad permitida)
- [x] 3.3 `features/fleet/fleet-labels.ts`: `IDENTIFIER_LABELS` e `identifierLabel` (clave desconocida tal cual), `capacitySummary(type)` («500 kg · 12 m³» y «Sin capacidad»; tolerante a claves que no entiende) y `identifierText(user)`; verificar un caso por cada clave de `IdentifierType`, una desconocida y los estados de capacidad
- [x] 3.4 `features/fleet/fleet-export.ts`: `typesToCsv`, `vehiclesToCsv`, `driversToCsv` sobre `shared/data/csv.ts`, y `csvFileName(entidad, fecha)`; verificar columnas, nombre con fecha y protección de fórmulas (`=`, `+`, `-`, `@`)
- [x] 3.5 `shared/data/bulk-run.ts`: operación sobre N registros con concurrencia 4, sin detenerse ante un fallo, con `{ done, failed[] }`; verificar con 10 registros y 3 fallos, con concurrencia máxima 4 observada y con lista vacía
- [x] 3.6 `src/testing/fleet.ts`: constructores `resourceType`, `resource` y `driver` con un comentario «hipótesis, no capturado del gateway» en los campos que lo son; verificar que, en los campos reales, pasan `expectSameContract` contra los fixtures

## 4. Tipos de vehículo
- [x] 4.1 `resource-types/resource-type-form.component.ts`: secciones «Capacidad» (peso en kg, selector «En volumen» / «En medidas», volumen en cm³ o ancho, alto y profundidad en cm con el volumen calculado y de solo lectura) y «Restricciones de carga» (mínimo y máximo de peso y de volumen), con los errores de `capacity-rules`; verificar los escenarios «Capacidad en volumen», «Capacidad en medidas», «Capacidad incompleta» y «Restricciones coherentes»
- [x] 4.2 Guardado con `encode`/`mergeOpaque`: en el alta solo se envían `capacity`, `measure` y `restriction` si la persona los rellenó; al editar se parte del registro cargado; verificar con `HttpTestingController` el cuerpo del `POST` y del `PUT` (con una clave desconocida que sobrevive) y el escenario «Estructuras sin contrato»
- [x] 4.3 `resource-types/resource-type-list.component.ts`: columna «Capacidad» con `capacitySummary`; verificar «Listado», incluido «Sin capacidad»
- [x] 4.4 Destino de vuelta del formulario de tipo (`?volver=`) y borrador en el estado de la navegación (`type-handoff.ts`): valida con `safeReturnUrl` y el prefijo `/flota/`, se usa al guardar y al cancelar y devuelve el borrador y el tipo creado; verificar «Volver tras crear», «Lo escrito se conserva», «Cancelar» y «Destino no seguro» (con `//host`, `/otra-ruta` y un esquema)
- [x] 4.5 Hojas de estilo del formulario de tipo y del listado de vehículos por debajo de 2 kB (204 y 1701 bytes); verificar con `npx sass --style=compressed --no-source-map <archivo> | wc -c` y el build sin avisos

## 5. Vehículos
- [x] 5.1 `resources/resource-form.component.*`: botón «Crear tipo» debajo del selector que navega a `/flota/tipos/nuevo?volver=…` con el borrador, sin preguntar por cambios sin guardar, y que al volver lo restaura y deja elegido el tipo creado; verificar «Botón de añadir tipo» y «Lo escrito se conserva»
- [x] 5.2 Al editar, reenviar `allowedPackageTypes` y `allowedZoneIds` del registro cargado; verificar con `HttpTestingController` que el cuerpo del `PUT` los incluye y que el del `POST` no («Vehículo con restricciones»)

## 6. Conductores
- [x] 6.1 `drivers/driver-form.component.ts`: tipo de documento (`IdentifierType` desde `MasterDomainsService`, etiquetado) y valor, error si falta uno de los dos, y «Repetir contraseña» al crear con su error; verificar «Documento de identidad», «Documento incompleto», «Contraseñas distintas» y «Alta de conductor»
- [x] 6.2 Reenviar `identifierType` e `identifierValue` al editar (los del registro si no se tocaron); verificar «Conductor con documento» con el cuerpo del `PUT`
- [x] 6.3 `drivers/driver-list.component.ts`: columna «Documento» con `identifierText` y estado visible; verificar «Listado» de conductores

## 7. Listados completos, selección, lote y CSV
- [x] 7.1 Tipos y conductores pasan a `FullListState` (conductores con `ClientPaging.fetch`, que cachea el arreglo entre páginas); verificar «Búsqueda sobre todo» (130 conductores, `GET /users/drivers` una sola vez) y «Más de 1000 registros»
- [x] 7.2 Selección en los tres listados (`selectable`, `#selectionActions` con «Eliminar» y «Exportar CSV»); verificar con una prueba por listado que la barra aparece al seleccionar y se limpia al eliminar
- [x] 7.3 Borrado en lote con `bulk-run` y una sola confirmación (`ConfirmDialogComponent`), con el informe «Se eliminaron 3 de 4» y el motivo por registro rechazado; verificar «Eliminar varios», «Alguno no se puede eliminar» y «Cancelar» en un listado y que los otros dos usan el mismo flujo
- [x] 7.4 «Exportar CSV» en los tres listados (lo filtrado o lo seleccionado) con `downloadCsv`; verificar «Exportar lo filtrado», «Exportar la selección» y «Protección de fórmulas»
- [x] 7.5 Todo botón de solo icono nuevo lleva `title` (`ActionTitleDirective`); verificar con `iconButtonsWithoutTitle` y el barrido `titulos` del banco visual

## 8. Calidad
- [x] 8.1 `npm --prefix ng-ruteando run test:ci`, `npm --prefix ng-ruteando run build` y `npm run test:server` en verde; verificar las cifras frente a la línea base (1.2) y que el bundle inicial no crece
- [x] 8.2 `npx --yes @fission-ai/openspec@1.14.3 validate --specs --strict` y `validate complete-fleet-module --strict`; verificar que ambos pasan
- [x] 8.3 Banco visual (`qa-visual/qa.mjs`): los tres listados y los tres formularios en 8 anchos (320 a 1536 px), claro y oscuro, y al 200 % de texto, sin desbordes; verificar los resultados
- [x] 8.4 Accesibilidad y seguridad: nombres accesibles de casillas y botones, errores de campo anunciados, nombres, matrículas y correos con HTML pintados como texto (pruebas que fallan si se usa `[innerHTML]`) y CSV con protección de fórmulas; verificar con las pruebas
- [ ] 8.5 Prueba manual en Chrome con administrador y con agente (sin acceso a `/flota`) contra el gateway simulado: crear un tipo en modo volumen y otro en medidas, crearlo desde el formulario de vehículo y volver, crear un conductor con documento, seleccionar y borrar varios (con un 409) y exportar; verificar y revisar `GET /__requests` con los cuerpos enviados. **Hecho con el administrador en Chrome (2026-11-01)**: listados de los tres, selección en tarjetas y tabla, borrado en lote con un 409 («Se eliminaron 1 de 2 tipos»), tipo con capacidad creado desde el formulario de vehículo y vuelta con el borrador, validación de restricciones y el cuerpo enviado (con la hipótesis anterior de gramos se envió `capacity {weight: 100000, volume: 5000}`; ya corregida a kg). **Pendiente**: probar con un agente (sin acceso a `/flota`) y descargar de verdad un CSV desde el navegador (las pruebas lo cubren)

## 9. Fase 0 — Comprobar el gateway real (abiertas a propósito)
Necesita el gateway activo (hoy responde 530) y una sesión de administrador iniciada por la persona; desde aquí no se introducen contraseñas. Todo lo que se cree se borra al terminar.
- [ ] 9.1 **Capacidad**: crear un tipo temporal con `capacity`, `measure` y `restriction` según `capacity-codec`; anotar si responde 200 o 400, qué claves devuelve y cuáles ignora; verificar que lo anotado confirma o corrige el codec
- [ ] 9.2 **Unidades**: con un tipo de capacidad 100 de peso y un paquete de peso 10, planificar una jornada de prueba y leer `weightUsagePercent` (10 % si las unidades coinciden); verificar y borrar lo creado
- [ ] 9.3 **Sustitución en `PUT`**: editar un vehículo con `allowedZoneIds` y un usuario con `identifierType`, omitiendo esos campos, y releer; verificar si se borran para confirmar D5
- [ ] 9.4 **Borrados en uso y duplicados**: estado y mensaje al borrar un tipo con vehículos y un conductor asignado, y al crear un correo duplicado; verificar si coinciden con los 400 y 409 que mapean las pantallas
- [ ] 9.5 **Conductores**: valores aceptados de `identifierType` y política de contraseña de `POST /users`; verificar si el mínimo de 8 caracteres del formulario es correcto

- [ ] 9.6 **Límites del plan**: la configuración del tenant trae `maxDrivers`, `maxDefaultResources`, `maxDeposits` y `maxAdmins`, y `GET /tenants/me` trae `seats { limit, available, used }`; crear un conductor por encima del cupo, ¿qué estado y mensaje devuelve? Verificar y, si es un 4xx propio, darle texto en español en el formulario de conductor

## 10. Cierre
- [x] 10.1 Actualizar `CLAUDE.md` (párrafo de Flota) y `.claude/skills/angular-ruteando/references/gateway-api.md` (sección Flota: lo implementado, las unidades hipotéticas y lo pendiente de la fase 0); verificar que lo escrito coincide con lo implementado
- [ ] 10.2 Sin push, PR, fusión ni tag hasta que la persona lo pida; tras fusionar, tag `vX.Y.0` sobre el commit de fusión y actualización de la hoja de seguimiento
- [ ] 10.3 Archivar el change (`/opsx:archive`) cuando la fase 0 esté cerrada o se descarte explícitamente
