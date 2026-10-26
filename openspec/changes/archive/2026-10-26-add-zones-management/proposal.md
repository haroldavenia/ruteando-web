# Proposal

## Why

Las zonas son la única entidad del gateway que sigue sin pantalla: `ZonesApi` (listar, detalle, alta, edición, borrado y `containing`), el modelo `Zone` (nombre, código, polígono GeoJSON y color) y los fixtures reales ya existen, y la planificación las usa (`evaluateItineraryZone` en las configuraciones, `zoneId` en lugares y paquetes, `totalZones` en las jornadas). Sin una pantalla, las zonas solo se pueden crear con una herramienta externa, así que esas opciones de planificación no se pueden aprovechar desde la aplicación. Es además el único requisito que aún no cubre el mapa reutilizable: **dibujar y editar un polígono**.

## What Changes

- Pantalla **Zonas** (`/zonas`, `/zonas/nueva`, `/zonas/:id`): listado (el gateway las devuelve sin paginar), alta, edición y borrado sobre `ZonesApi`, con nombre, código, color y polígono.
- Componente reutilizable **`PolygonEditorComponent`** (`shared/map`): muestra el polígono sobre el mapa base, permite **dibujarlo** vértice a vértice, **mover vértices** arrastrándolos y **empezar de nuevo**, y lo mantiene sincronizado con una **tabla de vértices** (latitud y longitud editables, añadir y quitar) que es la alternativa operable con teclado y lector de pantalla.
- **Validación geométrica** antes de enviar: al menos tres vértices distintos con coordenadas válidas, área mayor que cero y sin cruces entre lados; el anillo se cierra y se orienta de forma estándar (sentido antihorario) al enviarlo. Se informa del área aproximada en km².
- **Color** de la zona con un selector de la paleta de rutas (y «sin color»), para que el mapa y la leyenda las distingan.
- Mensajes propios: código duplicado (409), zona en uso (400 o 409), recurso inexistente y sesión sin empresa (el gateway exige `tenantId`, que se añade desde `TenantContext`).
- Entrada **«Zonas»** en el menú para `tenant_admin` y `super_admin`.
- Se conservan al guardar los campos que la pantalla no edita (`active`).
- Fuera de alcance: asignar zonas a lugares y paquetes, mostrar las zonas en el mapa de rutas, consulta «¿en qué zona está este punto?» (`containing`), importar polígonos de un archivo (GeoJSON, KML), polígonos con huecos o varios polígonos por zona.

## Capabilities

### New Capabilities
- `zone-management`: gestión de zonas (listado, alta, edición y borrado) con nombre, código, color y polígono validado.
- `polygon-editor`: edición de un polígono sobre el mapa con una tabla de vértices equivalente y accesible, reutilizable por otras pantallas.

### Modified Capabilities
- `ui-material-theme`: el menú lateral incluye la entrada "Zonas" para administradores.

## Impact

- Código nuevo: `shared/map/polygon-editor.component.ts` y utilidades de geometría de polígonos (`polygon-geometry.ts`), y `features/zones/**`.
- Modificado: `shared/map/openlayers.ts` (interacciones `Draw` y `Modify`, `Polygon`), `app.routes.ts`, `layout/shell.component.*` (menú) y pruebas.
- Dependencias: ninguna nueva (`ol` ya incluye `Draw` y `Modify`).
- Requiere: `add-packages-csv-import` archivado (ya lo está).
- Riesgos: el gateway no documenta qué valida de un polígono (autointersecciones, orientación, tamaño máximo) ni cómo responde a un polígono inválido; se valida en el cliente de forma conservadora y se contrasta con el gateway real con autorización; el dibujo con ratón o con el dedo no es operable con teclado, por lo que la tabla de vértices es obligatoria y completa; polígonos muy grandes o con miles de vértices se simplifican para dibujarlos pero se envían tal cual; el mapa de OpenStreetMap sigue siendo de uso ligero; borrar una zona usada por lugares o paquetes puede dejar `zoneId` huérfanos (a verificar); el rol real que gestiona zonas no está documentado.
- Sin impacto en `server/` ni en `master/`.
