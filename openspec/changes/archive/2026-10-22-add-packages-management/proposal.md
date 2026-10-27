# Proposal

## Why

Los paquetes (en el legacy, el `itinerary`) son la materia prima de la planificación: sin ellos no hay jornadas ni rutas. `PackagesApi`, el modelo `Package`, los fixtures reales y las piezas de pantalla (`shared/data`, `shared/map`) ya existen, pero ninguna pantalla permite crear, revisar o corregir un paquete. Es el siguiente eslabón del flujo de negocio (lugares y flota → **paquetes** → jornadas → rutas) y no depende de contratos sin documentar: la importación por CSV del legacy vive en la pantalla de jornadas y se tratará allí.

## What Changes

- Pantalla **Paquetes** (`/paquetes`, `/paquetes/nuevo`, `/paquetes/:id`): listado paginado, alta, edición y borrado sobre `PackagesApi`, con número de guía, nombre, tipo de servicio (`ServiceType`), dirección, ciudad, país, código postal, peso, volumen, número de piezas, observación y ubicación (campos de latitud y longitud con mapa, reutilizando `LocationFieldsComponent`).
- **Estado** del paquete: etiqueta en español en el listado y acción "Cambiar estado" (`PATCH /packages/{id}/status/{status}`) con los valores de `PackageStatus`; cancelar pide confirmación.
- **Exportar CSV** de todos los paquetes (pidiéndolos por páginas), con las columnas del legacy en español, separador `;`, UTF-8 con BOM para abrirlo bien en Excel y protección contra inyección de fórmulas.
- Mensajes propios: guía duplicada (409 `CONFLICT`, ya observado en el gateway real), borrado de un paquete en uso y recurso inexistente.
- Entrada **"Paquetes"** en el menú para `tenant_admin`, `super_admin` y `agent` (el rol `driver` no la ve); nuevo grupo de roles `OPERATIONS_ROLES`.
- Los campos sin contrato documentado (`measure`, `timeWindow`, `receiver`, `sender`, `category`, `goodsTags`, `customerId`, `durationStay`, `zoneId`) no se editan, pero **se conservan** al guardar.
- Fuera de alcance: importar CSV (fase de jornadas), geocodificar direcciones (`/geocoding` sin contrato), ventanas horarias, remitente y destinatario, medidas, etiquetas de mercancía, asignar zona y el borrado en lote.

## Capabilities

### New Capabilities
- `package-management`: gestión de paquetes (listado, alta, edición, borrado, cambio de estado y exportación a CSV) con ubicación en el mapa o por coordenadas.

### Modified Capabilities
- `ui-material-theme`: el menú lateral incluye la entrada "Paquetes" para administradores y agentes.

## Impact

- Código nuevo: `ng-ruteando/src/app/features/packages/**` y el helper de exportación `shared/data/csv.ts`.
- Modificado: `app.routes.ts`, `layout/shell.component.*` (menú), `core/auth/admin-roles.ts` (añade `OPERATIONS_ROLES`) y pruebas.
- Dependencias: ninguna nueva.
- Requiere: `add-places-management` archivado (ya lo está; aporta el mapa y la ubicación).
- Riesgos: el rol que puede gestionar paquetes no está documentado (se parte de administradores y agentes; el gateway responderá 403 si no); la unidad de `durationStay` no se conoce, por eso no se edita; sin geocodificación la ubicación se coloca a mano y `geocodingStatus` no se envía (no consta que el gateway lo acepte); la exportación de todos los paquetes pide varias páginas (una petición por 200 paquetes); `PUT /packages/{id}` con campos omitidos no está documentado, por lo que al editar se reenvían los valores cargados de los campos que no se editan.
- Sin impacto en `server/` ni en `master/`.
