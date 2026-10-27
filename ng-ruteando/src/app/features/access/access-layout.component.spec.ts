import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AccessLayoutComponent } from './access-layout.component';

describe('AccessLayoutComponent', () => {
  it('muestra el nombre de la aplicación y el contenido enrutado, sin barra ni menú lateral', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'acceso',
            component: AccessLayoutComponent,
            children: [{ path: '', loadComponent: () => import('./forbidden.component').then((m) => m.ForbiddenComponent) }],
          },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/acceso');
    const root: HTMLElement = harness.routeNativeElement!.closest('app-access-layout') ?? harness.routeNativeElement!;

    expect(document.body.textContent).toContain('Ruteando');
    expect(document.querySelector('app-access-layout main')).not.toBeNull();
    expect(root.querySelector('router-outlet')).not.toBeNull();
    expect(document.querySelector('mat-toolbar')).toBeNull();
    expect(document.querySelector('mat-sidenav')).toBeNull();
  });

  describe('aspecto', () => {
    let harness: RouterTestingHarness;
    const css = () => Array.from(document.querySelectorAll('style')).map((s) => s.textContent ?? '').join('\n');

    beforeEach(async () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([
            {
              path: 'acceso',
              component: AccessLayoutComponent,
              children: [{ path: '', loadComponent: () => import('./forbidden.component').then((m) => m.ForbiddenComponent) }],
            },
          ]),
        ],
      });
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/acceso');
    });

    it('lleva el tema de acceso, la marca, el fondo decorativo y el eslogan', () => {
      const main = document.querySelector('app-access-layout main')!;
      expect(main.classList.contains('access-theme')).toBeTrue();
      expect(main.querySelector('app-brand .name')?.textContent).toBe('Ruteando');
      expect(main.querySelector('app-route-backdrop')?.getAttribute('aria-hidden')).toBe('true');
      expect(main.querySelector('.tagline')?.textContent).toBe('Planifica y sigue tus rutas');
    });

    it('la marca y el contenido enrutado están dentro de la tarjeta, y el fondo fuera de ella', () => {
      const panel = document.querySelector('app-access-layout .panel')!;
      expect(panel.querySelector('app-brand')).not.toBeNull();
      expect(panel.querySelector('router-outlet')).not.toBeNull();
      expect(panel.querySelector('app-route-backdrop')).toBeNull();
    });

    it('la tarjeta se centra en vertical y horizontal y deja desplazar la página si el contenido es alto', () => {
      const main = document.querySelector('app-access-layout main') as HTMLElement;
      const style = getComputedStyle(main);
      expect(style.display).toBe('grid');
      expect(style.placeItems).toMatch(/^center( center)?$/);
      expect(parseFloat(style.minHeight)).toBeGreaterThan(0);
      expect(style.overflowY).not.toBe('hidden');
    });

    it('el desenfoque de la tarjeta solo se aplica si hay soporte y no se pide más contraste ni colores forzados', () => {
      expect(css()).toMatch(/@supports [^{]*backdrop-filter: blur\(1px\)[^{]*\{[\s\S]*forced-colors: none[\s\S]*prefers-contrast: no-preference[\s\S]*backdrop-filter: blur/);
      const panel = document.querySelector('app-access-layout .panel') as HTMLElement;
      // La base es opaca: el color de fondo de la tarjeta no es transparente sin las condiciones anteriores
      expect(css()).toMatch(/\.panel(\[[^\]]*\])?\s*\{[^}]*background: var\(--mat-sys-surface\)/);
      expect(panel).toBeTruthy();
    });

    it('en 360px el ancho máximo de la tarjeta no desborda (ancho 100% con máximo)', () => {
      const panel = document.querySelector('app-access-layout .panel') as HTMLElement;
      const style = getComputedStyle(panel);
      expect(style.boxSizing).toBe('border-box');
      expect(style.maxWidth).toBe('440px');
      const main = document.querySelector('app-access-layout main') as HTMLElement;
      expect(main.scrollWidth).toBeLessThanOrEqual(main.clientWidth);
    });
  });
});
