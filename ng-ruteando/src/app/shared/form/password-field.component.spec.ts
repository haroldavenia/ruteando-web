import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { MatFormField } from '@angular/material/form-field';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PasswordFieldComponent } from './password-field.component';

@Component({
  imports: [PasswordFieldComponent],
  template: `<app-password-field [control]="control" label="Contraseña" autocomplete="new-password" [messages]="messages" [requirements]="requirements" />`,
})
class HostComponent {
  control = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  messages = { required: 'Introduce tu contraseña' };
  requirements = false;
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

  describe('lista de requisitos', () => {
    const VALIDA = 'Ruteando@2026abcdef';
    const list = () => root.querySelector('ul.requirements') as HTMLElement | null;
    const items = () => Array.from(root.querySelectorAll('ul.requirements li')) as HTMLElement[];
    const statuses = () => items().map((li) => li.querySelector('.visually-hidden')?.textContent?.replace(/[,.\s]+/g, ' ').trim());
    const host = () => fixture.debugElement.query(By.directive(PasswordFieldComponent)).nativeElement as HTMLElement;
    const show = () => {
      fixture.componentInstance.requirements = true;
      fixture.detectChanges();
    };
    const focus = () => {
      input().dispatchEvent(new Event('focus'));
      fixture.detectChanges();
    };
    const blur = () => {
      input().dispatchEvent(new Event('blur'));
      fixture.detectChanges();
    };
    const type = (value: string) => {
      fixture.componentInstance.control.setValue(value);
      fixture.detectChanges();
    };

    it('sin requirements no pinta ninguna lista ni cambia la descripción del campo', () => {
      expect(list()).toBeNull();
      expect(input().getAttribute('aria-describedby') ?? '').not.toContain('password-requirements');
    });

    it('con requirements trae los cinco puntos, cerrada y descrita por el campo desde el principio', () => {
      show();

      expect(items().map((li) => li.querySelector('span')?.textContent)).toEqual([
        'Al menos 16 caracteres',
        'Una mayúscula',
        'Una minúscula',
        'Un número',
        'Un símbolo (@$!%*?&)',
      ]);
      expect(list()!.classList).toContain('visually-hidden');
      expect(host().classList).not.toContain('open');
      expect(input().getAttribute('aria-describedby')).toContain(list()!.id);
    });

    it('al enfocar el campo se abre y todos los puntos están pendientes', () => {
      show();
      focus();

      expect(list()!.classList).not.toContain('visually-hidden');
      expect(host().classList).toContain('open');
      expect(statuses()).toEqual(Array(5).fill('pendiente'));
    });

    it('al escribir se marca cada punto en cuanto se cumple y se desmarca si deja de cumplirse', () => {
      show();
      focus();

      type('r');
      expect(statuses()).toEqual(['pendiente', 'pendiente', 'cumplido', 'pendiente', 'pendiente']);
      type('rR1@');
      expect(statuses()).toEqual(['pendiente', 'cumplido', 'cumplido', 'cumplido', 'cumplido']);
      type(VALIDA);
      expect(statuses()).toEqual(Array(5).fill('cumplido'));
      type('Ruteando@2026');
      expect(statuses()[0]).toBe('pendiente');
    });

    it('cada punto lleva un icono y un texto de estado, además del color', () => {
      show();
      focus();
      type('r');

      expect(items().map((li) => li.querySelector('mat-icon')?.textContent?.trim())).toEqual([
        'radio_button_unchecked',
        'radio_button_unchecked',
        'check_circle',
        'radio_button_unchecked',
        'radio_button_unchecked',
      ]);
      expect(items().every((li) => li.querySelector('mat-icon')?.getAttribute('aria-hidden') === 'true')).toBeTrue();
      expect(items()[2].classList).toContain('met');
    });

    it('al salir con todo cumplido se cierra', () => {
      show();
      focus();
      type(VALIDA);
      blur();

      expect(list()!.classList).toContain('visually-hidden');
      expect(host().classList).not.toContain('open');
    });

    it('al salir con puntos sin cumplir permanece visible y los que faltan quedan como no cumplidos', () => {
      show();
      focus();
      type('Ruteando@2026');
      blur();

      expect(list()!.classList).not.toContain('visually-hidden');
      expect(statuses()).toEqual(['no cumplido', 'cumplido', 'cumplido', 'cumplido', 'cumplido']);
      expect(items()[0].classList).toContain('failed');
      expect(items()[0].querySelector('mat-icon')?.textContent?.trim()).toBe('cancel');
    });

    it('si se toca el campo sin enfocarlo (un envío con el formulario inválido) se abre con todo no cumplido', () => {
      show();
      fixture.componentInstance.control.markAsTouched();
      fixture.detectChanges();

      expect(list()!.classList).not.toContain('visually-hidden');
      expect(statuses()).toEqual(Array(5).fill('no cumplido'));
    });

    it('al vaciar el campo tras un rechazo (reset) vuelve a pendiente y se cierra', () => {
      show();
      type('Ruteando@2026');
      fixture.componentInstance.control.markAsTouched();
      fixture.detectChanges();
      expect(host().classList).toContain('open');

      fixture.componentInstance.control.reset('');
      fixture.detectChanges();

      expect(statuses()).toEqual(Array(5).fill('pendiente'));
      expect(host().classList).not.toContain('open');
    });

    it('con la lista el pie del campo es dinámico (no se corta) y sin ella sigue fijo', () => {
      const sizing = () => fixture.debugElement.query(By.directive(MatFormField)).componentInstance.subscriptSizing;
      expect(sizing()).toBe('fixed');

      show();
      expect(sizing()).toBe('dynamic');
    });
  });
});
