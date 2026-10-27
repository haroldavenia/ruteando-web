import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { Fixture, respondWith } from '../../../../testing/api-testing';
import { API_BASE_URL } from '../../../core/api/api-config';
import { errorInterceptor } from '../../../core/api/error.interceptor';

import { DriverListComponent } from './driver-list.component';

import drivers from '../../../../testing/fixtures/gateway/get__users__drivers.json';
import resetPassword from '../../../../testing/fixtures/gateway/post__users__id__reset-password.json';
import remove from '../../../../testing/fixtures/gateway/delete__users__id.json';

describe('DriverListComponent', () => {
  let fixture: ComponentFixture<DriverListComponent>;
  let http: HttpTestingController;
  let overlay: HTMLElement;
  const root = () => fixture.nativeElement as HTMLElement;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
  const driver = (drivers as unknown as Fixture).response.body as { id: string; email: string; firstName: string; lastName: string }[];
  const label = `${driver[0].firstName} ${driver[0].lastName}`;
  const overlayButton = (text: string) =>
    (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === text)!;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DriverListComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    fixture = TestBed.createComponent(DriverListComponent);
    fixture.detectChanges();
    respondWith(http.expectOne('/gateway/users/drivers'), drivers as unknown as Fixture);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('muestra nombre, correo, teléfono y estado de cada conductor', () => {
    const row = root().querySelector('tr.mat-mdc-row')!.textContent!;
    expect(row).toContain(label);
    expect(row).toContain(driver[0].email);
    expect(row).toContain('Activo');
  });

  it('las acciones de fila nombran al conductor', () => {
    expect(root().querySelector(`[aria-label="Editar conductor ${label}"]`)).not.toBeNull();
    expect(root().querySelector(`[aria-label="Eliminar conductor ${label}"]`)).not.toBeNull();
    expect(root().querySelector(`[aria-label="Enviar enlace de restablecimiento a ${label}"]`)).not.toBeNull();
  });

  async function openDialogFrom(ariaLabel: string): Promise<void> {
    (root().querySelector(`[aria-label="${ariaLabel}"]`) as HTMLButtonElement).click();
    TestBed.inject(ApplicationRef).tick();
    await wait();
  }

  it('borra tras confirmar y vuelve a pedir la lista completa', async () => {
    await openDialogFrom(`Eliminar conductor ${label}`);
    overlayButton('Eliminar').click();
    await wait();
    respondWith(http.expectOne((r) => r.method === 'DELETE' && r.url === `/gateway/users/${driver[0].id}`), remove as unknown as Fixture);
    fixture.detectChanges();

    expect(root().textContent).toContain(`Se eliminó conductor «${label}»`);
    respondWith(http.expectOne('/gateway/users/drivers'), drivers as unknown as Fixture);
  });

  it('un conductor asignado a un vehículo (409) no se borra y se explica por qué', async () => {
    await openDialogFrom(`Eliminar conductor ${label}`);
    overlayButton('Eliminar').click();
    await wait();
    http.expectOne((r) => r.method === 'DELETE').flush({ message: 'assigned' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('el conductor está asignado a un vehículo');
  });

  it('envía el enlace de restablecimiento tras confirmar y avisa con el correo', async () => {
    await openDialogFrom(`Enviar enlace de restablecimiento a ${label}`);
    expect(overlay.textContent).toContain(driver[0].email);
    overlayButton('Enviar enlace').click();
    await wait();
    respondWith(http.expectOne((r) => r.method === 'POST' && r.url === `/gateway/users/${driver[0].id}/reset-password`), resetPassword as unknown as Fixture);
    fixture.detectChanges();

    expect(root().querySelector('[role="status"]')?.textContent).toContain(driver[0].email);
  });

  it('al cancelar el enlace no se envía nada', async () => {
    await openDialogFrom(`Enviar enlace de restablecimiento a ${label}`);
    overlayButton('Cancelar').click();
    await wait();
    http.expectNone((r) => r.method === 'POST');
  });
});
