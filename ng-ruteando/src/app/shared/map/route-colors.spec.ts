import { ROUTE_COLORS, ROUTE_COLOR_NAMES, colorName, routeColor } from './route-colors';

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

describe('colorName', () => {
  it('cada color de la paleta tiene su nombre', () => {
    expect(ROUTE_COLOR_NAMES.length).toBe(ROUTE_COLORS.length);
    expect(colorName('#0072B2')).toBe('Azul');
    expect(colorName('#d55e00')).toBe('Bermellón');
  });

  it('un color ajeno a la paleta se muestra tal cual y sin color se dice así', () => {
    expect(colorName('#123456')).toBe('#123456');
    expect(colorName(null)).toBe('Sin color');
    expect(colorName('')).toBe('Sin color');
  });
});
