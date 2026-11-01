## Context

Lo que hay hoy, observado en el código, en los fixtures reales (`ng-ruteando/src/testing/fixtures/gateway/`), en la colección Postman del gateway (capturas del 2026-10-11) y en las fuentes de la app AngularJS (`ruteando-web-old`, tag `v1.0.0`: `master/js/custom/{vehicle_types,vehicles,drivers}` y `master/jade/views/pages/**`). La tabla de endpoints y el análisis de huecos están en `enhance-fleet-experience/design.md`.

### La app anterior (lo que se replica)
- **Tipos**: nombre; peso en **kg** (se guardaba ×1000, en gramos); selector «En volumen» / «En medidas»; volumen en **cm³** (en modo medidas = ancho × alto × profundidad, en **cm**); restricciones de peso (kg, ×1000) y de volumen (cm³), mínimo y máximo, con validaciones cruzadas: mín ≤ máx, máx peso ≤ peso, máx volumen ≤ volumen. El listado mostraba peso en kg y volumen en m³ (cm³ ÷ 1 000 000). Peso y volumen eran obligatorios.
- **Vehículos**: matrícula (obligatoria, ≥ 6), nombre (obligatorio, ≥ 2) y tipo (selector con botón «+» que llevaba a crear un tipo y volvía). Listado con matrícula y nombre.
- **Conductores**: licencia, nombre, apellidos, identificación, teléfono, correo (no editable al editar), contraseña y repetirla (solo al crear) y «activo». Listado con nombre, apellidos, correo, licencia, identificación y teléfono.
- **Listados**: búsqueda, selección con «seleccionar todo», borrado de varios con una confirmación, exportación a PDF, paginación del lado del cliente sobre todos los registros y estados de carga y vacío.

### La flota nueva (change archivado `add-fleet-management` + rediseño)
- Rutas `/flota/{tipos,vehiculos,conductores}` (+ `nuevo`, `:id`), `roleGuard(ADMIN_ROLES)`, `FleetTabsComponent`. Vehículos ya usa `FullListState`; tipos y conductores usan `ListState` (solo la página). Conductores se pagina con `ClientPaging` porque `GET /users/drivers` devuelve un arreglo.
- Formulario de tipo: nombre, categoría, perfil de ruteo, consumo; reenvía `capacity`, `measure` y `restriction` tal cual al editar. Formulario de conductor: nombre, apellidos, correo, teléfono, contraseña inicial. Formulario de vehículo: nombre, matrícula (opcional), tipo, depósito, turno, descanso, cantidad.
- `DataTableComponent` ya soporta `selectable` y `#selectionActions` (Paquetes lo usa para cambiar el estado de varios); `shared/data/csv.ts` ya tiene `toCsv` y `downloadCsv`.

### Restricciones del proyecto
Sin librerías nuevas; OnPush y signals; SSR seguro; CSP `script-src 'self'`; el bundle inicial no importa `core/api/data/*`; todo botón de solo icono lleva `title`; las tablas se apilan; colores solo por tokens; hoja de estilos de cada componente por debajo de 2 kB y nunca en `styles.scss`; todo texto del gateway se pinta como texto; fixtures reales intactos.

## Goals / Non-Goals

**Goals:**
- Que la flota haga lo que hacía la app anterior (capacidad y restricciones de tipos, documento del conductor, selección y borrado en lote, exportación, crear tipo desde el vehículo) con el diseño y el Angular actuales.
- Que guardar nunca borre datos que la pantalla no muestra.
- Que la lógica nueva (codec de capacidad, reglas, etiquetas, CSV, lote) sea **pura y se pruebe sin `TestBed`**.

**Non-Goals:**
- Resumen, fichas, chips, columnas de relación, zonas permitidas y seguimiento (`enhance-fleet-experience`).
- Licencia de conducir, activar o desactivar, servicios asignados y PDF (ver D8).
- Verificar el contrato real de capacidad: el gateway está caído (ver Riesgos).

