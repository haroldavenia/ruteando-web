import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessPitchComponent } from './access-pitch.component';

describe('AccessPitchComponent', () => {
  let fixture: ComponentFixture<AccessPitchComponent>;
  const root = () => fixture.nativeElement as HTMLElement;
  const wide = () => window.matchMedia('(min-width: 1024px)').matches;

  beforeEach(() => {
    fixture = TestBed.createComponent(AccessPitchComponent);
    fixture.detectChanges();
  });

  it('presenta el producto con un título y tres ventajas', () => {
    expect(root().querySelector('.title')?.textContent).toBe('Planifica y sigue tus rutas.');
    // El texto de cada ventaja es lo que sigue al icono (el nombre del icono también es texto del DOM)
    expect(Array.from(root().querySelectorAll('li')).map((li) => li.lastChild?.textContent?.trim())).toEqual([
      'Rutas y paradas en un solo mapa',
      'Seguimiento de cada visita',
      'Flota, lugares y zonas a mano',
    ]);
  });

  it('solo la palabra «rutas» lleva el degradado de la marca', () => {
    expect(Array.from(root().querySelectorAll('.accent')).map((el) => el.textContent)).toEqual(['rutas']);
  });

  it('los iconos son decorativos y no hay nada enfocable', () => {
    expect(root().querySelectorAll('mat-icon[aria-hidden="true"]').length).toBe(3);
    expect(root().querySelectorAll('a, button, input, [tabindex]').length).toBe(0);
  });

  it('es una tarjeta de presentación («pitch-card»), con el estilo común de acceso', () => {
    expect(root().classList.contains('pitch-card')).toBeTrue();
  });

  it('en colores forzados la palabra destacada vuelve a texto normal, sin depender del degradado', () => {
    const rules = Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules));
    const forced = rules.filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule && rule.conditionText.includes('forced-colors: active'));
    expect(forced.some((rule) => rule.cssText.includes('.accent') && /background: none/.test(rule.cssText))).toBeTrue();
  });

  it('se oculta en pantallas estrechas y se muestra como tarjeta desde 1024px', () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'access-theme';
    document.body.appendChild(wrapper);
    wrapper.appendChild(root());
    const style = getComputedStyle(root());
    if (wide()) {
      expect(style.display).toBe('block');
      expect(style.borderTopLeftRadius).toBe('24px');
      expect(parseFloat(style.maxWidth)).toBe(440);
    } else {
      expect(style.display).toBe('none');
    }
    wrapper.remove();
  });
});
