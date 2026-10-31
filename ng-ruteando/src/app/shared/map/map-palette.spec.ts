import { TestBed } from '@angular/core/testing';

import { ThemeService } from '../../core/theme/theme.service';

import { parseColor, readMapPalette, readableOn, toHex, toRgba } from './map-palette';
import { ROUTE_COLORS, ROUTE_COLORS_DARK } from './route-colors';

/** Color de fondo que resuelve un token con el esquema actual del documento. */
function token(name: string): string {
  const probe = document.createElement('span');
  probe.style.backgroundColor = `var(${name})`;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return toHex(color)!;
}

describe('paleta de los mapas', () => {
  describe('colores', () => {
    it('entiende #rrggbb, rgb(), rgba() y color(srgb …)', () => {
      expect(parseColor('#0072B2')).toEqual([0, 114, 178]);
      expect(parseColor('rgb(98, 0, 238)')).toEqual([98, 0, 238]);
      expect(parseColor('rgba(98 0 238 / 0.5)')).toEqual([98, 0, 238]);
      expect(parseColor('color(srgb 1 0.5 0)')).toEqual([255, 128, 0]);
      expect(parseColor('azul')).toBeNull();
    });

    it('convierte a #rrggbb en minúsculas y a rgba con opacidad', () => {
      expect(toHex('rgb(179, 38, 30)')).toBe('#b3261e');
      expect(toHex('nada')).toBeNull();
      expect(toRgba('#0072B2', 0.35)).toBe('rgba(0, 114, 178, 0.35)');
      expect(toRgba('rgb(1, 2, 3)', 0.2)).toBe('rgba(1, 2, 3, 0.2)');
      expect(toRgba('nada', 0.2)).toBe('nada');
    });

    it('sobre cualquier color de ruta, claro u oscuro, el texto elegido da al menos 4,5 a 1', () => {
      const luminance = (color: string) => {
        const [r, g, b] = parseColor(color)!.map((v) => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      for (const color of [...ROUTE_COLORS, ...ROUTE_COLORS_DARK]) {
        const [hi, lo] = [luminance(color), luminance(readableOn(color))].sort((a, b) => b - a);
        expect((hi + 0.05) / (lo + 0.05)).withContext(color).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('elige negro o blanco según el contraste con el fondo', () => {
      expect(readableOn('#ffffff')).toBe('#000000');
      expect(readableOn('#000000')).toBe('#ffffff');
      expect(readableOn('#0072B2')).toBe('#ffffff');
      expect(readableOn('#4DB0F0')).toBe('#000000');
      expect(readableOn('sin sentido')).toBe('#000000');
    });
  });

  describe('paleta según el tema', () => {
    let theme: ThemeService;

    beforeEach(() => {
      theme = TestBed.inject(ThemeService);
    });

    afterEach(() => theme.set('system'));

    it('con el tema claro: acento y error del tema, halo blanco y tinta negra', () => {
      theme.set('light');
      const palette = readMapPalette('light', document);

      expect(palette.accent).toBe(token('--mat-sys-primary'));
      expect(palette.danger).toBe(token('--mat-sys-error'));
      expect(palette.halo).toBe('#ffffff');
      expect(palette.ink).toBe('#000000');
    });

    it('con el tema oscuro: los colores del tema oscuro, y halo y tinta de la superficie y del texto', () => {
      theme.set('dark');
      const palette = readMapPalette('dark', document);

      expect(palette.accent).toBe(token('--mat-sys-primary'));
      expect(palette.halo).toBe(token('--mat-sys-surface'));
      expect(palette.ink).toBe(token('--mat-sys-on-surface'));
      theme.set('light');
      expect(palette.accent).not.toBe(token('--mat-sys-primary'));
      expect(palette.halo).not.toBe('#ffffff');
    });

    it('no deja ningún elemento de prueba en el documento', () => {
      const before = document.body.childElementCount;
      readMapPalette('dark', document);

      expect(document.body.childElementCount).toBe(before);
    });
  });
});
