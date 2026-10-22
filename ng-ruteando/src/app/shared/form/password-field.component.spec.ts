import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PasswordFieldComponent } from './password-field.component';

@Component({
  imports: [PasswordFieldComponent],
  template: `<app-password-field [control]="control" label="Contraseña" autocomplete="new-password" [messages]="messages" />`,
})
class HostComponent {
  control = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  messages = { required: 'Introduce tu contraseña' };
}

describe('PasswordFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let root: HTMLElement;
  const input = () => root.querySelector('input') as HTMLInputElement;
  const toggle = () => root.querySelector('button') as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideNoopAnimations()] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });

  it('muestra la etiqueta y pasa autocomplete al input', () => {
    expect(root.querySelector('mat-label')?.textContent).toContain('Contraseña');
    expect(input().getAttribute('autocomplete')).toBe('new-password');
  });

  it('empieza oculta y el botón alterna el tipo con su etiqueta y aria-pressed', () => {
    expect(input().type).toBe('password');
    expect(toggle().getAttribute('aria-label')).toBe('Mostrar contraseña');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');

    toggle().click();
    fixture.detectChanges();
    expect(input().type).toBe('text');
    expect(toggle().getAttribute('aria-label')).toBe('Ocultar contraseña');
    expect(toggle().getAttribute('aria-pressed')).toBe('true');

    toggle().click();
    fixture.detectChanges();
    expect(input().type).toBe('password');
  });

  it('al activar el botón el foco se queda en el botón y no salta al campo', () => {
    toggle().focus();
    toggle().click();
    fixture.detectChanges();

    expect(document.activeElement).toBe(toggle());
    expect(input().type).toBe('text');
  });

  it('el botón no envía el formulario (type=button)', () => {
    expect(toggle().type).toBe('button');
  });

  it('muestra el mensaje propio del error cuando el campo se toca vacío', () => {
    fixture.componentInstance.control.markAsTouched();
    fixture.detectChanges();

    expect(root.querySelector('mat-error')?.textContent).toContain('Introduce tu contraseña');
  });
});
