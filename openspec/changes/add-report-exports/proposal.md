# Proposal

## Why

La app AngularJS exportaba el reporte de jornadas y rutas a XLSX y PDF (lista de visitas con distancia y zona); la nueva solo exporta CSV.

## What Changes

- Detalle de ruta: «Exportar a Excel» (una hoja con las visitas) y «Exportar a PDF» (título, resumen de la ruta y la tabla de visitas).
- Detalle de jornada: «Exportar a Excel» (un libro con una hoja por ruta).
- Columnas por visita: orden, tipo, nº de guía, paquete, dirección, ciudad, zona, llegada, salida, estancia (min), distancia (m) y estado. Los paquetes se leen de a 6 y las zonas de `GET /zones`; lo que falle deja celdas vacías.
- Librerías cargadas solo al exportar: `write-excel-file/universal` (sin Web Workers, por la CSP) y `jspdf` + `jspdf-autotable`.

## Fuera de alcance

PDF de jornada (la app vieja lo tenía comentado), gráficos, y leer la zona o la estancia del gateway (la zona sale del paquete; la estancia, de llegada y salida de la parada).

## Notas

El trozo de jspdf pesa ~406 kB (más uno de html2canvas que no se usa) y entra en la caché de instalación de la PWA. Se probó en Chrome con el gateway simulado: el .xlsx es un zip válido, el .pdf empieza por `%PDF-` y no hay violaciones de CSP.
