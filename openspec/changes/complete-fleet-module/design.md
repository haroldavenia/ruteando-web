## Context

Lo que hay hoy, observado en el código, en los fixtures reales (`ng-ruteando/src/testing/fixtures/gateway/`), en la colección Postman del gateway (capturas reales del 2026-10-11) y en la app AngularJS anterior (`ruteando-web-old`, tag `v1.0.0`, leída en sus fuentes `master/js/custom/{vehicle_types,vehicles,drivers}` y `master/jade/views/pages/**`).

### La flota actual (change archivado `add-fleet-management` + rediseño)
- Rutas `/flota/{tipos,vehiculos,conductores}` (+ `nuevo`, `:id`), `roleGuard(ADMIN_ROLES)` (`tenant_admin`, `super_admin`); `/flota` redirige a `vehiculos`. Menú: sección «Flota» con tres enlaces. Pestañas `FleetTabsComponent`.
- **Vehículos**: `FullListState` (todo en el cliente, hasta 1000), tabla + tarjetas, asignar y retirar conductor con diálogo. Formulario: nombre, matrícula, tipo, depósito, inicio y duración de turno, descanso, cantidad.
- **Tipos**: `ListState` (solo la página). Formulario: nombre, categoría, perfil de ruteo, consumo. `capacity`, `measure` y `restriction` se reenvían tal cual al editar.
- **Conductores**: `ListState` sobre `ClientPaging` (`GET /users/drivers` no pagina). Formulario: nombre, apellidos, correo, teléfono, contraseña inicial solo al crear.
- Los modelos `Resource`, `ResourceType` y `User` ya traen `active`, `default`, `allowedPackageTypes`, `allowedZoneIds`, `identifierType`, `identifierValue`, `lastLoginAt`; la pantalla no usa casi ninguno.
- No existe cliente para `positions`, `driver/*` ni `invitations`. Existe `AssignedServicesApi` sin pantalla.

### Lo que dice la API (colección Postman, mismo origen que los fixtures)
| Endpoint | Acceso | Papel en la flota | Estado |
|---|---|---|---|
| `GET/POST /resource-types`, `GET/PUT/DELETE /resource-types/{id}` | autenticado | Tipos | Hecho; `capacity`, `measure`, `restriction` siempre `null` en las capturas |
| `GET/POST /resources`, `GET/PUT/DELETE /resources/{id}` | autenticado | Vehículos | Hecho; faltan `active`, `default`, `allowed*` |
| `PUT /resources/{id}/driver/{driverId}`, `DELETE /resources/{id}/driver` | autenticado | Asignación | Hecho |
| `GET /users/drivers`, `GET/POST /users`, `PUT/DELETE /users/{id}`, `POST /users/{id}/reset-password` | `TENANT_ADMIN` o `SUPER_ADMIN` | Conductores | Hecho; faltan `identifier*`; `PUT` documentado solo con email, nombre, apellidos y rol |
| `GET /master-domains` → `OsrmProfile`, `IdentifierType` (`citizen_id`, `itin`, `plate`, `code`), `Role`, `ServiceType`... | autenticado | Selectores | `OsrmProfile` usado; **`IdentifierType` sin usar** |
| `GET /positions`, `GET /positions/{driverId}` | autenticado | Seguimiento | Sin cliente; el listado de las capturas es `[]` y devuelve **202** |
| `POST /driver/positions`, `GET /driver/{positions,routes,assignments}`, `PUT /driver/packages/report` | `DRIVER` | Aplicación del conductor | Fuera de alcance |
| `GET/POST/PUT/DELETE /assigned-services` (+ `/summary`, `?ids=`) | autenticado | — | Cliente sin pantalla; objetos anidados opacos |
| `/invitations` (+ `accept`, `resend`) | `TENANT_ADMIN` | Alta por correo | Fuera de alcance |
| `GET /zones?tenantId=` | autenticado | Zonas permitidas de un vehículo | Cliente existente |
| `GET /audit-logs*` | según ámbito | Historial | Módulo existente |

