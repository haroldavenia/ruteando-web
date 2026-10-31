import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CityMapComponent } from './city-map.component';

describe('CityMapComponent', () => {
  let fixture: ComponentFixture<CityMapComponent>;
  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(CityMapComponent);
    fixture.detectChanges();
  });

  it('está oculto a los lectores de pantalla, sin nada enfocable y sin atender clics', () => {
    expect(root().getAttribute('aria-hidden')).toBe('true');
    expect(root().querySelector('svg')?.getAttribute('focusable')).toBe('false');
    expect(root().querySelectorAll('a, button, input, select, textarea, [tabindex]').length).toBe(0);
    expect(getComputedStyle(root()).pointerEvents).toBe('none');
  });

  it('dibuja una ciudad: calles, avenidas, un río y tres parques', () => {
    expect(root().querySelector('.land')).not.toBeNull();
    expect(root().querySelectorAll('.park').length).toBe(3);
    expect(root().querySelectorAll('.water').length).toBe(1);
    expect(root().querySelector('.street')).not.toBeNull();
    expect(root().querySelector('.avenue')).not.toBeNull();
  });

  it('dibuja tres rutas con diecisiete paradas numeradas «ruta·orden» y un depósito «D»', () => {
    expect(root().querySelectorAll('.route').length).toBe(3);
    expect(root().querySelectorAll('.stop').length).toBe(17);
    expect(root().querySelector('.depot text')?.textContent).toBe('D');
    const labels = Array.from(root().querySelectorAll('.stop text')).map((text) => text.textContent);
    expect(labels.slice(0, 5)).toEqual(['1·1', '1·2', '1·3', '1·4', '1·5']);
    expect(labels[5]).toBe('2·1');
    expect(labels[10]).toBe('3·1');
    expect(labels[16]).toBe('3·7');
  });

  it('cada ruta pide el par claro y oscuro de su color (`light-dark()`)', () => {
    const groups = Array.from(root().querySelectorAll('svg > g[style]'));
    expect(groups.length).toBe(3);
    expect(groups.every((g) => /--c:\s*light-dark\(#[0-9A-F]{6}, #[0-9A-F]{6}\)/i.test(g.getAttribute('style') ?? ''))).toBeTrue();
  });

  it('no pide imágenes ni recursos externos', () => {
    expect(root().querySelector('img, image, use')).toBeNull();
    expect(root().innerHTML).not.toMatch(/https?:|\.png|\.jpe?g|\.svg|url\(/i);
  });

  it('cambia con el tema: el terreno y las rutas son distintos en claro y en oscuro', () => {
    const wrap = document.createElement('div');
    document.body.appendChild(wrap);
    wrap.appendChild(root());
    const read = (scheme: string) => {
      wrap.style.colorScheme = scheme;
      return [getComputedStyle(root().querySelector('.land')!).fill, getComputedStyle(root().querySelector('.route')!).stroke];
    };
    const light = read('light');
    const dark = read('dark');
    wrap.remove();
    expect(dark[0]).not.toBe(light[0]);
    expect(dark[1]).not.toBe(light[1]);
  });

  it('la animación es de entrada y se desactiva con movimiento reducido', () => {
    const css = Array.from(document.querySelectorAll('style')).map((s) => s.textContent ?? '').join('\n');
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\)[\s\S]*animation: draw/);
    expect(getComputedStyle(root().querySelector('.route')!).strokeDasharray).toMatch(/^1(px)?$/);
  });
});
