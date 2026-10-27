import { environment as development } from '../../../environments/environment.development';
import { environment as production } from '../../../environments/environment';

import { MapConfig } from './map-config';

describe('configuración del mapa por entorno', () => {
  const entornos: [string, MapConfig][] = [
    ['desarrollo', development.map],
    ['producción', production.map],
  ];

  for (const [nombre, map] of entornos) {
    describe(nombre, () => {
      it('define URL de teselas, atribución, centro y zoom', () => {
        expect(map.tilesUrl).toContain('{z}');
        expect(map.tilesUrl).toContain('{x}');
        expect(map.tilesUrl).toContain('{y}');
        expect(map.attribution).toContain('OpenStreetMap contributors');
        expect(Math.abs(map.center.lat)).toBeLessThanOrEqual(90);
        expect(Math.abs(map.center.lng)).toBeLessThanOrEqual(180);
        expect(map.zoom).toBeGreaterThan(0);
      });

      it('no lleva claves ni parámetros de acceso en la URL', () => {
        expect(map.tilesUrl).not.toMatch(/[?&](key|token|access_token|apikey)=/i);
      });
    });
  }
});
