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

    it('«¿Olvidaste tu contraseña?» va a la derecha, entre la contraseña y el botón, y es un objetivo táctil de 44px', () => {
      const { root } = mount(LoginComponent);
      const forgot = root.querySelector('.forgot') as HTMLElement;
      const link = forgot.querySelector('a') as HTMLElement;
      const password = root.querySelector('app-password-field')!.getBoundingClientRect();
      const button = (root.querySelector('button[type="submit"]') as HTMLElement).getBoundingClientRect();
      expect(link.textContent).toContain('¿Olvidaste tu contraseña?');
      expect(link.getAttribute('href')).toBe('/acceso/recuperar');
      expect(getComputedStyle(forgot).justifyContent).toBe('flex-end');
      expect(link.getBoundingClientRect().top).toBeGreaterThan(password.top);
      expect(link.getBoundingClientRect().bottom).toBeLessThanOrEqual(button.top + 1);
      expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    });

    it('la invitación a crear cuenta va bajo el formulario, centrada y con el margen común de 24px', () => {
      const { root } = mount(LoginComponent);
      const alt = root.querySelector('.alt') as HTMLElement;
      const style = getComputedStyle(alt);
      expect(style.marginTop).toBe('24px');
      expect(style.textAlign).toBe('center');
      expect(alt.textContent).toContain('¿No tienes cuenta?');
      expect(alt.querySelector('a')?.getAttribute('href')).toBe('/acceso/registro');
    });

    it('los enlaces llevan el color de la marca y no el azul del navegador', () => {
      const { root } = mount(LoginComponent);
      const probe = document.createElement('span');
      probe.style.color = 'var(--mat-sys-primary)';
      root.appendChild(probe);
      const primary = getComputedStyle(probe).color;
      probe.remove();
      const links = Array.from(root.querySelectorAll('.forgot a, .alt a'));
      expect(links.length).toBe(2);
      for (const link of links) {
        expect(getComputedStyle(link).color).toBe(primary);
      }
    });

    it('el botón principal lleva el degradado de la marca y, desactivado, vuelve al color liso', () => {
      const { root } = mount(LoginComponent);
      const button = root.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(getComputedStyle(button).backgroundImage).toContain('linear-gradient');
      button.disabled = true;
      expect(getComputedStyle(button).backgroundImage).toBe('none');
    });

    it('el título va seguido de una frase de apoyo cercana, sin cambiar el margen de 20px del título', () => {
      const { root } = mount(LoginComponent);
      const title = root.querySelector('h1') as HTMLElement;
      const lead = root.querySelector('.lead') as HTMLElement;
      expect(getComputedStyle(title).marginBottom).toBe('20px');
      expect(lead.getBoundingClientRect().top - title.getBoundingClientRect().bottom).toBeLessThan(12);
      expect(lead.textContent).toBe('Inicia sesión para seguir tus rutas.');
    });

    it('los campos de correo y contraseña llevan su icono a la izquierda', () => {
      const { root } = mount(LoginComponent);
      const icons = Array.from(root.querySelectorAll('mat-form-field mat-icon[matPrefix]')).map((icon) => icon.textContent?.trim());
      expect(icons).toEqual(['mail', 'lock']);
    });

    for (const [name, component] of [
      ['iniciar sesión', LoginComponent],
      ['recuperar contraseña', ForgotPasswordComponent],
      ['crear cuenta', RegisterComponent],
    ] as [string, Type<unknown>][]) {
      it(`el botón principal de «${name}» mide 48px de alto y tiene las esquinas de los campos`, () => {
        const button = mount(component).root.querySelector('button[type="submit"]') as HTMLElement;
        expect(Math.round(button.getBoundingClientRect().height)).toBe(48);
        expect(getComputedStyle(button).borderTopLeftRadius).toBe('12px');
      });
    }

    it('en «crear cuenta» el nombre y los apellidos comparten fila y el resto de campos ocupan el ancho', () => {
      const fields = Array.from(mount(RegisterComponent).root.querySelectorAll('.field-grid mat-form-field')) as HTMLElement[];
      const [first, last, company, email] = fields.map((field) => field.getBoundingClientRect());
      expect(fields.length).toBe(4);
      expect(Math.round(first.top)).toBe(Math.round(last.top));
      expect(last.left).toBeGreaterThan(first.right - 1);
      expect(company.top).toBeGreaterThan(first.bottom - 1);
      expect(Math.round(company.width)).toBe(Math.round(email.width));
      expect(company.width).toBeGreaterThan(first.width * 1.8);
    });

    it('la negrita de las pantallas de acceso usa un peso que Roboto sí carga (500), sin negrita sintética', () => {
      const { root } = mount(LoginComponent);
      const strong = document.createElement('strong');
      strong.textContent = 'ana@example.invalid';
      root.appendChild(strong);
      expect(getComputedStyle(strong).fontWeight).toBe('500');
      strong.remove();
    });
  });
});
