import { loadOpenLayers } from './openlayers';

describe('loadOpenLayers', () => {
  it('entrega los símbolos del mapa de un punto y los del mapa de rutas', async () => {
    const ol = await loadOpenLayers();
    for (const name of ['Map', 'View', 'TileLayer', 'XYZ', 'VectorLayer', 'VectorSource', 'Feature', 'Point', 'Translate', 'Style', 'CircleStyle', 'Fill', 'Stroke']) {
      expect((ol as unknown as Record<string, unknown>)[name]).withContext(name).toBeDefined();
    }
    for (const name of ['LineString', 'TextStyle', 'extend', 'createEmptyExtent', 'transformExtent', 'fromLonLat', 'toLonLat', 'defaultControls']) {
      expect((ol as unknown as Record<string, unknown>)[name]).withContext(name).toBeDefined();
    }
  });

  it('puede crear una línea y un texto', async () => {
    const ol = await loadOpenLayers();
    const line = new ol.LineString([ol.fromLonLat([-74, 4.6]), ol.fromLonLat([-74.1, 4.7])]);
    expect(line.getCoordinates().length).toBe(2);
    expect(new ol.TextStyle({ text: '1' }).getText()).toBe('1');
  });

  it('dos llamadas comparten la misma carga', () => {
    expect(loadOpenLayers()).toBe(loadOpenLayers());
  });
});
