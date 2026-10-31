import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { OUTLINED_FIELDS_PROVIDER } from './outlined-fields';

@Component({
  imports: [MatFormFieldModule, MatInputModule],
  template: `<mat-form-field><mat-label>Nombre</mat-label><input matInput /></mat-form-field>`,
})
class HostComponent {}

describe('campos con contorno', () => {
  function field(): HTMLElement {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('mat-form-field');
  }

  it('con el proveedor de la aplicación, un campo cualquiera tiene contorno', () => {
    TestBed.configureTestingModule({ providers: [OUTLINED_FIELDS_PROVIDER, provideNoopAnimations()] });

    expect(field().classList).toContain('mat-form-field-appearance-outline');
  });

  it('las esquinas de los campos, los botones y los avisos son de 12px en toda la aplicación, no solo en el acceso', () => {
    TestBed.configureTestingModule({ providers: [OUTLINED_FIELDS_PROVIDER, provideNoopAnimations()] });
    const style = getComputedStyle(field());

    expect(style.getPropertyValue('--mat-form-field-outlined-container-shape').trim()).toBe('12px');
    expect(style.getPropertyValue('--mat-button-filled-container-shape').trim()).toBe('12px');
    expect(style.getPropertyValue('--mat-button-outlined-container-shape').trim()).toBe('12px');
    expect(style.getPropertyValue('--mat-button-text-container-shape').trim()).toBe('12px');
    expect(style.getPropertyValue('--mat-snack-bar-container-shape').trim()).toBe('12px');
  });
});
