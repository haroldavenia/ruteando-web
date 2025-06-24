# Servicio SVG a PNG Exporter

## Descripción

El servicio `SvgPngExporterService` permite exportar elementos SVG a formato PNG, preservando la funcionalidad del proyecto master pero modernizada para Angular 19. Este servicio utiliza `html2canvas` para la conversión, manteniendo compatibilidad con las funcionalidades existentes.

## Características

- ✅ Exportación de elementos SVG a PNG
- ✅ Exportación de strings SVG a PNG
- ✅ Exportación de mapas con controles opcionales
- ✅ Exportación de gráficos y visualizaciones
- ✅ Exportación múltiple de elementos
- ✅ Método nativo para mejor rendimiento
- ✅ Compatible con OpenLayers (usado en el proyecto master)
- ✅ Soporte para diferentes layouts
- ✅ Configuración flexible de opciones

## Instalación

El servicio ya está incluido en el proyecto. Las dependencias necesarias son:

```bash
npm install html2canvas file-saver
npm install --save-dev @types/file-saver
```

## Uso Básico

### Importar el servicio

```typescript
import { SvgPngExporterService } from '../shared/services/svg-png-exporter.service';

constructor(private svgPngExporter: SvgPngExporterService) {}
```

### Exportar un elemento SVG

```typescript
// Obtener el elemento SVG
const svgElement = document.querySelector('#mi-svg') as HTMLElement;

// Exportar a PNG
await this.svgPngExporter.exportSvgToPng(
  svgElement, 
  'mi-exportacion.png',
  {
    scale: 2,
    backgroundColor: '#ffffff',
    quality: 1.0
  }
);
```

### Exportar un string SVG

```typescript
const svgString = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>';

await this.svgPngExporter.exportSvgStringToPng(
  svgString,
  'circulo.png',
  {
    width: 200,
    height: 200,
    backgroundColor: '#f0f0f0'
  }
);
```

## Opciones de Configuración

```typescript
interface SvgPngExportOptions {
  width?: number;              // Ancho del PNG resultante
  height?: number;             // Alto del PNG resultante
  scale?: number;              // Factor de escala (default: 2)
  backgroundColor?: string;    // Color de fondo (default: '#ffffff')
  quality?: number;            // Calidad del PNG (0-1, default: 1.0)
  includeControls?: boolean;   // Incluir controles de mapa
  includeLegend?: boolean;     // Incluir leyenda
  includeTitle?: boolean;      // Incluir título
  layout?: 'horizontal' | 'vertical' | 'grid'; // Layout para múltiples elementos
  spacing?: number;            // Espaciado entre elementos
}
```

## Casos de Uso Específicos

### Exportar Mapas (Compatible con OpenLayers)

```typescript
const mapElement = document.querySelector('.map-container') as HTMLElement;

await this.svgPngExporter.exportMapToPng(
  mapElement,
  'mi-mapa.png',
  {
    width: 800,
    height: 600,
    includeControls: false,  // Ocultar controles de zoom
    includeLegend: true,     // Mantener leyenda
    backgroundColor: '#ffffff'
  }
);
```

### Exportar Gráficos

```typescript
const chartElement = document.querySelector('.chart-container') as HTMLElement;

await this.svgPngExporter.exportChartToPng(
  chartElement,
  'mi-grafico.png',
  {
    width: 600,
    height: 400,
    includeLegend: true,
    includeTitle: false,  // Ocultar título
    backgroundColor: '#fafafa'
  }
);
```

### Exportar Múltiples Elementos

```typescript
const elements = [
  document.querySelector('#svg1') as HTMLElement,
  document.querySelector('#svg2') as HTMLElement,
  document.querySelector('#svg3') as HTMLElement
];

await this.svgPngExporter.exportMultipleSvgsToPng(
  elements,
  'multiples-elementos.png',
  {
    layout: 'grid',        // 'horizontal', 'vertical', 'grid'
    spacing: 20,
    backgroundColor: '#ffffff'
  }
);
```

### Método Nativo (Más Rápido)

```typescript
const svgElement = document.querySelector('svg') as SVGElement;

await this.svgPngExporter.exportSvgToPngNative(
  svgElement,
  'exportacion-nativa.png',
  {
    width: 400,
    height: 300,
    backgroundColor: '#ffffff'
  }
);
```