Hallazgos que condicionan el plan:
1. **La planificación consume lo que los tipos no pueden definir**: las rutas traen `weightUsed`, `volumeUsed`, `weightUsagePercent`, `volumeUsagePercent` y `fuelCost`. Con tipos sin capacidad ni consumo, esas cifras salen `null`.
2. **`IdentifierType` ya está documentado** como dominio maestro, aunque `gateway-api.md` dice «valores válidos sin documentar».
3. **Las acciones de auditoría incluyen `user.activate` y `user.deactivate`** (dominio `audit_actions`), pero ningún endpoint de la colección activa o desactiva a un usuario: **no se sabe cómo escribir `active`**. Lo mismo con `active` y `default` de vehículos y tipos.
4. **`POST /users` aceptó la contraseña `Admin123456`** (11 caracteres, sin símbolo) en la captura: no aplica la política de 16 caracteres del registro. Por eso el formulario de conductores conserva su mínimo de 8.
5. **Posiciones**: una sola captura con datos (`/positions/{driverId}`): `{ id, userId, driver: { id, userId, name }, address: { location: { x: lon, y: lat } }, date: "2026-10-11 14:14", assignedService }`. `date` no lleva zona horaria y `driver.id` no es el `userId`.
6. **Auditoría de la flota**: hay eventos `resource` (crear, actualizar, asignar y retirar conductor) y `user`; no hay ninguno para tipos de vehículo en las capturas, así que no se sabe con qué `entityType` se auditan (si se auditan).

### Paridad con la app AngularJS
| App anterior | App nueva hoy | Plan |
|---|---|---|
| Tipo: peso, volumen, modo «volumen» o «medidas» (alto × ancho × profundo; volumen = producto) | Falta | Lote B, fase 2 |
| Tipo: restricciones mínimas y máximas de peso y volumen, con validaciones cruzadas (mín ≤ máx ≤ capacidad) | Falta | Lote B, fase 2 |
| Tipo: la lista muestra peso en kg y volumen en m³ | Falta | Columna «Capacidad» |
| Vehículo: nombre, matrícula, tipo | Hecho, con más (depósito, turno, cantidad) | — |
| Vehículo: «crear tipo» desde el formulario y volver | Enlace a `/flota/tipos` | Se descarta: el enlace basta y el aviso de cambios sin guardar protege lo escrito |
| Conductor: número de licencia | **La API no tiene ese campo** | No se hace (se documenta) |
| Conductor: número de identificación | Falta | Lote A (`identifierType` + `identifierValue`) |
| Conductor: teléfono, activo | Teléfono hecho; estado visible | Estado en chips y ficha |
| Listados: seleccionar y eliminar varios | Falta | Lote A |
| Listados: exportar a PDF | Falta | CSV (no hay librería de PDF desde que se retiró `jspdf`) |
| Servicios asignados y su mapa | Nunca terminó en la app anterior (editar vacío, eliminar con `alert`) | Se descarta |

**Sobre levantar la app anterior**: no hace falta. Su backend (HanoitApi + MongoDB) no está en el repositorio ni resuelve (`hanoit:9000`), así que sin datos no se vería nada más que formularios vacíos, y su comportamiento está completo en las fuentes leídas. Si más adelante interesa ver sus pantallas, se levanta con `http-server` (`ruteando-web-old`, puerto 3001) y un gateway simulado propio.

### Restricciones del proyecto
Sin librerías nuevas; OnPush y signals; SSR seguro; CSP `script-src 'self'`; el bundle inicial no importa `core/api/data/*`; todo botón de solo icono lleva `title`; las tablas se apilan en pantallas estrechas; colores solo por tokens; hoja de estilos de cada componente por debajo de 2 kB y nunca en `styles.scss`; todo texto del gateway se pinta como texto; fixtures reales intactos.

## Goals / Non-Goals

**Goals:**
- Que quien administra la flota pueda definir todo lo que la planificación usa (capacidad, medidas, restricciones, consumo, zonas) y ver de un vistazo si la flota está lista.
- Que guardar desde la pantalla nunca borre datos que la pantalla no muestra.
- Paridad con lo que hacía la app anterior (salvo lo que la API no tiene) y uso de lo que la API ofrece y hoy se ignora.
- Que la lógica nueva (capacidad, validaciones, relaciones, comprobaciones de preparación, CSV, lote) sea **pura y se pruebe sin `TestBed`**.
- Separar con claridad lo construible hoy de lo que exige comprobar el gateway real.

