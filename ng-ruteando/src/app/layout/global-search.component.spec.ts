import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';

import { makeUser } from '../../testing/session';
import { CurrentUser } from '../core/auth/current-user';
import { UserRole } from '../core/auth/session.model';

import { GlobalSearchComponent } from './global-search.component';
import { navItemsFor } from './nav-items';

describe('GlobalSearchComponent', () => {
  let fixture: ComponentFixture<GlobalSearchComponent>;
  const root = () => fixture.nativeElement as HTMLElement;
  const input = () => root().querySelector('input') as HTMLInputElement;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
  /** El panel se adjunta junto al campo (el CDK 21 usa el popover del navegador), no en el contenedor de overlays. */
  const panel = () => document.querySelector('.mat-mdc-autocomplete-panel') as HTMLElement;
  const labels = (group: string) => {
    const found = fixture.componentInstance.groups().find((g) => g.label === group);
    return found ? found.options.map((option) => option.label) : [];
  };
  const type = (text: string) => fixture.componentInstance.search.setValue(text);
  /** Abre la lista como lo haría la persona: foco y pulsación (sin foco real de la ventana, solo la pulsación abre el panel). */
  async function openList(): Promise<void> {
    input().focus();
    input().click();
    fixture.detectChanges();
    await wait();
  }

  /** Abre la búsqueda para un rol, con las entradas de menú que ese rol puede ver. */
  function open(role: UserRole): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideNoopAnimations()] });
    TestBed.inject(CurrentUser).set(makeUser({ role }));
    fixture = TestBed.createComponent(GlobalSearchComponent);
    fixture.componentRef.setInput('items', navItemsFor(role));
    fixture.detectChanges();
  }

  beforeEach(() => open('tenant_admin'));

  it('es un campo de búsqueda con nombre en español, la sugerencia Ctrl K decorativa y el atajo declarado', () => {
    expect(root().querySelector('[role="search"]')).not.toBeNull();
    expect(input().getAttribute('aria-label')).toBe('Buscar o ir a una pantalla');
    expect(input().getAttribute('placeholder')).toBe('Buscar o ir a…');
    expect(input().getAttribute('aria-keyshortcuts')).toBe('Control+K');
    expect(root().querySelector('.hint')?.getAttribute('aria-hidden')).toBe('true');
    expect(Array.from(root().querySelectorAll('kbd')).map((kbd) => kbd.textContent)).toEqual(['Ctrl', 'K']);
  });

  it('es una píldora de 44px de alto con el borde del contraste de los campos', () => {
    document.body.appendChild(root());
    const style = getComputedStyle(root().querySelector('.search')!);
    expect(parseFloat(style.height)).toBe(44);
    expect(style.borderTopLeftRadius).toBe('999px');
    root().remove();
  });

  it('sin escribir ofrece todas las pantallas del rol y las acciones', () => {
    expect(labels('Ir a')).toEqual(['Inicio', 'Vehículos', 'Tipos de vehículo', 'Conductores', 'Lugares', 'Zonas', 'Paquetes', 'Jornadas', 'Configuraciones', 'Auditoría']);
    expect(labels('Acciones')).toEqual(['Planificar jornada', 'Nuevo paquete', 'Importar paquetes']);
  });

  it('filtra sin distinguir mayúsculas ni tildes', () => {
    type('VEHICULOS');
    expect(labels('Ir a')).toEqual(['Vehículos']);
    expect(labels('Acciones')).toEqual([]);
    type('paquete');
    expect(labels('Ir a')).toEqual(['Paquetes']);
    expect(labels('Acciones')).toEqual(['Nuevo paquete', 'Importar paquetes']);
  });

  it('sin coincidencias no hay grupos y la lista dice «Sin resultados»', async () => {
    type('zzz');
    expect(fixture.componentInstance.groups()).toEqual([]);
    await openList();
    expect(panel().textContent).toContain('Sin resultados');
  });

  it('un agente solo encuentra lo que su rol puede abrir', () => {
    open('agent');
    expect(labels('Ir a')).toEqual(['Inicio', 'Paquetes', 'Jornadas', 'Auditoría']);
    type('flota');
    expect(fixture.componentInstance.groups()).toEqual([]);
  });

  it('un conductor solo encuentra Inicio y no tiene acciones', () => {
    open('driver');
    expect(labels('Ir a')).toEqual(['Inicio']);
    expect(labels('Acciones')).toEqual([]);
  });

  it('al abrir el campo se despliega la lista, agrupada en «Ir a» y «Acciones»', async () => {
    await openList();

    expect(Array.from(panel().querySelectorAll('mat-optgroup .mat-mdc-optgroup-label')).map((el) => el.textContent?.trim())).toEqual(['Ir a', 'Acciones']);
    expect(panel().querySelectorAll('mat-option').length).toBe(13);
  });

  it('el panel tiene el ancho y la posición de la píldora entera, no solo los del campo', async () => {
    // Como en la barra (380px) y separada del borde de la ventana, donde el CDK deja un margen de 8px que recortaría el panel
    root().style.width = '380px';
    root().style.marginLeft = '120px';
    await openList();
    const pill = root().querySelector('.search')!.getBoundingClientRect();
    const list = panel().getBoundingClientRect();
    expect(pill.width).toBeGreaterThan(input().getBoundingClientRect().width);
    expect(Math.abs(list.width - pill.width)).toBeLessThan(2);
    expect(Math.abs(list.left - pill.left)).toBeLessThan(2);
  });

  it('al elegir una opción va a su pantalla, vacía el campo y quita el foco', () => {
    const navigateByUrl = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    input().focus();
    type('zonas');
    fixture.componentInstance.go({ label: 'Zonas', icon: 'hexagon', link: '/zonas' });
    fixture.detectChanges();

    expect(navigateByUrl).toHaveBeenCalledWith('/zonas');
    expect(fixture.componentInstance.search.value).toBe('');
    expect(document.activeElement).not.toBe(input());
  });

  it('Ctrl K lleva el foco a la búsqueda y evita el atajo del navegador; Cmd K también', () => {
    const press = (init: KeyboardEventInit) => {
      const event = new KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true, ...init });
      document.dispatchEvent(event);
      return event;
    };
    const ctrl = press({ ctrlKey: true });
    expect(ctrl.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(input());
    input().blur();
    press({ metaKey: true });
    expect(document.activeElement).toBe(input());
  });

  it('la tecla K sola no hace nada', () => {
    const event = new KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBeFalse();
    expect(document.activeElement).not.toBe(input());
  });
});
