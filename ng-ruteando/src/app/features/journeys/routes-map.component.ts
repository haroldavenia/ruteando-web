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
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type OlMap from 'ol/Map';
import type { FeatureLike } from 'ol/Feature';
import type VectorLayer from 'ol/layer/Vector';
import type VectorSource from 'ol/source/Vector';

import { DomainRoute } from '../../core/api/models';
import { toOlCoordinate } from '../../core/geo/lat-lng';
import { ThemeService } from '../../core/theme/theme.service';
import { formatDateTime, formatDistance } from '../../shared/format';
import { MAP_CONFIG } from '../../shared/map/map-config';
import { MapPalette, readMapPalette, readableOn, toRgba } from '../../shared/map/map-palette';
import { OPENLAYERS_LOADER, OpenLayers } from '../../shared/map/openlayers';
import { routeColorFor } from '../../shared/map/route-colors';
import { LonLat, lonLatBounds, routeCoordinates, routeLine, routeStops } from '../../shared/map/route-geometry';
import { ActionTitleDirective } from '../../shared/ui/action-title.directive';

import { stopTypeLabel } from './journey-labels';

export interface StopRef {
  routeIndex: number;
  sequence: number;
}

interface LegendItem {
  routeIndex: number;
  name: string;
  vehicle: string;
  distance: string;
  color: string;
  dashed: boolean;
}

const DEPOT = 'depot';
const FIT_PADDING = [48, 48, 48, 48];
const MAX_FIT_ZOOM = 16;
const SINGLE_POINT_ZOOM = 15;

/**
 * Mapa de solo lectura con las rutas de una jornada: una línea por ruta con su color, paradas
 * numeradas y depósitos con una «D». Se dibuja solo en el navegador (OpenLayers se carga bajo demanda).
 * La leyenda y la ficha de parada son accesibles con teclado y cubren la información del mapa para quien
 * no pueda usarlo. `selectedRoute` y `selectedStop` se comparten con la pantalla (tablas de rutas y paradas).
 */
