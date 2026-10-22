import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { API_BASE_URL } from '../../../core/api/api-config';
import { authInterceptor } from '../../../core/api/auth.interceptor';
import { errorInterceptor } from '../../../core/api/error.interceptor';
import { refreshInterceptor } from '../../../core/api/refresh.interceptor';
import { ForgotPasswordComponent } from './forgot-password.component';

const FORGOT = '/gateway/auth/forgot-password';
const NEUTRAL = 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña';

describe('ForgotPasswordComponent', () => {
  let harness: RouterTestingHarness;
  let controller: HttpTestingController;
  let root: HTMLElement;

  const input = () => root.querySelector('input[type="email"]') as HTMLInputElement;
  const submit = () => root.querySelector('form')!.dispatchEvent(new Event('submit'));
  function fill(value: string): void {
    input().value = value;
    input().dispatchEvent(new Event('input'));
  }

  async function open(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'acceso/recuperar', component: ForgotPasswordComponent }]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([authInterceptor, refreshInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/acceso/recuperar');
    harness.detectChanges();
    root = harness.routeNativeElement as HTMLElement;
  }

  beforeEach(open);
  afterEach(() => controller.verify());

  it('muestra siempre el mismo mensaje neutro, exista o no la cuenta', () => {
    fill('existe@example.invalid');
    submit();
    controller.expectOne(FORGOT).flush({ message: 'Si el email existe, recibirás instrucciones para resetear tu contraseña.' });
    harness.detectChanges();
    const existing = root.querySelector('[role="status"]')?.textContent?.trim();

    expect(existing).toContain(NEUTRAL);
    expect(root.querySelector('form')).toBeNull();
  });

  it('una cuenta inexistente produce exactamente el mismo texto que una existente', async () => {
    fill('existe@example.invalid');
    submit();
    controller.expectOne(FORGOT).flush({ message: 'mensaje A del gateway' });
    harness.detectChanges();
    const first = root.querySelector('[role="status"]')?.textContent?.trim();

    TestBed.resetTestingModule();
    await open();
    fill('no-existe@example.invalid');
    submit();
    controller.expectOne(FORGOT).flush({ message: 'mensaje B distinto del gateway' });
    harness.detectChanges();

    expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe(first);
  });

  it('envía { email } al gateway', () => {
    fill('persona@example.invalid');
    submit();

    const req = controller.expectOne(FORGOT);
    expect(req.request.body).toEqual({ email: 'persona@example.invalid' });
    req.flush({ message: 'x' });
  });

  it('con el correo vacío o mal escrito no envía y muestra el error del campo', () => {
    submit();
    harness.detectChanges();
    expect(root.querySelector('mat-error')?.textContent).toContain('Introduce tu correo');

    fill('no-es-un-correo');
    submit();
    harness.detectChanges();
    expect(root.querySelector('mat-error')?.textContent).toContain('Introduce un correo válido');
    controller.expectNone(FORGOT);
  });

  it('si falla el servicio muestra el error genérico, no la confirmación, y permite reintentar', () => {
    fill('persona@example.invalid');
    submit();
    controller.expectOne(FORGOT).flush(null, { status: 503, statusText: 'x' });
    harness.detectChanges();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('El servicio no está disponible');
    expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe('');
    expect(root.querySelector('form')).not.toBeNull();
    expect((root.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeFalse();

    submit();
    controller.expectOne(FORGOT).flush({ message: 'x' });
  });

  it('no se envía dos veces mientras espera', () => {
    fill('persona@example.invalid');
    submit();
    submit();

    const requests = controller.match(FORGOT);
    expect(requests.length).toBe(1);
    requests[0].flush({ message: 'x' });
  });

  it('ofrece volver a iniciar sesión', () => {
    expect(Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain('/acceso');
  });
});
