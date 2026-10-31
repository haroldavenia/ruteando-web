import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  imports: [MatButtonModule, MatIconModule],
  template: `
    <button mat-flat-button type="button">Guardar</button>
    <button mat-stroked-button type="button">Exportar</button>
    <button mat-button type="button">Cancelar</button>
    <button mat-icon-button type="button" aria-label="Editar"><mat-icon fontIcon="edit" /></button>
    <a mat-flat-button href="/x"><mat-icon fontIcon="add" />Nuevo</a>
  `,
})
class HostComponent {}

describe('tamaño y forma de los controles de toda la aplicación', () => {
  let root: HTMLElement;

  beforeEach(() => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });

  it('los botones de relleno, contorno y texto miden 44px de alto (el enlace con aspecto de botón también)', () => {
    const heights = ['button[mat-flat-button]', 'button[mat-stroked-button]', 'button[mat-button]', 'a[mat-flat-button]'].map((selector) => root.querySelector(selector)!.getBoundingClientRect().height);
    expect(heights).toEqual([44, 44, 44, 44]);
  });

  it('tienen las esquinas de 12px de acceso e Inicio, no la píldora de Material', () => {
    for (const selector of ['button[mat-flat-button]', 'button[mat-stroked-button]', 'button[mat-button]']) {
      expect(getComputedStyle(root.querySelector(selector)!).borderTopLeftRadius).withContext(selector).toBe('12px');
    }
  });

  it('el botón de icono mide 44px y sigue siendo redondo; su zona táctil conserva los 48px de Material', () => {
    const button = root.querySelector('button[mat-icon-button]') as HTMLElement;
    const rect = button.getBoundingClientRect();
    expect([rect.width, rect.height]).toEqual([44, 44]);
    expect(parseFloat(getComputedStyle(button).borderTopLeftRadius)).toBeGreaterThanOrEqual(22);
    const touch = button.querySelector('.mat-mdc-button-touch-target')!.getBoundingClientRect();
    expect(touch.height).toBeGreaterThanOrEqual(44);
  });

  describe('botón de texto deshabilitado', () => {
    /** Componentes 0..1 de un color con o sin opacidad: `rgb(...)`, `rgba(...)` o `color(srgb r g b / a)`. */
    function channels(css: string): { rgb: number[]; alpha: number } {
      const numbers = css.match(/[\d.]+/g)!.map(Number);
      const srgb = css.startsWith('color(srgb');
      return { rgb: srgb ? numbers.slice(0, 3) : numbers.slice(0, 3).map((n) => n / 255), alpha: numbers[3] ?? 1 };
    }
    const luminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: number[], b: number[]) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };

    for (const scheme of ['light', 'dark'] as const) {
      it(`en el tema ${scheme} se lee con al menos 4,5 a 1 sobre la superficie y se distingue del botón activo`, () => {
        const host = document.createElement('div');
        host.style.colorScheme = scheme;
        host.style.background = 'var(--mat-sys-surface)';
        host.innerHTML = '<button mat-button class="mat-mdc-button mdc-button" disabled>Quitar</button><button class="mat-mdc-button mdc-button">Quitar</button>';
        document.body.appendChild(host);
        try {
          const [disabled, active] = Array.from(host.querySelectorAll('button')).map((b) => getComputedStyle(b).color);
          const surface = channels(getComputedStyle(host).backgroundColor).rgb;
          const text = channels(disabled);
          const composed = text.rgb.map((c, i) => c * text.alpha + surface[i] * (1 - text.alpha));

          expect(contrast(composed, surface)).toBeGreaterThanOrEqual(4.5);
          expect(disabled).not.toBe(active);
        } finally {
          host.remove();
        }
      });
    }
  });

  it('los botones llevan su zona táctil invisible de al menos 44px, que es la que cuenta como objetivo', () => {
    const touch = root.querySelector('button[mat-flat-button] .mat-mdc-button-touch-target')!.getBoundingClientRect();
    expect(touch.height).toBeGreaterThanOrEqual(44);
  });
});