@Component({
  selector: 'app-routes-map',
  imports: [MatButtonModule, MatIconModule, RouterLink, ActionTitleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routes-map.component.html',
  styleUrl: './routes-map.component.scss',
})
export class RoutesMapComponent {
  readonly routes = input.required<readonly DomainRoute[]>();
  readonly selectedRoute = model<number | null>(null);
  readonly selectedStop = model<StopRef | null>(null);

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
  /** Colores de las marcas con el tema que se ve; se renuevan al cambiar el tema. */
  private palette: MapPalette | null = null;
  private routeLayer: VectorLayer<VectorSource> | null = null;
  private stopLayer: VectorLayer<VectorSource> | null = null;
  private destroyed = false;
  private opener: HTMLElement | null = null;
  /** Lo último que ya se dibujó o enfocó: los efectos no lo repiten (evita pisar lo que hizo `init`). */
  private drawn: readonly DomainRoute[] | null = null;
  private fitted: number | null | undefined = undefined;
  private centered: StopRef | null = null;

  protected readonly legend = computed<LegendItem[]>(() =>
    this.routes().map((route) => ({
      routeIndex: route.routeIndex,
      name: route.name,
      vehicle: route.resource ? (route.resource.plate ? `${route.resource.name} (${route.resource.plate})` : route.resource.name) : '—',
      distance: formatDistance(route.distanceTraveled),
      color: routeColorFor(route.routeIndex, this.theme.scheme()),
      dashed: routeLine(route)?.dashed ?? false,
    })),
  );

  /** `true` si no hay nada que dibujar: sin rutas, o ninguna con línea ni paradas con posición. */
  protected readonly nothingToDraw = computed(() => routeCoordinates(this.routes()).length === 0);

  protected readonly stopCard = computed(() => {
    const ref = this.selectedStop();
    if (!ref) {
      return null;
    }
    const route = this.routes().find((r) => r.routeIndex === ref.routeIndex);
    const waypoint = route?.waypoints.find((w) => w.sequence === ref.sequence);
    return route && waypoint
      ? {
          route,
          waypoint,
          color: routeColorFor(route.routeIndex, this.theme.scheme()),
          type: stopTypeLabel(waypoint.stopType),
          arrival: formatDateTime(waypoint.arrivalUtc),
          departure: formatDateTime(waypoint.departureUtc),
        }
      : null;
  });

  protected readonly routeFocusText = computed(() => {
    const index = this.selectedRoute();
    const route = index === null ? null : this.routes().find((r) => r.routeIndex === index);
    return route ? `Ruta enfocada: ${route.name}` : '';
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
    // Rutas nuevas: se reconstruyen las capas y se encuadra todo
    effect(() => {
      const routes = this.routes();
      untracked(() => {
        if (this.ol && routes !== this.drawn) {
          this.drawRoutes(routes);
          this.fit(this.selectedRoute());
        }
      });
    });
    // Cambio de tema: el canvas no se entera solo; se renuevan los colores y se vuelve a pintar
    effect(() => {
      const scheme = this.theme.scheme();
      untracked(() => {
        if (this.ol) {
          this.palette = readMapPalette(scheme, this.document);
          this.routeLayer?.changed();
          this.stopLayer?.changed();
        }
      });
    });
    // Ruta elegida: se vuelve a pintar y se encuadra en ella (o en todas)
    effect(() => {
      const selected = this.selectedRoute();
      untracked(() => {
        if (this.ol) {
          this.routeLayer?.changed();
          this.stopLayer?.changed();
          if (selected !== this.fitted) {
            this.fit(selected);
          }
        }
      });
    });
    // Parada elegida: halo y centrado
    effect(() => {
      const ref = this.selectedStop();
      untracked(() => {
        if (this.ol) {
          this.stopLayer?.changed();
          if (ref && ref !== this.centered) {
            this.centerOn(ref);
          }
        }
      });
    });
    // Quien abrió la ficha (un botón de la tabla) recupera el foco al cerrarla
    effect(() => {
      if (this.selectedStop() && isPlatformBrowser(this.platformId)) {
        const active = document.activeElement as HTMLElement | null;
        this.opener = active && active !== document.body && !this.host().nativeElement.contains(active) ? active : this.opener;
      }
    });
  }

  protected toggleRoute(routeIndex: number): void {
    this.selectedRoute.set(this.selectedRoute() === routeIndex ? null : routeIndex);
  }

  protected showAll(): void {
    this.selectedRoute.set(null);
  }

  protected closeStop(): void {
    this.selectedStop.set(null);
    const opener = this.opener;
    this.opener = null;
    opener?.focus();
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

    this.palette = readMapPalette(this.theme.scheme(), this.document);
    // `app-tiles`: en el tema oscuro las teselas se oscurecen con un filtro de la hoja global (rutas y paradas no se tocan)
    const tiles = new ol.TileLayer({ className: 'app-tiles', source: new ol.XYZ({ url: tilesUrl, attributions: attribution }) });
    tiles.getSource()?.on('tileloaderror', () => this.failed.set(true));
    tiles.getSource()?.on('tileloadend', () => this.failed.set(false));

    this.routeLayer = new ol.VectorLayer({ source: new ol.VectorSource(), style: (feature) => this.routeStyle(feature) });
    this.stopLayer = new ol.VectorLayer({ source: new ol.VectorSource(), style: (feature) => this.stopStyle(feature), zIndex: 10 });

    const start = toOlCoordinate(center) ?? [0, 0];
    const map = new ol.Map({
      target: this.host().nativeElement,
      layers: [tiles, this.routeLayer, this.stopLayer],
      view: new ol.View({ center: ol.fromLonLat(start), zoom }),
      controls: ol.defaultControls({ attributionOptions: { collapsible: false }, zoomOptions: { zoomInTipLabel: 'Acercar el mapa', zoomOutTipLabel: 'Alejar el mapa' } }),
    });

    map.on('click', (event) => {
      const hit = map.forEachFeatureAtPixel(event.pixel, (feature) => feature, {
        layerFilter: (layer) => layer === this.stopLayer,
        hitTolerance: 8,
      });
      const routeIndex = hit?.get('routeIndex') as number | undefined;
      const sequence = hit?.get('sequence') as number | undefined;
      this.selectedStop.set(routeIndex === undefined || sequence === undefined ? null : { routeIndex, sequence });
    });

    this.olMap.set(map);
    this.drawRoutes(this.routes());
    this.fit(this.selectedRoute());
    // Una parada elegida antes de que el mapa estuviera listo se centra ahora
    const picked = this.selectedStop();
    if (picked) {
      this.centerOn(picked);
    }
  }

  private drawRoutes(routes: readonly DomainRoute[]): void {
    const ol = this.ol;
    if (!ol || !this.routeLayer || !this.stopLayer) {
      return;
    }
    this.drawn = routes;
    const lines = this.routeLayer.getSource()!;
    const stops = this.stopLayer.getSource()!;
    lines.clear();
    stops.clear();
    for (const route of routes) {
      const line = routeLine(route);
      if (line) {
        const feature = new ol.Feature(new ol.LineString(line.coordinates.map((c) => ol.fromLonLat(c))));
        feature.set('routeIndex', route.routeIndex);
        feature.set('dashed', line.dashed);
        lines.addFeature(feature);
      }
      for (const stop of routeStops(route)) {
        const feature = new ol.Feature(new ol.Point(ol.fromLonLat(stop.coordinate)));
        feature.setProperties({ routeIndex: route.routeIndex, sequence: stop.waypoint.sequence, stopType: stop.waypoint.stopType });
        stops.addFeature(feature);
      }
    }
  }

  /** Encuadra una ruta (o todas con `null`); sin nada que ver deja la vista por defecto. */
  private fit(routeIndex: number | null): void {
    const ol = this.ol;
    const map = this.olMap();
    if (!ol || !map) {
      return;
    }
    this.fitted = routeIndex;
    const chosen = routeIndex === null ? this.routes() : this.routes().filter((r) => r.routeIndex === routeIndex);
    const bounds = lonLatBounds(routeCoordinates(chosen)) ?? (routeIndex !== null ? lonLatBounds(routeCoordinates(this.routes())) : null);
    if (!bounds) {
      return;
    }
    const view = map.getView();
    const [west, south, east, north] = bounds;
    if (west === east && south === north) {
      view.setCenter(ol.fromLonLat([west, south]));
      view.setZoom(SINGLE_POINT_ZOOM);
      return;
    }
    view.fit(ol.transformExtent(bounds, 'EPSG:4326', 'EPSG:3857'), { padding: FIT_PADDING, maxZoom: MAX_FIT_ZOOM });
  }

  private centerOn(ref: StopRef): void {
    const ol = this.ol;
    const map = this.olMap();
    this.centered = ref;
    const route = this.routes().find((r) => r.routeIndex === ref.routeIndex);
    const stop = route && routeStops(route).find((s) => s.waypoint.sequence === ref.sequence);
    if (ol && map && stop) {
      map.getView().setCenter(ol.fromLonLat(stop.coordinate));
    }
  }

  private routeStyle(feature: FeatureLike): InstanceType<OpenLayers['Style']>[] {
    const ol = this.ol!;
    const index = feature.get('routeIndex') as number;
    const selected = this.selectedRoute();
    const dim = selected !== null && selected !== index;
    const width = selected === index ? 6 : 4;
    const palette = this.palette!;
    const base = routeColorFor(index, this.theme.scheme());
    const color = dim ? toRgba(base, 0.35) : base;
    const dash = feature.get('dashed') ? [10, 8] : undefined;
    return [
      new ol.Style({ stroke: new ol.Stroke({ color: dim ? toRgba(palette.halo, 0.5) : palette.halo, width: width + 3, lineDash: dash }) }),
      new ol.Style({ stroke: new ol.Stroke({ color, width, lineDash: dash }) }),
    ];
  }

  private stopStyle(feature: FeatureLike): InstanceType<OpenLayers['Style']>[] {
    const ol = this.ol!;
    const index = feature.get('routeIndex') as number;
    const sequence = feature.get('sequence') as number;
    const depot = feature.get('stopType') === DEPOT;
    const selectedRoute = this.selectedRoute();
    const dim = selectedRoute !== null && selectedRoute !== index;
    const picked = this.selectedStop();
    const isPicked = picked?.routeIndex === index && picked.sequence === sequence;
    const palette = this.palette!;
    const dark = this.theme.scheme() === 'dark';
    const color = routeColorFor(index, this.theme.scheme());
    const label = depot ? 'D' : `${index + 1}·${sequence}`;
    // Con el tema claro el número es blanco con un borde oscuro, como siempre; con el oscuro, las rutas son luminosas y el número va en el tono que más contraste da
    const numberColor = dark ? readableOn(color) : '#ffffff';

    const styles: InstanceType<OpenLayers['Style']>[] = [];
    if (isPicked) {
      styles.push(new ol.Style({ image: new ol.CircleStyle({ radius: 22, fill: new ol.Fill({ color: toRgba(palette.ink, 0.12) }), stroke: new ol.Stroke({ color: palette.ink, width: 3 }) }) }));
    }
    styles.push(
      new ol.Style({
        image: new ol.CircleStyle({
          radius: depot ? 13 : 14,
          fill: new ol.Fill({ color: depot ? palette.halo : dim ? toRgba(color, 0.45) : color }),
          stroke: new ol.Stroke({ color: depot ? (dim ? toRgba(color, 0.45) : color) : palette.halo, width: depot ? 4 : 2 }),
        }),
        text: new ol.TextStyle({
          text: label,
          font: '700 11px sans-serif',
          fill: new ol.Fill({ color: depot ? palette.ink : numberColor }),
          stroke: depot || dark ? undefined : new ol.Stroke({ color: 'rgba(0, 0, 0, 0.45)', width: 2 }),
        }),
      }),
    );
    return styles;
  }
}