## Decisions

### D1. Paridad primero, el resto después
**Decisión**: este change replica la app anterior; todo lo demás del plan pasó a `enhance-fleet-experience`, que se resincroniza con lo que deje este.
**Por qué**: la persona pidió «tal cual como en la app vieja, renovada». Separar evita archivar requisitos no implementados.

### D2. Los objetos opacos se fusionan, no se reemplazan
**Decisión**: `capacity`, `measure` y `restriction` se editan con `mergeOpaque(current, edited)`: se parte del objeto que trajo el gateway, se sobrescriben solo las claves que la pantalla conoce y se conservan las demás; vaciar un campo quita solo esa clave; un objeto que queda sin claves se envía como `null`.
**Por qué**: el gateway puede añadir claves (la app anterior usaba otras, como `capability`); reemplazar el objeto las perdería. Mismo criterio que `zoneId` en lugares.

### D3. Una sola hipótesis de almacenamiento, en un solo archivo
**Decisión**: `features/fleet/resource-types/capacity-codec.ts` concentra claves y unidades: `decode(type) → CapacityValues` y `encode(values, current) → { capacity, measure, restriction }`. Hipótesis de partida: `capacity = { weight, volume }` con el peso en **kg** y el volumen en **cm³**; `measure = { height, width, depth }` en **cm**; `restriction = { minWeight, minVolume, maxWeight, maxVolume }` en kg y cm³. Las claves vienen de la app anterior; **las unidades, de la configuración del tenant de la colección Postman** (`config { defaultWeightUnit: "kg", defaultVolumeUnit: "cm3" }`), no de la app anterior, que guardaba el peso en gramos (×1000). La pantalla muestra kg, cm³ y cm (como la app anterior) y el listado, m³.
**Por qué**: es lo que el gateway probablemente heredó, pero **no está verificado** (todas las capturas traen `null`). Si la fase 0 lo contradice (por ejemplo, kg y m³ como sugieren los paquetes de ejemplo, `weight: 1`, `volume: 0.1`), el arreglo es un archivo y sus pruebas, no la pantalla. Las constantes de conversión son nombradas y las pruebas las fijan con un comentario que dice que es una hipótesis.

### D4. El modo de capacidad se deduce, no se guarda
**Decisión**: «En medidas» si `measure` trae alto, ancho y profundidad mayores que 0; «En volumen» en cualquier otro caso. No se escribe un campo `capability`.
**Por qué**: la app anterior guardaba `capability` aparte, pero el modelo del gateway no tiene un sitio conocido para él; deducirlo evita inventar una clave.

### D5. Reenviar lo que la pantalla no edita
**Decisión**: al editar, el formulario de vehículo añade `allowedPackageTypes` y `allowedZoneIds` del registro cargado; el de conductor, `identifierType` e `identifierValue` (los suyos si no se tocaron); el de tipo, las tres estructuras completas. Al crear no se envían.
**Por qué**: un `PUT` sin esos campos puede borrarlos si el gateway sustituye; reenviarlos es inocuo si fusiona. Se prueba con el cuerpo de la petición (`HttpTestingController`).

### D6. Borrado en lote: una petición por registro, genérico
**Decisión**: `shared/data/bulk-run.ts` ejecuta una operación sobre N registros con concurrencia 4, sin detenerse ante un fallo, y devuelve `{ done, failed: { label, message }[] }`; la confirmación es una sola. Los tres listados usan `DataTableComponent` con `selectable` y `#selectionActions` (barra pegada al pie, como Paquetes). `package-bulk-status.ts` no se toca.
**Por qué**: el gateway no tiene borrado en lote para estos recursos. Mismo patrón y garantías que ya funcionan en paquetes.

