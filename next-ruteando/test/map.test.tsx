import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { normalizePoint, PointMap } from '@/components/map/point-map';
import { currentScheme, useColorScheme } from '@/lib/color-scheme';
import { I18nProvider } from '@/lib/i18n/client';
import { dictionaryOf } from '@/lib/i18n/dictionary';
import { fromGeoJsonPoint, latLng, toGeoJsonPoint, toOlCoordinate } from '@/lib/map/lat-lng';
import { parseColor, readableOn, readMapPalette, toHex, toRgba } from '@/lib/map/map-palette';

import { renderWithI18n } from './render';

// ---------- OpenLayers simulado: solo lo que usa el código (OpenLayers real necesita canvas) ----------
type Handler = (event: { coordinate: [number, number] }) => void;
const fake = vi.hoisted(() => {
  const state = {
    maps: [] as unknown[],
    layers: [] as { style: () => unknown; setStyle: (fn: () => unknown) => void }[],
    translate: null as null | {
      active: boolean;
      handlers: Record<string, () => void>;
    },
    feature: null as null | { geometry: { coords: [number, number] } | undefined },
    tileHandlers: {} as Record<string, () => void>,
    created: 0,
    disposed: 0,
    styleColors: [] as string[],
  };
  return state;
});

vi.mock('@/lib/map/openlayers', () => {
  class View {
    center: [number, number];
    constructor(o: { center: [number, number] }) {
      this.center = o.center;
    }
    calculateExtent() {
      return [-10, -10, 10, 10];
    }
    setCenter(c: [number, number]) {
      this.center = c;
    }
  }
  class MapStub {
    handlers: Record<string, Handler> = {};
    view: View;
    layers: unknown[] = [];
    constructor(o: { view: View }) {
      this.view = o.view;
      fake.created++;
      fake.maps.push(this);
    }
    addLayer(l: unknown) {
      this.layers.push(l);
    }
    removeLayer(l: unknown) {
      this.layers = this.layers.filter((x) => x !== l);
    }
    addInteraction() {}
    removeInteraction() {}
    on(type: string, fn: Handler) {
      this.handlers[type] = fn;
    }
    getView() {
      return this.view;
    }
    getSize() {
      return [100, 100];
    }
    setTarget() {}
    dispose() {
      fake.disposed++;
    }
  }
  class Point {
    constructor(public coords: [number, number]) {}
    getCoordinates() {
      return this.coords;
    }
  }
  class Feature {
    geometry: Point | undefined;
    constructor() {
      fake.feature = this as never;
    }
    setGeometry(g: Point | undefined) {
      this.geometry = g;
    }
    getGeometry() {
      return this.geometry;
    }
  }
  class VectorLayer {
    style: () => unknown;
    constructor(o: { style: () => unknown }) {
      this.style = o.style;
      fake.layers.push(this as never);
    }
    setStyle(fn: () => unknown) {
      this.style = fn;
    }
  }
  class Translate {
    active = false;
    handlers: Record<string, () => void> = {};
    constructor() {
      fake.translate = this;
    }
    setActive(a: boolean) {
      this.active = a;
    }
    on(type: string, fn: () => void) {
      this.handlers[type] = fn;
    }
  }
  const sourceOf = () => ({
    on: (type: string, fn: () => void) => {
      fake.tileHandlers[type] = fn;
    },
  });
  const ol = {
    Map: MapStub,
    View,
    TileLayer: class {
      getSource = sourceOf;
    },
    XYZ: class {},
    VectorLayer,
    VectorSource: class {
      addFeature() {}
    },
    Feature,
    Point,
    Translate,
    fromLonLat: (c: [number, number]) => c,
    toLonLat: (c: [number, number]) => c,
    Style: class {},
    CircleStyle: class {},
    Fill: class {
      constructor(o: { color: string }) {
        fake.styleColors.push(o.color);
      }
    },
    Stroke: class {},
    defaultControls: () => [],
  };
  return { loadOpenLayers: vi.fn(async () => ol) };
});

import { loadOpenLayers } from '@/lib/map/openlayers';

beforeEach(() => {
  fake.maps.length = 0;
  fake.layers.length = 0;
  fake.translate = null;
  fake.feature = null;
  fake.created = 0;
  fake.disposed = 0;
  fake.styleColors.length = 0;
  delete document.documentElement.dataset.theme;
  vi.mocked(loadOpenLayers).mockClear();
});

