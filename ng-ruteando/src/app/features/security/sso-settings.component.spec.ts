import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { API_BASE_URL } from '../../core/api/api-config';
import { authInterceptor } from '../../core/api/auth.interceptor';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { refreshInterceptor } from '../../core/api/refresh.interceptor';
import { SsoEnterprise } from '../../core/auth/sso.model';
import { SsoAccountsComponent } from '../../shared/sso/sso-accounts.component';
import { parseDomains, SsoSettingsComponent } from './sso-settings.component';

const ENTERPRISE: SsoEnterprise = {
  available: true,
  configured: true,
  name: 'Corp',
  issuer: 'https://login.corp.example',
  clientId: 'cid',
  hasSecret: true,
  domains: ['corp.example'],
  redirectUri: 'https://app.example/gateway/sso/enterprise/callback',
};

describe('parseDomains', () => {
  it('separa por comas, espacios o saltos de línea, en minúsculas y sin repetidos', () => {
    expect(parseDomains(' Corp.Example, filial.com;\ncorp.example  ')).toEqual(['corp.example', 'filial.com']);
    expect(parseDomains('  ')).toEqual([]);
  });
});

describe('SSO en Seguridad y Perfil', () => {
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([authInterceptor, refreshInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    controller = TestBed.inject(HttpTestingController);
  });
  afterEach(() => controller.verify());

  function settings() {
    const fixture = TestBed.createComponent(SsoSettingsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('sin SSO en el servidor la sección no aparece', () => {
    const fixture = settings();
    controller.expectOne('/gateway/sso/policy').flush({ code: 'SSO_DISABLED' }, { status: 503, statusText: 'x' });
    controller.expectOne('/gateway/sso/enterprise').flush({ code: 'SSO_DISABLED' }, { status: 503, statusText: 'x' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('section')).toBeNull();
  });

  it('muestra la política y el proveedor de la empresa sin el secreto, y guarda lo editado', () => {
    const fixture = settings();
    controller
      .expectOne('/gateway/sso/policy')
      .flush({ tenantId: 't', enabled: true, providers: [{ id: 'google', label: 'Google' }] });
    controller.expectOne('/gateway/sso/enterprise').flush(ENTERPRISE);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain(ENTERPRISE.redirectUri);
    expect((root.querySelector('input[type="password"]') as HTMLInputElement).value).toBe('');

    const name = root.querySelector('input[formControlName="name"]') as HTMLInputElement;
    name.value = 'Corp SA';
    name.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = controller.expectOne((r) => r.method === 'PUT' && r.url === '/gateway/sso/enterprise');
    expect(req.request.body).toEqual({
      name: 'Corp SA',
      issuer: 'https://login.corp.example',
      clientId: 'cid',
      clientSecret: '',
      domains: ['corp.example'],
    });
    req.flush({ ...ENTERPRISE, name: 'Corp SA' });
  });

  it('el interruptor cambia la política', () => {
    const fixture = settings();
    controller.expectOne('/gateway/sso/policy').flush({ tenantId: 't', enabled: true, providers: [] });
    controller.expectOne('/gateway/sso/enterprise').flush({ ...ENTERPRISE, available: false });
    fixture.detectChanges();
    const toggle = (fixture.nativeElement as HTMLElement).querySelector('button[role="switch"]') as HTMLButtonElement;
    toggle.click();
    const req = controller.expectOne('/gateway/sso/policy');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ enabled: false });
    req.flush({ tenantId: 't', enabled: false });
  });

  it('Perfil: las cuentas vinculadas solo aparecen si hay alguna', () => {
    const fixture = TestBed.createComponent(SsoAccountsComponent);
    fixture.detectChanges();
    controller.expectOne('/gateway/sso/identities').flush({ identities: [] });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('section')).toBeNull();

    const other = TestBed.createComponent(SsoAccountsComponent);
    other.detectChanges();
    controller.expectOne('/gateway/sso/identities').flush({
      identities: [{ provider: 'google', label: 'Google', email: 'a@x.invalid', linkedAt: 'x', lastLoginAt: 'x' }],
    });
    other.detectChanges();
    const root = other.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Google');
    expect(root.textContent).toContain('a@x.invalid');
  });
});
