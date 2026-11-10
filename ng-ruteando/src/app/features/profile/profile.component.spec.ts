import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { makeUser } from '../../../testing/session';
import { API_BASE_URL } from '../../core/api/api-config';
import { authInterceptor } from '../../core/api/auth.interceptor';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { refreshInterceptor } from '../../core/api/refresh.interceptor';
import { CurrentUser } from '../../core/auth/current-user';
import { MfaMethod, MfaMethodStatus, MfaStatus } from '../../core/auth/mfa.model';
import { ProfileComponent } from './profile.component';

const STATUS_URL = '/gateway/mfa/status';
const wait = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

type Overrides = Partial<Record<MfaMethod, Partial<MfaMethodStatus>>>;

function status(overrides: Overrides = {}, extra: Partial<MfaStatus> = {}): MfaStatus {
  const base = (m: MfaMethod): MfaMethodStatus => ({
    allowed: true,
    available: true,
    active: false,
    pending: false,
    destination: m === 'email' ? 'p•••@example.invalid' : null,
    ...overrides[m],
  });
  const methods = { totp: base('totp'), email: base('email'), sms: base('sms') };
  const activeCount = Object.values(methods).filter((m) => m.active).length;
  return { enabled: true, methods, recoveryCodesLeft: activeCount ? 10 : 0, required: false, activeCount, ...extra };
}

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let controller: HttpTestingController;
  let root: HTMLElement;

  const rows = () => Array.from(root.querySelectorAll<HTMLElement>('.methods li'));
  const row = (name: string) => rows().find((r) => r.querySelector('strong')?.textContent === name)!;
  const buttonIn = (el: ParentNode, text: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);
  const badge = (name: string) => row(name).querySelector('app-status-badge span')?.textContent?.trim();
  const alertText = () => root.querySelector('[role="alert"] span')?.textContent?.trim() ?? '';
  const noticeText = () => root.querySelector('[role="status"] span')?.textContent?.trim() ?? '';
  const submit = () => root.querySelector('.panel form')!.dispatchEvent(new Event('submit'));
  function type(value: string): void {
    const input = root.querySelector<HTMLInputElement>('.panel input')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }
  async function settle(): Promise<void> {
    await wait();
    fixture.detectChanges();
  }

  async function open(current: MfaStatus | { error: object; status: number }): Promise<void> {
    fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
    const req = controller.expectOne(STATUS_URL);
    if ('error' in current) {
      req.flush(current.error, { status: current.status, statusText: 'Error' });
    } else {
      req.flush(current);
    }
    await settle();
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
    TestBed.inject(CurrentUser).set(makeUser({ firstName: 'Ana', lastName: 'Pérez', role: 'agent' }));
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
    controller.verify();
  });

  it('muestra los datos de la cuenta y cada método con su estado', async () => {
    await open(
      status({
        totp: { active: true },
        sms: { allowed: false },
        email: { available: false },
      })
    );

    expect(root.querySelector('h1')?.textContent).toBe('Perfil');
    expect(root.querySelector('.stat-grid')?.textContent).toContain('Ana Pérez');
    expect(root.querySelector('.stat-grid')?.textContent).toContain('Agente');
    expect(rows().length).toBe(3);
    expect(badge('Aplicación autenticadora')).toBe('Activo');
    expect(badge('Mensaje de texto (SMS)')).toBe('No permitido por tu empresa');
    expect(badge('Correo electrónico')).toBe('No disponible en el servidor');
    expect(buttonIn(row('Aplicación autenticadora'), 'Desactivar')).toBeDefined();
    expect(buttonIn(row('Mensaje de texto (SMS)'), 'Activar')).toBeUndefined();
    expect(buttonIn(row('Correo electrónico'), 'Activar')).toBeUndefined();
  });

  it('un método sin activar ofrece activarlo y uno activo enseña a dónde llegan los códigos', async () => {
    await open(status({ email: { active: true } }));

    expect(badge('Correo electrónico')).toBe('Activo');
    expect(row('Correo electrónico').textContent).toContain('p•••@example.invalid');
    expect(badge('Aplicación autenticadora')).toBe('Sin activar');
    expect(buttonIn(row('Aplicación autenticadora'), 'Activar')).toBeDefined();
  });

  it('activar la aplicación autenticadora: QR, código y, al ser el primer método, los códigos de recuperación una vez', async () => {
    await open(status());
    buttonIn(row('Aplicación autenticadora'), 'Activar')!.click();
    fixture.detectChanges();

    controller
      .expectOne('/gateway/mfa/totp/setup')
      .flush({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/Ruteando:x?secret=JBSWY3DPEHPK3PXP' });
    await settle();
    expect(root.querySelector('.panel')?.textContent).toContain('JBSWY3DPEHPK3PXP');

    type('123456');
    submit();
    controller
      .expectOne('/gateway/mfa/totp/confirm')
      .flush({ active: true, recoveryCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'] });
    await settle();
    controller.expectOne(STATUS_URL).flush(status({ totp: { active: true } }));
    await settle();

    expect(noticeText()).toBe('Método activado: Aplicación autenticadora');
    expect(root.querySelector('app-recovery-codes')?.textContent).toContain('AAAAA-BBBBB');
    expect(badge('Aplicación autenticadora')).toBe('Activo');
    buttonIn(root, 'Ya los guardé')!.click();
    fixture.detectChanges();
    expect(root.querySelector('app-recovery-codes')).toBeNull();
  });

  it('desactivar pide un código de otro método activo y, si no vale, el método sigue activo', async () => {
    await open(status({ totp: { active: true }, email: { active: true } }));
    buttonIn(row('Aplicación autenticadora'), 'Desactivar')!.click();
    fixture.detectChanges();

    expect(root.querySelector('.panel h3')?.textContent).toBe('Desactivar Aplicación autenticadora');
    // sin el método que se quita, confirma el correo (o un código de recuperación)
    expect(root.querySelector('.panel')?.textContent).toContain('Correo electrónico');
    expect(root.querySelector('.panel')?.textContent).toContain('Código de recuperación');

    type('000000');
    submit();
    const bad = controller.expectOne('/gateway/mfa/methods/totp');
    expect(bad.request.method).toBe('DELETE');
    bad.flush({ code: 'INVALID_CODE' }, { status: 401, statusText: 'Unauthorized' });
    await settle();

    expect(root.querySelector('.panel [role="alert"] span')?.textContent?.trim()).toBe('El código no es válido');
    expect(badge('Aplicación autenticadora')).toBe('Activo');
  });

  it('desactivar con un código válido manda el método de confirmación y refresca el estado', async () => {
    await open(status({ totp: { active: true } }));
    buttonIn(row('Aplicación autenticadora'), 'Desactivar')!.click();
    fixture.detectChanges();
    // solo queda confirmar con un código de recuperación
    type('abcde-fghjk');
    submit();

    const req = controller.expectOne('/gateway/mfa/methods/totp');
    expect(req.request.body).toEqual({ via: 'recovery', code: 'abcdefghjk' });
    req.flush({ active: false });
    await settle();
    controller.expectOne(STATUS_URL).flush(status());
    await settle();

    expect(noticeText()).toBe('Método desactivado: Aplicación autenticadora');
    expect(badge('Aplicación autenticadora')).toBe('Sin activar');
    expect(root.querySelector('.panel')).toBeNull();
  });

  it('si la empresa exige el segundo factor, el último método no se puede quitar y se explica por qué', async () => {
    await open(status({ totp: { active: true } }, { required: true }));

    const button = buttonIn(row('Aplicación autenticadora'), 'Desactivar')!;
    expect(button.disabled).toBeTrue();
    expect(root.textContent).toContain('Tu empresa exige el segundo factor: no puedes quitar el último método');
    expect(root.querySelector('[role="note"]')?.textContent).toContain('exige la verificación en dos pasos');
  });

  it('con dos métodos activos y el 2FA obligatorio sí se puede quitar uno', async () => {
    await open(status({ totp: { active: true }, email: { active: true } }, { required: true }));
    expect(buttonIn(row('Aplicación autenticadora'), 'Desactivar')!.disabled).toBeFalse();
  });

  it('códigos de recuperación nuevos: confirma con un código y los muestra una sola vez', async () => {
    await open(status({ totp: { active: true } }, { recoveryCodesLeft: 3 }));
    expect(root.querySelector('.recovery')?.textContent).toContain('Te quedan 3 códigos sin usar');

    buttonIn(root, 'Generar nuevos')!.click();
    fixture.detectChanges();
    type('123 456');
    submit();
    const req = controller.expectOne('/gateway/mfa/recovery-codes/regenerate');
    // la aplicación autenticadora es el método de confirmación por defecto
    expect(req.request.body).toEqual({ via: 'totp', code: '123456' });
    req.flush({ recoveryCodes: ['NNNNN-MMMMM'] });
    await settle();
    controller.expectOne(STATUS_URL).flush(status({ totp: { active: true } }));
    await settle();

    expect(root.querySelector('app-recovery-codes')?.textContent).toContain('NNNNN-MMMMM');
    expect(noticeText()).toBe('Códigos de recuperación nuevos generados');
  });

  it('con un método por correo, confirmar envía primero el código y lo anuncia', async () => {
    await open(status({ email: { active: true } }));
    buttonIn(row('Correo electrónico'), 'Desactivar')!.click();
    fixture.detectChanges();
    // el único método es el que se quita: solo cabe un código de recuperación
    expect(buttonIn(root.querySelector('.panel')!, 'Enviar código')).toBeUndefined();
  });

  it('si el servidor no tiene activado el segundo factor lo explica y no ofrece controles', async () => {
    await open({ error: { code: 'MFA_DISABLED' }, status: 503 });

    expect(alertText()).toBe('El segundo factor no está activado en el servidor');
    expect(rows().length).toBe(0);
  });
});
