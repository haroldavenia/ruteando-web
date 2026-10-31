import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormActionsComponent } from './form-actions.component';

@Component({
  imports: [FormActionsComponent],
  template: `
    <app-form-actions [dirty]="dirty()">
      <a href="/x">Cancelar</a>
      <button type="submit">Guardar</button>
    </app-form-actions>
  `,
})
class HostComponent {
  readonly dirty = signal(false);
}

describe('FormActionsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const root = () => fixture.nativeElement as HTMLElement;
  const status = () => root().querySelector('[role="status"]') as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('proyecta los botones del formulario tal cual, en su orden', () => {
    const items = Array.from(root().querySelectorAll('app-form-actions > a, app-form-actions > button')).map((e) => e.textContent?.trim());

    expect(items).toEqual(['Cancelar', 'Guardar']);
    expect(root().querySelector('button')?.getAttribute('type')).toBe('submit');
  });

  it('toma el aspecto común de las acciones del formulario', () => {
    const host = root().querySelector('app-form-actions') as HTMLElement;

    expect(host.classList).toContain('form-actions');
    expect(getComputedStyle(host).display).toBe('flex');
    expect(getComputedStyle(host).justifyContent).toBe('flex-end');
  });

  it('sin cambios no avisa de nada, pero la región de estado ya existe para anunciar el aviso', () => {
    expect(status()).not.toBeNull();
    expect(status().textContent?.trim()).toBe('');
    expect(getComputedStyle(status()).display).toBe('none');
  });

  it('con cambios sin guardar lo dice con icono y texto, anunciado como estado', () => {
    fixture.componentInstance.dirty.set(true);
    fixture.detectChanges();

    expect(status().textContent).toContain('Cambios sin guardar');
    expect(status().querySelector('mat-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(getComputedStyle(status()).display).not.toBe('none');
  });

  it('el aviso desaparece al guardar', () => {
    fixture.componentInstance.dirty.set(true);
    fixture.detectChanges();
    fixture.componentInstance.dirty.set(false);
    fixture.detectChanges();

    expect(status().textContent?.trim()).toBe('');
  });

  it('en pantallas estrechas la barra queda fija al pie y con fondo propio', () => {
    const css = ((FormActionsComponent as unknown as { ɵcmp: { styles?: string[] } }).ɵcmp.styles ?? []).join('\n');

    expect(css).toMatch(/@media \(max-width: 719\.98px\)[\s\S]*position: sticky[\s\S]*bottom: 0[\s\S]*background/);
  });
});
