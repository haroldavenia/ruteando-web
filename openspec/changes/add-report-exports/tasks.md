# Tasks

## 1. Implementación

- [x] 1.1 Dependencias (`write-excel-file`, `jspdf`, `jspdf-autotable`) con la auditoría de producción limpia
- [x] 1.2 `shared/data/report-files.ts` (Excel, PDF, nombres de hoja, descarga)
- [x] 1.3 `route-report.ts` (filas, resumen, nombre de archivo) y `route-report-export.ts` (lectura de paquetes y zonas)
- [x] 1.4 Botones en el detalle de ruta y de jornada, traducciones (es/en/pt) y pruebas

## 2. Verificación

- [x] 2.1 Pruebas (incluye generar un .xlsx y un .pdf reales), `pnpm lint`, `pnpm format`, `i18n-check`, `icon-names`, `build:web` sin avisos y `pnpm audit --prod`
- [x] 2.2 Probado en Chrome con el gateway simulado (ruta y jornada), sin violaciones de CSP
- [ ] 2.3 Abrir los archivos en Excel y en un lector de PDF reales
