import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgressRingComponent } from './progress-ring.component';

describe('ProgressRingComponent', () => {
  let fixture: ComponentFixture<ProgressRingComponent>;
  const root = () => fixture.nativeElement as HTMLElement;
  const arc = () => root().querySelector('.progress') as SVGCircleElement;
  const circumference = 2 * Math.PI * 42;

  function render(value: number): void {
    fixture = TestBed.createComponent(ProgressRingComponent);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
  }

  it('muestra el porcentaje como texto real y el dibujo es decorativo', () => {
    render(72);
    expect(root().querySelector('.value')?.textContent?.trim()).toBe('72%');
    expect(root().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('el arco cubre la parte proporcional de la circunferencia', () => {
    render(25);
    const [filled, total] = (arc().getAttribute('stroke-dasharray') ?? '').split(' ').map(Number);
    expect(total).toBeCloseTo(circumference, 0);
    expect(filled).toBeCloseTo(circumference * 0.25, 0);
  });

  it('0 % no dibuja arco y 100 % lo cierra', () => {
    render(0);
    expect(Number((arc().getAttribute('stroke-dasharray') ?? '').split(' ')[0])).toBe(0);
    render(100);
    const [filled, total] = (arc().getAttribute('stroke-dasharray') ?? '').split(' ').map(Number);
    expect(filled).toBeCloseTo(total, 0);
  });

  it('redondea y recorta los valores fuera de 0 a 100', () => {
    render(71.6);
    expect(root().querySelector('.value')?.textContent?.trim()).toBe('72%');
    render(140);
    expect(root().querySelector('.value')?.textContent?.trim()).toBe('100%');
    render(-5);
    expect(root().querySelector('.value')?.textContent?.trim()).toBe('0%');
  });

  it('cada anillo tiene su propio degradado, así que dos en la misma página no se pisan', () => {
    render(10);
    const first = root().querySelector('linearGradient')?.getAttribute('id');
    const second = TestBed.createComponent(ProgressRingComponent);
    second.componentRef.setInput('value', 90);
    second.detectChanges();
    const other = (second.nativeElement as HTMLElement).querySelector('linearGradient')?.getAttribute('id');
    expect(first).toBeTruthy();
    expect(other).toBeTruthy();
    expect(first).not.toBe(other);
    expect(arc().getAttribute('stroke')).toBe(`url(#${first})`);
  });

  it('el arco usa los colores del tema: cambia entre claro y oscuro', () => {
    render(50);
    const wrap = document.createElement('div');
    document.body.appendChild(wrap);
    wrap.appendChild(root());
    const stop = root().querySelector('.from') as SVGStopElement;
    wrap.style.colorScheme = 'light';
    const light = getComputedStyle(stop).stopColor;
    wrap.style.colorScheme = 'dark';
    const dark = getComputedStyle(stop).stopColor;
    wrap.remove();
    expect(dark).not.toBe(light);
  });
});
