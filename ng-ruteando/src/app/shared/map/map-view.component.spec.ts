import { ComponentFixture, TestBed } from '@angular/core/testing';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { toLonLat, fromLonLat } from 'ol/proj';
import Translate from 'ol/interaction/Translate';
import Point from 'ol/geom/Point';
import type TileLayer from 'ol/layer/Tile';
import type CircleStyle from 'ol/style/Circle';
import type Style from 'ol/style/Style';

import { LatLng } from '../../core/geo/lat-lng';
import { ThemeService, THEME_STORAGE_KEY } from '../../core/theme/theme.service';

import { TEST_MAP_CONFIG } from '../../../testing/map';

import { MAP_CONFIG } from './map-config';
import { toHex } from './map-palette';
import { MapViewComponent } from './map-view.component';

describe('MapViewComponent', () => {
  let fixture: ComponentFixture<MapViewComponent>;
  let emitted: LatLng[];

  async function create(inputs: { point?: LatLng | null; selectable?: boolean } = {}): Promise<void> {
    TestBed.configureTestingModule({ imports: [MapViewComponent], providers: [{ provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG }] });
    fixture = TestBed.createComponent(MapViewComponent);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    emitted = [];
    fixture.componentInstance.pointChange.subscribe((p) => emitted.push(p));
    (fixture.nativeElement as HTMLElement).style.setProperty('--app-map-height', '300px');
    (fixture.nativeElement as HTMLElement).style.width = '400px';
    fixture.detectChanges();
    for (let i = 0; i < 100 && !fixture.componentInstance.olMap(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(fixture.componentInstance.olMap()).withContext('el mapa debería haberse creado').not.toBeNull();
    fixture.detectChanges();
  }

  const map = () => fixture.componentInstance.olMap()!;
  const markerCoordinates = (): [number, number] | null => {
    const layer = map().getLayers().item(1) as VectorLayer<VectorSource>;
    const geometry = layer.getSource()!.getFeatures()[0].getGeometry() as Point | undefined;
    return geometry ? (toLonLat(geometry.getCoordinates()) as [number, number]) : null;
  };
  const click = (lat: number, lng: number) => map().dispatchEvent({ type: 'click', coordinate: fromLonLat([lng, lat]) } as never);

  // Sin elección propia el tema sería el del sistema operativo de quien ejecuta las pruebas: estas dan por hecho el claro
  beforeEach(() => localStorage.setItem(THEME_STORAGE_KEY, 'light'));

  afterEach(() => {
    fixture?.destroy();
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
  });

  describe('colores del tema', () => {
    const marker = () => {
      const layer = map().getLayers().item(1) as VectorLayer<VectorSource>;
      const style = layer.getStyleFunction()!(layer.getSource()!.getFeatures()[0], 1) as Style;
      const image = style.getImage() as CircleStyle;
      return { fill: image.getFill()!.getColor() as string, halo: image.getStroke()!.getColor() as string };
    };
    /** Color que resuelve un token con el tema que tenga el documento en este momento. */
    const token = (name: string) => {
      const probe = document.createElement('span');
      probe.style.backgroundColor = `var(${name})`;
      document.body.appendChild(probe);
      const color = toHex(getComputedStyle(probe).backgroundColor)!;
      probe.remove();
      return color;
    };

    afterEach(() => {
      localStorage.removeItem(THEME_STORAGE_KEY);
      document.documentElement.removeAttribute('data-theme');
    });

    it('solo la capa base lleva la clase que el tema oscuro oscurece: el marcador conserva sus colores', async () => {
      await create({ point: { lat: 4.6, lng: -74.08 } });

      expect((map().getLayers().item(0) as TileLayer).getClassName()).toBe('app-tiles');
      expect((map().getLayers().item(1) as VectorLayer<VectorSource>).getClassName()).not.toBe('app-tiles');
    });

    it('con el tema claro el marcador es del acento del tema y su borde es blanco', async () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      await create({ point: { lat: 4.6, lng: -74.08 } });

      expect(marker()).toEqual({ fill: token('--mat-sys-primary'), halo: '#ffffff' });
    });

    it('con el tema oscuro el marcador es del acento oscuro y su borde, la superficie oscura', async () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      await create({ point: { lat: 4.6, lng: -74.08 } });

      expect(marker()).toEqual({ fill: token('--mat-sys-primary'), halo: token('--mat-sys-surface') });
      expect(marker().halo).not.toBe('#ffffff');
    });

    it('al cambiar de tema con el mapa abierto se vuelve a pintar el marcador, sin recrear el mapa', async () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      await create({ point: { lat: 4.6, lng: -74.08 } });
      const before = map();
      const light = marker();

      TestBed.inject(ThemeService).set('dark');
      fixture.detectChanges();

      expect(map()).toBe(before);
      expect(marker().fill).not.toBe(light.fill);
      expect(marker().halo).toBe(token('--mat-sys-surface'));

      TestBed.inject(ThemeService).set('light');
      fixture.detectChanges();
      expect(marker()).toEqual(light);
    });
  });

  it('los botones de zoom llevan título en español, no el «Zoom in» de OpenLayers', async () => {
    await create();
    const titles = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.ol-zoom button')).map((b) => b.getAttribute('title'));

    expect(titles).toEqual(['Acercar el mapa', 'Alejar el mapa']);
  });

  it('muestra la atribución del proveedor sin plegar', async () => {
    await create();
    const attribution = (fixture.nativeElement as HTMLElement).querySelector('.ol-attribution') as HTMLElement;
    expect(attribution.textContent).toContain('OpenStreetMap contributors');
    expect(attribution.classList.contains('ol-collapsed')).toBeFalse();
    expect(attribution.querySelector('a')?.getAttribute('href')).toBe('https://www.openstreetmap.org/copyright');
  });

  it('sin marcador se centra en el centro y el zoom del entorno', async () => {
    await create();
    const [lon, lat] = toLonLat(map().getView().getCenter()!);
    expect(lat).toBeCloseTo(4.6097, 4);
    expect(lon).toBeCloseTo(-74.0817, 4);
    expect(map().getView().getZoom()).toBe(11);
    expect(markerCoordinates()).toBeNull();
  });

  it('muestra el marcador del punto inicial', async () => {
    await create({ point: { lat: 6.2442, lng: -75.5812 } });
    const [lon, lat] = markerCoordinates()!;
    expect(lat).toBeCloseTo(6.2442, 5);
    expect(lon).toBeCloseTo(-75.5812, 5);
  });

  it('con selectable, un clic coloca el marcador y emite latitud y longitud', async () => {
    await create({ selectable: true });
    click(4.60872, -74.07728);

    expect(emitted).toEqual([{ lat: 4.60872, lng: -74.07728 }]);
    expect(markerCoordinates()![1]).toBeCloseTo(4.60872, 5);
  });

  it('el arrastre del marcador emite el nuevo punto', async () => {
    await create({ selectable: true, point: { lat: 4.6, lng: -74.1 } });
    const translate = map().getInteractions().getArray().find((i) => i instanceof Translate) as Translate;
    const layer = map().getLayers().item(1) as VectorLayer<VectorSource>;
    (layer.getSource()!.getFeatures()[0].getGeometry() as Point).setCoordinates(fromLonLat([-74.2, 4.7]));
    translate.dispatchEvent({ type: 'translateend' } as never);

    expect(emitted.length).toBe(1);
    expect(emitted[0].lat).toBeCloseTo(4.7, 5);
    expect(emitted[0].lng).toBeCloseTo(-74.2, 5);
  });

  it('un punto que llega desde fuera mueve el marcador sin emitir', async () => {
    await create({ selectable: true, point: { lat: 4.6, lng: -74.1 } });
    fixture.componentRef.setInput('point', { lat: 10.5, lng: -66.9 });
    fixture.detectChanges();

    expect(markerCoordinates()![1]).toBeCloseTo(10.5, 5);
    expect(emitted).toEqual([]);
  });

  it('un punto de fuera de la vista centra el mapa en él', async () => {
    await create({ point: { lat: 4.6, lng: -74.1 } });
    fixture.componentRef.setInput('point', { lat: -33.45, lng: -70.66 });
    fixture.detectChanges();

    const [lon, lat] = toLonLat(map().getView().getCenter()!);
    expect(lat).toBeCloseTo(-33.45, 3);
    expect(lon).toBeCloseTo(-70.66, 3);
  });

  it('un punto nulo o inválido quita el marcador', async () => {
    await create({ point: { lat: 4.6, lng: -74.1 } });
    fixture.componentRef.setInput('point', null);
    fixture.detectChanges();
    expect(markerCoordinates()).toBeNull();

    fixture.componentRef.setInput('point', { lat: 95, lng: 0 });
    fixture.detectChanges();
    expect(markerCoordinates()).toBeNull();
  });

  it('sin selectable los clics no mueven el marcador ni emiten', async () => {
    await create({ point: { lat: 4.6, lng: -74.1 } });
    click(10, -70);

    expect(emitted).toEqual([]);
    expect(markerCoordinates()![1]).toBeCloseTo(4.6, 5);
  });

  it('lleva la longitud a -180..180 si el mapa dio la vuelta al mundo', async () => {
    await create({ selectable: true });
    map().dispatchEvent({ type: 'click', coordinate: [fromLonLat([-74, 4])[0] + 40075016.68, fromLonLat([-74, 4])[1]] } as never);
    expect(emitted[0].lng).toBeCloseTo(-74, 4);
  });

  it('etiqueta la región del mapa en español', async () => {
    await create();
    fixture.componentRef.setInput('ariaLabel', 'Mapa para elegir la ubicación');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="region"]')?.getAttribute('aria-label')).toBe('Mapa para elegir la ubicación');
  });

  it('el contenedor del mapa tiene borde suave y esquinas redondeadas del sistema de interfaz', async () => {
    await create();
    const container = (fixture.nativeElement as HTMLElement).querySelector('.map') as HTMLElement;
    const style = getComputedStyle(container);
    expect(style.borderTopWidth).toBe('1px');
    expect(style.borderTopLeftRadius).toBe('16px');
    expect(style.overflow).toBe('hidden');
  });
});
