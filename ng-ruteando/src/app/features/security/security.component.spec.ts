import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { makeUser } from '../../../testing/session';
import { API_BASE_URL } from '../../core/api/api-config';
import { authInterceptor } from '../../core/api/auth.interceptor';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { refreshInterceptor } from '../../core/api/refresh.interceptor';
import { MfaPolicy } from '../../core/auth/mfa.model';
import { SecurityComponent } from './security.component';

const POLICY_URL = '/gateway/mfa/policy';
const wait = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

const policy = (overrides: Partial<MfaPolicy> = {}): MfaPolicy => ({
  tenantId: 'tenant-1',
  methods: { email: true, sms: true, totp: true },
  required: 'none',
  roles: [],
  available: { email: true, sms: true, totp: true },
  ...overrides,
});

const people = [
  makeUser({ id: 'u1', firstName: 'Ana', lastName: 'Pérez', role: 'agent', email: 'ana@example.invalid' }),
  makeUser({ id: 'u2', firstName: 'Luis', lastName: 'Gómez', role: 'driver', email: 'luis@example.invalid' }),
];

describe('SecurityComponent', () => {
  let fixture: ComponentFixture<SecurityComponent>;
  let controller: HttpTestingController;
  let root: HTMLElement;
  let confirm: boolean;
  const dialogOpen = jasmine.createSpy('open');

  const toggles = () => Array.from(root.querySelectorAll<HTMLElement>('mat-slide-toggle'));
  const toggleButton = (i: number) => toggles()[i].querySelector('button')!;
  const saveButton = () =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Guardar cambios'
    )!;
  const radio = (value: string) => root.querySelector<HTMLInputElement>(`mat-radio-button[value="${value}"] input`)!;
  const alertText = () => root.querySelector('app-form-result [role="alert"] span')?.textContent?.trim() ?? '';
  const noticeText = () => root.querySelector('app-form-result [role="status"] span')?.textContent?.trim() ?? '';
  const peopleRows = () => Array.from(root.querySelectorAll<HTMLElement>('tbody tr'));
  async function settle(): Promise<void> {
    await wait();
    fixture.detectChanges();
  }

  async function open(current: MfaPolicy, withMfa: string[] = []): Promise<void> {
    fixture = TestBed.createComponent(SecurityComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
    controller.expectOne(POLICY_URL).flush(current);
    await settle();
    controller
      .expectOne((r) => r.url === '/gateway/users')
      .flush({ content: people, page: 0, size: 100, totalElements: 2, totalPages: 1 });
    controller.expectOne('/gateway/mfa/users').flush({ userIds: withMfa });
    await settle();
  }

  beforeEach(() => {
    localStorage.clear();
    confirm = true;
    dialogOpen.calls.reset();
    dialogOpen.and.callFake(() => ({ afterClosed: () => of(confirm) }));
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        { provide: MatDialog, useValue: { open: dialogOpen } },
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

  it('muestra la política guardada: métodos permitidos, obligatoriedad y la lista de personas', async () => {
    await open(policy({ methods: { email: false, sms: true, totp: true }, required: 'all' }), ['u1']);

    expect(root.querySelector('h1')?.textContent).toBe('Seguridad');
    expect(toggles().length).toBe(3);
    expect(toggles().map((t) => t.classList.contains('mat-mdc-slide-toggle-checked'))).toEqual([true, false, true]); // totp, correo, sms
    expect(radio('all').checked).toBeTrue();
    expect(peopleRows().length).toBe(2);
    expect(peopleRows()[0].textContent).toContain('Ana Pérez');
    expect(peopleRows()[0].textContent).toContain('Activa');
    expect(peopleRows()[1].textContent).toContain('Sin activar');
    expect(saveButton().disabled).toBeTrue();
  });

  it('cambiar un método y guardar envía la política completa y confirma', async () => {
    await open(policy());
    toggleButton(1).click(); // correo
    fixture.detectChanges();
    expect(saveButton().disabled).toBeFalse();

    saveButton().click();
    const req = controller.expectOne(POLICY_URL);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ methods: { email: false, sms: true, totp: true }, required: 'none', roles: [] });
    req.flush(policy({ methods: { email: false, sms: true, totp: true } }));
    await settle();

    expect(noticeText()).toBe('Cambios guardados');
    expect(saveButton().disabled).toBeTrue();
  });

  it('exigir el 2FA sin ningún método permitido lo impide con un mensaje y no deja guardar', async () => {
    await open(policy({ methods: { email: true, sms: false, totp: false } }));
    toggleButton(1).click(); // quita el correo, el único
    radio('all').click();
    fixture.detectChanges();

    expect(root.querySelector('.problem')?.textContent).toContain('hace falta permitir al menos un método');
    expect(saveButton().disabled).toBeTrue();
    controller.expectNone(POLICY_URL);
  });

  it('exigir a ciertos roles pide elegir al menos uno y manda los elegidos', async () => {
    await open(policy());
    radio('roles').click();
    fixture.detectChanges();
    expect(root.querySelector('.problem')?.textContent).toContain('Elige al menos un rol');
    expect(saveButton().disabled).toBeTrue();

    root.querySelector<HTMLInputElement>('.roles mat-checkbox input')!.click(); // el primero: superadministrador
    fixture.detectChanges();
    const roles = root.querySelectorAll('.roles mat-checkbox');
    (roles[2].querySelector('input') as HTMLInputElement).click(); // agente
    fixture.detectChanges();
    expect(root.querySelector('.problem')).toBeNull();

    saveButton().click();
    const req = controller.expectOne(POLICY_URL);
    expect(req.request.body).toEqual({
      methods: { email: true, sms: true, totp: true },
      required: 'roles',
      roles: ['super_admin', 'agent'],
    });
    req.flush(policy({ required: 'roles', roles: ['super_admin', 'agent'] }));
    await settle();
  });

  it('un método que el servidor no tiene configurado se explica y no se puede activar desde aquí', async () => {
    await open(
      policy({ methods: { email: false, sms: false, totp: true }, available: { email: false, sms: false, totp: true } })
    );

    expect(root.querySelector('.methods')?.textContent).toContain('El servidor no lo tiene configurado todavía.');
    expect(toggleButton(1).disabled).toBeTrue();
    expect(toggleButton(0).disabled).toBeFalse();
  });

  it('restablecer el 2FA de una persona pide confirmación y, al confirmar, lo hace y refresca quién lo tiene', async () => {
    await open(policy(), ['u1']);
    const reset = Array.from(peopleRows()[0].querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Restablecer'
    )!;
    expect(Array.from(peopleRows()[1].querySelectorAll('button'))).toEqual([]);
    reset.click();

    expect(dialogOpen).toHaveBeenCalledTimes(1);
    expect(dialogOpen.calls.mostRecent().args[1].data.destructive).toBeTrue();
    expect(dialogOpen.calls.mostRecent().args[1].data.message).toContain('Ana Pérez');
    const req = controller.expectOne('/gateway/mfa/users/u1/reset');
    expect(req.request.method).toBe('POST');
    req.flush({ reset: true });
    controller.expectOne('/gateway/mfa/users').flush({ userIds: [] });
    await settle();

    expect(noticeText()).toBe('Se restableció la verificación en dos pasos de Ana Pérez');
    expect(peopleRows()[0].textContent).toContain('Sin activar');
  });

  it('si se cancela la confirmación no se restablece nada', async () => {
    confirm = false;
    await open(policy(), ['u1']);
    Array.from(peopleRows()[0].querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Restablecer')!
      .click();

    controller.expectNone('/gateway/mfa/users/u1/reset');
  });

  it('si el servidor no tiene activado el segundo factor lo explica y no muestra controles', async () => {
    fixture = TestBed.createComponent(SecurityComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
    controller
      .expectOne(POLICY_URL)
      .flush({ code: 'MFA_DISABLED' }, { status: 503, statusText: 'Service Unavailable' });
    await settle();

    expect(alertText()).toBe('El segundo factor no está activado en el servidor');
    expect(toggles().length).toBe(0);
  });

  it('un 403 (otro rol) muestra el error del permiso', async () => {
    fixture = TestBed.createComponent(SecurityComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
    controller.expectOne(POLICY_URL).flush({ code: 'FORBIDDEN' }, { status: 403, statusText: 'Forbidden' });
    await settle();

    expect(alertText()).toBe('No tienes permiso para realizar esta acción');
  });
});
