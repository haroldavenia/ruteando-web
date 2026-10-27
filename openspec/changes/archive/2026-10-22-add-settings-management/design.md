# Design

## Context

Estado de partida (ver `proposal.md` para la motivación):

- `core/api` tiene `SettingsApi` (`CrudApi<Settings, SettingsInput>`), el modelo `Settings` (con `placeStart`, `placeEnd` y `resources` resumidos) y fixtures reales de `settings` (lista, detalle, alta, edición y borrado). `MasterDomainsService` ya trae valores por defecto de `RouteTopology` y de otros dominios.
- Hay pantallas de lugares (`PlacesApi`) y de vehículos (`ResourcesApi`) de las que sale lo que la configuración elige. `shared/data` y `shared/form` ofrecen el patrón de listado y formulario; `features/places` y `features/packages` son la referencia más reciente.
- El ejemplo real de alta usa `fixed_routes` con `fixedRoutes: 1`, un vehículo y un solo lugar (`placeEndId` lo rellena el gateway con el de salida). El legacy (`master/js/custom/settings`) condiciona el turno al tipo de restricción (no se usa con rutas fijas) y trabaja con tipos de vehículo con cantidad, un modelo que el gateway sustituyó por vehículos concretos.
- Dominios: `RouteTopology` (`depot_to_depot`, `round_trip`, `open_delivery`, `open_pickup`, `flexible`), `RestrictionType` (`fixed_routes`, `resource_vs_time`, `time_windows`) y `TypeLengthOfStay` (`fixed`, `define_itinerary`).

## Goals / Non-Goals

**Goals:**
- Que un administrador pueda crear y mantener las configuraciones que `journeys/plan` necesita.
- Mostrar solo los campos que aplican al tipo de restricción y no enviar los demás.
- No perder los campos que la pantalla todavía no edita.

**Non-Goals:**
- Planificar o previsualizar una jornada.
- Replicar la lógica de tipos de vehículo con cantidad del legacy.
- Validar en el cliente reglas que el gateway no documenta más allá de las que ya tienen respaldo en un ejemplo real o en el legacy.

## Decisions

### 1. Formulario con secciones que dependen del tipo de restricción
Un `FormGroup` con todos los controles y una señal derivada del tipo de restricción que decide qué secciones se pintan (`@if`). Al ocultar una sección se **deshabilitan** sus controles (no se validan ni se envían: `getRawValue` se filtra por la sección activa). Rutas fijas → `fixedRoutes`; resto → turno (inicio, duración y descanso). Es la misma regla del legacy, comprobada con el ejemplo real de `fixed_routes`.
- *Alternativa descartada:* un formulario por tipo. Triplica plantillas para diferencias de dos campos.

### 2. Turno en hora local, como en vehículos
El inicio del turno se edita en hora local del navegador y se envía en UTC; duración y descanso en minutos, enviados en segundos. Se reutiliza `features/fleet/resources/shift-time.ts`; como lo usan dos features, se mueve a `shared/time/shift-time.ts` en la primera tarea del change.
- *Riesgo:* si el gateway guarda una hora local de tenant en vez de UTC, la hora se desplazaría; se contrasta con el gateway real.

### 3. Selección de vehículos y lugares
Lugares: `mat-select` simple para salida y llegada (como el depósito de los vehículos, hasta 200 con aviso si hay más). Vehículos: `mat-select` múltiple con nombre y matrícula, también acotado a 200 con aviso. Sin lugares o sin vehículos, el formulario enlaza a su pantalla de creación en lugar de quedar vacío.
- *Alternativa descartada:* un selector con búsqueda en servidor, porque el gateway no documenta búsqueda.

### 4. Conservar lo que no se edita
Igual que en paquetes: el cuerpo del PUT parte del registro cargado quitando campos de solo lectura (`id`, `tenantId`, fechas, `createdBy`, los resúmenes `placeStart`, `placeEnd` y `resources`) y con lo editado encima. Así `globalShiftActive`, `globalBreakActive` y `active` no se pierden. Las secciones desactivadas se envían como `null` para que un cambio de tipo no deje valores obsoletos (se contrasta con el gateway real).

### 5. Estancia
`lengthOfStay` + `typeLengthOfStay`: con `fixed` se exige un número positivo; con `define_itinerary` se envía `null`. La etiqueta del campo es neutra («Estancia») y no declara unidad mientras el gateway no la documente.

### 6. Etiquetas y borrado
`settings-labels.ts` con las etiquetas de los tres dominios (clave como reserva). Borrado con `DeleteFlow` y mensaje propio para 400 y 409. Rutas con `roleGuard(ADMIN_ROLES)` y `unsavedChangesGuard`; entrada de menú con `ADMIN_ROLES`.

## Risks / Trade-offs

- [Reglas por tipo de restricción sin documentar] → Se limita a lo comprobado (ejemplo real y legacy) y se contrasta con el gateway con autorización.
- [Unidad de `lengthOfStay` desconocida] → Etiqueta neutra y pregunta abierta; no se convierte nada.
- [Selectores acotados a 200] → Aviso visible cuando hay más.
- [Un cambio de tipo deja datos obsoletos si el PUT no los limpia] → Las secciones inactivas se envían como `null`.
- [Mover `shift-time.ts`] → Cambio mecánico con sus pruebas; se ejecuta antes del resto.

## Migration Plan

1. Mover `shift-time`, etiquetas y utilidades comunes.
2. Listado y borrado.
3. Formulario y reglas por tipo de restricción.
4. Rutas, menú, verificación (build, navegador real) y documentación.

Reversión: aditivo; revertir las rutas y el menú oculta la pantalla.

## Open Questions

- ¿Qué unidad usa `lengthOfStay` y qué exige el gateway para `time_windows` y `resource_vs_time` (turno obligatorio, ventanas en los paquetes)? Hasta saberlo no se valida más.
- ¿Pueden los agentes gestionar configuraciones? Se parte de administradores.
