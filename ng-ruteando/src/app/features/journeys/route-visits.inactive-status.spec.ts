import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { DomainRoute, DomainWaypoint } from '../../core/api/models';

import { RouteVisitsComponent } from './route-visits.component';

const waypoint = (sequence: number, packageId: string): DomainWaypoint =>
  ({ sequence, stopType: 'delivery', packageId, packageInfo: null, placeId: null, arrivalUtc: null, departureUtc: null, position: null }) as DomainWaypoint;

const route = { routeIndex: 0, name: 'Ruta Norte', waypoints: [waypoint(1, 'a'), waypoint(2, 'b')] } as DomainRoute;
const pkg = (id: string, status: string) => ({ id, name: `Paquete ${id}`, guideNumber: null, address: `Calle ${id}`, standardizedAddress: null, status });
const value = (key: string, active: boolean) => ({ key, label: key, description: null, sortOrder: null, active });
/** Catálogo como el del gateway real: `returned` y una clave de pruebas están inactivos. */
const CATALOG = [
  {
    id: 'd1',
    code: 'PackageStatus',
    description: '',
    system: true,
    values: [value('pending', true), value('attended', true), value('unattended', true), value('cancelled', true), value('returned', false), value('demo_1', false)],
  },
];

describe('RouteVisitsComponent: estados inactivos del catálogo', () => {
  let fixture: ComponentFixture<RouteVisitsComponent>;
  let http: HttpTestingController;
  let overlay: HTMLElement;
  const root = () => fixture.nativeElement as HTMLElement;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
  const filterOptions = () => Array.from(root().querySelectorAll('select option')).map((o) => o.textContent!.trim());
  const rows = () => Array.from(root().querySelectorAll('tbody tr'));

  function open(statusA: string, statusB: string): void {
    TestBed.configureTestingModule({
      imports: [RouteVisitsComponent],
      providers: [
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    fixture = TestBed.createComponent(RouteVisitsComponent);
    fixture.componentRef.setInput('route', route);
    fixture.detectChanges();
    http.match((r) => r.url === '/gateway/master-domains').forEach((r) => r.flush(CATALOG));
    http.expectOne('/gateway/packages/a').flush(pkg('a', statusA));
    http.expectOne('/gateway/packages/b').flush(pkg('b', statusB));
    fixture.detectChanges();
  }

  async function menuFor(name: string): Promise<string[]> {
    (root().querySelector(`[aria-label="Cambiar el estado de la visita ${name}"]`) as HTMLButtonElement).click();
    fixture.detectChanges();
    await wait();
    return Array.from(overlay.querySelectorAll('[mat-menu-item]')).map((b) => b.textContent!.trim());
  }

  afterEach(() => http.verify());

  it('con el catálogo del gateway el menú no ofrece «Devuelto» ni claves inactivas', async () => {
    open('pending', 'attended');
    const items = await menuFor('Paquete a');
    expect(items).toEqual(['Atendido', 'No atendido', 'Cancelado']);
    expect(items.join(' ')).not.toContain('demo_1');
  });

  it('sin visitas con estados inactivos el filtro solo ofrece los activos y «No disponible»', () => {
    open('pending', 'attended');
    expect(filterOptions()).toEqual(['Todos los estados', 'Pendiente', 'Atendido', 'No atendido', 'Cancelado', 'No disponible']);
  });

  it('una visita con un estado inactivo se muestra y su estado aparece en el filtro, pero no como destino', async () => {
    open('pending', 'returned');
    expect(rows()[1].textContent).toContain('Devuelto');
    expect(filterOptions()).toEqual(['Todos los estados', 'Pendiente', 'Atendido', 'No atendido', 'Cancelado', 'Devuelto', 'No disponible']);

    const select = root().querySelector('select') as HTMLSelectElement;
    select.value = 'returned';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(rows().length).toBe(1);

    expect(await menuFor('Paquete b')).toEqual(['Pendiente', 'Atendido', 'No atendido', 'Cancelado']);
  });
});
