import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormResultComponent } from './form-result.component';

@Component({
  imports: [FormResultComponent],
  template: `<app-form-result [error]="error()" [success]="success()" />`,
})
class HostComponent {
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
}

/** Color de fondo que resuelve un token del tema. */
function tokenColor(token: string): string {
  const probe = document.createElement('div');
  probe.style.background = `var(${token})`;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return color;
}

describe('FormResultComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const alert = () => fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
  const status = () => fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('las dos regiones existen siempre, vacías y sin ocupar espacio, para que se anuncien al llenarse', () => {
    expect(alert()).not.toBeNull();
    expect(status()).not.toBeNull();
    expect(getComputedStyle(alert()).display).toBe('none');
    expect(getComputedStyle(status()).display).toBe('none');
  });

  it('el componente no tiene caja propia: vacío no añade un hueco entre los bloques de la pantalla', () => {
    expect(getComputedStyle(fixture.nativeElement.querySelector('app-form-result')).display).toBe('contents');
  });

  it('el error se anuncia como alerta, con icono decorativo y en el contenedor de error', () => {
    fixture.componentInstance.error.set('No se pudo guardar');
    fixture.detectChanges();

    expect(alert().textContent).toContain('No se pudo guardar');
    expect(alert().querySelector('mat-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(getComputedStyle(alert()).display).toBe('flex');
    expect(getComputedStyle(alert()).backgroundColor).toBe(tokenColor('--mat-sys-error-container'));
  });

  it('la confirmación se anuncia como estado, con icono y en el tono de éxito', () => {
    fixture.componentInstance.success.set('Lugar guardado');
    fixture.detectChanges();

    expect(status().textContent).toContain('Lugar guardado');
    expect(status().querySelector('mat-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(getComputedStyle(status()).backgroundColor).toBe(tokenColor('--app-success-container'));
  });

  it('error y éxito no se confunden: tienen colores distintos', () => {
    fixture.componentInstance.error.set('x');
    fixture.componentInstance.success.set('y');
    fixture.detectChanges();

    expect(getComputedStyle(alert()).backgroundColor).not.toBe(getComputedStyle(status()).backgroundColor);
  });
});
