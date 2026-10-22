# Proposal

## Why

Los vehículos necesitan un **depósito** y las jornadas, paquetes y rutas se apoyan en **lugares**, pero hoy la aplicación nueva no permite crear ninguno: el selector de depósito del formulario de vehículo queda vacío en un tenant nuevo y el vehículo no se puede guardar (hallazgo de `add-fleet-management`). `PlacesApi`, el modelo `Place`, las utilidades de coordenadas (`core/geo`) y los fixtures reales ya existen. Los lugares son además la primera pantalla que necesita **mapa**: resolverlo aquí, de forma reutilizable y segura en SSR, evita que cada fase siguiente (zonas, paquetes, jornadas, rutas) lo reinvente.

## What Changes

- Crear un **componente de mapa reutilizable** (`shared/map`) sobre OpenLayers 10 (ya instalado): se carga solo en el navegador y de forma diferida, usa el mapa base de OpenStreetMap configurado por entorno con su atribución, muestra marcadores y permite elegir un punto con un clic. Sin mapa en el servidor (SSR) ni en pruebas de unidad.
- Pantalla **Lugares** (`/lugares`, `/lugares/nuevo`, `/lugares/:id`): listado paginado, alta, edición y borrado sobre `PlacesApi`, con nombre, tipo (`PlaceType` desde `MasterDomainsService`, con etiquetas en español), dirección, teléfono, persona de contacto y ubicación.
- **Selector de ubicación**: se elige en el mapa o escribiendo latitud y longitud. Los campos numéricos son la alternativa accesible (el mapa no se puede operar con teclado) y se mantienen sincronizados con el marcador.
- Añadir **"Lugares"** al menú lateral (entrada propia, no dentro de "Flota") para `tenant_admin` y `super_admin`.
- En el formulario de vehículo, cuando no haya lugares, enlazar a `/lugares/nuevo` en lugar del texto actual sin salida.
- Configuración del mapa en los ficheros de entorno (`map.tilesUrl`, `map.attribution`, centro y zoom por defecto); sin claves ni secretos en el cliente.
- Reutilizar `shared/data` (listado, borrado, envío, guarda de cambios sin guardar) y `shared/form`.
- Fuera de alcance: **geocodificación de direcciones** (`/geocoding` sin contrato documentado), **zonas** y su dibujo de polígonos (fase siguiente), el campo `zoneId` del lugar, buscar lugares cercanos (`nearby`), subir lugares por CSV, borrado en lote y mapas de rutas y clusters.

## Capabilities

### New Capabilities
- `map-view`: mapa reutilizable con mapa base configurable, atribución, marcadores y selección de un punto, que solo se renderiza en el navegador y no es la única vía para introducir una ubicación.
- `place-management`: gestión de lugares (listado, alta, edición, borrado) con ubicación en el mapa o por coordenadas, tipo y datos de contacto.

### Modified Capabilities
- `ui-material-theme`: el menú lateral incluye la entrada "Lugares" para los roles de administración.
- `fleet-management`: el formulario de vehículo enlaza a la creación de lugares cuando no hay ninguno para elegir como depósito.
- `frontend-environments`: los ficheros de entorno incluyen la configuración del mapa (URL de teselas, atribución, centro y zoom).

## Impact

- Código nuevo: `ng-ruteando/src/app/shared/map/**` y `ng-ruteando/src/app/features/places/**`.
- Modificado: `app.routes.ts`, `layout/shell.component.*` (menú), `features/fleet/resources/resource-form.component.html`, `src/environments/environment*.ts`, estilos globales o del componente (CSS de OpenLayers) y pruebas.
- Dependencias: `ol` ya está en `package.json`; no se añade ninguna. Hay que comprobar que su importación funciona en el build de navegador y que no entra en el render de servidor.
- Requiere: `add-fleet-management` archivado (ya lo está).
- Riesgos: OpenLayers pesa (cientos de kB): debe quedar en un fragmento diferido que solo cargan las pantallas con mapa y no tocar el bundle inicial (límite relajado de +15 kB); el servidor de teselas público de OpenStreetMap solo admite uso ligero y exige atribución visible (aceptable para desarrollo y uso interno; se puede cambiar de proveedor con la configuración); el mapa es inaccesible con teclado y lector de pantalla, por lo que los campos de coordenadas son obligatorios como alternativa; el rol que puede gestionar lugares no está documentado (se parte de `tenant_admin` y `super_admin`); sin geocodificación el usuario debe colocar el punto a mano.
- Sin impacto en `server/` ni en `master/`.