**Non-Goals:**
- No se inventan contratos: lo no verificado se aísla en un único módulo (`capacity-codec.ts`) y se declara pendiente.
- No hay pantalla de `assigned-services` ni aplicación del conductor (`/driver/*`) ni alta por invitación.
- No se cambia el rol que ve la flota (administradores) ni se añaden permisos nuevos.
- No hay PDF, ni WebSocket, ni librería de gráficos o de mapas nueva.
- No se toca el módulo de Auditoría ni `package-bulk-status.ts` (ver D6 y D8).

## Decisions

### D1. Dos lotes por riesgo de contrato
**Decisión**: **Lote A** (conservar datos, conductores, listados completos, lote, CSV, asignación, resumen, fichas) usa solo contratos ya conocidos y se entrega primero. **Lote B** (tipos completos, zonas permitidas, seguimiento) se construye detrás de la **fase 0**, que comprueba el gateway real; no se habilita ninguna escritura nueva hacia el gateway hasta cerrar su punto de la fase 0.
**Por qué**: el gateway real está caído y los objetos `capacity`/`measure`/`restriction` jamás aparecieron con datos; escribir a ciegas puede guardar basura que la planificación luego interprete mal. El lote A ya da valor (y arregla la pérdida de datos) sin esa información.
**Entrega recomendada**: dos PR (A, luego B), según la preferencia de pocos PR.

### D2. Los objetos opacos se fusionan, no se reemplazan
**Decisión**: `capacity`, `measure` y `restriction` se editan con `mergeOpaque(current, edited)`: se parte del objeto que trajo el gateway, se sobrescriben solo las claves que la pantalla conoce y se conservan las demás; si la persona vacía un campo se elimina solo esa clave. Un objeto que queda sin claves se envía como `null`.
**Por qué**: el gateway puede añadir claves (o la app anterior las usaba: `capability`); reemplazar el objeto las perdería. Es el mismo criterio que `zoneId` en lugares.
**Alternativa**: construir el objeto entero desde el formulario (más simple, pierde claves desconocidas).

### D3. Una sola hipótesis, en un solo archivo
**Decisión**: `features/fleet/resource-types/capacity-codec.ts` concentra las claves y las unidades: `decode(type) → CapacityValues` y `encode(values, current) → { capacity, measure, restriction }`. Hipótesis de partida, tomada de la app AngularJS y de los fixtures de paquetes (`weight: 1`, `volume: 0.1`): `capacity = { weight, volume }` en kg y m³; `measure = { height, width, depth }`; `restriction = { minWeight, minVolume, maxWeight, maxVolume }`. La app anterior guardaba gramos y cm³, pero un volumen de paquete de 0,1 cm³ no tiene sentido, por lo que el gateway parece usar kg y m³ (hipótesis a comprobar).
**Por qué**: si la fase 0 contradice la hipótesis, el arreglo es un archivo y sus pruebas, no la pantalla. Las pruebas fijan la hipótesis con un comentario que dice que es una hipótesis.
**Qué se muestra**: kg y m³ siempre; la conversión (identidad o ×1000) vive en el codec.

### D4. Reenviar lo que la pantalla no edita
**Decisión**: al editar, el formulario de vehículo añade a la petición `allowedPackageTypes` y `allowedZoneIds` del registro cargado; el de conductor añade `identifierType` e `identifierValue`; el de tipo añade las tres estructuras (ya lo hace). Al crear no se envían.
**Por qué**: `PUT` sin esos campos puede borrarlos si el gateway sustituye. Reenviarlos es inocuo si fusiona. Es un arreglo del lote A, con pruebas de cuerpo de petición (`HttpTestingController`), independiente de la fase 0.

