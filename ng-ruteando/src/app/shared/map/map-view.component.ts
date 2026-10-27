import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type OlMap from 'ol/Map';

import { LatLng, latLng, toOlCoordinate } from '../../core/geo/lat-lng';

import { MAP_CONFIG } from './map-config';
import { OPENLAYERS_LOADER, OpenLayers } from './openlayers';

/** Redondea a 6 decimales (~10 cm) y lleva la longitud a -180..180 si el mapa dio la vuelta al mundo. */
function normalize(lon: number, lat: number): LatLng {
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  const round = (n: number) => Math.round(n * 1e6) / 1e6;
  return { lat: round(lat), lng: round(wrapped) };
}

/**
 * Mapa con un marcador opcional. Solo se dibuja en el navegador (OpenLayers se carga bajo demanda); en el
 * servidor deja un hueco del mismo tamaño. Con `selectable`, un clic coloca el marcador y se puede
 * arrastrar; `pointChange` emite solo acciones de la persona, no los cambios que llegan por `point`.
 * El mapa no se puede operar con teclado: quien lo use debe ofrecer también campos de coordenadas.
 */
@Component({
  selector: 'app-map-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #host class="map" role="region" [attr.aria-label]="ariaLabel()"></div>
    @if (failed()) {
      <p class="failed" role="alert">No se pudo cargar el mapa. Puedes seguir usando los campos de coordenadas.</p>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .map {
      height: var(--app-map-height, 320px);
      background: var(--mat-sys-surface-container);
      border-radius: var(--mat-sys-corner-medium, 12px);
      overflow: hidden;
    }
    .failed {
      margin: 8px 0 0;
      color: var(--mat-sys-error);
    }
  `,
})
export class MapViewComponent {
  readonly point = input<LatLng | null>(null);
  readonly selectable = input(false);
  readonly ariaLabel = input('Mapa');
  readonly pointChange = output<LatLng>();

  /** El mapa de OpenLayers, o `null` mientras carga, en el servidor o si falló; para pruebas. */
  readonly olMap = signal<OlMap | null>(null);
  protected readonly failed = signal(false);

  private readonly config = inject(MAP_CONFIG);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly load = inject(OPENLAYERS_LOADER);

  private ol: OpenLayers | null = null;
  private marker: InstanceType<OpenLayers['Feature']> | null = null;
  private translate: InstanceType<OpenLayers['Translate']> | null = null;
  private destroyed = false;

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
      const point = this.point();
      if (this.ol) {
        this.showPoint(point);
      }
    });
    effect(() => {
      const selectable = this.selectable();
      this.translate?.setActive(selectable);
    });
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

    const source = new ol.VectorSource();
    this.marker = new ol.Feature();
    source.addFeature(this.marker);
    const markerLayer = new ol.VectorLayer({
      source,
      style: new ol.Style({
        image: new ol.CircleStyle({
          radius: 9,
          fill: new ol.Fill({ color: '#6200ee' }),
          stroke: new ol.Stroke({ color: '#ffffff', width: 3 }),
        }),
      }),
    });
    const tiles = new ol.TileLayer({ source: new ol.XYZ({ url: tilesUrl, attributions: attribution }) });
    tiles.getSource()?.on('tileloaderror', () => this.failed.set(true));
    tiles.getSource()?.on('tileloadend', () => this.failed.set(false));

    const initial = this.point();
    const start = (initial && toOlCoordinate(initial)) ?? toOlCoordinate(center) ?? [0, 0];
    const map = new ol.Map({
      target: this.host().nativeElement,
      layers: [tiles, markerLayer],
      view: new ol.View({ center: ol.fromLonLat(start), zoom }),
      // La atribución del proveedor debe verse siempre: sin el botón que la pliega
      controls: ol.defaultControls({ attributionOptions: { collapsible: false } }),
    });

    this.translate = new ol.Translate({ layers: [markerLayer] });
    this.translate.setActive(this.selectable());
    this.translate.on('translateend', () => {
      const [lon, lat] = ol.toLonLat((this.marker?.getGeometry() as InstanceType<OpenLayers['Point']>).getCoordinates());
      this.pointChange.emit(normalize(lon, lat));
    });
    map.addInteraction(this.translate);

    map.on('click', (event) => {
      if (!this.selectable()) {
        return;
      }
      const [lon, lat] = ol.toLonLat(event.coordinate);
      const picked = normalize(lon, lat);
      this.showPoint(picked, false);
      this.pointChange.emit(picked);
    });

    this.olMap.set(map);
    this.showPoint(initial, false);
  }

  /** Coloca (o quita) el marcador; con `recenter` mueve el mapa si el punto queda fuera de la vista. */
  private showPoint(point: LatLng | null, recenter = true): void {
    const ol = this.ol;
    const map = this.olMap();
    if (!ol || !map || !this.marker) {
      return;
    }
    const coordinate = point && latLng(point.lat, point.lng) ? toOlCoordinate(point) : null;
    if (!coordinate) {
      this.marker.setGeometry(undefined);
      return;
    }
    const projected = ol.fromLonLat(coordinate);
    this.marker.setGeometry(new ol.Point(projected));
    if (recenter) {
      const view = map.getView();
      const extent = view.calculateExtent(map.getSize());
      const inside = projected[0] >= extent[0] && projected[0] <= extent[2] && projected[1] >= extent[1] && projected[1] <= extent[3];
      if (!inside) {
        view.setCenter(projected);
      }
    }
  }
}
