# Proposal

## Why

Planificar una jornada exige una **configuración** (`settings`): topología de la ruta, tipo de restricción, depósito de salida y llegada, vehículos disponibles y reglas de peso, volumen y turno. `POST /journeys/plan` recibe `settingsId`, así que sin configuraciones no hay jornadas. `SettingsApi`, el modelo `Settings` y los fixtures reales ya existen, y las dependencias de la configuración (lugares, vehículos) ya tienen pantallas, pero ninguna pantalla permite crear o editar una configuración. Es el eslabón que falta entre lo ya migrado (flota, lugares, paquetes) y las jornadas.

## What Changes

- Pantalla **Configuraciones** (`/configuraciones`, `/configuraciones/nuevo`, `/configuraciones/:id`): listado paginado, alta, edición y borrado sobre `SettingsApi`.
- Formulario con descripción, **topología** (`RouteTopology`), **tipo de restricción** (`RestrictionType`), lugar de **salida** y de **llegada** (desde `PlacesApi`), **vehículos** (selección múltiple desde `ResourcesApi`), evaluar peso, volumen y zona del itinerario, número de rutas fijas, estancia (`lengthOfStay` + `TypeLengthOfStay`) y turno (inicio, duración y descanso).
- Los campos que dependen del tipo de restricción (rutas fijas, turno) se muestran y se validan según el tipo, como el legacy.
- Etiquetas en español de los tres dominios y del estado activo.
- Mensajes propios: borrado de una configuración usada por una jornada y recurso inexistente.
- Entrada **"Configuraciones"** en el menú para administradores (`ADMIN_ROLES`).
- Los campos sin contrato documentado (`globalShiftActive`, `globalBreakActive`, `active`) no se editan, pero se conservan al guardar.
- Fuera de alcance: planificar jornadas (siguiente fase), el módulo de «tipos de vehículo con cantidad» del legacy (el gateway usa vehículos concretos), plantillas de vehículos agregados y el borrado en lote.

## Capabilities

### New Capabilities
- `settings-management`: gestión de las configuraciones de planificación (listado, alta, edición y borrado), con campos condicionados al tipo de restricción.

### Modified Capabilities
- `ui-material-theme`: el menú lateral incluye la entrada "Configuraciones" para administradores.

## Impact

- Código nuevo: `ng-ruteando/src/app/features/settings/**`.
- Modificado: `app.routes.ts`, `layout/shell.component.*` (menú) y pruebas.
- Dependencias: ninguna nueva.
- Requiere: `add-packages-management` archivado (ya lo está), y lugares y vehículos para poder elegirlos.
- Riesgos: qué campos exige el gateway según el tipo de restricción no está documentado: se parte de las reglas del legacy y de los ejemplos reales (`fixed_routes` con `fixedRoutes`), y se contrasta con el gateway real con autorización; la unidad de `lengthOfStay` (minutos o segundos) no consta y el legacy no la indica, por lo que el campo se etiqueta de forma neutra hasta confirmarla; el rol que gestiona configuraciones no está documentado (se parte de administradores); un gateway que acepte configuraciones incoherentes solo las rechazará al planificar.
- Sin impacto en `server/` ni en `master/`.
