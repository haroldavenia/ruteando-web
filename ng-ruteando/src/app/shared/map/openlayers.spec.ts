import { loadOpenLayers } from './openlayers';

describe('loadOpenLayers', () => {
  it('entrega los símbolos del mapa de un punto y los del mapa de rutas', async () => {
    const ol = await loadOpenLayers();
    for (const name of ['Map', 'View', 'TileLayer', 'XYZ', 'VectorLayer', 'VectorSource', 'Feature', 'Point', 'Translate', 'Style', 'CircleStyle', 'Fill', 'Stroke']) {
      expect((ol as unknown as Record<string, unknown>)[name]).withContext(name).toBeDefined();
    }
    for (const name of ['LineString', 'TextStyle', 'Draw', 'Modify', 'Polygon', 'extend', 'createEmptyExtent', 'transformExtent', 'fromLonLat', 'toLonLat', 'defaultControls']) {
      expect((ol as unknown as Record<string, unknown>)[name]).withContext(name).toBeDefined();
    }
  });

  it('puede crear una línea y un texto', async () => {
    const ol = await loadOpenLayers();
    const line = new ol.LineString([ol.fromLonLat([-74, 4.6]), ol.fromLonLat([-74.1, 4.7])]);
    expect(line.getCoordinates().length).toBe(2);
    expect(new ol.TextStyle({ text: '1' }).getText()).toBe('1');
  });

  it('puede crear un polígono y una interacción de dibujo', async () => {
    const ol = await loadOpenLayers();
    const polygon = new ol.Polygon([[ol.fromLonLat([-74.1, 4.5]), ol.fromLonLat([-74, 4.5]), ol.fromLonLat([-74, 4.7]), ol.fromLonLat([-74.1, 4.5])]]);
    expect(polygon.getCoordinates()[0].length).toBe(4);
    expect(new ol.Draw({ type: 'Polygon', source: new ol.VectorSource() }).getActive()).toBeTrue();
  });

  it('dos llamadas comparten la misma carga', () => {
    expect(loadOpenLayers()).toBe(loadOpenLayers());
  });
});
