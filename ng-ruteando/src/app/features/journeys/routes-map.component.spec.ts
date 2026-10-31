import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type Feature from 'ol/Feature';
import type { Geometry, LineString } from 'ol/geom';
import type VectorLayer from 'ol/layer/Vector';
import type VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import type Style from 'ol/style/Style';

import { TEST_MAP_CONFIG } from '../../../testing/map';
import { toPlannedJourney } from '../../core/api/journey-mapper';
import { DomainRoute, DomainWaypoint, Journey } from '../../core/api/models';
import { ThemeService, THEME_STORAGE_KEY } from '../../core/theme/theme.service';
import { MAP_CONFIG } from '../../shared/map/map-config';
import { toHex } from '../../shared/map/map-palette';
import { ROUTE_COLORS_DARK, routeColor } from '../../shared/map/route-colors';

import { RoutesMapComponent } from './routes-map.component';

import plan from '../../../testing/fixtures/gateway/post__journeys__plan.json';

const base = toPlannedJourney(plan.response.body as unknown as Journey).routes[0];

/** Segunda ruta sintética, desplazada, con un paquete en su primera parada de servicio. */
function shifted(routeIndex: number, name: string, dLat: number): DomainRoute {
  return {
    ...base,
    routeIndex,
    name,
    geometry: base.geometry.map((p) => ({ lat: p.lat + dLat, lng: p.lng })),
    waypoints: base.waypoints.map((w) => ({
      ...w,
      packageId: w.stopType === 'service' && w.sequence === 1 ? `pkg-${routeIndex}` : null,
      position: w.position && { lat: w.position.lat + dLat, lng: w.position.lng },
    })) as DomainWaypoint[],
  };
}