## Métodos de Utilidad

### Obtener Dimensiones de SVG

```typescript
const svgElement = document.querySelector('svg') as SVGElement;
const dimensions = this.svgPngExporter.getSvgDimensions(svgElement);
console.log(`Ancho: ${dimensions.width}, Alto: ${dimensions.height}`);
```

### Validar si es Elemento SVG

```typescript
const element = document.querySelector('#mi-elemento') as HTMLElement;
if (this.svgPngExporter.isSvgElement(element)) {
  console.log('Es un elemento SVG');
}
```

## Ejemplos de Integración

### En un Componente Angular

```typescript
import { Component, ViewChild, ElementRef } from '@angular/core';
import { SvgPngExporterService } from '../shared/services/svg-png-exporter.service';

@Component({
  selector: 'app-mapa',
  template: `
    <div #mapContainer class="map-container">
      <!-- Contenido del mapa -->
    </div>
    <button (click)="exportarMapa()">Exportar Mapa</button>
  `
})
export class MapaComponent {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  constructor(private svgPngExporter: SvgPngExporterService) {}

  async exportarMapa() {
    try {
      await this.svgPngExporter.exportMapToPng(
        this.mapContainer.nativeElement,
        `mapa-${new Date().toISOString().split('T')[0]}.png`,
        {
          width: 800,
          height: 600,
          includeControls: false,
          includeLegend: true
        }
      );
    } catch (error) {
      console.error('Error al exportar mapa:', error);
    }
  }
}
```

### En un Servicio

```typescript
import { Injectable } from '@angular/core';
import { SvgPngExporterService } from './svg-png-exporter.service';

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  constructor(private svgPngExporter: SvgPngExporterService) {}

  async generarReporteVisual(elementos: HTMLElement[]) {
    const nombreArchivo = `reporte-${new Date().toISOString().split('T')[0]}.png`;
    
    await this.svgPngExporter.exportMultipleSvgsToPng(
      elementos,
      nombreArchivo,
      {
        layout: 'vertical',
        spacing: 30,
        backgroundColor: '#ffffff',
        scale: 2
      }
    );
  }
}
```

## Compatibilidad con el Proyecto Master

Este servicio preserva la funcionalidad del proyecto master:

- ✅ Usa `html2canvas` como en el proyecto original
- ✅ Compatible con OpenLayers (controles `.ol-control`, `.ol-zoom`)
- ✅ Soporte para mapas y gráficos
- ✅ Exportación de múltiples elementos
- ✅ Configuración flexible

### Diferencias con el Master

| Característica | Master | Angular 19 |
|----------------|--------|------------|
| Sintaxis | JavaScript ES5 | TypeScript ES2020+ |
| Inyección | AngularJS | Angular Dependency Injection |
| Promesas | Callbacks | Async/Await |
| Tipos | Dinámicos | Estáticos con TypeScript |
| Modularidad | Factory | Injectable Service |

## Manejo de Errores

```typescript
try {
  await this.svgPngExporter.exportSvgToPng(element, 'export.png');
} catch (error) {
  console.error('Error en la exportación:', error);
  // Manejar el error apropiadamente
}
```

## Consideraciones de Rendimiento

- **Escala**: Usar `scale: 1` para mejor rendimiento, `scale: 2` para mejor calidad
- **Tamaño**: Elementos grandes pueden tomar más tiempo
- **Método nativo**: Más rápido pero menos compatible
- **Múltiples elementos**: Considerar el uso de Web Workers para elementos muy grandes

## Troubleshooting

### Error: "No se pudo obtener el contexto 2D del canvas"
- Verificar que el elemento existe en el DOM
- Asegurar que el navegador soporta canvas

### Error: "Error al cargar la imagen SVG"
- Verificar que el SVG es válido
- Comprobar que no hay problemas de CORS

### Error: "Error al generar el blob del PNG"
- Verificar permisos de escritura
- Comprobar espacio disponible en disco

## Dependencias

- `html2canvas`: Para la conversión de HTML/SVG a canvas
- `file-saver`: Para la descarga de archivos
- `@types/file-saver`: Tipos TypeScript para file-saver

## Licencia

Este servicio es parte del proyecto Ruteando y mantiene la misma licencia del proyecto principal. 