import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from '../../core/api/api-config';
import { MfaStatus } from '../../core/auth/mfa.model';
import { MfaReminderComponent, needsMfaActivation } from './mfa-reminder.component';

const STATUS = '/gateway/mfa/status';
const method = (over: Partial<MfaStatus['methods']['email']> = {}) => ({
  allowed: true,
  available: true,
  active: false,
  pending: false,
  destination: null,
  ...over,
});
const status = (over: Partial<MfaStatus> = {}): MfaStatus => ({
  enabled: true,
  methods: { email: method(), sms: method({ available: false }), totp: method() },
  recoveryCodesLeft: 0,
  required: false,
  activeCount: 0,
  ...over,
});

describe('needsMfaActivation', () => {
  it('avisa solo si no hay ningún método activo y hay alguno que se pueda activar', () => {
    expect(needsMfaActivation(status())).toBeTrue();
    expect(needsMfaActivation(status({ activeCount: 1 }))).toBeFalse();
    const none = {
      email: method({ allowed: false }),
      sms: method({ available: false }),
      totp: method({ allowed: false }),
    };
    expect(needsMfaActivation(status({ methods: none }))).toBeFalse();
  });
});

describe('MfaReminderComponent', () => {
  let fixture: ComponentFixture<MfaReminderComponent>;
  let controller: HttpTestingController;
  const banner = () => (fixture.nativeElement as HTMLElement).querySelector('.mfa-reminder');
  const wait = () => new Promise((resolve) => setTimeout(resolve, 10));

  async function open(): Promise<void> {
    fixture = TestBed.createComponent(MfaReminderComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('sin ningún método activo muestra el aviso con el camino al perfil', async () => {
    await open();
    controller.expectOne(STATUS).flush(status());
    await wait();
    fixture.detectChanges();

    expect(banner()?.textContent).toContain('Protege tu cuenta con la verificación en dos pasos');
    expect(banner()?.querySelector('a')?.getAttribute('href')).toBe('/profile');
  });

  it('«Más tarde» lo oculta', async () => {
    await open();
    controller.expectOne(STATUS).flush(status());
    await wait();
    fixture.detectChanges();

    (banner()!.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(banner()).toBeNull();
  });

  it('con un método activo no aparece', async () => {
    await open();
    controller.expectOne(STATUS).flush(status({ activeCount: 1 }));
    await wait();
    fixture.detectChanges();
    expect(banner()).toBeNull();
  });

  it('con el módulo apagado (503) no aparece ni molesta', async () => {
    await open();
    controller.expectOne(STATUS).flush({ code: 'MFA_DISABLED' }, { status: 503, statusText: 'Service Unavailable' });
    await wait();
    fixture.detectChanges();
    expect(banner()).toBeNull();
  });
});
