import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandComponent } from './brand.component';

describe('BrandComponent', () => {
  let fixture: ComponentFixture<BrandComponent>;
  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(BrandComponent);
    fixture.detectChanges();
  });

  it('muestra el nombre como texto real', () => {
    expect(root().querySelector('.name')?.textContent).toBe('Ruteando');
    expect(root().textContent!.replace(/\s+/g, ' ').trim()).toBe('Ruteando');
  });

  it('el emblema es un SVG decorativo oculto a lectores de pantalla y no enfocable', () => {
    const svg = root().querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.querySelector('title')).toBeNull();
  });

  it('no usa imágenes ni recursos externos', () => {
    expect(root().querySelector('img, image')).toBeNull();
    expect(root().innerHTML).not.toMatch(/url\(|https?:|\.png|\.jpe?g|\.svg/i);
  });

  it('dibuja las tres flechas de ruta', () => {
    expect(root().querySelectorAll('.arrows #arrow, .arrows use').length).toBe(3);
  });

  it('el color sale de los tokens del tema, no de valores fijos', () => {
    const color = getComputedStyle(root()).color;
    expect(color).toBeTruthy();
    expect(root().innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('la variante compacta reduce el emblema y el nombre sin cambiar el texto', () => {
    const regular = root().querySelector('svg') as SVGElement;
    document.body.appendChild(root());
    const regularWidth = regular.getBoundingClientRect().width;
    fixture.componentRef.setInput('size', 'compact');
    fixture.detectChanges();
    expect(root().classList.contains('compact')).toBeTrue();
    expect(regular.getBoundingClientRect().width).toBeLessThan(regularWidth);
    expect(root().querySelector('.name')?.textContent).toBe('Ruteando');
    root().remove();
  });

  it('la variante «mark» muestra solo el emblema, pero el nombre sigue en el DOM para los lectores de pantalla', () => {
    document.body.appendChild(root());
    fixture.componentRef.setInput('size', 'mark');
    fixture.detectChanges();
    const name = root().querySelector('.name') as HTMLElement;
    expect(root().classList.contains('mark')).toBeTrue();
    expect(name.textContent).toBe('Ruteando');
    expect(name.getBoundingClientRect().width).toBeLessThanOrEqual(1);
    expect(root().querySelector('svg')!.getBoundingClientRect().width).toBeGreaterThan(24);
    root().remove();
  });
});
