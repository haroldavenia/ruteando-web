import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkeletonComponent, SkeletonVariant } from './skeleton.component';

describe('SkeletonComponent', () => {
  let fixture: ComponentFixture<SkeletonComponent>;
  const root = () => fixture.nativeElement as HTMLElement;

  function render(variant: SkeletonVariant, label?: string, count?: number): void {
    fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentRef.setInput('variant', variant);
    if (label) fixture.componentRef.setInput('label', label);
    if (count !== undefined) fixture.componentRef.setInput('count', count);
    fixture.detectChanges();
  }

  it('anuncia la etiqueta como estado y esconde el dibujo a los lectores', () => {
    render('stats', 'Cargando la jornada…');
    expect(root().getAttribute('role')).toBe('status');
    expect(root().querySelector('.visually-hidden')?.textContent).toBe('Cargando la jornada…');
    expect(root().querySelector('.shape')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('dibuja las piezas por defecto de cada variante y respeta `count`', () => {
    render('stats');
    expect(root().querySelectorAll('.stat').length).toBe(6);
    render('form');
    expect(root().querySelectorAll('.field').length).toBe(4);
    render('list', undefined, 5);
    expect(root().querySelectorAll('.row').length).toBe(5);
    render('ring');
    expect(root().querySelectorAll('.disc').length).toBe(1);
  });
});