### D5. Un almacén de flota por ruta, no por pantalla
**Decisión**: `FleetStore` (no `providedIn: 'root'`) se provee en la ruta padre de `/flota` y carga de forma perezosa tipos, vehículos, conductores y lugares con `FullListState` (el de conductores sobre un adaptador de arreglo a página). Expone mapas por id y vistas derivadas (`driverOf(vehicle)`, `vehicleOf(driver)`, `vehiclesOfType(type)`, `placeName(id)`, `needsAttention`) con `computed`. Las altas, ediciones y borrados llaman a `invalidate()` para recargar lo que cambió.
**Por qué**: las relaciones (conductor ↔ vehículo ↔ tipo ↔ depósito) cruzan colecciones; sin almacén común, cada pestaña repite cuatro cargas y los recuentos del resumen y de los listados pueden discrepar. Vive solo mientras se está en `/flota`.
**Consecuencia**: `FLEET_ROUTES` gana una ruta padre sin componente con `providers: [FleetStore]`; se actualizan las pruebas de rutas.

### D6. Lote de borrado: una petición por registro, genérica
**Decisión**: `shared/data/bulk-run.ts` ejecuta una operación sobre N registros con concurrencia 4, no se detiene ante un fallo y devuelve `{ done, failed: { label, message }[] }`. La confirmación es una sola. Se usa en los tres listados; `package-bulk-status.ts` no se toca (migrarlo es una limpieza posterior).
**Por qué**: el gateway no tiene borrado en lote para estos recursos (solo `DELETE /assigned-services?ids=`). Mismo patrón y mismas garantías que ya funcionan en paquetes.

### D7. «Resumen» es una pestaña; `/flota` sigue yendo a vehículos
**Decisión**: nueva pestaña `/flota/resumen` (primera) y entrada de búsqueda «Resumen de flota»; `/flota` mantiene su redirección a `vehiculos` para no cambiar el comportamiento de quien trabaja a diario con vehículos. Pregunta abierta: ¿debería abrir en el resumen?
**Por qué**: es el cambio más pequeño; la redirección del spec actual se conserva.
**Pestañas**: pasan de 3 a 5 con el mapa; a 320 px se mide y, si desbordan, se vuelven desplazables sin barra visible.

### D8. Fichas: modal ligada a la dirección, como Auditoría
**Decisión**: tres diálogos diferidos (`VehicleDetailDialog`, `DriverDetailDialog`, `TypeDetailDialog`) que siguen a `?vehiculo=`, `?conductor=` y `?tipo=`. La lógica de sincronización con la dirección (abrir al cargar, cerrar quita el parámetro, `closeOnNavigation: false`, `Location.back()` si se empujó) se extrae a `shared/ui/query-dialog.ts` **para la flota**; Auditoría no se migra en este change. Una pieza `FleetFactsComponent` (rejilla etiqueta–valor) la comparten las tres fichas.
**Por qué**: es el patrón que la persona pidió y validó en Auditoría (tabla esencial, ojo, modal con detalle, enlazable, «Atrás» la cierra). Son tres consumidores nuevos, así que merece un helper; no se toca auditoría para no arriesgar sus 1948 pruebas en este change.
**Reglas aprendidas**: hojas por debajo de 2 kB, cabecera en su propio componente, tono por `data-tone`, y mat-dialog con `(click)="close()"` si el resultado importa.

### D9. Seguimiento por sondeo, condicionado
**Decisión**: `PositionsApi` (`list()`, `last(driverId)`) y `DriversMapComponent` sobre `shared/map/` con marcadores por conductor (tokens y `map-palette`). Sondeo cada 30 s mientras la pestaña esté visible (`PageVisibility`, seguro en SSR), sin WebSocket (no documentado). Posición obsoleta a los 15 min (atenuada, con «Última señal hace N min»). La unión posición ↔ vehículo es `position.userId === resource.driverId`. `x` = longitud, `y` = latitud.
**Por qué**: es la única capacidad de la API de flota sin cliente. Pero **hoy nadie publica posiciones**: `POST /driver/positions` es del rol conductor y esa aplicación no existe. Sin la aplicación del conductor el mapa estará siempre vacío; por eso es lote B y se decide con la persona si se construye ahora o cuando exista esa aplicación.
**Pendiente de la fase 0**: significado del 202, zona horaria de `date`, si `userId` coincide con el conductor.

### D10. Etiquetas y selectores por dominio maestro
**Decisión**: `IdentifierType` se lee de `MasterDomainsService` y se etiqueta en `fleet-labels.ts` (`citizen_id` → «Documento de identidad», `itin` → «Identificación fiscal», `plate` → «Placa», `code` → «Código interno»); una clave desconocida se muestra tal cual.
**Por qué**: es el mismo mecanismo que `OsrmProfile`; el gateway puede añadir valores.

