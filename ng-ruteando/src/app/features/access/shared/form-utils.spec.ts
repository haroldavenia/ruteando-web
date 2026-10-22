import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { firstErrorMessage } from '../../../shared/form/access.messages';
import { matchesSibling, revalidateOnPasswordChange } from './form-utils';

@Component({ template: '' })
class HostComponent {
  form = new FormGroup({
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    confirm: new FormControl('', { nonNullable: true, validators: [Validators.required, matchesSibling('password')] }),
  });
  constructor() {
    revalidateOnPasswordChange(this.form, 'password', 'confirm');
  }
}

describe('utilidades de formulario', () => {
  let form: HostComponent['form'];

  beforeEach(() => {
    form = TestBed.createComponent(HostComponent).componentInstance.form;
  });

  it('la confirmación distinta da el error mismatch', () => {
    form.patchValue({ password: 'abcdefgh', confirm: 'abcdefgX' });
    expect(form.controls.confirm.errors).toEqual({ mismatch: true });
  });

  it('la confirmación igual no da error', () => {
    form.patchValue({ password: 'abcdefgh', confirm: 'abcdefgh' });
    expect(form.controls.confirm.errors).toBeNull();
  });

  it('una confirmación vacía solo da required, no mismatch', () => {
    form.patchValue({ password: 'abcdefgh', confirm: '' });
    expect(Object.keys(form.controls.confirm.errors ?? {})).toEqual(['required']);
  });

  it('al cambiar la contraseña se revalida la confirmación', () => {
    form.patchValue({ password: 'abcdefgh', confirm: 'abcdefgh' });
    expect(form.controls.confirm.valid).toBeTrue();

    form.controls.password.setValue('otra-clave-1');
    expect(form.controls.confirm.errors).toEqual({ mismatch: true });
  });

  it('la contraseña corta da minlength', () => {
    form.controls.password.setValue('corta');
    expect(form.controls.password.errors?.['minlength']).toBeTruthy();
  });
});

describe('firstErrorMessage', () => {
  it('usa los mensajes comunes en español', () => {
    expect(firstErrorMessage({ required: true })).toBe('Este campo es obligatorio');
    expect(firstErrorMessage({ email: true })).toBe('Introduce un correo válido');
    expect(firstErrorMessage({ minlength: {} })).toBe('Usa al menos 8 caracteres');
    expect(firstErrorMessage({ mismatch: true })).toBe('Las contraseñas no coinciden');
  });

  it('los mensajes propios tienen prioridad y sin errores devuelve vacío', () => {
    expect(firstErrorMessage({ required: true }, { required: 'Introduce tu correo' })).toBe('Introduce tu correo');
    expect(firstErrorMessage(null)).toBe('');
    expect(firstErrorMessage({ desconocido: true })).toBe('');
  });
});
