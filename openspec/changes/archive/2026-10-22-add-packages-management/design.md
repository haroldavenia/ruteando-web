# Design

## Context

Estado de partida (ver `proposal.md` para la motivación):

- `core/api` tiene `PackagesApi` (`CrudApi<Package, PackageInput>` + `setStatus(id, status)`), el modelo `Package` y fixtures reales de `packages` (lista, detalle, alta, edición, borrado y `PATCH /packages/{id}/status/{status}`). La subida de CSV (`/packages/upload`) no tiene contrato; no se usa.
- `shared/data` (listado, borrado, envío, `RecordLoader`, `unsavedChangesGuard`), `shared/form` y `shared/map` (`LocationFieldsComponent`) son los bloques que `features/fleet` y `features/places` ya usan; esta fase no añade piezas nuevas salvo un helper de CSV.
- En el gateway real, `guideNumber` es **único por tenant** y con valor `null` el segundo paquete creado da 409 `CONFLICT` (hallazgo de `gateway-api-client-foundation`). El dominio `PackageStatus` trae `pending`, `attended`, `unattended`, `cancelled`, `returned` (más valores de prueba que el gateway puede tener).
- El legacy (`master/js/custom/itinerary`) solo exporta CSV (`;`, columnas en español) y edita un paquete con muchos campos (medidas, remitente, destinatario...). La importación por CSV está en el flujo de jornadas.

## Goals / Non-Goals

**Goals:**
- Que un agente pueda crear, revisar, corregir, cancelar y exportar paquetes sin salir de la aplicación nueva.
- Conservar los datos que la aplicación todavía no sabe editar, para no perderlos al guardar.
- Exportar a CSV sin fórmulas peligrosas y legible en Excel.

**Non-Goals:**
- Importar CSV, geocodificar, editar ventanas horarias, remitente/destinatario o medidas, asignar zonas.
- Filtros de servidor por estado o fecha (el gateway no los documenta).

## Decisions

### 1. Roles de operación: un grupo propio
`OPERATIONS_ROLES = ['tenant_admin', 'super_admin', 'agent']` en `core/auth/admin-roles.ts` (mismo fichero mínimo, sin dependencias, para no engordar el bundle inicial). Los paquetes son trabajo del día a día de los agentes, a diferencia de la flota y los lugares; el rol `driver` queda fuera. Es una suposición: el gateway ya responde 403 si no corresponde y se documentará.

### 2. Conservar lo que no se edita (PUT con campos omitidos)
No consta cómo trata `PUT /packages/{id}` los campos omitidos. Para no perder datos, al editar se construye el cuerpo a partir del registro cargado (`{...registro, ...camposEditados}`) quitando solo los campos de solo lectura (`id`, `tenantId`, `createdAt`, `updatedAt`, `status`, `standardizedAddress`, `geocodingScore`, `geocodingStatus`). El alta envía solo los campos con valor (la guía vacía no se envía).
- *Alternativa descartada:* enviar solo los campos editados. Riesgo de borrar `receiver`, `timeWindow`, etc. si el gateway reemplaza el recurso.
- *Verificación pendiente:* con autorización y una cuenta desechable, comprobar si el reenvío completo es aceptado o rechazado por el gateway real.

### 3. Estado: acción de fila con menú, confirmación solo al cancelar
`PATCH /packages/{id}/status/{status}`. Un `mat-menu` por fila con los valores de `PackageStatus` (de `MasterDomainsService`, con etiqueta en español y la clave como reserva), sin el estado actual. Cancelar pasa por `ConfirmDialogComponent`; el resto es directo. La fila se actualiza con la respuesta; un error se muestra con `DeleteFlow`-like (`FormResult`) sin cambiar la fila.

### 4. Exportación de CSV en el navegador
`shared/data/csv.ts` ofrece `toCsv(rows, columns)` (separador `;`, fin de línea `\r\n`, comillas dobles escapadas, BOM al inicio, apóstrofo delante de textos que empiezan por `=`, `+`, `-`, `@`, tabulación o retorno) y `downloadCsv(name, csv)` (solo en navegador, con `Blob` y enlace temporal). La exportación recorre las páginas de 200 en 200 con `expand`/bucle de RxJS y muestra el progreso ("Exportando… 400 de 1.250"). Columnas del legacy: `ID_GUIA;LONGITUD;LATITUD;CIUDAD;PAIS;DIRECCION;DIRECCION ESTANDARIZADA;PRECISION;ESTADO DE GEOCODIFICACION;ESTADO`, con los estados de geocodificación en español.
- *Alternativa descartada:* pedir al servidor el CSV (no hay endpoint documentado).
- *Límite aceptado:* un tenant con decenas de miles de paquetes tardará; se muestra el progreso y se puede cancelar saliendo de la pantalla (la suscripción se corta).

### 5. Formulario sobre las piezas existentes
Rutas `/paquetes`, `/paquetes/nuevo`, `/paquetes/:id` con `loadChildren`, `roleGuard(OPERATIONS_ROLES)` y `unsavedChangesGuard`. Campos: guía, nombre, tipo de servicio (`ServiceType`), dirección, ciudad, país, código postal, `LocationFieldsComponent`, peso, volumen, piezas y observación. Peso y volumen con `min(0)`; piezas entero ≥ 1. Etiquetas en `package-labels.ts` (`ServiceType`, `PackageStatus`, `GeocodingStatus`).

### 6. Tipo de servicio y estados por dominio, con reserva
Los selectores usan `MasterDomainsService.values('ServiceType'|'PackageStatus')`; si el dominio aún no se ha cargado (o falla) se usan los valores habituales (`pickup`, `delivery`, `mixed` y los cinco estados). Los valores ajenos a las etiquetas conocidas se muestran con su clave.

## Risks / Trade-offs

- [PUT con el cuerpo completo puede ser rechazado o ignorar campos] → Verificación contra el gateway real con autorización; si falla, se reduce el cuerpo a lo editado y se documenta.
- [Rol de agentes sin documentar] → Se parte de administradores y agentes; el gateway decide con 403.
- [La exportación de muchos paquetes es lenta] → Progreso visible y páginas de 200.
- [Sin geocodificación el agente coloca el punto a mano] → Igual que en lugares; el estado de geocodificación existente se conserva y se exporta.
- [`durationStay` sin unidad conocida] → No se edita; se conserva.

## Migration Plan

1. Roles, etiquetas y helper de CSV con pruebas.
2. Listado, cambio de estado y borrado.
3. Formulario de alta y edición.
4. Exportación.
5. Rutas, menú y verificación (build, navegador real) y documentación.

Reversión: todo es aditivo; revertir las rutas y el menú oculta la pantalla.

## Open Questions

- ¿Qué unidad usa `durationStay` y qué formato tienen `timeWindow`, `receiver` y `sender`? Hasta saberlo no se editan.
- ¿Acepta el gateway `geocodingStatus: manual` al colocar el punto a mano? No se envía; se puede añadir cuando se documente.
