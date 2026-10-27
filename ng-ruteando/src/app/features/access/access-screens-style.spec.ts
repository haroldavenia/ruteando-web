import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { VerifyEmailComponent } from './verify-email/verify-email.component';

const SCREENS: [string, Type<unknown>][] = [
  ['iniciar sesión', LoginComponent],
  ['crear cuenta', RegisterComponent],
  ['recuperar contraseña', ForgotPasswordComponent],
  ['restablecer contraseña', ResetPasswordComponent],
  ['verificar correo', VerifyEmailComponent],
];

/** Estilos propios que Angular tiene registrados para un componente. */
const ownStyles = (component: Type<unknown>): string => ((component as unknown as { ɵcmp: { styles?: string[] } }).ɵcmp.styles ?? []).join('\n');

describe('aspecto común de las pantallas de acceso', () => {
  it('ninguna pantalla declara estilos propios de título, formulario ni enlaces', () => {
    for (const [name, component] of SCREENS) {
      expect(ownStyles(component)).withContext(name).not.toMatch(/h1|form|\.links|\.alt|\.field|\.actions/);
    }
  });

  describe('dentro de la vista de acceso', () => {
    const wrappers: HTMLElement[] = [];

    function mount(component: Type<unknown>): { fixture: ComponentFixture<unknown>; root: HTMLElement } {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [component],
        providers: [provideRouter([]), provideNoopAnimations(), { provide: AuthService, useValue: { resendVerification: () => undefined } }],
      });
      const fixture = TestBed.createComponent(component);
      const wrapper = document.createElement('div');
      wrapper.className = 'access-theme';
      wrapper.style.width = '360px';
      document.body.appendChild(wrapper);
      wrappers.push(wrapper);
      wrapper.appendChild(fixture.nativeElement);
      fixture.detectChanges();
      return { fixture, root: fixture.nativeElement as HTMLElement };
    }

    afterEach(() => wrappers.splice(0).forEach((w) => w.remove()));

    it('el título tiene la misma tipografía y separación en dos pantallas distintas', () => {
      const a = getComputedStyle(mount(LoginComponent).root.querySelector('h1')!);
      const [sizeA, marginA, weightA] = [a.fontSize, a.marginBottom, a.fontWeight];
      const b = getComputedStyle(mount(ForgotPasswordComponent).root.querySelector('h1')!);
      expect([b.fontSize, b.marginBottom, b.fontWeight]).toEqual([sizeA, marginA, weightA]);
      expect(parseFloat(sizeA)).toBeGreaterThanOrEqual(28);
      expect(marginA).toBe('20px');
    });

    for (const [name, component] of [
      ['iniciar sesión', LoginComponent],
      ['recuperar contraseña', ForgotPasswordComponent],
      ['crear cuenta', RegisterComponent],
    ] as [string, Type<unknown>][]) {
      it(`el botón principal de «${name}» ocupa todo el ancho del formulario`, () => {
        const { root } = mount(component);
        const form = root.querySelector('form') as HTMLElement;
        const button = form.querySelector('button[type="submit"]') as HTMLElement;
        expect(Math.round(button.getBoundingClientRect().width)).toBe(Math.round(form.getBoundingClientRect().width));
      });
    }

    it('los enlaces secundarios de «iniciar sesión» están agrupados en un bloque con el mismo estilo', () => {
      const links = mount(LoginComponent).root.querySelector('.links') as HTMLElement;
      const style = getComputedStyle(links);
      expect(style.display).toBe('flex');
      expect(style.marginTop).toBe('24px');
      expect(links.querySelectorAll('a').length).toBe(2);
    });
  });
});