### D7. Volver tras crear un tipo desde el vehículo
**Decisión**: el botón «Crear tipo» navega a `/flota/tipos/nuevo?volver=<ruta del formulario de vehículo>`; el formulario de tipo lee `volver`, lo valida (solo rutas internas que empiecen por `/flota/`, reutilizando `safeReturnUrl` y añadiendo la comprobación del prefijo) y, al guardar o cancelar, navega allí; si no es válido, al listado de tipos. El borrador del formulario de vehículo viaja en el **estado de la navegación** (`type-handoff.ts`, sin almacenamiento), como hacía la app anterior con `returnTo.data`: al guardar o cancelar, el formulario de tipo vuelve con el borrador y, si se creó, con el id del tipo, que el vehículo deja elegido. Mientras se va a crear el tipo no se pregunta por cambios sin guardar; al volver, el formulario queda marcado como modificado y el aviso de siempre protege lo restaurado. El destino y el borrador se validan por su forma y se ignoran si no son los esperados.
**Por qué**: es el comportamiento de la app anterior sin guardar borradores en almacenamiento.
**Alternativa**: diálogo con un formulario de tipo reducido (más trabajo y duplica validaciones).

### D8. Desviaciones deliberadas respecto a la app anterior
- **Matrícula opcional** (la app anterior la exigía): la API la permite nula y hay vehículos sin matrícula (bicicletas).
- **Capacidad opcional**: la app anterior exigía peso y volumen; la API permite `null` y hay tipos existentes sin capacidad. Si se indica una parte, deben indicarse peso y volumen.
- **Identificación del conductor opcional**, con tipo y valor (la app anterior solo tenía el número).
- **Sin licencia de conducir**: la API no tiene el campo.
- **Sin «activo» editable**: no se conoce cómo escribir `active`; el estado se muestra (listado) pero no se promete cambiarlo.
- **CSV en lugar de PDF**: `jspdf` se retiró por sus vulnerabilidades.
- **Sin servicios asignados**: la app anterior nunca los terminó y el gateway no tiene contrato para sus objetos anidados.

### D9. Gateway simulado con estado
**Decisión**: `qa-visual/mock-gateway.mjs` (fuera del repo) gana un CRUD en memoria de tipos, vehículos y conductores, con la forma de los fixtures reales, 409 al borrar un tipo con vehículos o un conductor asignado, 409 en correo duplicado, conductores con y sin documento, tipos con capacidad en modo volumen y en modo medidas (según D3) y registro del cuerpo completo de las peticiones de flota (`GET /__requests`) para comprobar lo que se envía.
**Por qué**: el simulado actual repite un fixture y no guarda nada, así que no permite ver crear, editar ni borrar en lote.

## Risks / Trade-offs

- **Contrato de capacidad sin verificar** → si el gateway usa otras claves o unidades, la planificación calcularía mal el uso (por ejemplo, un factor de 1000). Mitigación: fase 0 (tareas abiertas, con el experimento «capacidad 100, paquete 10 → 10 %»), codec aislado, fusión de objetos y pruebas que fijan la hipótesis. **Hasta ejecutarla, no usar la capacidad con datos reales.**
- **Sustitución en `PUT`**: D5 es defensiva; falta saber si el gateway sustituye o fusiona.
- **Borrados en uso**: los estados 400 y 409 siguen sin comprobar contra el gateway real; el lote muestra el motivo que devuelva.
- **Borrador en el estado de la navegación**: se pierde si la persona abre el formulario de tipo en otra pestaña o escribe la dirección a mano; en ese caso el vehículo vuelve vacío (D7).
- **Sin gateway real**: todo se prueba con fixtures y el simulado; lo no verificado queda declarado como pendiente.

## Open Questions

1. ¿Se quiere que la capacidad sea obligatoria al crear un tipo, como en la app anterior? (Por defecto es opcional, ver D8.)
2. ¿Quién ejecuta la fase 0 y cuándo? Necesita el gateway activo y una sesión de administrador iniciada por la persona.
3. ¿El conductor debe poder activarse o desactivarse desde la pantalla? Falta el endpoint.
