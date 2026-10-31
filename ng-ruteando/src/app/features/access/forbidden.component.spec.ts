import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CurrentUser } from '../../core/auth/current-user';
import { makeUser } from '../../../testing/session';

import { ForbiddenComponent } from './forbidden.component';

describe('ForbiddenComponent', () => {
  function render(role: string | null) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    if (role) {
      TestBed.inject(CurrentUser).set(makeUser({ role: role as never }));
    }
    const fixture = TestBed.createComponent(ForbiddenComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('dice que no hay permiso con el mismo título y el mismo texto de siempre', () => {
    const root = render('agent');

    expect(root.querySelector('h1')?.textContent).toBe('Sin permiso');
    expect(root.textContent).toContain('No tienes permiso para ver esta página.');
  });

  it('muestra el rol de la sesión en español y a quién pedir el acceso', () => {
    const root = render('agent');

    expect(root.querySelector('.role strong')?.textContent).toBe('Agente');
    expect(root.querySelector('.role')?.textContent).toContain('pídela a quien administra tu empresa');
  });

  it('sin sesión no inventa un rol', () => {
    expect(render(null).querySelector('.role')).toBeNull();
  });

  it('ofrece volver al inicio con la acción principal de la pantalla', () => {
    const link = render('driver').querySelector('a') as HTMLAnchorElement;

    expect(link.textContent?.trim()).toBe('Volver al inicio');
    expect(link.getAttribute('href')).toBe('/');
    expect(link.classList).toContain('primary-action');
  });

  it('el icono es decorativo', () => {
    expect(render('driver').querySelector('.icon')?.getAttribute('aria-hidden')).toBe('true');
  });
});
