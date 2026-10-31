import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessStepsComponent } from './access-steps.component';

describe('AccessStepsComponent', () => {
  let fixture: ComponentFixture<AccessStepsComponent>;
  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(AccessStepsComponent);
    fixture.detectChanges();
  });

  it('cuenta el camino hasta la primera jornada en tres pasos, con su título y la palabra «minutos» destacada', () => {
    expect(root().querySelector('.title')?.textContent).toBe('Tu primera jornada, en minutos.');
    expect(Array.from(root().querySelectorAll('.accent')).map((el) => el.textContent)).toEqual(['minutos']);
    expect(Array.from(root().querySelectorAll('li b')).map((el) => el.textContent)).toEqual([
      'Crea tu cuenta',
      'Verifica tu correo',
      'Planifica tu primera jornada',
    ]);
    expect(Array.from(root().querySelectorAll('li small')).map((el) => el.textContent)).toEqual([
      'Tus datos y los de tu empresa',
      'Abre el enlace que te enviamos',
      'Lugares, flota y paquetes',
    ]);
  });

  it('es una lista ordenada y los números son decorativos: el orden ya lo dice la lista', () => {
    expect(root().querySelector('ol')).not.toBeNull();
    expect(root().querySelectorAll('li').length).toBe(3);
    expect(Array.from(root().querySelectorAll('.n')).map((el) => el.getAttribute('aria-hidden'))).toEqual(['true', 'true', 'true']);
  });

  it('solo el primer paso, en el que está la persona, lleva el hilo de la marca', () => {
    expect(Array.from(root().querySelectorAll('li')).map((li) => li.classList.contains('now'))).toEqual([true, false, false]);
  });

  it('es una tarjeta de presentación y no hay nada enfocable', () => {
    expect(root().classList.contains('pitch-card')).toBeTrue();
    expect(root().querySelectorAll('a, button, input, [tabindex]').length).toBe(0);
  });

  it('el número del paso actual se lee sobre el degradado de la marca: texto de `on-primary`', () => {
    const wrapper = document.createElement('div');
    document.body.appendChild(wrapper);
    wrapper.appendChild(root());
    const now = getComputedStyle(root().querySelector('.now .n')!);
    const probe = document.createElement('span');
    probe.style.color = 'var(--mat-sys-on-primary)';
    wrapper.appendChild(probe);
    expect(now.color).toBe(getComputedStyle(probe).color);
    expect(now.backgroundImage).toContain('gradient');
    wrapper.remove();
  });
});
