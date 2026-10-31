import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type OlMap from 'ol/Map';

import { Place } from '../../core/api/models';
import { fromGeoJsonPoint } from '../../core/geo/lat-lng';
import { ThemeService } from '../../core/theme/theme.service';
import { MAP_CONFIG } from '../../shared/map/map-config';
import { readMapPalette, readableOn } from '../../shared/map/map-palette';
import { OPENLAYERS_LOADER, OpenLayers } from '../../shared/map/openlayers';
import { routeColorFor } from '../../shared/map/route-colors';

import { PLACE_TYPE_LABELS, placeTypeLabel } from './place-labels';

/**
 * Mapa de los lugares: un pin por lugar, del color y con la letra de su tipo (el color nunca es la única señal), y la leyenda de
 * los tipos que hay. Dibuja los lugares que recibe (la lista ya filtrada) y se ajusta para mostrarlos todos; un clic en un pin
 * emite su id. Solo se dibuja en el navegador (OpenLayers se carga bajo demanda). El mapa no se maneja con teclado: la lista de
 * al lado es la alternativa accesible.
 */
@Component({
  selector: 'app-places-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #host class="map" role="region" aria-label="Mapa de los lugares: un pin por lugar, con el color y la letra de su tipo"></div>
    @if (failed()) {
      <p class="failed" role="alert">No se pudo cargar el mapa. Puedes seguir usando la lista.</p>
    }
    <ul class="legend" aria-label="Tipos de lugar">
      @for (item of legend(); track item.key) {
        <li><span class="pin" [style.background]="item.color" [style.color]="item.ink" aria-hidden="true">{{ item.letter }}</span>{{ item.label }}</li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }
    .map {
      height: var(--app-map-height, 360px);
      background: var(--mat-sys-surface-container);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 16px;
      overflow: hidden;
    }
    .failed {
      margin: 8px 0 0;
      color: var(--mat-sys-error);
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
      margin: 12px 0 0;
      padding: 0;
      list-style: none;
      font: var(--mat-sys-body-medium);
    }
    .legend li {
      display: inline-flex;
      gap: 8px;
      align-items: center;
    }
    .pin {
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      font: 700 12px var(--mat-sys-title-large-font);
    }
  `,
})
export class PlacesMapComponent {
  /** Los lugares que se dibujan (los que no tienen una ubicación válida se omiten). */
  readonly places = input.required<readonly Place[]>();
  /** El lugar resaltado con un anillo. */
  readonly selectedId = input<string | null>(null);
  readonly placeSelect = output<string>();

  /** El mapa de OpenLayers, o `null` mientras carga, en el servidor o si falló; para pruebas. */
  readonly olMap = signal<OlMap | null>(null);
  protected readonly failed = signal(false);

  private readonly config = inject(MAP_CONFIG);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly load = inject(OPENLAYERS_LOADER);
  private readonly theme = inject(ThemeService);
  private readonly document = inject(DOCUMENT);

  private ol: OpenLayers | null = null;
  private source: InstanceType<OpenLayers['VectorSource']> | null = null;
  private layer: InstanceType<OpenLayers['VectorLayer']> | null = null;
  private styles = new Map<string, InstanceType<OpenLayers['Style']>[]>();
  private destroyed = false;

  /** Los tipos en un orden estable: primero los que conoce la aplicación y después los que traigan los lugares. */
  private readonly typeOrder = computed(() => {
    const known = Object.keys(PLACE_TYPE_LABELS);
    const unknown = [...new Set(this.places().map((p) => p.type))].filter((type) => !known.includes(type));
    return [...known, ...unknown];
  });

  protected readonly legend = computed(() => {
    const scheme = this.theme.scheme();
    const present = new Set(this.places().map((p) => p.type));
    return this.typeOrder()
      .filter((type) => present.has(type))
      .map((type) => {
        const color = routeColorFor(this.typeOrder().indexOf(type), scheme);
        return { key: type, label: placeTypeLabel(type), letter: this.letter(type), color, ink: readableOn(color) };
      });
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.olMap()?.setTarget(undefined);
      this.olMap()?.dispose();
    });
    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => void this.init());
    }
    effect(() => {
      this.places();
      if (this.ol) {
        this.showPlaces(true);
      }
    });
    effect(() => {
      this.selectedId();
      this.layer?.changed();
    });
    // Cambio de tema: el canvas no se entera solo, así que se vuelven a calcular los estilos con los colores del tema nuevo
    effect(() => {
      this.theme.scheme();
      this.styles.clear();
      this.layer?.changed();
    });
  }

  private letter(type: string): string {
    return (placeTypeLabel(type)[0] ?? '?').toUpperCase();
  }

  private async init(): Promise<void> {
    let ol: OpenLayers;
    try {
      ol = await this.load();
    } catch {
      this.failed.set(true);
      return;
    }
    if (this.destroyed) {
      return;
    }
    this.ol = ol;
    const { tilesUrl, attribution, center, zoom } = this.config;

    this.source = new ol.VectorSource();
    const layer = new ol.VectorLayer({ source: this.source, style: (feature) => this.styleOf(ol, feature.get('type') as string, feature.get('id') === this.selectedId()) });
    this.layer = layer;
    // `app-tiles`: en el tema oscuro las teselas se oscurecen con un filtro de la hoja global (los pines no se tocan)
    const tiles = new ol.TileLayer({ className: 'app-tiles', source: new ol.XYZ({ url: tilesUrl, attributions: attribution }) });
    tiles.getSource()?.on('tileloaderror', () => this.failed.set(true));
    tiles.getSource()?.on('tileloadend', () => this.failed.set(false));

    const map = new ol.Map({
      target: this.host().nativeElement,
      layers: [tiles, layer],
      view: new ol.View({ center: ol.fromLonLat([center.lng, center.lat]), zoom }),
      // La atribución del proveedor debe verse siempre: sin el botón que la pliega
      controls: ol.defaultControls({ attributionOptions: { collapsible: false }, zoomOptions: { zoomInTipLabel: 'Acercar el mapa', zoomOutTipLabel: 'Alejar el mapa' } }),
    });
    map.on('click', (event) => {
      const id = map.forEachFeatureAtPixel(event.pixel, (feature) => feature.get('id') as unknown, { layerFilter: (l) => l === layer, hitTolerance: 6 });
      if (typeof id === 'string') {
        this.placeSelect.emit(id);
      }
    });

    this.olMap.set(map);
    this.showPlaces(true);
  }

  /** Un círculo con la letra del tipo, de su color, y, si es el elegido, un anillo alrededor. */
  private styleOf(ol: OpenLayers, type: string, selected: boolean): InstanceType<OpenLayers['Style']>[] {
    const key = `${type}|${selected}`;
    const cached = this.styles.get(key);
    if (cached) {
      return cached;
    }
    const palette = readMapPalette(this.theme.scheme(), this.document);
    const color = routeColorFor(this.typeOrder().indexOf(type), this.theme.scheme());
    const styles = [
      new ol.Style({
        image: new ol.CircleStyle({ radius: 11, fill: new ol.Fill({ color }), stroke: new ol.Stroke({ color: palette.halo, width: 3 }) }),
        text: new ol.TextStyle({ text: this.letter(type), fill: new ol.Fill({ color: readableOn(color) }), font: '700 12px sans-serif' }),
      }),
    ];
    if (selected) {
      styles.unshift(new ol.Style({ image: new ol.CircleStyle({ radius: 17, stroke: new ol.Stroke({ color: palette.ink, width: 3 }) }) }));
    }
    this.styles.set(key, styles);
    return styles;
  }

  /** Dibuja un pin por lugar con ubicación válida y, con `fit`, ajusta la vista para que se vean todos. */
  private showPlaces(fit: boolean): void {
    const ol = this.ol;
    const map = this.olMap();
    if (!ol || !map || !this.source) {
      return;
    }
    this.source.clear();
    for (const place of this.places()) {
      const point = fromGeoJsonPoint(place.location?.coordinates);
      if (!point) {
        continue;
      }
      const feature = new ol.Feature({ geometry: new ol.Point(ol.fromLonLat([point.lng, point.lat])), id: place.id, type: place.type });
      this.source.addFeature(feature);
    }
    const extent = this.source.getExtent();
    if (fit && extent && this.source.getFeatures().length > 0 && !ol.isEmpty(extent)) {
      map.updateSize();
      map.getView().fit(extent, { padding: [48, 48, 48, 48], maxZoom: 15, duration: 0 });
    }
  }
}
