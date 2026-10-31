import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';

import { UserRole } from '../core/auth/session.model';

import { NavRailComponent } from './nav-rail.component';
import { navItemsFor } from './nav-items';

describe('NavRailComponent', () => {
  let fixture: ComponentFixture<NavRailComponent>;
  const root = () => fixture.nativeElement as HTMLElement;
  const labels = () => Array.from(root().querySelectorAll('.rail-item .rail-label')).map((el) => el.textContent!.trim());
  const active = () => Array.from(root().querySelectorAll('.rail-item.active .rail-label')).map((el) => el.textContent!.trim());

  function open(role: UserRole): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideNoopAnimations()] });
    fixture = TestBed.createComponent(NavRailComponent);
    fixture.componentRef.setInput('items', navItemsFor(role));
    fixture.detectChanges();
  }

  async function navigate(path: string, routes: string[]): Promise<void> {
    const router = TestBed.inject(Router);
    router.resetConfig([{ path: '', pathMatch: 'full', children: [] }, ...routes.map((route) => ({ path: route, children: [] }))]);
    await router.navigateByUrl(path);
    fixture.detectChanges();
  }

  beforeEach(() => open('tenant_admin'));

  it('es una navegación con nombre en español, con la marca arriba y una lista de entradas', () => {
    expect(root().querySelector('nav')?.getAttribute('aria-label')).toBe('Navegación principal');
    expect(root().querySelector('a.rail-brand')?.getAttribute('href')).toBe('/');
    expect(root().querySelector('ul.rail-list')).not.toBeNull();
  });

  it('muestra una entrada por área con el nombre corto donde hace falta', () => {
    expect(labels()).toEqual(['Inicio', 'Flota', 'Lugares', 'Zonas', 'Paquetes', 'Jornadas', 'Config.']);
    open('agent');
    expect(labels()).toEqual(['Inicio', 'Paquetes', 'Jornadas']);
  });

  it('«Flota» es un botón con menú y el resto son enlaces a su ruta', () => {
    const items = Array.from(root().querySelectorAll('.rail-item')) as HTMLElement[];
    expect(items.map((item) => item.tagName)).toEqual(['A', 'BUTTON', 'A', 'A', 'A', 'A', 'A']);
    expect(items.filter((item) => item.tagName === 'A').map((item) => item.getAttribute('href'))).toEqual(['/', '/lugares', '/zonas', '/paquetes', '/jornadas', '/configuraciones']);
    expect(items[1].getAttribute('aria-haspopup')).toBe('menu');
  });

  it('el menú de Flota ofrece sus tres entradas con su ruta', async () => {
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    (root().querySelectorAll('.rail-item')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 40));
    const entries = Array.from(overlay.querySelectorAll('a[mat-menu-item]')) as HTMLAnchorElement[];
    expect(entries.map((entry) => entry.getAttribute('href'))).toEqual(['/flota/vehiculos', '/flota/tipos', '/flota/conductores']);
  });

  it('marca «Flota» como activa en cualquiera de sus pantallas y solo en ellas', async () => {
    await navigate('/flota/conductores', ['flota/conductores']);
    expect(active()).toEqual(['Flota']);
    await navigate('/zonas', ['zonas']);
    expect(active()).toEqual(['Zonas']);
  });

  it('la entrada activa lleva aria-current y la barra de la marca', async () => {
    await navigate('/paquetes', ['paquetes']);
    const entry = root().querySelector('a.rail-item.active') as HTMLElement;
    expect(entry.getAttribute('aria-current')).toBe('page');
    expect(getComputedStyle(entry, '::before').width).toBe('4px');
  });
});
