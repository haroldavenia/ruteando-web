import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { API_BASE_URL } from '../../core/api/api-config';
import { authInterceptor } from '../../core/api/auth.interceptor';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { refreshInterceptor } from '../../core/api/refresh.interceptor';
import { MfaMethod } from '../../core/auth/mfa.model';
import { MfaEnrollComponent, MfaEnrollment } from './mfa-enroll.component';

const wait = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

@Component({
  imports: [MfaEnrollComponent],
  template: `<app-mfa-enroll [methods]="methods()" [challengeId]="challengeId()" (enrolled)="done.push($event)" />`,
})
class HostComponent {
  readonly methods = signal<MfaMethod[]>(['email', 'sms', 'totp']);
  readonly challengeId = signal<string | null>(null);
  done: MfaEnrollment[] = [];
}

describe('MfaEnrollComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let controller: HttpTestingController;
  let root: HTMLElement;

  const choices = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.choice'));
  const choice = (text: string) => choices().find((c) => c.textContent?.includes(text))!;
  const input = () => root.querySelector('input') as HTMLInputElement;
  const alert = () => root.querySelector('[role="alert"] span')?.textContent?.trim() ?? '';
  const buttonNamed = (text: string) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text)!;
  const submit = () => root.querySelector('form')!.dispatchEvent(new Event('submit'));
  function type(value: string): void {
    input().value = value;
    input().dispatchEvent(new Event('input'));
  }
  async function settle(): Promise<void> {
    await wait();
    fixture.detectChanges();
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([authInterceptor, refreshInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    localStorage.clear();
    controller.verify();
  });

  it('ofrece solo los métodos que se le pasan, con su nombre y su explicación', async () => {
    expect(choices().map((c) => c.querySelector('strong')?.textContent)).toEqual([
      'Correo electrónico',
      'Mensaje de texto (SMS)',
      'Aplicación autenticadora',
    ]);
    host.methods.set(['totp']);
    fixture.detectChanges();
    expect(choices().length).toBe(1);
  });

  it('correo: envía el código al elegirlo y al confirmar avisa del método y de los códigos de recuperación', async () => {
    choice('Correo').click();
    controller
      .expectOne('/gateway/mfa/email/setup')
      .flush({ sent: true, destination: 'a•••@example.invalid', expiresInSeconds: 300 });
    await settle();
    expect(root.textContent).toContain('a•••@example.invalid');

    type('123 456');
    submit();
    const req = controller.expectOne('/gateway/mfa/email/confirm');
    expect(req.request.body).toEqual({ code: '123456' });
    req.flush({ active: true, recoveryCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'] });
    await settle();

    expect(host.done).toEqual([{ method: 'email', recoveryCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'] }]);
  });

  it('un código incorrecto avisa y no activa nada; atrás vuelve a elegir', async () => {
    choice('Correo').click();
    controller.expectOne('/gateway/mfa/email/setup').flush({ sent: true, destination: 'x', expiresInSeconds: 300 });
    await settle();
    type('000000');
    submit();
    controller
      .expectOne('/gateway/mfa/email/confirm')
      .flush({ code: 'INVALID_CODE' }, { status: 401, statusText: 'x' });
    await settle();

    expect(alert()).toBe('El código no es válido');
    expect(host.done).toEqual([]);
    buttonNamed('Atrás').click();
    fixture.detectChanges();
    expect(choices().length).toBe(3);
  });

  it('SMS: valida el formato internacional antes de enviar y manda el número sin espacios', async () => {
    choice('SMS').click();
    fixture.detectChanges();
    type('3001234567');
    submit();
    fixture.detectChanges();
    controller.expectNone('/gateway/mfa/sms/setup');
    expect(root.querySelector('mat-error')?.textContent).toContain('formato internacional');

    type('+57 300 123 4567');
    submit();
    const req = controller.expectOne('/gateway/mfa/sms/setup');
    expect(req.request.body).toEqual({ phone: '+573001234567' });
    req.flush({ sent: true, destination: '+57•••••4567', expiresInSeconds: 300 });
    await settle();
    expect(root.textContent).toContain('+57•••••4567');

    type('654321');
    submit();
    controller.expectOne('/gateway/mfa/sms/confirm').flush({ active: true });
    await settle();
    expect(host.done).toEqual([{ method: 'sms', recoveryCodes: null }]);
  });

  it('aplicación autenticadora: muestra el QR y la clave en texto, y activa con el código', async () => {
    choice('Aplicación').click();
    controller.expectOne('/gateway/mfa/totp/setup').flush({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUri: 'otpauth://totp/Ruteando:ana%40example.invalid?secret=JBSWY3DPEHPK3PXP',
    });
    await settle();
    await wait(80); // la biblioteca del QR se carga bajo demanda
    fixture.detectChanges();

    expect(root.querySelector('app-qr-code svg[role="img"]')).not.toBeNull();
    expect(root.querySelector('.manual code')?.textContent).toBe('JBSWY3DPEHPK3PXP');

    type('111222');
    submit();
    controller.expectOne('/gateway/mfa/totp/confirm').flush({ active: true, recoveryCodes: ['AAAAA-BBBBB'] });
    await settle();
    expect(host.done[0].method).toBe('totp');
  });

  it('con un reto de activación las peticiones llevan su cabecera y no la sesión', async () => {
    host.challengeId.set('reto-2');
    fixture.detectChanges();
    choice('Correo').click();

    const req = controller.expectOne('/gateway/mfa/email/setup');
    expect(req.request.headers.get('X-MFA-Challenge')).toBe('reto-2');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ sent: true, destination: 'x', expiresInSeconds: 300 });
  });

  it('si el servidor rechaza empezar (ya activo, no permitido) muestra el motivo', async () => {
    choice('Aplicación').click();
    controller
      .expectOne('/gateway/mfa/totp/setup')
      .flush({ code: 'ALREADY_ACTIVE' }, { status: 409, statusText: 'Conflict' });
    await settle();

    expect(alert()).toContain('ya está activo');
  });
});
