import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { FleetTabsComponent } from './fleet-tabs.component';

describe('FleetTabsComponent', () => {
  async function render(url: string): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'flota/vehiculos', children: [] },
          { path: 'flota/tipos', children: [] },
          { path: 'flota/conductores', children: [] },
        ]),
      ],
    });
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(FleetTabsComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  const links = (root: HTMLElement) => Array.from(root.querySelectorAll('a')) as HTMLAnchorElement[];

  it('ofrece los tres listados de la flota, con su nombre y su ruta de siempre', async () => {
    const root = await render('/flota/vehiculos');

    expect(links(root).map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Vehículos', '/flota/vehiculos'],
      ['Tipos de vehículo', '/flota/tipos'],
      ['Conductores', '/flota/conductores'],
    ]);
  });

  it('es una navegación con nombre accesible', async () => {
    const root = await render('/flota/vehiculos');

    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Secciones de la flota');
  });

  for (const [url, current] of [
    ['/flota/vehiculos', 'Vehículos'],
    ['/flota/tipos', 'Tipos de vehículo'],
    ['/flota/conductores', 'Conductores'],
  ]) {
    it(`en ${url} marca solo «${current}» como la página actual`, async () => {
      const root = await render(url);
      const marked = links(root).filter((a) => a.getAttribute('aria-current') === 'page');

      expect(marked.map((a) => a.textContent?.trim())).toEqual([current]);
      expect(marked[0].classList).toContain('active');
    });
  }

  it('cada enlace es un objetivo de al menos 44px de alto', async () => {
    const root = await render('/flota/vehiculos');
    document.body.appendChild(root);
    try {
      for (const link of links(root)) {
        expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      }
    } finally {
      root.remove();
    }
  });

  it('la barra no tiene desplazamiento vertical (un píxel de más en los enlaces lo mostraba)', async () => {
    const root = await render('/flota/vehiculos');
    document.body.appendChild(root);
    try {
      const nav = root.querySelector('nav') as HTMLElement;

      expect(nav.scrollHeight).toBeLessThanOrEqual(nav.clientHeight);
      expect(getComputedStyle(nav).overflowY).toBe('hidden');
    } finally {
      root.remove();
    }
  });

  it('la pestaña actual se distingue por más que el color: lleva una línea inferior', async () => {
    const root = await render('/flota/tipos');
    document.body.appendChild(root);
    try {
      const current = links(root)[1];
      const other = links(root)[0];

      expect(getComputedStyle(current).borderBottomColor).not.toBe(getComputedStyle(other).borderBottomColor);
    } finally {
      root.remove();
    }
  });
});
