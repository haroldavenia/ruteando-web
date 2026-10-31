import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AuthService } from '../../core/auth/auth.service';
import { OUTLINED_FIELDS_PROVIDER } from '../../shared/form/outlined-fields';

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

  // El proveedor lo da `app.config.ts` a toda la aplicación (lo comprueba `app.config.spec.ts`); aquí se pone igual que allí
  it('las pantallas de acceso muestran sus campos con contorno y esquinas de 12px, los mismos que el resto de la aplicación', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'acceso',
            component: AccessLayoutComponent,
            children: [{ path: '', loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent) }],
          },
        ]),
        provideNoopAnimations(),
        OUTLINED_FIELDS_PROVIDER,
        { provide: AuthService, useValue: {} },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/acceso');
    const fields = Array.from(document.querySelectorAll('app-access-layout mat-form-field'));
    expect(fields.length).toBeGreaterThan(0);
    expect(fields.every((field) => field.classList.contains('mat-form-field-appearance-outline'))).toBeTrue();
    const shape = getComputedStyle(document.querySelector('app-access-layout main')!).getPropertyValue('--mat-form-field-outlined-container-shape');
    expect(shape.trim()).toBe('12px');
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
      if (window.matchMedia('(min-width: 1024px)').matches) {
        pending('la ventana de pruebas es ancha: el formulario ocupa su columna');
      }
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

    it('la presentación del producto acompaña a la ilustración, con tres ventajas, y es decorativa para el icono', () => {
      const art = document.querySelector('app-access-layout .art')!;
      expect(art.querySelector('app-route-backdrop')).not.toBeNull();
      const pitch = art.querySelector('app-access-pitch')!;
      expect(pitch.querySelector('.title')?.textContent).toBe('Planifica y sigue tus rutas.');
      expect(Array.from(pitch.querySelectorAll('li')).map((li) => li.textContent?.trim())).toEqual([
        'routeRutas y paradas en un solo mapa',
        'task_altSeguimiento de cada visita',
        'local_shippingFlota, lugares y zonas a mano',
      ]);
      expect(pitch.querySelectorAll('mat-icon[aria-hidden="true"]').length).toBe(3);
    });

    it('la presentación va después del formulario en el orden de lectura, aunque se vea a su izquierda', () => {
      const main = document.querySelector('app-access-layout main')!;
      expect(main.children[0].classList.contains('panel')).toBeTrue();
      expect(main.children[1].classList.contains('art')).toBeTrue();
    });

    it('en pantallas estrechas solo se ve la tarjeta sobre la ilustración: la presentación está oculta y la ilustración llena la ventana', () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        pending('la ventana de pruebas es ancha: aplica el diseño dividido');
      }
      const pitch = document.querySelector('app-access-pitch') as HTMLElement;
      expect(getComputedStyle(pitch).display).toBe('none');
      const art = getComputedStyle(document.querySelector('app-access-layout .art')!);
      expect(art.position).toBe('absolute');
      expect(getComputedStyle(document.querySelector('app-access-layout .panel')!).zIndex).toBe('1');
    });

    it('en pantallas anchas el formulario ocupa su propia columna y la ilustración queda fija a la izquierda', () => {
      if (!window.matchMedia('(min-width: 1024px)').matches) {
        pending('la ventana de pruebas es estrecha: aplica el diseño de tarjeta centrada');
      }
      const main = document.querySelector('app-access-layout main') as HTMLElement;
      expect(getComputedStyle(main).gridTemplateAreas).toContain('art panel');
      expect(getComputedStyle(document.querySelector('app-access-layout .art')!).position).toBe('sticky');
      expect(getComputedStyle(document.querySelector('app-access-pitch')!).display).toBe('block');
      expect(getComputedStyle(document.querySelector('app-access-layout .tagline')!).display).toBe('none');
    });

    it('en 360px el ancho máximo de la tarjeta no desborda (ancho 100% con máximo)', () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        pending('la ventana de pruebas es ancha: la columna del formulario no lleva ancho máximo');
      }
      const panel = document.querySelector('app-access-layout .panel') as HTMLElement;
      const style = getComputedStyle(panel);
      expect(style.boxSizing).toBe('border-box');
      expect(style.maxWidth).toBe('440px');
      const main = document.querySelector('app-access-layout main') as HTMLElement;
      expect(main.scrollWidth).toBeLessThanOrEqual(main.clientWidth);
    });

    it('la tarjeta puede encoger por debajo del ancho mínimo de sus campos, para que en 320px no desborde', () => {
      const panel = document.querySelector('app-access-layout .panel') as HTMLElement;
      expect(getComputedStyle(panel).minWidth).toBe('0px');
    });
  });
});
