import { ROUTE_COLORS, ROUTE_COLORS_DARK, ROUTE_COLOR_NAMES, colorName, routeColor, routeColorThemed } from './route-colors';

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

describe('colores de ruta para fondos oscuros', () => {
  it('hay una variante luminosa por cada color de la paleta, y todas son hexadecimales válidos y distintas', () => {
    expect(ROUTE_COLORS_DARK.length).toBe(ROUTE_COLORS.length);
    expect(new Set(ROUTE_COLORS_DARK).size).toBe(ROUTE_COLORS_DARK.length);
    expect(ROUTE_COLORS_DARK.every((color) => /^#[0-9A-F]{6}$/.test(color))).toBeTrue();
  });

  it('routeColorThemed devuelve el par claro y oscuro del mismo índice para `light-dark()`', () => {
    expect(routeColorThemed(0)).toBe(`light-dark(${ROUTE_COLORS[0]}, ${ROUTE_COLORS_DARK[0]})`);
    expect(routeColorThemed(2)).toBe(`light-dark(${ROUTE_COLORS[2]}, ${ROUTE_COLORS_DARK[2]})`);
  });

  it('se repite por orden a partir de la novena ruta y un índice negativo no falla', () => {
    expect(routeColorThemed(8)).toBe(routeColorThemed(0));
    expect(routeColorThemed(-1)).toBe(routeColorThemed(7));
  });

  it('el color resuelto cambia entre el esquema claro y el oscuro', () => {
    const resolveIn = (scheme: string) => {
      const host = document.createElement('div');
      host.style.colorScheme = scheme;
      const probe = document.createElement('span');
      probe.style.color = routeColorThemed(0);
      host.appendChild(probe);
      document.body.appendChild(host);
      const color = getComputedStyle(probe).color;
      host.remove();
      return color;
    };
    expect(resolveIn('light')).not.toBe(resolveIn('dark'));
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
