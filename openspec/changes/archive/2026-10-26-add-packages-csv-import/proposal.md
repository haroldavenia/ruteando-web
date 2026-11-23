# Proposal

## Why

Crear paquetes de uno en uno solo sirve para pruebas: en la operación real las empresas cargan **cientos de paquetes de una vez** desde una hoja de cálculo, y el legacy lo resolvía con la subida de un CSV (`journeys_form`, con una guía de ayuda y un archivo de ejemplo) que el servidor geocodificaba. La subida del gateway (`POST /packages/upload`) no tiene contrato documentado (la captura devuelve 400) y la geocodificación tampoco, así que la aplicación nueva no puede importar nada. Sin una importación, el flujo planificación → jornada no es utilizable con volúmenes reales. El plan B que ya quedó anotado en `gateway-api.md` es leer el CSV en el navegador y crear los paquetes con `create()`: es lo que esta fase hace, sin depender de contratos desconocidos.

## What Changes

- Pantalla **Importar paquetes** (`/paquetes/importar`), accesible desde el listado de paquetes, con un flujo en tres pasos: elegir el archivo, revisar la vista previa y confirmar la importación.
- **Plantilla descargable** (`plantilla-paquetes.csv`) con las columnas esperadas, una fila de ejemplo y una guía de campos en la propia pantalla.
- **Lectura en el navegador**: CSV en UTF-8 (con o sin BOM), separador `;` o `,` detectado, comillas y saltos de línea dentro de los textos, con un límite de tamaño y de filas. Nada se envía al servidor hasta confirmar.
- **Validación por fila** con mensajes en español que indican la línea y el campo (nombre, dirección, coordenadas, peso, volumen, tipo de servicio, piezas, guía repetida dentro del propio archivo), y una **vista previa** con el total de filas válidas e inválidas y la lista de errores.
- **Importación** con las filas válidas: se crean con `PackagesApi.create` con una concurrencia acotada, con **progreso**, **cancelación** y un **resumen** de creadas, repetidas (guía ya existente, 409) y fallidas; las fallidas se pueden **reintentar** y descargar como **informe CSV** con el motivo.
- Como el gateway no geocodifica, el archivo debe traer **longitud y latitud**; las filas sin coordenadas se rechazan con un mensaje que lo explica.
- Fuera de alcance: geocodificar direcciones, el endpoint `POST /packages/upload` (se adoptará cuando se documente su contrato, sin cambiar la pantalla), importar `.xlsx`, ventanas horarias, remitente y destinatario, y actualizar paquetes existentes (solo se crean).

## Capabilities

### New Capabilities
- `package-import`: importar paquetes desde un CSV leído en el navegador, con plantilla, validación por fila, vista previa, creación con progreso y cancelación, resumen, reintento de fallidas e informe de errores.

### Modified Capabilities
- `package-management`: el listado de paquetes ofrece el acceso a la importación.

## Impact

- Código nuevo: `ng-ruteando/src/app/features/packages/import/**` (lector de CSV, mapeo y validación de filas, ejecutor de la importación, pantalla) y `parseCsv` en `shared/data/csv.ts`.
- Modificado: `features/packages/package-list.component.ts` (botón «Importar CSV»), `packages.routes.ts` y pruebas.
- Dependencias: ninguna nueva (el lector es propio, pequeño y probado; no se añade una librería de CSV).
- Requiere: `add-journey-routes-map` archivado (ya lo está) y `add-packages-management` (aporta `PackagesApi.create` y el formulario de referencia).
- Riesgos: una petición por paquete (miles de peticiones) puede chocar con límites del gateway no documentados: concurrencia baja (4), pausa ante 429 y límite de 2000 filas por importación; una importación parcial no es transaccional (si falla a mitad quedan creadas las anteriores): el resumen y el reintento lo hacen explícito; la guía es única por tenant (409) y sin guía no hay forma de detectar repetidos al reimportar el mismo archivo (se avisa); el CSV es datos de entrada no fiable: se tratan como texto, se recortan y se validan longitud y rango, y nunca se interpretan como fórmulas ni como HTML; sin geocodificación el archivo exige coordenadas, que muchas hojas no tienen (es la mayor diferencia con el legacy y queda como pregunta para el equipo del gateway); los textos con tildes dependen de la codificación: se espera UTF-8 y se avisa si aparecen caracteres de sustitución.
- Sin impacto en `server/` ni en `master/`.
