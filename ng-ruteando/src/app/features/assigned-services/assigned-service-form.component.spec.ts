import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';

import { Fixture } from '../../../testing/api-testing';
import { flushLookups, SERVICE } from '../../../testing/assigned-services';
import journeyFixture from '../../../testing/fixtures/gateway/get__journeys__id.json';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { AssignedServiceFormComponent } from './assigned-service-form.component';

const base = (journeyFixture as unknown as Fixture).response.body as { routes: Record<string, unknown>[] };
const journey = {
  ...(base as object),
  id: 'j1',
  name: 'Reparto norte',
  routes: [
    { ...base.routes[0], routeIndex: 0, name: 'Ruta A', resourceId: 'v1' },
    { ...base.routes[0], routeIndex: 1, name: 'Ruta B', resourceId: 'v2' },
  ],
};

describe('AssignedServiceFormComponent', () => {
  let fixture: ComponentFixture<AssignedServiceFormComponent>;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;
  const root = () => fixture.nativeElement as HTMLElement;
  // El formulario es protegido: las pruebas lo leen por su valor, no por la interfaz de Material
  const form = () => (fixture.componentInstance as unknown as { form: import('@angular/forms').FormGroup }).form;

  function setup(params: Record<string, string> = {}, query: Record<string, string> = {}): void {
    TestBed.configureTestingModule({
      imports: [AssignedServiceFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(params), queryParamMap: convertToParamMap(query) } },
        },
        { provide: Router, useValue: { navigateByUrl: (navigate = jasmine.createSpy().and.resolveTo(true)) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AssignedServiceFormComponent);
    fixture.detectChanges();
  }
  const submit = () => {
    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  afterEach(() => http.verify());

  it('con ?journey y ?route deja la ruta elegida y propone su vehículo y el conductor de ese vehículo', () => {
    setup({}, { journey: 'j1', route: '0' });
    flushLookups(http);
    http.expectOne('/gateway/journeys/j1').flush(journey);
    fixture.detectChanges();
    expect(form().value).toEqual(
      jasmine.objectContaining({ journeyId: 'j1', routeIndex: 0, vehicleId: 'v1', driverId: 'd1' })
    );
  });

  it('si el vehículo de la ruta no tiene conductor, el conductor queda por elegir y no se puede guardar', () => {
    setup({}, { journey: 'j1', route: '1' });
    flushLookups(http);
    http.expectOne('/gateway/journeys/j1').flush(journey);
    fixture.detectChanges();
    expect(form().value).toEqual(jasmine.objectContaining({ routeIndex: 1, vehicleId: 'v2', driverId: '' }));
    submit();
    http.expectNone('/gateway/assigned-services');
    expect(form().controls['driverId'].hasError('required')).toBeTrue();
  });

  it('crea el servicio con la ruta como jornada e índice, el vehículo, el conductor y la fecha', () => {
    setup({}, { journey: 'j1', route: '0' });
    flushLookups(http);
    http.expectOne('/gateway/journeys/j1').flush(journey);
    form().controls['executionDate'].setValue('2026-12-01');
    submit();
    const req = http.expectOne('/gateway/assigned-services');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      state: 'ACTIVO',
      route: { journeyId: 'j1', routeIndex: 0 },
      vehicle: { id: 'v1' },
      driver: { id: 'd1' },
      executionDate: '2026-12-01',
    });
    req.flush(SERVICE);
    expect(navigate).toHaveBeenCalledWith('/assigned-services');
  });

  it('al editar rellena el formulario y al guardar reenvía el estado que el servicio ya tenía', () => {
    setup({ id: 's1' });
    flushLookups(http);
    http.expectOne('/gateway/assigned-services/s1').flush({ ...SERVICE, state: 'FINALIZADO' });
    http.expectOne('/gateway/journeys/j1').flush(journey);
    fixture.detectChanges();
    expect(form().value).toEqual(
      jasmine.objectContaining({
        journeyId: 'j1',
        routeIndex: 1,
        vehicleId: 'v1',
        driverId: 'd1',
        executionDate: '2026-11-25',
      })
    );
    submit();
    const req = http.expectOne('/gateway/assigned-services/s1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.state).toBe('FINALIZADO');
    req.flush(SERVICE);
  });

  it('si el servicio ya no existe lo dice y no muestra el formulario', () => {
    setup({ id: 's9' });
    flushLookups(http);
    http.expectOne('/gateway/assigned-services/s9').flush({ message: 'no' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(root().querySelector('form')).toBeNull();
    expect(root().textContent).toContain('El registro ya no existe');
  });
});
