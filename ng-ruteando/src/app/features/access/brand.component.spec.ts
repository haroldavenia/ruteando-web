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
});
