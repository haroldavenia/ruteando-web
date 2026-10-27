import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { makeUser } from '../../testing/session';
import { CurrentUser } from '../core/auth/current-user';
import { UserRole } from '../core/auth/session.model';
import { navItemsFor } from '../layout/nav-items';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  const root = () => fixture.nativeElement as HTMLElement;
  const links = () => Array.from(root().querySelectorAll('a.area'));
  const names = () => links().map((a) => a.querySelector('span')!.textContent!.trim());

  function open(role: UserRole): void {
    TestBed.configureTestingModule({ imports: [HomeComponent], providers: [provideRouter([])] });
    TestBed.inject(CurrentUser).set(makeUser({ role }));
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  }

  it('tiene un único h1 «Ruteando» y la sección «Áreas» con su h2', () => {
    open('tenant_admin');
    expect(root().querySelectorAll('h1').length).toBe(1);
    expect(root().querySelector('h1')?.textContent).toBe('Ruteando');
    const section = root().querySelector('section[aria-labelledby="areas-title"]')!;
    expect(section.querySelector('h2#areas-title')?.textContent).toBe('Áreas');
  });

  for (const role of ['tenant_admin', 'super_admin'] as const) {
    it(`${role} ve accesos a Flota, Lugares, Zonas, Paquetes, Jornadas y Configuraciones`, () => {
      open(role);
      expect(names()).toEqual(['Vehículos', 'Tipos de vehículo', 'Conductores', 'Lugares', 'Zonas', 'Paquetes', 'Jornadas', 'Configuraciones']);
      expect(links().map((a) => a.getAttribute('href'))).toEqual([
        '/flota/vehiculos',
        '/flota/tipos',
        '/flota/conductores',
        '/lugares',
        '/zonas',
        '/paquetes',
        '/jornadas',
        '/configuraciones',
      ]);
    });
  }

  it('el agente ve solo Paquetes y Jornadas', () => {
    open('agent');
    expect(names()).toEqual(['Paquetes', 'Jornadas']);
  });

  it('el conductor ve un mensaje y ningún acceso', () => {
    open('driver');
    expect(links().length).toBe(0);
    expect(root().textContent).toContain('Tu rol no tiene áreas disponibles en la aplicación web');
  });

  it('los accesos coinciden con las áreas del menú lateral para cada rol', () => {
    for (const role of ['tenant_admin', 'agent'] as const) {
      TestBed.resetTestingModule();
      open(role);
      const menu = navItemsFor(role)
        .filter((item) => item.link !== '/')
        .flatMap((item) => item.children ?? [item])
        .map((item) => item.label);
      expect(names()).toEqual(menu);
    }
  });

  it('los accesos son enlaces con texto, operables con teclado', () => {
    open('tenant_admin');
    expect(links().every((a) => a.tagName === 'A' && a.getAttribute('href'))).toBeTrue();
    expect(root().querySelectorAll('mat-icon[aria-hidden="true"]').length).toBe(links().length);
  });
});
