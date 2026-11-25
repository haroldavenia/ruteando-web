import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { flushLookups, SERVICE } from '../../../testing/assigned-services';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { RouteAssignmentComponent } from './route-assignment.component';

describe('RouteAssignmentComponent', () => {
  let fixture: ComponentFixture<RouteAssignmentComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;

  function setup(routeIndex: number, services: unknown[]): void {
    TestBed.configureTestingModule({
      imports: [RouteAssignmentComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RouteAssignmentComponent);
    fixture.componentRef.setInput('journeyId', 'j1');
    fixture.componentRef.setInput('routeIndex', routeIndex);
    fixture.detectChanges();
    http.expectOne('/gateway/assigned-services').flush(services);
    if (
      services.some(
        (s) =>
          (s as typeof SERVICE).route?.['journeyId'] === 'j1' &&
          (s as typeof SERVICE).route?.['routeIndex'] === routeIndex
      )
    ) {
      flushLookups(http);
    }
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('una ruta asignada muestra vehículo, conductor, fecha y estado, y deja cambiarla', () => {
    setup(1, [SERVICE]);
    const text = root().textContent!.replace(/\s+/g, ' ');
    expect(text).toContain('ABC123');
    expect(text).toContain('Ana Pérez');
    expect(text).toContain('Activo');
    expect(root().querySelector('a[href="/assigned-services/s1"]')?.textContent?.trim()).toBe('Cambiar');
  });

  it('una ruta sin asignar ofrece asignarla con la jornada y la ruta ya elegidas', () => {
    setup(0, [SERVICE]);
    const link = root().querySelector('a.primary-action') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/assigned-services/new?journey=j1&route=0');
  });

  it('solo cuenta el servicio de esa ruta de esa jornada', () => {
    setup(0, [{ ...SERVICE, route: { journeyId: 'otra', routeIndex: 0 } }]);
    expect(root().textContent).toContain('todavía no está asignada');
  });

  it('una ruta asignada ofrece quitar la asignación', () => {
    setup(1, [SERVICE]);
    expect(root().querySelector('button')?.textContent).toContain('Quitar asignación');
  });
});
