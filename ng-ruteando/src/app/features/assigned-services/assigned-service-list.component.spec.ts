import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { flushLookups, SERVICE } from '../../../testing/assigned-services';
import { iconButtonsWithoutTitle } from '../../../testing/icon-button-titles';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { AssignedServiceListComponent } from './assigned-service-list.component';

describe('AssignedServiceListComponent', () => {
  let fixture: ComponentFixture<AssignedServiceListComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;

  function setup(lookups: Parameters<typeof flushLookups>[1] = {}, services: unknown[] = [SERVICE]): void {
    TestBed.configureTestingModule({
      imports: [AssignedServiceListComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AssignedServiceListComponent);
    fixture.detectChanges();
    flushLookups(http, lookups);
    http.expectOne('/gateway/assigned-services').flush(services);
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('pide los nombres antes que los servicios y los muestra en la fila', () => {
    setup();
    const cells = Array.from(root().querySelector('tr.mat-mdc-row')!.querySelectorAll('td')).map((c) =>
      c.textContent!.trim()
    );
    expect(cells.join('|')).toContain('Reparto norte · Ruta 2');
    expect(cells.join('|')).toContain('ABC123');
    expect(cells.join('|')).toContain('Ana Pérez');
    expect(cells.join('|')).toContain('Activo');
  });

  it('si no puede leer los conductores (rol sin permiso) igual lista los servicios, con «—»', () => {
    setup({ drivers: null });
    expect(root().querySelector('tr.mat-mdc-row')!.textContent).toContain('—');
    expect(root().querySelector('tr.mat-mdc-row')!.textContent).toContain('ABC123');
  });

  it('las acciones de fila, que son solo un icono, llevan título; asignar es la acción principal', () => {
    setup();
    expect(root().querySelectorAll('.mat-mdc-icon-button').length).toBeGreaterThan(1);
    expect(iconButtonsWithoutTitle(root())).toEqual([]);
    expect(root().querySelectorAll('app-page-header .primary-action').length).toBe(1);
  });

  it('ofrece ver los servicios en el mapa', () => {
    setup();
    expect(root().querySelector('app-page-header a[href="/assigned-services/map"]')?.textContent).toContain(
      'Ver en el mapa'
    );
  });

  it('sin servicios muestra el aviso y el enlace para asignar la primera ruta', () => {
    setup({}, []);
    expect(root().textContent).toContain('Todavía no hay servicios asignados');
    expect(root().textContent).toContain('Asignar la primera ruta');
  });
});
