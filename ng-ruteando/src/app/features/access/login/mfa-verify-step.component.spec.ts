import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { makeSession } from '../../../../testing/session';
import { API_BASE_URL } from '../../../core/api/api-config';
import { authInterceptor } from '../../../core/api/auth.interceptor';
import { errorInterceptor } from '../../../core/api/error.interceptor';
import { refreshInterceptor } from '../../../core/api/refresh.interceptor';
import { CurrentUser } from '../../../core/auth/current-user';
import { MfaChallenge } from '../../../core/auth/mfa.model';
import { MfaVerifyStepComponent } from './mfa-verify-step.component';

const SEND = '/gateway/mfa/login/send';
const VERIFY = '/gateway/mfa/login/verify';
const wait = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

const challenge = (...methods: MfaChallenge['methods']): MfaChallenge => ({
  mfaRequired: true,
  challengeId: 'reto-1',
  methods,
  expiresInSeconds: 300,
});
const TOTP = { method: 'totp', destination: null } as const;
const EMAIL = { method: 'email', destination: 'a•••@example.invalid' } as const;
const RECOVERY = { method: 'recovery', destination: null } as const;

@Component({
  imports: [MfaVerifyStepComponent],
  template: `<app-mfa-verify-step
    [challenge]="challenge()"
    (verified)="verified = verified + 1"
    (cancelled)="cancelled.push($event)"
  />`,
})
class HostComponent {
  readonly challenge = signal<MfaChallenge>(challenge(TOTP));
  verified = 0;
  cancelled: string[] = [];
}

