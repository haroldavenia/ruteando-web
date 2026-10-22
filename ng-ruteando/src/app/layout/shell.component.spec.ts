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

  it('renderiza el enlace "Inicio" del menú', () => {
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
    expect(links.some((a) => a.textContent?.includes('Inicio'))).toBeTrue();
  });

  it('marca como activo el elemento de menú de la ruta actual', async () => {
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();

    const inicio = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).find((a) =>
      a.textContent?.includes('Inicio'),
    );
    expect(inicio?.classList.contains('active')).toBeTrue();
  });

  describe('menú por secciones y rol', () => {
    const links = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-sidenav a')).map((a) => a.querySelector('[matListItemTitle]')!.textContent!.trim());
    const withRole = (role: 'tenant_admin' | 'super_admin' | 'agent' | 'driver') => {
      TestBed.inject(CurrentUser).set(makeUser({ role }));
      fixture.detectChanges();
    };

    for (const role of ['tenant_admin', 'super_admin'] as const) {
      it(`${role} ve Inicio, la sección Flota con tres entradas, Lugares, Paquetes, Jornadas y Configuraciones`, () => {
        withRole(role);
        const root = fixture.nativeElement as HTMLElement;
        expect(root.querySelector('mat-sidenav h3')?.textContent).toContain('Flota');
        expect(links()).toEqual(['Inicio', 'Vehículos', 'Tipos de vehículo', 'Conductores', 'Lugares', 'Paquetes', 'Jornadas', 'Configuraciones']);
      });
    }

    it('un agente ve Inicio, Paquetes y Jornadas, sin la sección Flota ni Lugares', () => {
      withRole('agent');
      expect(links()).toEqual(['Inicio', 'Paquetes', 'Jornadas']);
      expect((fixture.nativeElement as HTMLElement).querySelector('mat-sidenav h3')).toBeNull();
    });

    it('la edición de una configuración marca "Configuraciones" como activa', async () => {
      withRole('tenant_admin');
      TestBed.inject(Router).resetConfig([
        { path: '', pathMatch: 'full', children: [] },
        { path: 'configuraciones/:id', children: [] },
      ]);
      await TestBed.inject(Router).navigateByUrl('/configuraciones/abc');
      fixture.detectChanges();

      const active = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-sidenav a.active')).map((a) =>
        a.querySelector('[matListItemTitle]')!.textContent!.trim(),
      );
      expect(active).toEqual(['Configuraciones']);
    });

    it('el detalle de una jornada marca "Jornadas" como activa', async () => {
      withRole('agent');
      TestBed.inject(Router).resetConfig([
        { path: '', pathMatch: 'full', children: [] },
        { path: 'jornadas/:id', children: [] },
      ]);
      await TestBed.inject(Router).navigateByUrl('/jornadas/abc');
      fixture.detectChanges();

      const active = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-sidenav a.active')).map((a) =>
        a.querySelector('[matListItemTitle]')!.textContent!.trim(),
      );
      expect(active).toEqual(['Jornadas']);
    });

    it('un conductor solo ve Inicio', () => {
      withRole('driver');
      expect(links()).toEqual(['Inicio']);
    });

    it('la edición de un paquete marca "Paquetes" como activa', async () => {
      withRole('agent');
      TestBed.inject(Router).resetConfig([
        { path: '', pathMatch: 'full', children: [] },
        { path: 'paquetes/:id', children: [] },
      ]);
      await TestBed.inject(Router).navigateByUrl('/paquetes/abc');
      fixture.detectChanges();

      const active = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-sidenav a.active')).map((a) =>
        a.querySelector('[matListItemTitle]')!.textContent!.trim(),
      );
      expect(active).toEqual(['Paquetes']);
    });

    it('sin usuario cargado (render en servidor) solo muestra las entradas sin rol y no falla', () => {
      TestBed.inject(CurrentUser).clear();
      fixture.detectChanges();
      expect(links().length).toBe(1);
    });

    it('la edición de un vehículo marca "Vehículos" como activa, y Inicio solo en /', async () => {
      withRole('tenant_admin');
      TestBed.inject(Router).resetConfig([
        { path: '', pathMatch: 'full', children: [] },
        { path: 'flota/vehiculos/:id', children: [] },
      ]);
      await TestBed.inject(Router).navigateByUrl('/flota/vehiculos/abc');
      fixture.detectChanges();

      const active = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-sidenav a.active')).map((a) =>
        a.querySelector('[matListItemTitle]')!.textContent!.trim(),
      );
      expect(active).toEqual(['Vehículos']);
    });
  });

  it('usa el menú fijo en pantalla ancha y desplegable en estrecha', () => {
    expect(fixture.componentInstance.mode()).toBe('side');

    breakpoints.next({ matches: false, breakpoints: {} });
    expect(fixture.componentInstance.mode()).toBe('over');

    breakpoints.next({ matches: true, breakpoints: {} });
    expect(fixture.componentInstance.mode()).toBe('side');
  });

  it('muestra el botón del menú solo en pantalla estrecha, con etiqueta en español', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('button[aria-label="Abrir menú de navegación"]')).toBeNull();

    breakpoints.next({ matches: false, breakpoints: {} });
    fixture.detectChanges();
    expect(root.querySelector('button[aria-label="Abrir menú de navegación"]')).not.toBeNull();
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
