import { InjectionToken } from '@angular/core';

/**
 * Carga de OpenLayers bajo demanda. Un `import` estático tocaría `window` en el prerender y metería
 * cientos de kB en el bundle inicial: por eso solo se llama desde el navegador, tras el primer render,
 * y la promesa se memoriza para cargarlo una vez.
 */
async function importOpenLayers() {
  const [map, view, tileLayer, xyz, vectorLayer, vectorSource, feature, point, translate, proj, style, circle, fill, stroke, controls] =
    await Promise.all([
      import('ol/Map'),
      import('ol/View'),
      import('ol/layer/Tile'),
      import('ol/source/XYZ'),
      import('ol/layer/Vector'),
      import('ol/source/Vector'),
      import('ol/Feature'),
      import('ol/geom/Point'),
      import('ol/interaction/Translate'),
      import('ol/proj'),
      import('ol/style/Style'),
      import('ol/style/Circle'),
      import('ol/style/Fill'),
      import('ol/style/Stroke'),
      import('ol/control/defaults'),
    ]);
  return {
    Map: map.default,
    View: view.default,
    TileLayer: tileLayer.default,
    XYZ: xyz.default,
    VectorLayer: vectorLayer.default,
    VectorSource: vectorSource.default,
    Feature: feature.default,
    Point: point.default,
    Translate: translate.default,
    fromLonLat: proj.fromLonLat,
    toLonLat: proj.toLonLat,
    Style: style.default,
    CircleStyle: circle.default,
    Fill: fill.default,
    Stroke: stroke.default,
    defaultControls: controls.defaults,
  };
}

export type OpenLayers = Awaited<ReturnType<typeof importOpenLayers>>;

let loading: Promise<OpenLayers> | null = null;

export function loadOpenLayers(): Promise<OpenLayers> {
  if (!loading) {
    loading = importOpenLayers().catch((error: unknown) => {
      loading = null; // un fallo no se memoriza: el siguiente intento vuelve a cargarlo
      throw error;
    });
  }
  return loading;
}

/** Cómo se carga OpenLayers; se sustituye en las pruebas para simular un fallo de carga. */
export const OPENLAYERS_LOADER = new InjectionToken<() => Promise<OpenLayers>>('OPENLAYERS_LOADER', {
  providedIn: 'root',
  factory: () => loadOpenLayers,
});