describe('RoutesMapComponent', () => {
  let fixture: ComponentFixture<RoutesMapComponent>;
  const root = () => fixture.nativeElement as HTMLElement;
  const map = () => fixture.componentInstance.olMap()!;
  const layer = (n: number) => map().getLayers().item(n) as VectorLayer<VectorSource>;
  const lines = () => layer(1).getSource()!.getFeatures() as Feature<LineString>[];
  const stops = () => layer(2).getSource()!.getFeatures() as Feature<Geometry>[];
  const styleOf = (l: VectorLayer<VectorSource>, f: Feature) => (l.getStyleFunction()!(f, 1) as Style[]);
  const lineStyle = (f: Feature) => styleOf(layer(1), f);
  const legendButtons = () => Array.from(root().querySelectorAll('.legend .item')) as HTMLButtonElement[];

  async function create(routes: readonly DomainRoute[], inputs: Record<string, unknown> = {}): Promise<void> {
    TestBed.configureTestingModule({
      imports: [RoutesMapComponent],
      providers: [provideRouter([]), { provide: MAP_CONFIG, useValue: TEST_MAP_CONFIG }],
    });
    fixture = TestBed.createComponent(RoutesMapComponent);
    fixture.componentRef.setInput('routes', routes);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    (root().style as CSSStyleDeclaration).width = '800px';
    root().style.setProperty('--app-routes-map-height', '400px');
    fixture.detectChanges();
    for (let i = 0; i < 100 && !fixture.componentInstance.olMap(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(fixture.componentInstance.olMap()).withContext('el mapa debería haberse creado').not.toBeNull();
    fixture.detectChanges();
    map().renderSync();
  }

  // Sin elección propia el tema sería el del sistema operativo de quien ejecuta las pruebas: estas dan por hecho el claro
  beforeEach(() => localStorage.setItem(THEME_STORAGE_KEY, 'light'));

  afterEach(() => {
    fixture?.destroy();
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
  });

  describe('tema oscuro', () => {
    const dark = () => localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const token = (name: string) => {
      const probe = document.createElement('span');
      probe.style.backgroundColor = `var(${name})`;
      document.body.appendChild(probe);
      const color = toHex(getComputedStyle(probe).backgroundColor)!;
      probe.remove();
      return color;
    };
    const imageOf = (f: Feature) => styleOf(layer(2), f).at(-1)!.getImage() as unknown as { getFill(): { getColor(): string }; getStroke(): { getColor(): string } };

    afterEach(() => {
      localStorage.removeItem(THEME_STORAGE_KEY);
      document.documentElement.removeAttribute('data-theme');
    });

    it('las líneas usan la paleta luminosa y su borde es la superficie oscura, no blanco', async () => {
      dark();
      await create([shifted(0, 'Norte', 0), shifted(1, 'Sur', -0.05)]);

      for (const line of lines()) {
        const [casing, main] = lineStyle(line);
        expect(main.getStroke()!.getColor()).toBe(ROUTE_COLORS_DARK[line.get('routeIndex')]);
        expect(casing.getStroke()!.getColor()).toBe(token('--mat-sys-surface'));
      }
    });

    it('las paradas llevan el color luminoso de su ruta, con el halo oscuro y el número en el tono que más contraste da', async () => {
      dark();
      await create([base]);
      const service = stops().find((s) => s.get('stopType') === 'service')!;
      const depot = stops().find((s) => s.get('stopType') === 'depot')!;

      expect(imageOf(service as Feature).getFill().getColor()).toBe(ROUTE_COLORS_DARK[0]);
      expect(imageOf(service as Feature).getStroke().getColor()).toBe(token('--mat-sys-surface'));
      expect(imageOf(depot as Feature).getFill().getColor()).toBe(token('--mat-sys-surface'));
      const number = styleOf(layer(2), service as Feature).at(-1)!.getText()!.getFill()!.getColor();
      expect(number).toBe('#000000');
    });

    it('la leyenda enseña el mismo color luminoso que el mapa', async () => {
      dark();
      await create([shifted(0, 'Norte', 0), shifted(1, 'Sur', -0.05)]);

      const swatch = legendButtons()[1].querySelector('.swatch') as HTMLElement;
      expect(toHex(getComputedStyle(swatch).borderTopColor)).toBe(ROUTE_COLORS_DARK[1].toLowerCase());
    });

    it('al cambiar de tema con el mapa abierto, las líneas se vuelven a pintar con la paleta del tema nuevo', async () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      await create([shifted(0, 'Norte', 0)]);
      expect(lineStyle(lines()[0])[1].getStroke()!.getColor()).toBe(routeColor(0));

      TestBed.inject(ThemeService).set('dark');
      fixture.detectChanges();
      expect(lineStyle(lines()[0])[1].getStroke()!.getColor()).toBe(ROUTE_COLORS_DARK[0]);

      TestBed.inject(ThemeService).set('light');
      fixture.detectChanges();
      expect(lineStyle(lines()[0])[1].getStroke()!.getColor()).toBe(routeColor(0));
    });
  });

  describe('dibujo', () => {
    it('dibuja una línea por ruta con el color de su ruta y un borde blanco debajo', async () => {
      await create([shifted(0, 'Norte', 0), shifted(1, 'Sur', -0.05)]);
      expect(lines().length).toBe(2);
      for (const line of lines()) {
        const [casing, main] = lineStyle(line);
        expect(main.getStroke()!.getColor()).toBe(routeColor(line.get('routeIndex')));
        expect(String(casing.getStroke()!.getColor())).toContain('#ffffff');
        expect(casing.getStroke()!.getWidth()!).toBeGreaterThan(main.getStroke()!.getWidth()!);
      }
    });

    it('dibuja todas las paradas con posición, con número de ruta y de orden, y los depósitos con «D»', async () => {
      await create([base]);
      expect(stops().length).toBe(base.waypoints.length);
      const texts = stops().map((s) => styleOf(layer(2), s as Feature).at(-1)!.getText()!.getText());
      expect(texts).toContain('D');
      expect(texts).toContain('1·1');
      expect(texts.filter((t) => t === 'D').length).toBe(base.waypoints.filter((w) => w.stopType === 'depot').length);
    });

    it('un depósito se distingue por su relleno blanco y un servicio por el color de su ruta', async () => {
      await create([base]);
      const depot = stops().find((s) => s.get('stopType') === 'depot')!;
      const service = stops().find((s) => s.get('stopType') === 'service')!;
      const fill = (f: Feature) => styleOf(layer(2), f).at(-1)!.getImage() as unknown as { getFill(): { getColor(): string } };
      expect(fill(depot).getFill().getColor()).toBe('#ffffff');
      expect(fill(service).getFill().getColor()).toBe(routeColor(0));
    });

    it('encuadra la vista para que quepan todas las paradas', async () => {
      await create([shifted(0, 'Norte', 0), shifted(1, 'Sur', -0.05)]);
      const extent = map().getView().calculateExtent(map().getSize());
      for (const stop of stops()) {
        const [x, y] = (stop.getGeometry() as unknown as { getCoordinates(): number[] }).getCoordinates();
        expect(x >= extent[0] && x <= extent[2] && y >= extent[1] && y <= extent[3]).withContext(`${stop.get('sequence')}`).toBeTrue();
      }
    });

    it('una ruta sin geometría se dibuja discontinua uniendo sus paradas', async () => {
      await create([{ ...base, geometry: [] }]);
      expect(lines().length).toBe(1);
      expect(lines()[0].get('dashed')).toBeTrue();
      expect(lineStyle(lines()[0])[1].getStroke()!.getLineDash()).toEqual([10, 8]);
    });

    it('una parada sin posición válida se omite sin afectar al resto', async () => {
      const broken = { ...base, waypoints: base.waypoints.map((w, i) => (i === 1 ? { ...w, position: null } : w)) } as DomainRoute;
      await create([broken]);
      expect(stops().length).toBe(base.waypoints.length - 1);
      expect(lines().length).toBe(1);
    });

    it('la leyenda nombra cada ruta con su color, vehículo y distancia', async () => {
      await create([shifted(0, 'Norte', 0), shifted(1, 'Sur', -0.05)]);
      const items = legendButtons().map((b) => b.textContent!.replace(/\s+/g, ' ').trim());
      expect(items.length).toBe(2);
      expect(items[0]).toContain('1. Norte');
      expect(items[1]).toContain('2. Sur');
      expect(items[0]).toMatch(/km/);
      const swatch = legendButtons()[0].querySelector('.swatch') as HTMLElement;
      expect(swatch.style.background).toContain('rgb');
    });

    it('con la atribución del proveedor visible', async () => {
      await create([base]);
      expect(root().querySelector('.ol-attribution')?.textContent).toContain('OpenStreetMap contributors');
    });
  });

  describe('selección de ruta', () => {
    it('elegir una ruta la resalta, atenúa las demás y la marca como pulsada', async () => {
      await create([shifted(0, 'Norte', 0), shifted(1, 'Sur', -0.05)]);
      legendButtons()[1].click();
      fixture.detectChanges();
      expect(fixture.componentInstance.selectedRoute()).toBe(1);

      const [, chosen] = lineStyle(lines().find((l) => l.get('routeIndex') === 1)!);
      const [, other] = lineStyle(lines().find((l) => l.get('routeIndex') === 0)!);
      expect(chosen.getStroke()!.getWidth()).toBe(6);
      expect(chosen.getStroke()!.getColor()).toBe(routeColor(1));
      expect(other.getStroke()!.getWidth()).toBe(4);
      expect(String(other.getStroke()!.getColor())).toContain('0.35');
      expect(legendButtons()[1].getAttribute('aria-pressed')).toBe('true');
      expect(legendButtons()[0].getAttribute('aria-pressed')).toBe('false');
      expect(root().textContent).toContain('Ruta enfocada: Sur');
    });

    it('encuadra el mapa en la ruta elegida', async () => {
      await create([shifted(0, 'Norte', 0), shifted(1, 'Sur', -0.5)]);
      const all = map().getView().calculateExtent(map().getSize());
      legendButtons()[1].click();
      fixture.detectChanges();
      map().renderSync();
      const focused = map().getView().calculateExtent(map().getSize());
      expect(focused[3] - focused[1]).toBeLessThan(all[3] - all[1]);
      const south = stops().filter((s) => s.get('routeIndex') === 1);
      for (const stop of south) {
        const [, y] = (stop.getGeometry() as unknown as { getCoordinates(): number[] }).getCoordinates();
        expect(y >= focused[1] && y <= focused[3]).toBeTrue();
      }
    });

    it('volver a elegirla restablece el estilo y el encuadre', async () => {
      await create([shifted(0, 'Norte', 0), shifted(1, 'Sur', -0.5)]);
      const all = map().getView().calculateExtent(map().getSize());
      legendButtons()[1].click();
      fixture.detectChanges();
      legendButtons()[1].click();
      fixture.detectChanges();
      map().renderSync();
      expect(fixture.componentInstance.selectedRoute()).toBeNull();
      expect(lineStyle(lines()[0])[1].getStroke()!.getWidth()).toBe(4);
      const again = map().getView().calculateExtent(map().getSize());
      expect(Math.abs(again[3] - again[1] - (all[3] - all[1]))).toBeLessThan(1);
    });

    it('«Ver todas» solo aparece con una ruta elegida y la quita', async () => {
      await create([shifted(0, 'Norte', 0)]);
      const showAll = () => (Array.from(root().querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes('Ver todas'));
      expect(showAll()).toBeUndefined();
      legendButtons()[0].click();
      fixture.detectChanges();
      expect(showAll()).toBeDefined();
      showAll()!.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.selectedRoute()).toBeNull();
      expect(showAll()).toBeUndefined();
    });

    it('una ruta elegida desde fuera (la tabla) se resalta igual', async () => {
      await create([shifted(0, 'Norte', 0), shifted(1, 'Sur', -0.05)], { selectedRoute: 0 });
      expect(legendButtons()[0].getAttribute('aria-pressed')).toBe('true');
      expect(lineStyle(lines().find((l) => l.get('routeIndex') === 0)!)[1].getStroke()!.getWidth()).toBe(6);
    });

    it('la leyenda es operable con teclado: son botones nativos', async () => {
      await create([base]);
      expect(legendButtons()[0].tagName).toBe('BUTTON');
      legendButtons()[0].focus();
      expect(document.activeElement).toBe(legendButtons()[0]);
    });
  });

  describe('ficha de parada', () => {
    const pixelOf = (routeIndex: number, sequence: number) => {
      const stop = stops().find((s) => s.get('routeIndex') === routeIndex && s.get('sequence') === sequence)!;
      return map().getPixelFromCoordinate((stop.getGeometry() as unknown as { getCoordinates(): number[] }).getCoordinates());
    };
    const clickAt = (pixel: number[]) => map().dispatchEvent({ type: 'click', pixel, coordinate: map().getCoordinateFromPixel(pixel) } as never);
    const fieldValues = () => Array.from(root().querySelectorAll('.card dl > div')).map((d) => [d.querySelector('dt')!.textContent!.trim(), d.querySelector('dd')!.textContent!.trim()]);

    it('un clic sobre una parada muestra su ficha con ruta, orden, tipo, llegada y salida', async () => {
      await create([shifted(0, 'Norte', 0), shifted(1, 'Sur', -0.05)]);
      clickAt(pixelOf(1, 2));
      fixture.detectChanges();

      expect(fixture.componentInstance.selectedStop()).toEqual({ routeIndex: 1, sequence: 2 });
      expect(root().querySelector('.card h3')?.textContent).toContain('Ruta 2: Sur');
      expect(Object.fromEntries(fieldValues())).toEqual(jasmine.objectContaining({ Orden: '2', Tipo: 'Servicio' }));
      expect(fieldValues().map(([k]) => k)).toEqual(['Orden', 'Tipo', 'Llegada', 'Salida']);
    });

    it('el enlace al paquete solo aparece si la parada tiene paquete', async () => {
      await create([shifted(0, 'Norte', 0)]);
      clickAt(pixelOf(0, 1));
      fixture.detectChanges();
      expect(root().querySelector('.card a')?.getAttribute('href')).toBe('/paquetes/pkg-0');

      clickAt(pixelOf(0, 2));
      fixture.detectChanges();
      expect(root().querySelector('.card a')).toBeNull();
    });

    it('la parada marcada recibe un halo', async () => {
      await create([base]);
      const feature = stops().find((s) => s.get('sequence') === 1)!;
      const before = styleOf(layer(2), feature as Feature).length;
      clickAt(pixelOf(0, 1));
      fixture.detectChanges();
      expect(styleOf(layer(2), feature as Feature).length).toBe(before + 1);
    });

    it('una parada elegida desde fuera abre su ficha y centra el mapa en ella', async () => {
      await create([shifted(0, 'Norte', 0)], { selectedStop: { routeIndex: 0, sequence: 2 } });
      expect(root().querySelector('.card h3')?.textContent).toContain('Parada 2');
      // OpenLayers aplica el nuevo centro en el siguiente fotograma
      await new Promise((resolve) => setTimeout(resolve, 100));
      const center = map().getView().getCenter()!;
      const stop = stops().find((s) => s.get('sequence') === 2)!;
      const [x, y] = (stop.getGeometry() as unknown as { getCoordinates(): number[] }).getCoordinates();
      expect(Math.abs(center[0] - x)).toBeLessThan(2);
      expect(Math.abs(center[1] - y)).toBeLessThan(2);
    });

    it('un clic en vacío cierra la ficha', async () => {
      await create([base], { selectedStop: { routeIndex: 0, sequence: 1 } });
      expect(root().querySelector('.card')).not.toBeNull();
      clickAt([2, 2]);
      fixture.detectChanges();
      expect(root().querySelector('.card')).toBeNull();
      expect(fixture.componentInstance.selectedStop()).toBeNull();
    });

    it('cerrar la ficha quita el halo y devuelve el foco a quien la abrió', async () => {
      const opener = document.createElement('button');
      document.body.appendChild(opener);
      opener.focus();
      await create([base]);
      fixture.componentRef.setInput('selectedStop', { routeIndex: 0, sequence: 1 });
      fixture.detectChanges();

      (root().querySelector('button[aria-label="Cerrar la ficha de la parada"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(root().querySelector('.card')).toBeNull();
      expect(document.activeElement).toBe(opener);
      opener.remove();
    });
  });

  it('el contenedor del mapa tiene borde suave y esquinas redondeadas del sistema de interfaz', async () => {
    await create([]);
    const container = root().querySelector('.map') as HTMLElement;
    const style = getComputedStyle(container);
    expect(style.borderTopWidth).toBe('1px');
    expect(style.borderTopLeftRadius).toBe('16px');
    expect(style.overflow).toBe('hidden');
  });
});
