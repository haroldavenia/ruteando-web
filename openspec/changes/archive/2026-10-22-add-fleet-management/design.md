# Design

## Context

Estado de partida (ver `proposal.md` para la motivación):

- `core/api` ya ofrece `CrudApi<T, TInput>` (`list/get/create/update/remove` con `Page<T>`), `ResourceTypesApi`, `ResourcesApi` (+ `assignDriver`/`unassignDriver`), `UsersApi` (+ `drivers()` y `sendPasswordReset()`), `PlacesApi`, `MasterDomainsService` (perfil de ruteo con valores por defecto) y los mensajes de error personalizables por operación (`withErrorMessage`, `provideApiErrorMessages`).
- Hay fixtures reales saneados de todas esas operaciones, pero **ninguno de un error de borrado por registro en uso**: ese comportamiento del gateway no está documentado.
- El shell tiene un único elemento de menú fijo (`items` en `shell.component.ts`), `roleGuard(roles)` existe y no se usa, y el patrón de formularios (reactivos tipados, `FocusFirstInvalidDirective`, `FormResultComponent`, `ConfirmDialogComponent`) está fijado por `add-access-screens`.
- Legacy de referencia: `master/js/custom/{vehicle_types,vehicles,drivers}` y sus vistas en `master/jade/views/pages/`. El legacy pagina en servidor, borra en lote y filtra con una caja de texto.

## Goals / Non-Goals

**Goals:**
- Fijar un patrón de listado/formulario que las fases siguientes (lugares, zonas, ajustes) reutilicen sin copiarlo.
- Que cada pantalla de negocio sea una pieza pequeña: configuración declarativa (columnas, formulario, API) y no un componente de 400 líneas.
- Mantener el bundle inicial sin crecer (todo diferido) y cada pantalla probada contra los fixtures reales.

**Non-Goals:**
- Un "framework CRUD" genérico que genere pantallas desde metadatos. Se reutilizan piezas de presentación; cada feature conserva su formulario y su lógica.
- Búsqueda, orden o filtros en el servidor: el gateway no documenta parámetros para ello.
- Edición de `capacity`, `measure` y `restriction`.

## Decisions

### 1. Piezas compartidas de presentación, no una clase base de pantalla
`shared/data/` contiene componentes "tontos" y utilidades: `DataTableComponent` (columnas por `ng-template`, paginador, estados carga/vacío/error, filtro), `PageHeaderComponent` (título + acción principal), un servicio `ListState<T>` basado en señales (`load(page,size)`, `status`, `page`, `error`, `reload()`) y `confirmDelete()` (envuelve `ConfirmDialogComponent` y devuelve `Observable<boolean>`). Cada feature compone esas piezas con su `*.api.ts`.
- *Alternativa descartada:* clase base `CrudListComponent<T>` con herencia. Acopla las pantallas entre sí y se vuelve inflexible en cuanto una tiene una acción extra (asignar conductor, enviar enlace).
- *Alternativa descartada:* generar pantallas desde un esquema JSON. Mucha maquinaria para solo tres pantallas y difícil de hacer accesible.

### 2. Tabla con `MatTable` + `MatPaginator`, filtro en cliente sobre la página
Paginación del servidor (`page`, `size` de `CrudApi.list`) y filtro de texto aplicado a la página cargada, normalizando mayúsculas y acentos. El texto de ayuda del campo indica "Filtrar esta página" para no prometer una búsqueda global.
- *Alternativa:* cargar todo y paginar en cliente. Descartada: los tenants grandes tendrían cientos de vehículos y el contrato es paginado.
- *Consecuencia asumida:* la búsqueda no encuentra registros de otras páginas. Si se necesita, hará falta un parámetro del gateway (pregunta para backend, fuera de esta fase).

### 3. Rutas: un listado y un formulario por entidad, formulario como ruta
`/flota/vehiculos` (lista), `/flota/vehiculos/nuevo` y `/flota/vehiculos/:id` (edición); igual para `tipos` y `conductores`. Se prefiere ruta a diálogo modal porque permite enlace directo, botón Atrás y guarda de "cambios sin guardar" con `canDeactivate`. Todas con `loadComponent`; la rama `/flota` lleva `canActivate`/`canActivateChild: [roleGuard(['tenant_admin','super_admin'])]` y redirige `''` a `vehiculos`.
- *Alternativa:* diálogo modal para el alta (como el legacy `ngDialog`). Descartada por accesibilidad (foco, Escape y formularios largos con el selector de turno) y por no tener URL.