describe('lat-lng', () => {
  test('latLng valida rangos y tipos', () => {
    expect(latLng(4.6, -74)).toEqual({ lat: 4.6, lng: -74 });
    for (const [a, b] of [
      [91, 0],
      [0, 181],
      [NaN, 0],
      ['4', 0],
      [null, 0],
      [Infinity, 0],
    ] as const) {
      expect(latLng(a, b), `${a},${b}`).toBeNull();
    }
  });

  test('GeoJSON es [longitud, latitud]', () => {
    expect(fromGeoJsonPoint([-74, 4.6])).toEqual({ lat: 4.6, lng: -74 });
    expect(fromGeoJsonPoint([-74])).toBeNull();
    expect(fromGeoJsonPoint(null)).toBeNull();
    expect(toGeoJsonPoint({ lat: 4.6, lng: -74 })).toEqual({ type: 'Point', coordinates: [-74, 4.6] });
    expect(toGeoJsonPoint({ lat: 99, lng: 0 })).toBeNull();
    expect(toOlCoordinate({ lat: 4.6, lng: -74 })).toEqual([-74, 4.6]);
    expect(toOlCoordinate({ lat: 4.6, lng: 999 })).toBeNull();
  });

  test('normalizePoint redondea a 6 decimales y lleva la longitud a -180..180', () => {
    expect(normalizePoint(-74.08171234567, 4.60971234567)).toEqual({ lat: 4.609712, lng: -74.081712 });
    expect(normalizePoint(190, 0).lng).toBe(-170);
    expect(normalizePoint(-190, 0).lng).toBe(170);
    expect(normalizePoint(540, 0).lng).toBe(-180);
  });
});

