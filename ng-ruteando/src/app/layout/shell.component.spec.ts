import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { Subject, of } from 'rxjs';

import { makeUser } from '../../testing/session';
import { iconButtonsWithoutTitle } from '../../testing/icon-button-titles';
import { API_BASE_URL } from '../core/api/api-config';
import { AuthService } from '../core/auth/auth.service';
import { CurrentUser } from '../core/auth/current-user';

import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let breakpoints: Subject<BreakpointState>;

  beforeEach(async () => {
    breakpoints = new Subject<BreakpointState>();
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([{ path: '', pathMatch: 'full', children: [] }]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BreakpointObserver, useValue: { observe: () => breakpoints.asObservable() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    // afterNextRender se ejecuta tras un ciclo de la aplicación
    TestBed.inject(ApplicationRef).tick();
  });

  it('se crea', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('los botones de icono de la barra (menú y cuenta) llevan título con lo que hacen', () => {
    TestBed.inject(CurrentUser).set(makeUser({ role: 'tenant_admin' }));
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-toolbar .mat-mdc-icon-button'));

    expect(buttons.length).toBeGreaterThan(0);
    expect(iconButtonsWithoutTitle(fixture.nativeElement)).toEqual([]);
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const withRole = (role: 'tenant_admin' | 'super_admin' | 'agent' | 'driver') => {
    TestBed.inject(CurrentUser).set(makeUser({ role }));
    fixture.detectChanges();
  };
  const goNarrow = () => {
    breakpoints.next({ matches: false, breakpoints: {} });
    fixture.detectChanges();
  };
  const railLabels = () => Array.from(root().querySelectorAll('nav.rail .rail-item .rail-label')).map((el) => el.textContent!.trim());
  const railActive = () => Array.from(root().querySelectorAll('nav.rail .rail-item.active .rail-label')).map((el) => el.textContent!.trim());
  const navigate = async (path: string, routes: string[]) => {
    const router = TestBed.inject(Router);
    router.resetConfig([{ path: '', pathMatch: 'full', children: [] }, ...routes.map((route) => ({ path: route, children: [] }))]);
    await router.navigateByUrl(path);
    fixture.detectChanges();
  };

  describe('riel de iconos (pantalla ancha)', () => {
    it('lleva la marca, que es un enlace al inicio, solo con el emblema a la vista', () => {
      const brand = root().querySelector('nav.rail a.rail-brand') as HTMLAnchorElement;
      expect(brand.getAttribute('href')).toBe('/');
      expect(brand.querySelector('app-brand')?.classList.contains('mark')).toBeTrue();
      expect(brand.textContent).toContain('Ruteando');
    });

    for (const role of ['tenant_admin', 'super_admin'] as const) {
      it(`${role} ve Inicio, Flota, Lugares, Zonas, Paquetes, Jornadas, Config. y Auditoría`, () => {
        withRole(role);
        expect(railLabels()).toEqual(['Inicio', 'Flota', 'Lugares', 'Zonas', 'Paquetes', 'Jornadas', 'Config.', 'Auditoría']);
      });
    }

    it('un agente ve Inicio, Paquetes, Jornadas y Auditoría, sin Flota ni Lugares', () => {
      withRole('agent');
      expect(railLabels()).toEqual(['Inicio', 'Paquetes', 'Jornadas', 'Auditoría']);
    });

    it('un conductor solo ve Inicio', () => {
      withRole('driver');
      expect(railLabels()).toEqual(['Inicio']);
    });

    it('sin usuario cargado (render en servidor) solo muestra las entradas sin rol y no falla', () => {
      TestBed.inject(CurrentUser).clear();
      fixture.detectChanges();
      expect(railLabels()).toEqual(['Inicio']);
    });

    it('«Config.» conserva el nombre accesible largo y las demás entradas se nombran por su texto', () => {
      withRole('tenant_admin');
      const items = Array.from(root().querySelectorAll('nav.rail .rail-item')) as HTMLElement[];
      expect(items.map((item) => item.getAttribute('aria-label'))).toEqual([null, null, null, null, null, null, 'Configuraciones', null]);
    });

    it('cada entrada lleva su icono decorativo sobre su nombre, como botón o enlace con tamaño táctil', () => {
      withRole('tenant_admin');
      const items = Array.from(root().querySelectorAll('nav.rail .rail-item')) as HTMLElement[];
      expect(items.every((item) => item.querySelector('mat-icon')?.getAttribute('aria-hidden') === 'true')).toBeTrue();
      expect(items.every((item) => ['A', 'BUTTON'].includes(item.tagName))).toBeTrue();
      expect(items.every((item) => item.getBoundingClientRect().height >= 56 && item.getBoundingClientRect().width >= 64)).toBeTrue();
    });

    describe('Flota', () => {
      let overlay: HTMLElement;
      const wait = () => new Promise((resolve) => setTimeout(resolve, 40));

      beforeEach(() => {
        overlay = TestBed.inject(OverlayContainer).getContainerElement();
        withRole('tenant_admin');
      });

      it('es un botón que abre un menú con Vehículos, Tipos de vehículo y Conductores', async () => {
        const flota = Array.from(root().querySelectorAll('nav.rail button.rail-item')).find((b) => b.textContent?.includes('Flota')) as HTMLButtonElement;
        expect(flota.getAttribute('aria-haspopup')).toBe('menu');
        flota.click();
        fixture.detectChanges();
        await wait();

        const entries = Array.from(overlay.querySelectorAll('a[mat-menu-item]')) as HTMLAnchorElement[];
        // El texto de cada entrada es el nombre de su icono seguido del de la pantalla: se descarta el del icono
        const names = entries.map((entry) => entry.textContent!.replace(entry.querySelector('mat-icon')?.textContent ?? '', '').trim());
        expect(names).toEqual(['Vehículos', 'Tipos de vehículo', 'Conductores']);
        expect(entries.map((entry) => entry.getAttribute('href'))).toEqual(['/flota/vehiculos', '/flota/tipos', '/flota/conductores']);
      });
    });

    describe('entrada activa', () => {
      it('Inicio solo en la raíz y con aria-current', async () => {
        withRole('tenant_admin');
        await navigate('/', []);
        expect(railActive()).toEqual(['Inicio']);
        expect(root().querySelector('nav.rail a.active')?.getAttribute('aria-current')).toBe('page');
      });

      for (const [label, path, route, role] of [
        ['Config.', '/configuraciones/abc', 'configuraciones/:id', 'tenant_admin'],
        ['Jornadas', '/jornadas/abc', 'jornadas/:id', 'agent'],
        ['Zonas', '/zonas/abc', 'zonas/:id', 'tenant_admin'],
        ['Paquetes', '/paquetes/abc', 'paquetes/:id', 'agent'],
      ] as const) {
        it(`la edición o el detalle en ${path} marca «${label}» como activa`, async () => {
          withRole(role);
          await navigate(path, [route]);
          expect(railActive()).toEqual([label]);
        });
      }

      it('cualquier pantalla de la flota marca «Flota» como activa, y Inicio no', async () => {
        withRole('tenant_admin');
        await navigate('/flota/vehiculos/abc', ['flota/vehiculos/:id']);
        expect(railActive()).toEqual(['Flota']);
      });

      it('la entrada activa se distingue con fondo propio y con el hilo de la marca, no solo con el peso de la letra', async () => {
        withRole('tenant_admin');
        await navigate('/', []);
        const active = root().querySelector('nav.rail .rail-item.active') as HTMLElement;
        expect(getComputedStyle(active).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        const bar = getComputedStyle(active, '::before');
        expect(bar.width).toBe('4px');
        expect(bar.backgroundImage).toContain('linear-gradient');
      });
    });
  });

  describe('barra superior (pantalla ancha)', () => {
    const title = () => root().querySelector('mat-toolbar .page-title')?.textContent?.trim();

    it('muestra el nombre de la pantalla actual', async () => {
      withRole('tenant_admin');
      await navigate('/', []);
      expect(title()).toBe('Inicio');
      await navigate('/zonas/abc', ['zonas/:id']);
      expect(title()).toBe('Zonas');
      await navigate('/flota/tipos', ['flota/tipos']);
      expect(title()).toBe('Tipos de vehículo');
    });

    it('en «Sin permiso» la barra lo dice y ninguna entrada del riel queda como activa', async () => {
      withRole('agent');
      await navigate('/sin-permiso', ['sin-permiso']);
      expect(title()).toBe('Sin permiso');
      expect(railActive()).toEqual([]);
    });

    it('el título no es un encabezado: el de cada pantalla es su h1', () => {
      expect(root().querySelector('mat-toolbar h1, mat-toolbar h2')).toBeNull();
    });

    it('lleva el selector de tema antes del avatar', () => {
      const toolbar = root().querySelector('mat-toolbar') as HTMLElement;
      const toggle = toolbar.querySelector('app-theme-toggle');
      const avatar = toolbar.querySelector('.avatar-button');
      expect(toggle).not.toBeNull();
      expect(toggle?.querySelector('mat-button-toggle-group')?.getAttribute('aria-label')).toBe('Tema de color');
      expect(toggle!.compareDocumentPosition(avatar!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('no ofrece el botón del menú desplegable ni tiene menú desplegable', () => {
      expect(root().querySelector('button[aria-label="Abrir menú de navegación"]')).toBeNull();
      expect(root().querySelector('mat-sidenav')).toBeNull();
    });
  });

  describe('búsqueda en la barra', () => {
    it('está en la barra de las pantallas anchas, entre el título y el tema, y recibe las entradas del rol', async () => {
      withRole('agent');
      const toolbar = root().querySelector('mat-toolbar') as HTMLElement;
      const search = toolbar.querySelector('app-global-search') as HTMLElement;
      expect(search).not.toBeNull();
      expect(search.querySelector('input')?.getAttribute('aria-label')).toBe('Buscar o ir a una pantalla');
      const title = toolbar.querySelector('.page-title')!;
      const toggle = toolbar.querySelector('app-theme-toggle')!;
      expect(title.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(search.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('Ctrl K lleva el foco a la búsqueda desde la barra', () => {
      withRole('tenant_admin');
      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });
      document.dispatchEvent(event);
      expect(event.defaultPrevented).toBeTrue();
      expect(document.activeElement).toBe(root().querySelector('app-global-search input'));
    });

    it('en pantallas estrechas no hay búsqueda y Ctrl K no hace nada', () => {
      goNarrow();
      expect(root().querySelector('app-global-search')).toBeNull();
      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });
      document.dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
    });
  });

  describe('menú desplegable (pantalla estrecha)', () => {
    const titles = () => Array.from(root().querySelectorAll('mat-sidenav a')).map((a) => a.querySelector('[matListItemTitle]')!.textContent!.trim());

    it('sustituye al riel y a la búsqueda: botón de menú con etiqueta en español y marca compacta', () => {
      goNarrow();
      expect(root().querySelector('nav.rail')).toBeNull();
      expect(root().querySelector('mat-toolbar .search')).toBeNull();
      expect(root().querySelector('button[aria-label="Abrir menú de navegación"]')).not.toBeNull();
      const brand = root().querySelector('mat-toolbar app-brand') as HTMLElement;
      expect(brand.classList.contains('compact')).toBeTrue();
      expect(brand.querySelector('.name')?.textContent).toBe('Ruteando');
    });

    it('vuelve al riel al ensanchar la ventana', () => {
      goNarrow();
      breakpoints.next({ matches: true, breakpoints: {} });
      fixture.detectChanges();
      expect(root().querySelector('nav.rail')).not.toBeNull();
      expect(root().querySelector('mat-sidenav')).toBeNull();
    });

    it('administración ve Inicio, la sección Flota con sus tres entradas y las demás áreas', () => {
      withRole('tenant_admin');
      goNarrow();
      expect(root().querySelector('mat-sidenav h3')?.textContent).toContain('Flota');
      expect(titles()).toEqual(['Inicio', 'Vehículos', 'Tipos de vehículo', 'Conductores', 'Lugares', 'Zonas', 'Paquetes', 'Jornadas', 'Configuraciones', 'Auditoría']);
    });

    it('un agente ve Inicio, Paquetes, Jornadas y Auditoría, sin sección Flota', () => {
      withRole('agent');
      goNarrow();
      expect(titles()).toEqual(['Inicio', 'Paquetes', 'Jornadas', 'Auditoría']);
      expect(root().querySelector('mat-sidenav h3')).toBeNull();
    });

    it('tiene un encabezado que no es un h3 de sección ni un enlace', () => {
      goNarrow();
      const title = root().querySelector('mat-sidenav .nav-title') as HTMLElement;
      expect(title.textContent).toContain('Menú principal');
      expect(title.tagName).toBe('P');
    });

    it('la edición de un vehículo marca «Vehículos» como activa, y Inicio solo en /', async () => {
      withRole('tenant_admin');
      goNarrow();
      await navigate('/flota/vehiculos/abc', ['flota/vehiculos/:id']);
      const active = Array.from(root().querySelectorAll('mat-sidenav a.active')).map((a) => a.querySelector('[matListItemTitle]')!.textContent!.trim());
      expect(active).toEqual(['Vehículos']);
    });

    it('la entrada activa se marca con fondo propio y con aria-current', async () => {
      withRole('tenant_admin');
      goNarrow();
      await navigate('/', []);
      const active = root().querySelector('mat-sidenav a.active') as HTMLElement;
      expect(active.getAttribute('aria-current')).toBe('page');
      const style = getComputedStyle(active);
      expect(style.getPropertyValue('--mat-list-list-item-container-color').trim()).toBe(style.getPropertyValue('--mat-sys-secondary-container').trim());
    });
  });

  describe('aspecto', () => {
    const setUser = (overrides: Parameters<typeof makeUser>[0]) => {
      TestBed.inject(CurrentUser).set(makeUser(overrides));
      fixture.detectChanges();
    };

    it('la barra superior no se tiñe con el color primario', () => {
      expect(root().querySelector('mat-toolbar')!.classList.contains('mat-primary')).toBeFalse();
    });

    it('el avatar muestra las iniciales de nombre y apellido, es decorativo y lleva el hilo de la marca', () => {
      setUser({ firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.invalid' });
      const avatar = root().querySelector('button[aria-label="Menú de usuario"] .avatar') as HTMLElement;
      expect(avatar.textContent?.trim()).toBe('AP');
      expect(avatar.getAttribute('aria-hidden')).toBe('true');
      expect(getComputedStyle(avatar).backgroundImage).toContain('linear-gradient');
    });

    it('sin nombre el avatar usa la primera letra del correo, en mayúscula', () => {
      setUser({ firstName: null, lastName: null, email: 'zoe@example.invalid' });
      expect(root().querySelector('.avatar')?.textContent?.trim()).toBe('Z');
    });

    it('con un solo nombre el avatar usa su inicial', () => {
      setUser({ firstName: 'Álvaro', lastName: null, email: 'a@example.invalid' });
      expect(root().querySelector('.avatar')?.textContent?.trim()).toBe('Á');
    });

    it('el botón del avatar sigue siendo un botón con etiqueta en español', () => {
      const button = root().querySelector('button[aria-label="Menú de usuario"]') as HTMLButtonElement;
      expect(button.tagName).toBe('BUTTON');
    });

    it('el área con desplazamiento cabe en la ventana: su relleno cuenta dentro de su alto y no recorta el final de la pantalla', () => {
      const content = root().querySelector('mat-sidenav-content') as HTMLElement;
      expect(getComputedStyle(content).boxSizing).toBe('border-box');
      const container = root().querySelector('mat-sidenav-container') as HTMLElement;
      expect(content.getBoundingClientRect().bottom).toBeLessThanOrEqual(container.getBoundingClientRect().bottom + 1);
    });

    it('el contenido enrutado va en el marco centrado de la página', () => {
      const frame = root().querySelector('mat-sidenav-content .page') as HTMLElement;
      expect(frame).not.toBeNull();
      expect(frame.querySelector('router-outlet')).not.toBeNull();
      expect(getComputedStyle(frame).maxWidth).toBe('1200px');
    });
  });

  describe('menú de usuario', () => {
    let overlay: HTMLElement;
    let logout: jasmine.Spy;
    const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
    const trigger = () => (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Menú de usuario"]') as HTMLButtonElement;
    const overlayButton = (text: string) =>
      (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes(text))!;

    async function openMenu(): Promise<void> {
      trigger().click();
      fixture.detectChanges();
      await wait();
    }

    beforeEach(() => {
      overlay = TestBed.inject(OverlayContainer).getContainerElement();
      TestBed.inject(CurrentUser).set(makeUser({ firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.invalid' }));
      logout = spyOn(TestBed.inject(AuthService), 'logout').and.returnValue(of(undefined));
      fixture.detectChanges();
    });

    it('el botón del menú es un botón con etiqueta en español', () => {
      expect(trigger()).not.toBeNull();
      expect(trigger().tagName).toBe('BUTTON');
    });

    it('muestra el nombre y el correo de la persona con sesión', async () => {
      await openMenu();

      expect(overlay.textContent).toContain('Ana Pérez');
      expect(overlay.textContent).toContain('ana@example.invalid');
    });

    it('sin nombre muestra el correo como nombre', async () => {
      TestBed.inject(CurrentUser).set(makeUser({ firstName: null, lastName: null, email: 'sin-nombre@example.invalid' }));
      fixture.detectChanges();
      await openMenu();

      expect(overlay.querySelector('.user-name')?.textContent).toContain('sin-nombre@example.invalid');
    });

    it('"Cerrar sesión" es un botón nativo (se activa con Intro) y abre el diálogo de confirmación', async () => {
      await openMenu();
      const item = overlayButton('Cerrar sesión');
      expect(item.tagName).toBe('BUTTON');

      item.click();
      fixture.detectChanges();
      await wait();

      expect(overlay.querySelector('app-confirm-dialog')).not.toBeNull();
      expect(logout).not.toHaveBeenCalled();
    });

    it('al confirmar cierra la sesión', async () => {
      await openMenu();
      overlayButton('Cerrar sesión').click();
      await wait();

      (Array.from(overlay.querySelectorAll('app-confirm-dialog button')) as HTMLButtonElement[])
        .find((b) => b.textContent?.trim() === 'Cerrar sesión')!
        .click();
      await wait();

      expect(logout).toHaveBeenCalledTimes(1);
    });

    it('al cancelar la sesión sigue iniciada y el foco vuelve al botón de cuenta', async () => {
      await openMenu();
      overlayButton('Cerrar sesión').click();
      await wait();

      (Array.from(overlay.querySelectorAll('app-confirm-dialog button')) as HTMLButtonElement[])
        .find((b) => b.textContent?.trim() === 'Cancelar')!
        .click();
      await wait();

      expect(logout).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(trigger());
    });

    it('con Escape tampoco se cierra la sesión y el foco vuelve al botón de cuenta', async () => {
      await openMenu();
      overlayButton('Cerrar sesión').click();
      await wait();

      const container = overlay.querySelector('.mat-mdc-dialog-container') as HTMLElement;
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      await wait();

      expect(logout).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(trigger());
    });
  });
});
