# UI (Angular Material) y librerías de terceros

**Decisión:** la UI del proyecto es **Angular Material + CDK**. No uses Bootstrap ni ng-bootstrap, ni los mezcles con Material en el mismo proyecto.

## Versiones (Material va alineado con Angular)

| Angular | `@angular/material` y `@angular/cdk` | Tema |
|---|---|---|
| 21 (`ng-ruteando`) | `21.2.x` | M3 (`mat.theme`), ya aplicado en `src/styles.scss` |
| 19 | `19.x` | M3 estable (`mat.theme` desde 19.2; antes `define-theme`) |

Instalar: `npx ng add @angular/material` (pregunta tema, tipografía y animaciones). Material y CDK van con la misma versión mayor y menor que `@angular/core`.

## Qué hay declarado hoy

`ng-ruteando` ya usa Angular Material 21.2 con tema M3 y un shell (barra superior y menú lateral). `bootstrap`, `@popperjs/core` y `@ng-bootstrap/ng-bootstrap` ya se retiraron. Se mantienen `ol`, `jspdf` y `@faker-js/faker` (aún sin uso).

## Tema

`ng-ruteando` (Angular 21, M3), en `src/styles.scss`, definido **una sola vez**:
```scss
@use '@angular/material' as mat;
html {
  color-scheme: light;
  @include mat.theme((color: (primary: mat.$violet-palette, tertiary: mat.$rose-palette, theme-type: light), typography: Roboto, density: 0));
}
```
En M3 `color="primary"` ya no tiñe `mat-toolbar` por defecto: el shell lo conserva con `mat.toolbar-overrides` e `mat.icon-button-overrides` sobre `.mat-toolbar.mat-primary`, usando los tokens `--mat-sys-primary` y `--mat-sys-on-primary`. Los colores de marca definitivos están pendientes. No uses las funciones M2 (`define-light-theme`, `define-palette`, `m2-*`) ni `mat.core()` (en Material 19 es un no-op y en 21 desaparece).

Referencia de la versión 19.2+ (M3):
```scss
@use '@angular/material' as mat;
html {
  color-scheme: light dark;
  @include mat.theme((color: mat.$azure-palette, typography: Roboto, density: 0));
}
```
Modo oscuro con `color-scheme`. En 19.0/19.1 usa `mat.define-theme` + `mat.all-component-themes`.

Fuentes: `Roboto` e iconos `Material Symbols`/`Material Icons` por `<link>` en `index.html` (o autohospedados para no depender de Google en producción).

## Animaciones

- `provideAnimationsAsync()` en `app.config.ts`.

## Componentes standalone

Importa solo lo que uses en `imports` del componente:
```ts
imports: [MatTableModule, MatSortModule, MatPaginatorModule, MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule]
```
En NgModule, añade esos mismos módulos al `imports` del módulo de la feature (o crea un `MaterialModule` compartido con exports).

## Equivalencias con Material

| Componente habitual (Bootstrap 3 / terceros) | Angular Material |
|---|---|
| ng-table, ag-grid, ui-grid, datatables | `MatTable` + `MatSort` + `MatPaginator` (`MatTableDataSource`); virtual scroll del CDK para listas grandes |
| ui-bootstrap modal, ngDialog | `MatDialog` (`inject(MatDialog)`), datos con `MAT_DIALOG_DATA` |
| toastr, angularjs-toaster | `MatSnackBar` |
| ui-select, chosen, select3 | `MatSelect` / `MatAutocomplete` |
| datepicker/timepicker de ui-bootstrap | `MatDatepicker` (+ `provideNativeDateAdapter()` o `moment-adapter`) |
| sidebar | `MatSidenav` + `MatNavList`/`MatTree` |
| navbar | `MatToolbar` |
| tabs | `MatTabs` con `routerLink` (`mat-tab-nav-bar`) |
| acordeones, panels | `MatExpansionPanel`, `MatCard` |
| wizard | `MatStepper` |
| loading-bar | `MatProgressBar` / `MatProgressSpinner` |
| fontawesome 4, simple-line-icons | `MatIcon` (Material Symbols) |
| tooltips, popovers | `MatTooltip`, `cdk/overlay` |
| sortable (ui-sortable) | `cdk/drag-drop` (útil para ordenar paradas/visitas de una ruta) |

## Layout sin rejilla Bootstrap

Material no trae rejilla. Usa CSS Grid/Flexbox en SCSS del componente. **No uses `@angular/flex-layout`** (deprecado, sin soporte). Rejilla por breakpoints con `BreakpointObserver` del CDK cuando haga falta lógica; en SCSS, media queries.

## Buenas prácticas con Material

- Formularios: `mat-form-field` + `matInput` + `<mat-error>` con Reactive Forms tipados.
- Densidad: `density: -2` para tablas de datos densas (mejor en paneles de gestión).
- SSR: Material funciona con hidratación; cuida `MatDialog`/`Overlay` solo en navegador.
- Personalización por componente con tokens/variables CSS del tema, no con `::ng-deep` sobre clases internas.
- **Presupuesto de estilos en `ng-ruteando`:** `anyComponentStyle` 2kb/4kb. El tema va en `styles.scss` (global); no lo repitas por componente.
- Accesibilidad: los componentes ya traen ARIA; no los rompas con `div` clicables.

## OpenLayers (`ol` 10)

```ts
import Map from 'ol/Map'; import View from 'ol/View';
import TileLayer from 'ol/layer/Tile'; import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
```
- Teselas **OSM** (sin tokens; el commit `1b42631` eliminó Mapbox). Respeta atribución.
- Crear el `Map` en `ngAfterViewInit` (o `afterNextRender` en SSR) sobre un `ViewChild`; `map.setTarget(undefined)` en `ngOnDestroy`.
- Rutas: `ol/format/GeoJSON` con ejemplos en `server/path/*.geojson` (lon/lat EPSG:4326 → `fromLonLat`).
- Eventos de mapa frecuentes fuera de zona: `NgZone.runOutsideAngular`, y `ngZone.run` al cambiar estado.
- Cargar con `import()` dinámico dentro de `@defer` para no inflar el bundle inicial.
- CSS: `@import 'ol/ol.css'` en `styles.scss`.
- Contenedor del mapa con alto explícito dentro de `mat-sidenav-content`/`mat-card`.

## jsPDF (retirado de las dependencias; notas para cuando se vuelva a añadir)

- Import dinámico en navegador: `const { jsPDF } = await import('jspdf');`.
- Tablas: `jspdf-autotable` compatible con jspdf 2.x.
- Fuentes con acentos: embebe una TTF.

## Otros

- `@faker-js/faker` ^9: solo datos de desarrollo/mocks; no al bundle de producción.
