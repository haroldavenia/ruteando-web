import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
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
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import type { Coordinate } from 'ol/coordinate';
import type { Geometry } from 'ol/geom';
import type Draw from 'ol/interaction/Draw';
import type Modify from 'ol/interaction/Modify';
import type OlMap from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type VectorSource from 'ol/source/Vector';

import { LatLng } from '../../core/geo/lat-lng';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

import { MAP_CONFIG } from './map-config';
import { OPENLAYERS_LOADER, OpenLayers } from './openlayers';
import { areaKm2, polygonIssueMessage, validatePolygon, verticesFromRing } from './polygon-geometry';
import { VertexTableComponent } from './vertex-table.component';

const DEFAULT_COLOR = '#6750a4';
const INVALID_COLOR = '#b3261e';
const FIT_PADDING = [48, 48, 48, 48];
const AREA = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });

/** `#RRGGBB` + opacidad 0..1 → `rgba(...)`. */
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Editor de un polígono: dibujarlo en el mapa, arrastrar sus vértices y, en paralelo, una tabla de
 * vértices con las mismas posibilidades (la vía para quien no puede usar el ratón). `vertices` es la única
 * fuente de verdad (sin repetir el primero al final). OpenLayers solo se carga en el navegador.
 */
@Component({
  selector: 'app-polygon-editor',
  imports: [MatButtonModule, MatIconModule, VertexTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './polygon-editor.component.html',
  styleUrl: './polygon-editor.component.scss',
})
export class PolygonEditorComponent {
  readonly vertices = model<LatLng[]>([]);
  /** Color de la zona (`#RRGGBB`); sin color se usa uno neutro. */
  readonly color = input<string | null>(null);

  /** El mapa de OpenLayers, o `null` mientras carga, en el servidor o si falló; para pruebas. */
  readonly olMap = signal<OlMap | null>(null);
  protected readonly failed = signal(false);
  protected readonly drawing = signal(false);

  private readonly config = inject(MAP_CONFIG);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly load = inject(OPENLAYERS_LOADER);
  private readonly dialog = inject(MatDialog);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  private ol: OpenLayers | null = null;
  private source: VectorSource | null = null;
  private layer: VectorLayer<VectorSource> | null = null;
  private draw: Draw | null = null;
  private modify: Modify | null = null;
  private destroyed = false;
  /** Lo último que entregó el mapa: evita reconstruir la geometría mientras se arrastra un vértice. */
  private fromMap: LatLng[] | null = null;
  private fitted = false;

  protected readonly issues = computed(() => validatePolygon(this.vertices()));
  protected readonly valid = computed(() => this.vertices().length >= 3 && this.issues().every((i) => i.kind === 'unchecked'));
  protected readonly summary = computed(() => {
    const vertices = this.vertices();
    const blocking = this.issues().filter((i) => i.kind !== 'unchecked');
    if (vertices.length === 0) {
      return 'Todavía no hay polígono.';
    }
    if (blocking.length > 0) {
      return `${vertices.length} vértices. ${blocking.map(polygonIssueMessage).join('. ')}.`;
    }
    const warning = this.issues().some((i) => i.kind === 'unchecked') ? ` ${polygonIssueMessage({ kind: 'unchecked' })}.` : '';
    return `Polígono válido: ${vertices.length} vértices, unos ${AREA.format(areaKm2(vertices))} km² (aproximado).${warning}`;
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
      const vertices = this.vertices();
      untracked(() => {
        if (this.ol && vertices !== this.fromMap) {
          this.showVertices(vertices);
        }
      });
    });
    effect(() => {
      this.color();
      this.valid();
      untracked(() => this.layer?.changed());
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.drawing()) {
      this.cancelDrawing();
    }
  }

  protected startDrawing(): void {
    const ol = this.ol;
    const map = this.olMap();
    if (!ol || !map || this.drawing()) {
      return;
    }
    this.draw = new ol.Draw({ type: 'Polygon', source: new ol.VectorSource() });
    this.draw.on('drawend', (event) => {
      const geometry = event.feature.getGeometry();
      const ring = (geometry instanceof ol.Polygon ? geometry.getCoordinates()[0] : []).map((c) => ol.toLonLat(c));
      const vertices = verticesFromRing(ring);
      this.stopDrawing();
      if (vertices.length >= 3) {
        this.fromMap = vertices;
        this.vertices.set(vertices);
        this.showVertices(vertices);
      }
    });
    map.addInteraction(this.draw);
    this.modify?.setActive(false);
    this.drawing.set(true);
  }

  protected finishDrawing(): void {
    this.draw?.finishDrawing();
  }

  protected cancelDrawing(): void {
    this.stopDrawing();
  }

  protected clear(): void {
    const apply = () => {
      this.fromMap = [];
      this.vertices.set([]);
      this.showVertices([]);
    };
    if (this.vertices().length <= 3) {
      apply();
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        data: { title: 'Borrar el polígono', message: `¿Quitar los ${this.vertices().length} vértices del polígono?`, confirmLabel: 'Borrar', cancelLabel: 'Conservar' },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed === true) {
          apply();
        }
      });
  }

  private stopDrawing(): void {
    if (this.draw) {
      this.draw.abortDrawing();
      this.olMap()?.removeInteraction(this.draw);
      this.draw = null;
    }
    this.modify?.setActive(true);
    this.drawing.set(false);
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
    const tiles = new ol.TileLayer({ source: new ol.XYZ({ url: tilesUrl, attributions: attribution }) });
    tiles.getSource()?.on('tileloaderror', () => this.failed.set(true));
    tiles.getSource()?.on('tileloadend', () => this.failed.set(false));

    this.source = new ol.VectorSource();
    this.layer = new ol.VectorLayer({ source: this.source, style: (feature) => this.style(feature.getGeometry()?.getType()) });
    const start = [center.lng, center.lat];
    const map = new ol.Map({
      target: this.host().nativeElement,
      layers: [tiles, this.layer],
      view: new ol.View({ center: ol.fromLonLat(start), zoom }),
      controls: ol.defaultControls({ attributionOptions: { collapsible: false } }),
    });
    this.modify = new ol.Modify({ source: this.source });
    this.modify.on('modifyend', () => this.readFromMap());
    map.addInteraction(this.modify);
    this.olMap.set(map);
    this.showVertices(this.vertices());
  }

  /** Dibuja el polígono (o la línea o el punto mientras faltan vértices) y, la primera vez, encuadra la vista. */
  private showVertices(vertices: readonly LatLng[]): void {
    const ol = this.ol;
    const map = this.olMap();
    if (!ol || !map || !this.source) {
      return;
    }
    this.source.clear();
    if (vertices.length > 0) {
      const coords = vertices.map((v) => ol.fromLonLat([v.lng, v.lat]));
      const geometry: Geometry =
        vertices.length >= 3 ? new ol.Polygon([[...coords, coords[0]]]) : vertices.length === 2 ? new ol.LineString(coords) : new ol.Point(coords[0]);
      this.source.addFeature(new ol.Feature(geometry));
      if (!this.fitted) {
        this.fitted = true;
        const extent = geometry.getExtent();
        if (extent[0] === extent[2] && extent[1] === extent[3]) {
          map.getView().setCenter(coords[0]);
          map.getView().setZoom(15);
        } else {
          map.getView().fit(extent, { padding: FIT_PADDING, maxZoom: 16 });
        }
      }
    }
  }

  /** Lee los vértices de la geometría después de arrastrar uno y los entrega. */
  private readFromMap(): void {
    const ol = this.ol;
    const geometry = this.source?.getFeatures()[0]?.getGeometry();
    if (!ol || !geometry) {
      return;
    }
    const positions = (
      geometry instanceof ol.Polygon ? geometry.getCoordinates()[0] : geometry instanceof ol.LineString ? geometry.getCoordinates() : geometry instanceof ol.Point ? [geometry.getCoordinates()] : []
    ).map((c) => ol.toLonLat(c));
    const vertices = geometry instanceof ol.Polygon ? verticesFromRing(positions) : verticesFromRing([...positions, positions[0]]);
    this.fromMap = vertices;
    this.vertices.set(vertices);
  }

  private style(type: string | undefined): InstanceType<OpenLayers['Style']>[] {
    const ol = this.ol!;
    const base = this.color() ?? DEFAULT_COLOR;
    const problem = !this.valid() && this.vertices().length >= 3;
    const stroke = problem ? INVALID_COLOR : base;
    if (type === 'Point') {
      return [new ol.Style({ image: new ol.CircleStyle({ radius: 7, fill: new ol.Fill({ color: stroke }), stroke: new ol.Stroke({ color: '#ffffff', width: 2 }) }) })];
    }
    return [
      new ol.Style({ stroke: new ol.Stroke({ color: '#ffffff', width: 7 }) }),
      new ol.Style({
        fill: new ol.Fill({ color: withAlpha(stroke, 0.2) }),
        stroke: new ol.Stroke({ color: stroke, width: 4, lineDash: problem ? [10, 8] : undefined }),
      }),
    ];
  }
}
