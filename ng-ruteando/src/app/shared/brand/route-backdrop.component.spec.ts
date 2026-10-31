import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RouteBackdropComponent } from './route-backdrop.component';

describe('RouteBackdropComponent', () => {
  let fixture: ComponentFixture<RouteBackdropComponent>;
  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(RouteBackdropComponent);
    fixture.detectChanges();
  });

  it('está oculto a los lectores de pantalla', () => {
    expect(root().getAttribute('aria-hidden')).toBe('true');
    expect(root().querySelector('svg')?.getAttribute('focusable')).toBe('false');
    expect(root().querySelector('title, desc')).toBeNull();
  });

  it('no tiene nada enfocable ni intercepta clics', () => {
    expect(root().querySelectorAll('a, button, input, select, textarea, [tabindex]').length).toBe(0);
    expect(getComputedStyle(root()).pointerEvents).toBe('none');
  });

  it('dibuja un depósito, tres rutas, quince paradas numeradas y una zona', () => {
    expect(root().querySelectorAll('.route').length).toBe(3);
    expect(root().querySelectorAll('.stop').length).toBe(15);
    expect(root().querySelector('.depot text')?.textContent).toBe('D');
    expect(root().querySelector('.zone')).not.toBeNull();
    const labels = Array.from(root().querySelectorAll('.stop text')).map((t) => t.textContent);
    expect(labels.slice(0, 5)).toEqual(['1·1', '1·2', '1·3', '1·4', '1·5']);
    expect(labels[5]).toBe('2·1');
  });

  it('cada ruta toma su color de una variable CSS', () => {
    const groups = Array.from(root().querySelectorAll('svg > g[style]'));
    expect(groups.length).toBe(3);
    expect(groups.every((g) => /--c:/.test(g.getAttribute('style') ?? ''))).toBeTrue();
  });

  it('no pide imágenes ni recursos externos', () => {
    expect(root().querySelector('img, image, use')).toBeNull();
    expect(root().innerHTML).not.toMatch(/https?:|\.png|\.jpe?g|\.svg|url\(/i);
  });

  it('se adapta al tema: el fondo usa tokens y cambia entre claro y oscuro', () => {
    const wrap = document.createElement('div');
    wrap.className = 'access-theme';
    document.body.appendChild(wrap);
    const color = (scheme: string) => {
      wrap.style.colorScheme = scheme;
      const probe = document.createElement('span');
      probe.style.color = 'var(--mat-sys-surface-container-low)';
      wrap.appendChild(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    };
    expect(color('light')).not.toBe(color('dark'));
    wrap.remove();
    expect(getComputedStyle(root()).backgroundImage).toContain('gradient');
  });

  it('la animación es de entrada y se desactiva con movimiento reducido', async () => {
    const css = Array.from(document.querySelectorAll('style')).map((s) => s.textContent ?? '').join('\n');
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\)[\s\S]*animation: draw/);
    // Sin la media query la ruta queda completa: el desplazamiento del trazo no está animado por defecto
    const route = root().querySelector('.route') as SVGElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      expect(getComputedStyle(route).animationName).toBe('none');
    }
    expect(getComputedStyle(route).strokeDasharray).toMatch(/^1(px)?$/);
  });

  describe('alineación', () => {
    const aspect = () => root().querySelector('svg')!.getAttribute('preserveAspectRatio');

    it('por defecto centra el dibujo al recortar', () => {
      expect(aspect()).toBe('xMidYMid slice');
    });

    it('con `start` ancla el dibujo a la izquierda para que el depósito siempre se vea', () => {
      fixture.componentRef.setInput('align', 'start');
      fixture.detectChanges();
      expect(aspect()).toBe('xMinYMid slice');
    });
  });

  describe('color de las rutas', () => {
    const stroke = (scheme: string) => {
      const wrap = document.createElement('div');
      wrap.style.colorScheme = scheme;
      document.body.appendChild(wrap);
      wrap.appendChild(root());
      const color = getComputedStyle(root().querySelector('.route')!).stroke;
      wrap.remove();
      return color;
    };

    it('cada ruta pide el par claro y oscuro de su color (`light-dark()`)', () => {
      const groups = Array.from(root().querySelectorAll('svg > g[style]'));
      expect(groups.every((g) => /--c:\s*light-dark\(#[0-9A-F]{6}, #[0-9A-F]{6}\)/i.test(g.getAttribute('style') ?? ''))).toBeTrue();
    });

    it('en oscuro las rutas usan tonos distintos, más luminosos, que en claro', () => {
      expect(stroke('light')).not.toBe(stroke('dark'));
    });
  });
});