### 4. Menú declarativo por rol
`NavItem` gana `roles?: UserRole[]` y `children?: NavItem[]`. El shell calcula `visibleItems` con una señal `computed` sobre `CurrentUser.role()`; sin usuario (SSR) solo se ven las entradas sin `roles`. El elemento activo se calcula por prefijo de URL (`routerLinkActive` con `ignoreQueryParams`), de modo que `/flota/vehiculos/abc` marca "Vehículos". El menú es una **conveniencia**: la seguridad real la dan `roleGuard` y el gateway.

### 5. Zona horaria del turno: la del navegador, conversión en un solo sitio
`shiftStartUtc` es ISO 8601 UTC. El formulario edita hora local (`<input type="time">` + fecha base fija `1970-01-01` o la del registro) y una función pura `toUtcIso(localTime)` / `fromUtcIso(iso)` en `features/fleet/shift-time.ts`, probada con husos distintos. Las duraciones se editan en minutos y se convierten a segundos en el mismo módulo.
- *Riesgo:* el legacy tomaba la hora tal cual; un vehículo creado allí puede mostrar otra hora. Se documenta y se deja como pregunta abierta (abajo).

### 6. Selectores de tipo, depósito y conductor
Se cargan con una sola petición paginada grande (`size` fijo, p. ej. 200) al abrir el formulario y se muestran en `mat-select` con filtro cuando hay más de 10. Si el total supera lo cargado, el formulario avisa de que la lista está truncada en lugar de ocultarlo. Es una decisión consciente de esta fase; un autocompletado con búsqueda en servidor se plantea cuando el gateway lo permita.

### 7. Borrado "en uso": mensajes por estado, sin suposiciones
El comportamiento real del gateway al borrar un tipo con vehículos o un conductor asignado no está documentado. Se mapean `409` y `400` en `withErrorMessage` de cada borrado con el texto de la spec, y el resto de estados usa los genéricos. La primera tarea de verificación contra el gateway real (**solo con autorización expresa y cuenta desechable**) documenta el estado real; si difiere, se corrige el mapeo, no la spec.

### 8. Conductor: dos pasos independientes
Crear un conductor es `POST /users` con rol `driver`; asignarlo es una operación separada de `ResourcesApi` desde el vehículo. Las pantallas no encadenan ambas operaciones, para que un fallo parcial no deje datos a medias. El formulario de edición de conductor **no** incluye la contraseña (`UserInput.password` solo se envía en el alta).

### 9. Conductores: lista completa de `GET /users/drivers`, paginada en el navegador
El gateway ofrece `GET /users/drivers` (lista plana, ya filtrada por rol, sin paginar según el fixture real) y `GET /users` (paginado, todos los roles, sin filtro por rol documentado). El listado usa `drivers()` y `ClientPaging` (`shared/data/client-paging.ts`) para entregar la misma forma `Page<T>` a `ListState`; la lista se guarda mientras se cambia de página y se pide de nuevo tras borrar o reintentar.
- *Alternativa descartada:* paginar `GET /users` y filtrar `role === 'driver'` en cliente: las páginas saldrían con huecos y un total falso.

## Risks / Trade-offs

- [El filtro solo cubre la página actual] → El texto de ayuda lo dice; queda como mejora dependiente del gateway.
- [Estados HTTP de borrado y de duplicados sin documentar] → Mapeo a 409/400 con mensaje genérico de reserva; verificación contra el gateway real autorizada y documentada en `references/gateway-api.md`.
- [Selectores truncados con muchos registros] → Aviso visible y tamaño de carga acotado; no se oculta el límite.
- [Vehículos creados en el legacy con otra interpretación de la hora] → Conversión centralizada y probada; se avisa en las notas de migración.
- [Sin lugares no se puede elegir depósito] → El formulario lo explica y, mientras no exista la fase de lugares, el alta de vehículo requiere que el tenant ya tenga alguno; se refleja en la guía de verificación manual.
- [Crecimiento del bundle] → Carga diferida de todo `features/fleet`; el presupuesto de 500 kB se comprueba al cerrar.

## Migration Plan

1. Piezas compartidas y su prueba (sin rutas).
2. Tipos de vehículo completo (la pantalla más simple, valida el patrón).
3. Conductores.
4. Vehículos (depende de tipos, conductores y lugares como selectores).
5. Menú por rol y rutas.
6. Verificación (pruebas, build, navegador a 360 y 1200 px, teclado) y documentación.

Reversión: cada paso es aditivo (rutas y pantallas nuevas); revertir el commit del menú oculta las pantallas sin afectar al resto.

## Open Questions

- ¿Debe `shiftStartUtc` mostrarse en la zona del navegador o en una zona del tenant (`settings`)? Se parte de la del navegador; cambiarlo solo afecta a `shift-time.ts`.
- ¿Admite el gateway `sort` o un parámetro de búsqueda en `GET /resource-types`, `/resources` y `/users`? No consta en la colección; se pregunta al equipo del gateway.
