# Proposal

## Why

La flota se construyó como una primera versión (change archivado `add-fleet-management`): tres CRUD con la asignación de conductor. Se decidió dejar, por ahora, el módulo **tal como lo tenía la aplicación AngularJS anterior, pero renovado y sobre el Angular y el sistema de interfaz actuales**. Comparada con la app anterior (y con los endpoints del gateway), a la flota nueva le faltan:

- **Capacidad de los tipos de vehículo**: peso, volumen o medidas (alto × ancho × profundidad) y restricciones de carga mínimas y máximas. Hoy `capacity`, `measure` y `restriction` se reenvían sin tocar. Importa más que antes: las jornadas ya muestran el porcentaje de uso de peso y de volumen de cada ruta, que sin capacidad sale vacío.
- **Documento del conductor** (el «número de identificación» de la app anterior; la API lo guarda como `identifierType` + `identifierValue`) y la contraseña repetida al crear.
- **Seleccionar y borrar varios registros** y **exportar** (la app anterior exportaba a PDF).
- **Crear un tipo desde el formulario de vehículo** y volver.
- **Búsqueda sobre todos los registros** en tipos y conductores (la app anterior traía todo y paginaba en el navegador; la nueva solo filtra la página).
- Y un riesgo que no existía en la app anterior: **editar un vehículo o un conductor puede borrar datos** que la pantalla no muestra (`allowedPackageTypes`, `allowedZoneIds`, `identifierType`, `identifierValue`) si el gateway sustituye en el `PUT`.

El plan completo (resumen, fichas, seguimiento, zonas permitidas...) queda en el change `enhance-fleet-experience`, para después.

## What Changes

- **Tipos de vehículo**: secciones «Capacidad» (peso en kg; «En volumen» con el volumen en cm³ o «En medidas» con ancho, alto y profundidad en cm y el volumen calculado) y «Restricciones de carga» (peso y volumen, mínimo y máximo), con las mismas reglas que la app anterior (mín ≤ máx ≤ capacidad) mostradas como errores de campo. El listado muestra la capacidad resumida («500 kg · 12 m³») y no la pierde al editar: los objetos se **fusionan**, nunca se reemplazan.
- **Conductores**: tipo de documento (dominio maestro `IdentifierType`, en español) y valor, y «Repetir contraseña» al crear; el listado muestra el documento.
- **Vehículos**: botón «Crear tipo» junto al selector (vuelve al formulario al terminar, con un destino de vuelta validado).
- **Conservar lo que la pantalla no edita**: el vehículo reenvía `allowedPackageTypes` y `allowedZoneIds`; el conductor, `identifierType` e `identifierValue`; el tipo, las tres estructuras completas.
- **Listados**: tipos y conductores cargan todo (como vehículos) para buscar y contar sobre todos; selección en los tres, borrado en lote con una confirmación y un informe de cuáles se eliminaron, y exportación a CSV de lo filtrado o seleccionado.
- **Fuera de este change, con motivo**: licencia de conducir (la API no tiene el campo), activar o desactivar (no se conoce el endpoint), servicios asignados (la app anterior nunca los terminó), exportar a PDF (se retiró `jspdf`; se sustituye por CSV) y todo el plan «extra» (`enhance-fleet-experience`).

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `fleet-management`: tipos con capacidad, medidas y restricciones; conductores con documento y contraseña repetida; crear un tipo desde el vehículo; conservación de los datos no editados; listados con todos los registros; selección y borrado en lote; exportación a CSV.

## Impact

- **Código**: `ng-ruteando/src/app/features/fleet/**` (formularios y listados de tipos, vehículos y conductores, `capacity-codec.ts`, `capacity-rules.ts`, `fleet-labels.ts`, `fleet-export.ts`), `shared/data/bulk-run.ts`, ajuste del destino de vuelta del formulario de tipo y pruebas. Sin cambios en `server/`, rutas ni menú.
- **Compartido**: `DataTableComponent` se usa tal como está (selección y `#selectionActions`, como Paquetes); `shared/data/csv.ts` y `ClientPaging` se reutilizan sin cambios.
- **Dependencias**: ninguna nueva. Bundle: todo diferido; el inicial (492,8 kB de 500) no debe crecer; hojas de componente por debajo de 2 kB.
- **Datos que no se pueden comprobar hoy**: el gateway real está caído. La estructura y las unidades de `capacity`, `measure` y `restriction` se escriben con las claves de la app anterior y las unidades que declara la configuración del tenant en Postman (kg, cm³ y cm) y **no están verificadas**; el código las aísla en un archivo y se declaran pendientes de comprobar (fase 0, tareas abiertas a propósito). Antes de usar la capacidad con datos reales hay que ejecutarla.
- **Herramientas**: el gateway simulado (fuera del repo) pasa a tener estado para la flota (CRUD en memoria, 409 en usos, conductores con documento) para ver crear, editar y borrar en lote.
- **Documentación**: `CLAUDE.md`, `references/gateway-api.md` (sección Flota) y el spec `fleet-management` al archivar.