### D11. Datos cruzados y de prueba
**Decisión**: los helpers de prueba con datos que el gateway nunca devolvió (capacidad, posiciones con datos, zonas permitidas) viven en `src/testing/fleet.ts`, con un comentario «hipótesis, no capturado del gateway»; los fixtures de `fixtures/gateway/` no se tocan. El gateway simulado (`qa-visual/mock-gateway.mjs`, fuera del repo) se amplía con tipos con capacidad, vehículos con zonas y sin conductor, conductores inactivos, borrados en uso (409), y posiciones.
**Por qué**: mezclar datos inventados con fixtures reales haría pasar por «contrato» lo que es una suposición.

### D12. Lo que se deja fuera, y por qué
- **`assigned-services`**: cada servicio asignado es vehículo + ruta + conductor, y eso ya lo expresan las jornadas (la ruta lleva el recurso) y el vehículo (lleva el conductor). La app anterior nunca lo terminó y los objetos anidados no tienen contrato.
- **`/driver/*`**: es la aplicación del conductor (sus rutas, reportar entregas, publicar posición). Es otro módulo, con su propio rol y diseño; se recomienda como siguiente módulo.
- **Invitaciones**: invitar al conductor por correo es mejor que fijarle una contraseña inicial, pero exige una pantalla de aceptación (`/acceso/invitacion`) que no existe y que el rol permitido en la invitación (el ejemplo es `agent`) incluya `driver`.
- **Número de licencia**: la API no tiene el campo.

## Risks / Trade-offs

- **Contrato no verificado de capacidad** → la hipótesis de D3 puede estar equivocada. Mitigación: fase 0 antes de escribir; codec aislado; fusión de objetos; vista previa que enseña lo que se enviará.
- **Unidades**: si el gateway guarda gramos y la planificación compara con paquetes en kg, el porcentaje de uso sería absurdo. Mitigación: la fase 0 incluye un experimento de contraste (un tipo de capacidad 100, un paquete de peso 10 y leer `weightUsagePercent`: debe dar 10 %).
- **Sustitución en `PUT`**: D4 es defensiva; falta saber si el gateway sustituye (fase 0).
- **Escritura de `active`/`default`** sin endpoint conocido: no se promete activar ni desactivar; se muestra el estado. Si la fase 0 encuentra cómo, se añade como ampliación pequeña.
- **Carga de cuatro colecciones al abrir la flota** (hasta 1000 cada una): coste moderado y diferido; se carga lo que cada pestaña necesita y se invalida por mutación.
- **Desbordamiento de pestañas** a 320 px: se mide con el banco visual antes de dar por cerrado.
- **Asignar un conductor que ya conduce otro vehículo**: se desconoce si el gateway lo mueve o lo rechaza; la pantalla avisa y muestra el motivo del rechazo, sin suponer.
- **Mapa vacío para siempre** si nadie publica posiciones (D9): por eso es condicionado.
- **Sin gateway real**: el lote A queda probado con fixtures y el gateway simulado, y los puntos de la fase 0 quedan como pendientes declarados.

## Open Questions

1. ¿`/flota` debe abrir en el **resumen** en lugar de en vehículos? (D7; por defecto no cambia.)
2. ¿Los **agentes** deberían ver vehículos y conductores en solo lectura (la planificación depende de ellos)? Hoy no ven «Flota»; `GET /resources` es «autenticado» pero `GET /users/drivers` exige administrador.
3. ¿Se construyen las **fichas** para las tres entidades o solo para vehículos y conductores? (Por defecto las tres.)
4. ¿Se construye el **seguimiento** ahora (mapa vacío hasta que exista la aplicación del conductor) o se espera? (D9; por defecto, lote B, después.)
5. ¿Se quiere dar de alta conductores **por invitación** en el futuro? Exigiría la pantalla de aceptación y confirmar que el gateway admite `role: driver` en invitaciones.
6. Fase 0: ¿quién la ejecuta y cuándo? Necesita el gateway activo y una sesión de administrador iniciada por la persona.
