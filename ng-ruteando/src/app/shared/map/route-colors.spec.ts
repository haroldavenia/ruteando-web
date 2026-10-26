import { ROUTE_COLORS, routeColor } from './route-colors';

describe('routeColor', () => {
  it('las ocho primeras rutas tienen colores distintos', () => {
    const colors = Array.from({ length: 8 }, (_, i) => routeColor(i));
    expect(new Set(colors).size).toBe(8);
  });

  it('a partir de la novena se repiten por orden', () => {
    expect(routeColor(8)).toBe(routeColor(0));
    expect(routeColor(9)).toBe(routeColor(1));
    expect(routeColor(17)).toBe(routeColor(1));
  });

  it('un índice negativo no falla', () => {
    expect(routeColor(-1)).toBe(ROUTE_COLORS[7]);
  });

  it('todos son colores hexadecimales válidos y ninguno es amarillo puro', () => {
    for (const color of ROUTE_COLORS) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
      expect(color).not.toBe('#FFFF00');
      expect(color).not.toBe('#F0E442');
    }
  });
});
