import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { FocusFirstInvalidDirective } from './focus-first-invalid.directive';
import { FormResultComponent } from './form-result.component';

@Component({
  imports: [ReactiveFormsModule, FocusFirstInvalidDirective, FormResultComponent],
  template: `
    <form [formGroup]="form" appFocusFirstInvalid (ngSubmit)="submitted = true">
      <input id="a" formControlName="a" />
      <input id="b" formControlName="b" />
      <button type="submit">Enviar</button>
    </form>
    <app-form-result [error]="error" [success]="success" />
  `,
})
class HostComponent {
  submitted = false;
  error: string | null = null;
  success: string | null = null;
  form = new FormGroup({
    a: new FormControl('', { nonNullable: true, validators: Validators.required }),
    b: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
}

describe('FocusFirstInvalidDirective y FormResultComponent', () => {
  function create() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }
  const submit = (root: HTMLElement) => root.querySelector('form')!.dispatchEvent(new Event('submit'));

  it('tras un envío inválido da el foco al primer campo inválido y marca los campos como tocados', () => {
    const fixture = create();
    fixture.componentInstance.form.controls.a.setValue('lleno');
    fixture.detectChanges();

    submit(fixture.nativeElement);
    fixture.detectChanges();

    expect(document.activeElement?.id).toBe('b');
    expect(fixture.componentInstance.form.controls.b.touched).toBeTrue();
  });

  it('con el primer campo vacío el foco va al primero', () => {
    const fixture = create();
    submit(fixture.nativeElement);

    expect(document.activeElement?.id).toBe('a');
  });

  it('con el formulario válido no mueve el foco', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ a: 'x', b: 'y' });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).focus();

    submit(fixture.nativeElement);

    expect(document.activeElement?.tagName).toBe('BUTTON');
  });

  it('los contenedores de resultado existen siempre y usan alert y status', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('[role="alert"]')).not.toBeNull();
    expect(root.querySelector('[role="status"][aria-live="polite"]')).not.toBeNull();
    expect(root.querySelector('[role="alert"]')?.textContent?.trim()).toBe('');
  });

  it('muestra el error en la región alert y la confirmación en la región status', () => {
    const fixture = create();
    fixture.componentInstance.error = 'Algo falló';
    fixture.componentInstance.success = 'Hecho';
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Algo falló');
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Hecho');
  });
});
