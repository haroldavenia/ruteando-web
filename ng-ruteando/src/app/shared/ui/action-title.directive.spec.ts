import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ActionTitleDirective } from './action-title.directive';

@Component({
  imports: [MatButtonModule, MatIconModule, ActionTitleDirective],
  template: `
    <button id="dinamico" mat-icon-button type="button" [attr.aria-label]="'Editar lugar ' + name()"><mat-icon fontIcon="edit" /></button>
    <a id="enlace" mat-icon-button href="/x" aria-label="Ver la jornada"><mat-icon fontIcon="visibility" /></a>
    <button id="propio" mat-icon-button type="button" aria-label="Eliminar" title="Borrar para siempre"><mat-icon fontIcon="delete" /></button>
    <button id="sin-nombre" mat-icon-button type="button"><mat-icon fontIcon="add" /></button>
    <button id="normal" mat-button type="button" aria-label="No es de icono">Guardar</button>
  `,
})
class HostComponent {
  readonly name = signal('Depósito norte');
}

describe('ActionTitleDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  const el = (id: string) => fixture.nativeElement.querySelector('#' + id) as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('el botón de icono lleva como título su nombre accesible, que ya nombra el registro', () => {
    expect(el('dinamico').getAttribute('title')).toBe('Editar lugar Depósito norte');
    expect(el('dinamico').getAttribute('title')).toBe(el('dinamico').getAttribute('aria-label'));
  });

  it('también el enlace con aspecto de botón de icono', () => {
    expect(el('enlace').getAttribute('title')).toBe('Ver la jornada');
  });

  it('el título sigue al nombre cuando este cambia (una fila que se actualiza)', () => {
    fixture.componentInstance.name.set('Almacén sur');
    fixture.detectChanges();

    expect(el('dinamico').getAttribute('title')).toBe('Editar lugar Almacén sur');
  });

  it('un título puesto a mano en la plantilla se respeta', () => {
    expect(el('propio').getAttribute('title')).toBe('Borrar para siempre');
  });

  it('un botón sin nombre no recibe un título vacío', () => {
    expect(el('sin-nombre').hasAttribute('title')).toBeFalse();
  });

  it('un botón que no es de icono no se toca', () => {
    expect(el('normal').hasAttribute('title')).toBeFalse();
  });
});
