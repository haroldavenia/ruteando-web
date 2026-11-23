# Proposal

## Why

Con el acceso resuelto, la aplicación nueva tiene sesión pero **ninguna pantalla de negocio**: `/` es un título y el menú solo tiene "Inicio". La capa de datos (`ResourceTypesApi`, `ResourcesApi`, `UsersApi`, modelos y fixtures reales) ya existe y está probada, pero nadie la usa. Antes de poder planificar una ruta hacen falta los **datos maestros de la flota**: qué tipos de vehículo hay, qué vehículos tiene la empresa y quién los conduce. Son además los módulos legacy más pequeños y homogéneos (`vehicle_types`, `vehicles`, `drivers`: ~930 líneas entre los tres), por lo que sirven para fijar **una sola vez** el patrón de listado paginado + formulario + borrado confirmado que reutilizarán lugares, zonas, ajustes y el resto de fases.

## What Changes

- Crear el patrón reutilizable de pantallas de datos en `shared/data/` (sin lógica de negocio): tabla paginada con búsqueda, estados de carga, vacío y error con reintento, selección múltiple opcional, acciones por fila, cabecera de página con acción principal y borrado confirmado con `ConfirmDialogComponent`. Formularios reactivos tipados reutilizando `FocusFirstInvalidDirective` y `FormResultComponent`.
- Pantalla **Tipos de vehículo** (`/flota/tipos`): listado, alta, edición y borrado sobre `ResourceTypesApi` (nombre, categoría, perfil de ruteo desde `MasterDomainsService`, consumo). Las estructuras `capacity`, `measure` y `restriction` siguen siendo opacas (no tienen contrato documentado) y se conservan sin tocar al editar.
- Pantalla **Vehículos** (`/flota/vehiculos`): listado, alta, edición, borrado y asignación o retirada de conductor sobre `ResourcesApi` (nombre, matrícula, tipo, depósito, turno, descanso, cantidad).
- Pantalla **Conductores** (`/flota/conductores`): listado, alta, edición, borrado y envío de enlace de restablecimiento de contraseña sobre `UsersApi` (usuarios con rol `driver`).
- Añadir la sección "Flota" al menú del shell y las rutas diferidas bajo `/flota`, restringidas por rol con el `roleGuard` ya existente (`tenant_admin` y `super_admin`; el gateway ya limita `/users/drivers` a esos roles).
- Mensajes de error propios por operación (409 por matrícula o correo duplicados, 400 de validación, 404 de recurso ya borrado) con el mecanismo `withErrorMessage` existente.
- Todas las pantallas se cargan de forma diferida: el bundle inicial no crece.
- Fuera de alcance (queda para fases siguientes): **lugares y depósitos** (mapa, geocodificación y direcciones: el selector de depósito del vehículo solo *lista* lugares ya existentes con `PlacesApi`), zonas, jornadas, paquetes, importación CSV, ajustes, edición de `capacity`/`measure`/`restriction` (sin contrato), borrado en lote del legacy, asignación de servicios y cambiar contraseña o editar perfil.

## Capabilities

### New Capabilities
- `data-management-ui`: patrón compartido de listado paginado, formulario y borrado confirmado para recursos del gateway, con estados de carga, vacío y error, accesibilidad y mensajes en español.
- `fleet-management`: gestión de tipos de vehículo, vehículos y conductores desde pantallas propias, incluida la asignación de conductor a vehículo.

### Modified Capabilities
- `ui-material-theme`: el menú lateral incorpora secciones de negocio y muestra a cada persona solo las entradas a las que su rol da acceso (empezando por "Flota").

## Impact

- Código nuevo: `ng-ruteando/src/app/shared/data/**` (tabla, cabecera, borrado, utilidades de formulario) y `ng-ruteando/src/app/features/fleet/**` (tipos, vehículos, conductores, rutas, mensajes).
- Modificado: `app.routes.ts` (rutas diferidas de `/flota` con `roleGuard`), `layout/shell.component.*` (menú por rol), pruebas de rutas y shell. `core/api` solo se toca si una prueba contra los fixtures reales revela un modelo incorrecto.
- Dependencias: ninguna nueva (`MatTable`, `MatPaginator`, `MatSelect`, `MatDialog` y formularios ya están instalados).
- Requiere: `add-access-screens` archivado (ya lo está) y datos reales en los fixtures de `resources`, `resource-types` y `users`.
- Riesgos: el bundle inicial tiene ~150 kB de margen (348,7 de 500 kB), suficiente si todo es diferido; la política de borrado del gateway cuando un tipo o conductor está en uso no está documentada (se verificará y se documentará el mensaje 409/400); `shiftStartUtc` es ISO UTC y el legacy lo trataba como hora local, por lo que el formulario debe decidir la zona horaria visible (pregunta abierta en `design.md`); sin lugares creados el selector de depósito queda vacío hasta la fase de lugares.
- Sin impacto en `server/` ni en `master/`.