describe('MfaVerifyStepComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let controller: HttpTestingController;
  let root: HTMLElement;

  const input = () => root.querySelector('input') as HTMLInputElement;
  const lead = () => root.querySelector('.lead')?.textContent?.trim() ?? '';
  const alert = () => root.querySelector('[role="alert"] span')?.textContent?.trim() ?? '';
  const status = () => root.querySelector('[role="status"] span')?.textContent?.trim() ?? '';
  const links = () => Array.from(root.querySelectorAll<HTMLButtonElement>('button.link'));
  const linkNamed = (text: string) => links().find((b) => b.textContent?.trim() === text);
  const choices = () => Array.from(root.querySelectorAll<HTMLButtonElement>('button.choice'));
  const choiceNamed = (text: string) => choices().find((b) => b.querySelector('strong')?.textContent?.trim() === text);

  function type(value: string): void {
    input().value = value;
    input().dispatchEvent(new Event('input'));
  }
  const submit = () => root.querySelector('form')!.dispatchEvent(new Event('submit'));

  async function open(c: MfaChallenge): Promise<void> {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    host.challenge.set(c);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([authInterceptor, refreshInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
    controller.verify();
  });

  it('con varios métodos activos pregunta cuál usar y no envía ni pide nada todavía', async () => {
    await open(challenge(EMAIL, TOTP, RECOVERY));

    controller.expectNone(SEND);
    expect(root.querySelector('input')).toBeNull();
    expect(lead()).toBe('Elige cómo quieres verificar tu identidad.');
    expect(choices().map((b) => b.querySelector('strong')?.textContent?.trim())).toEqual([
      'Correo electrónico',
      'Aplicación autenticadora',
    ]);
    expect(choiceNamed('Correo electrónico')!.textContent).toContain('a•••@example.invalid');
    expect(linkNamed('¿No puedes usar ninguno? Usa un código de recuperación')).toBeDefined();
  });

  it('al elegir la aplicación autenticadora no envía nada y pide el código de 6 dígitos', async () => {
    await open(challenge(EMAIL, TOTP, RECOVERY));

    choiceNamed('Aplicación autenticadora')!.click();
    fixture.detectChanges();

    controller.expectNone(SEND);
    expect(lead()).toContain('aplicación autenticadora');
    expect(input().getAttribute('autocomplete')).toBe('one-time-code');
    expect(input().getAttribute('inputmode')).toBe('numeric');
  });

  it('desde el campo del código se puede volver al selector', async () => {
    await open(challenge(EMAIL, TOTP));
    choiceNamed('Aplicación autenticadora')!.click();
    fixture.detectChanges();

    linkNamed('Elegir otro método')!.click();
    fixture.detectChanges();

    expect(root.querySelector('input')).toBeNull();
    expect(choices().length).toBe(2);
  });

  it('con un solo método activo va directo al código, sin selector', async () => {
    await open(challenge(TOTP, RECOVERY));

    expect(choices().length).toBe(0);
    expect(input()).not.toBeNull();
    expect(linkNamed('Código de recuperación')).toBeDefined();
    expect(linkNamed('Elegir otro método')).toBeUndefined();
  });

  it('al acertar abre la sesión, avisa y la petición no lleva token', async () => {
    await open(challenge(TOTP));
    type('123 456');
    submit();

    const req = controller.expectOne(VERIFY);
    expect(req.request.body).toEqual({ challengeId: 'reto-1', method: 'totp', code: '123456' });
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush(makeSession('acc', 'ref'));
    await wait();

    expect(host.verified).toBe(1);
    expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeTrue();
  });

  it('un código incorrecto muestra el aviso, vacía el campo y no abre sesión', async () => {
    await open(challenge(TOTP));
    type('000000');
    submit();
    controller.expectOne(VERIFY).flush({ code: 'INVALID_CODE' }, { status: 401, statusText: 'Unauthorized' });
    await wait();
    fixture.detectChanges();

    expect(alert()).toBe('El código no es válido');
    expect(input().value).toBe('');
    expect(host.verified).toBe(0);
    expect(host.cancelled).toEqual([]);
    expect(TestBed.inject(CurrentUser).isAuthenticated()).toBeFalse();
    controller.expectNone('/gateway/auth/refresh');
  });

  it('no envía un campo vacío', async () => {
    await open(challenge(TOTP));
    submit();
    controller.expectNone(VERIFY);
  });

  it('un reto caducado o con los intentos agotados devuelve al primer paso con el motivo', async () => {
    await open(challenge(TOTP));
    type('000000');
    submit();
    controller.expectOne(VERIFY).flush({ code: 'TOO_MANY_ATTEMPTS' }, { status: 429, statusText: 'Too Many Requests' });
    await wait();

    expect(host.cancelled).toEqual(['Demasiados intentos. Inicia sesión de nuevo']);
    expect(host.verified).toBe(0);
  });

  it('con el correo como método envía el código al abrir y avisa a dónde fue', async () => {
    await open(challenge(EMAIL));

    const req = controller.expectOne(SEND);
    expect(req.request.body).toEqual({ challengeId: 'reto-1', method: 'email' });
    req.flush({ sent: true, method: 'email', destination: 'a•••@example.invalid', expiresInSeconds: 300 });
    await wait();
    fixture.detectChanges();

    expect(lead()).toContain('a•••@example.invalid');
    expect(status()).toBe('Código enviado a a•••@example.invalid');
    expect(linkNamed('Reenviar código')).toBeDefined();
  });

  it('reenviar pide otro código, y si el límite se agota lo explica sin salir del paso', async () => {
    await open(challenge(EMAIL));
    controller.expectOne(SEND).flush({ sent: true, destination: 'a•••@example.invalid', expiresInSeconds: 300 });
    await wait();
    fixture.detectChanges();

    linkNamed('Reenviar código')!.click();
    controller.expectOne(SEND).flush({ code: 'TOO_MANY_REQUESTS' }, { status: 429, statusText: 'Too Many Requests' });
    await wait();
    fixture.detectChanges();

    expect(alert()).toContain('Demasiados envíos');
    expect(host.cancelled).toEqual([]);
  });

  it('el código de recuperación acepta texto y no envía nada', async () => {
    await open(challenge(TOTP, EMAIL, RECOVERY));

    linkNamed('¿No puedes usar ninguno? Usa un código de recuperación')!.click();
    fixture.detectChanges();
    controller.expectNone(SEND);
    expect(lead()).toContain('códigos de recuperación');
    expect(input().getAttribute('inputmode')).toBe('text');

    type('abcde-fghjk');
    submit();
    const req = controller.expectOne(VERIFY);
    expect(req.request.body).toEqual({ challengeId: 'reto-1', method: 'recovery', code: 'abcdefghjk' });
    req.flush(makeSession('acc', 'ref'));
    await wait();
    expect(host.verified).toBe(1);
  });

  it('elegir el correo envía el código en ese momento', async () => {
    await open(challenge(TOTP, EMAIL));
    controller.expectNone(SEND);

    choiceNamed('Correo electrónico')!.click();
    controller.expectOne(SEND).flush({ sent: true, destination: 'a•••@example.invalid', expiresInSeconds: 300 });
    await wait();
    fixture.detectChanges();

    expect(lead()).toContain('a•••@example.invalid');
  });

  it('el campo recibe el foco y volver avisa sin motivo', async () => {
    await open(challenge(TOTP));
    await wait(10);
    expect(document.activeElement).toBe(input());

    linkNamed('Volver')!.click();
    expect(host.cancelled).toEqual(['']);
  });
});