describe('paleta de colores', () => {
  test('parseColor entiende hex, rgb, rgba y color(srgb); lo demás es null', () => {
    expect(parseColor('#0072B2')).toEqual([0, 114, 178]);
    expect(parseColor('rgb(1, 2, 3)')).toEqual([1, 2, 3]);
    expect(parseColor('rgba(10 20 30 / 0.5)')).toEqual([10, 20, 30]);
    expect(parseColor('color(srgb 1 0.5 0)')).toEqual([255, 128, 0]);
    expect(parseColor('rojo')).toBeNull();
    expect(parseColor('#fff')).toBeNull();
  });

  test('toHex, toRgba y readableOn', () => {
    expect(toHex('rgb(255, 0, 128)')).toBe('#ff0080');
    expect(toHex('nada')).toBeNull();
    expect(toRgba('#ff0000', 0.25)).toBe('rgba(255, 0, 0, 0.25)');
    expect(toRgba('raro', 0.5)).toBe('raro');
    expect(readableOn('#ffffff')).toBe('#000000');
    expect(readableOn('#000000')).toBe('#ffffff');
    expect(readableOn('#0072B2')).toBe('#ffffff');
    expect(readableOn('#E69F00')).toBe('#000000');
    expect(readableOn('no es un color')).toBe('#000000'); // gris medio
  });

  test('readMapPalette: claro = halo blanco y tinta negra; oscuro = superficie y texto del tema', () => {
    const light = readMapPalette('light', document);
    expect(light.halo).toBe('#ffffff');
    expect(light.ink).toBe('#000000');
    expect(light.accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(light.danger).toMatch(/^#[0-9a-f]{6}$/);
    const dark = readMapPalette('dark', document);
    expect(dark.halo).toMatch(/^#[0-9a-f]{6}$/);
    expect(dark.halo).not.toBe('#ffffff');
    expect(dark.ink).not.toBe('#000000');
  });
});

describe('esquema de color efectivo', () => {
  test('manda la elección manual; sin ella, el sistema', () => {
    const media = (dark: boolean) =>
      vi
        .spyOn(window, 'matchMedia')
        .mockImplementation(
          () => ({ matches: dark, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList
        );
    media(true);
    expect(currentScheme()).toBe('dark');
    media(false);
    expect(currentScheme()).toBe('light');
    document.documentElement.dataset.theme = 'dark';
    expect(currentScheme()).toBe('dark');
    document.documentElement.dataset.theme = 'light';
    media(true);
    expect(currentScheme()).toBe('light');
    vi.restoreAllMocks();
  });

  test('useColorScheme sigue los cambios de data-theme en vivo', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList
    );
    const { result } = renderHook(() => useColorScheme());
    expect(result.current).toBe('light');
    await act(async () => {
      document.documentElement.dataset.theme = 'dark';
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current).toBe('dark'));
    vi.restoreAllMocks();
  });
});

describe('PointMap', () => {
  // `rerender` sustituye todo el árbol: sin el proveedor de idioma el mapa se recrearía
  const wrap = (ui: React.ReactElement) => (
    <I18nProvider lang="es" dictionary={dictionaryOf('es')}>
      {ui}
    </I18nProvider>
  );

  const ready = async (ui: React.ReactElement) => {
    const view = renderWithI18n(ui);
    await waitFor(() => expect(fake.created).toBeGreaterThan(0));
    await waitFor(() => expect(fake.translate).not.toBeNull());
    return view;
  };

  test('carga OpenLayers una vez, crea el mapa y lo libera al desmontar', async () => {
    const view = await ready(<PointMap point={null} />);
    expect(screen.getByRole('region', { name: 'Mapa' })).toBeInTheDocument();
    expect(loadOpenLayers).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(fake.disposed).toBeGreaterThan(0);
  });

  test('pinta el punto que llega y lo mueve o lo quita cuando cambia', async () => {
    const view = await ready(<PointMap point={{ lat: 1, lng: 2 }} />);
    await waitFor(() => expect(fake.feature?.geometry?.coords).toEqual([2, 1]));
    view.rerender(wrap(<PointMap point={{ lat: 3, lng: 4 }} />));
    await waitFor(() => expect(fake.feature?.geometry?.coords).toEqual([4, 3]));
    view.rerender(wrap(<PointMap point={null} />));
    await waitFor(() => expect(fake.feature?.geometry).toBeUndefined());
    view.rerender(wrap(<PointMap point={{ lat: 999, lng: 0 }} />)); // no válido: sin marcador
    await waitFor(() => expect(fake.feature?.geometry).toBeUndefined());
  });

  test('un punto fuera de la vista recentra el mapa; uno dentro, no', async () => {
    const view = await ready(<PointMap point={null} />);
    const map = fake.maps[0] as { view: { center: [number, number] } };
    view.rerender(wrap(<PointMap point={{ lat: 5, lng: 5 }} />)); // extent simulado: -10..10
    await waitFor(() => expect(fake.feature?.geometry).toBeDefined());
    const before = map.view.center;
    view.rerender(wrap(<PointMap point={{ lat: 50, lng: 50 }} />));
    await waitFor(() => expect(map.view.center).toEqual([50, 50]));
    expect(map.view.center).not.toBe(before);
  });

  test('sin selectable un clic no hace nada; con selectable coloca el punto y avisa', async () => {
    const onPointChange = vi.fn();
    const view = await ready(<PointMap point={null} onPointChange={onPointChange} />);
    const map = fake.maps[0] as { handlers: Record<string, Handler> };
    expect(fake.translate?.active).toBe(false);
    map.handlers.click!({ coordinate: [-74.08171234, 4.60971234] });
    expect(onPointChange).not.toHaveBeenCalled();
    view.rerender(wrap(<PointMap point={null} selectable onPointChange={onPointChange} />));
    await waitFor(() => expect(fake.translate?.active).toBe(true));
    map.handlers.click!({ coordinate: [-74.08171234, 4.60971234] });
    expect(onPointChange).toHaveBeenCalledWith({ lat: 4.609712, lng: -74.081712 });
    expect(fake.feature?.geometry?.coords).toEqual([-74.081712, 4.609712]);
  });

  test('arrastrar el marcador avisa con el punto normalizado; un cambio por propiedad no avisa', async () => {
    const onPointChange = vi.fn();
    const view = await ready(<PointMap point={{ lat: 1, lng: 2 }} selectable onPointChange={onPointChange} />);
    await waitFor(() => expect(fake.feature?.geometry).toBeDefined());
    view.rerender(wrap(<PointMap point={{ lat: 3, lng: 4 }} selectable onPointChange={onPointChange} />));
    await waitFor(() => expect(fake.feature?.geometry?.coords).toEqual([4, 3]));
    expect(onPointChange).not.toHaveBeenCalled();
    fake.feature!.geometry!.coords = [190, 5]; // la persona lo arrastró hasta pasar la línea de cambio de fecha
    fake.translate!.handlers.translateend!();
    expect(onPointChange).toHaveBeenCalledWith({ lat: 5, lng: -170 });
  });

  test('al cambiar el tema se repinta el marcador con los colores nuevos', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList
    );
    await ready(<PointMap point={{ lat: 1, lng: 2 }} />);
    const layer = fake.layers[0]!;
    const first = layer.style();
    await act(async () => {
      document.documentElement.dataset.theme = 'dark';
      await Promise.resolve();
    });
    await waitFor(() => expect(layer.style()).not.toBe(first));
    expect(fake.styleColors.length).toBeGreaterThanOrEqual(2);
    vi.restoreAllMocks();
  });

  test('si OpenLayers no carga o las teselas fallan avisa y se recupera cuando vuelven', async () => {
    vi.mocked(loadOpenLayers).mockRejectedValueOnce(new Error('sin red'));
    const failing = render(<PointMap point={null} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el mapa');
    failing.unmount();

    await ready(<PointMap point={null} />);
    expect(screen.queryByRole('alert')).toBeNull();
    act(() => fake.tileHandlers.tileloaderror!());
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el mapa');
    act(() => fake.tileHandlers.tileloadend!());
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});
