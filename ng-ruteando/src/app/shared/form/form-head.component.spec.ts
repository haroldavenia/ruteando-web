import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FormHeadComponent } from './form-head.component';

@Component({
  imports: [FormHeadComponent],
  template: `<app-form-head title="Nuevo lugar" backLabel="Lugares" backLink="/lugares" />`,
})
class HostComponent {}

describe('FormHeadComponent', () => {
  function render(): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('muestra el título como h1', () => {
    expect(render().querySelector('h1')?.textContent).toBe('Nuevo lugar');
  });

  it('ofrece volver al listado con su nombre y su ruta', () => {
    const link = render().querySelector('a.back') as HTMLAnchorElement;

    expect(link.textContent?.trim()).toBe('Lugares');
    expect(link.getAttribute('href')).toBe('/lugares');
    expect(link.querySelector('mat-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('el enlace de vuelta va antes del título y mide al menos 44px de alto', () => {
    const root = render();
    document.body.appendChild(root);
    try {
      const link = root.querySelector('a.back') as HTMLElement;

      expect(link.compareDocumentPosition(root.querySelector('h1')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    } finally {
      root.remove();
    }
  });

  it('el enlace de vuelta es un botón de contorno, sin fondo y con las esquinas de los demás botones', () => {
    const root = render();
    document.body.appendChild(root);
    try {
      const link = root.querySelector('a.back') as HTMLElement;
      const style = getComputedStyle(link);

      expect(link.classList).toContain('mat-mdc-outlined-button');
      expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(parseFloat(style.borderTopWidth)).toBeGreaterThanOrEqual(1);
      expect(style.borderTopLeftRadius).toBe('12px');
    } finally {
      root.remove();
    }
  });

  it('el botón de vuelta lleva el color del texto y deja aire sobre el título', () => {
    const root = render();
    document.body.appendChild(root);
    try {
      const link = root.querySelector('a.back') as HTMLElement;
      const text = document.createElement('span');
      text.style.color = 'var(--mat-sys-on-surface)';
      root.appendChild(text);

      expect(getComputedStyle(link).color).toBe(getComputedStyle(text).color);
      expect(root.querySelector('h1')!.getBoundingClientRect().top - link.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(12);
    } finally {
      root.remove();
    }
  });

  it('el título conserva el estilo del sistema de interfaz: no declara el suyo', () => {
    const css = ((FormHeadComponent as unknown as { ɵcmp: { styles?: string[] } }).ɵcmp.styles ?? []).join('\n');

    expect(css).not.toMatch(/h1/);
  });
});
