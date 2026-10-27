import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { DomainRoute, DomainWaypoint } from '../../core/api/models';

import { RouteVisitsComponent } from './route-visits.component';
import { StopRef } from './routes-map.component';

const waypoint = (sequence: number, packageId: string | null, withPosition = true): DomainWaypoint =>
  ({
    sequence,
    stopType: packageId ? 'delivery' : 'depot',
    packageId,
    packageInfo: null,
    placeId: null,
    arrivalUtc: '2026-10-26T13:00:00Z',
    departureUtc: null,
    position: withPosition ? { lat: 4.6, lng: -74.08 } : null,
  }) as DomainWaypoint;

const route = {
  routeIndex: 2,
  name: 'Ruta Norte',
  waypoints: [waypoint(0, null), waypoint(1, 'a'), waypoint(2, 'b', false), waypoint(3, 'c'), waypoint(4, null)],
} as DomainRoute;

const pkg = (id: string, name: string, address: string, status = 'pending') => ({ id, name, guideNumber: null, address, standardizedAddress: null, status });

describe('RouteVisitsComponent', () => {
  let fixture: ComponentFixture<RouteVisitsComponent>;
  let http: HttpTestingController;
  let overlay: HTMLElement;
  let focused: StopRef[];
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent!.replace(/\s+/g, ' ');
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
  const rows = () => Array.from(root().querySelectorAll('tbody tr'));
  const cells = (row: Element) => Array.from(row.querySelectorAll('td')).map((c) => c.textContent!.replace(/\s+/g, ' ').trim());
  const get = (id: string): TestRequest => http.expectOne((r) => r.method === 'GET' && r.url === `/gateway/packages/${id}`);
  const patch = (id: string, status: string): TestRequest =>
    http.expectOne((r) => r.method === 'PATCH' && r.url === `/gateway/packages/${id}/status/${status}`);
  const overlayButton = (label: string) => (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === label)!;

  function loadAll(statusOfA = 'pending'): void {
    get('a').flush(pkg('a', 'Café Ñandú', 'Calle Mayor 1', statusOfA));
    get('b').flush(pkg('b', 'Tienda Sur', 'Avenida Sur 2'));
    get('c').flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
  }

  const changeButton = (name: string) => root().querySelector(`[aria-label="Cambiar el estado de la visita ${name}"]`) as HTMLButtonElement;

  async function pickStatus(name: string, label: string): Promise<void> {
    changeButton(name).click();
    fixture.detectChanges();
    await wait();
    overlayButton(label).click();
    fixture.detectChanges();
    await wait();
  }

  beforeEach(() => {
    focused = [];
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
    fixture.componentInstance.stopFocus.subscribe((ref) => focused.push(ref));
    fixture.detectChanges();
    http.match((r) => r.url === '/gateway/master-domains').forEach((r) => r.flush([]));
  });

  afterEach(() => http.verify());

  describe('paradas y visitas', () => {
    it('muestra orden, tipo, nombre, dirección, llegada y estado de cada parada', () => {
      loadAll();
      expect(rows().length).toBe(5);
      const visit = cells(rows()[1]);
      expect(visit[0]).toBe('1');
      expect(visit[1]).toBe('Entrega');
      expect(rows()[1].querySelector('.name')?.textContent).toBe('Café Ñandú');
      expect(rows()[1].querySelector('.address')?.textContent).toBe('Calle Mayor 1');
      expect(visit[3]).not.toBe('—');
      expect(visit[5]).toBe('Pendiente');
    });

    it('mientras lee los paquetes muestra «Cargando…» y cuántos faltan', () => {
      expect(cells(rows()[1])[5]).toBe('Cargando…');
      expect(root().querySelector('.count')?.textContent).toContain('Cargando 3 paquetes');
      loadAll();
      expect(root().querySelector('.count')?.textContent?.trim()).toBe('');
    });

    it('las paradas sin paquete no tienen estado ni acción de cambio', () => {
      loadAll();
      const depot = rows()[0];
      expect(cells(depot)[2]).toBe('—');
      expect(cells(depot)[5]).toBe('—');
      expect(depot.querySelector('[aria-label^="Cambiar el estado"]')).toBeNull();
    });

    it('un paquete que no se puede leer queda «No disponible» sin afectar al resto', () => {
      loadAll();
      expect(cells(rows()[3])[5]).toBe('No disponible');
      expect(cells(rows()[1])[5]).toBe('Pendiente');
      expect(rows()[3].querySelector<HTMLButtonElement>('[aria-label^="Cambiar el estado"]')?.disabled).toBeTrue();
    });

    it('«Ver en el mapa» pide enfocar esa parada de esta ruta y se desactiva sin posición', () => {
      loadAll();
      const buttons = rows().map((r) => r.querySelector('button[aria-label^="Ver la parada"]') as HTMLButtonElement);
      expect(buttons[2].disabled).toBeTrue();
      buttons[1].click();
      expect(focused).toEqual([{ routeIndex: 2, sequence: 1 }]);
      expect(buttons[1].getAttribute('aria-label')).toBe('Ver la parada 1 de Ruta Norte en el mapa');
    });

    it('una ruta sin visitas lo dice y no ofrece filtros', () => {
      loadAll();
      fixture.componentRef.setInput('route', { ...route, waypoints: [waypoint(0, null), waypoint(1, null)] });
      fixture.detectChanges();
      expect(text()).toContain('Esta ruta no tiene visitas');
      expect(root().querySelector('[role="search"]')).toBeNull();
      expect(rows().length).toBe(2);
    });
  });

  describe('filtros', () => {
    beforeEach(() => loadAll());

    const select = () => root().querySelector('select') as HTMLSelectElement;
    const input = () => root().querySelector('input[type="search"]') as HTMLInputElement;
    const choose = (value: string) => {
      select().value = value;
      select().dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    const type = (value: string) => {
      input().value = value;
      input().dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };

    it('filtra por estado y cuenta las coincidencias', () => {
      choose('pending');
      expect(rows().length).toBe(2);
      expect(text()).toContain('2 de 3 visitas coinciden con los filtros');
    });

    it('filtra por «No disponible»', () => {
      choose('unavailable');
      expect(rows().length).toBe(1);
    });

    it('filtra por texto sin distinguir mayúsculas ni acentos', () => {
      type('CAFE ñandu');
      expect(rows().length).toBe(1);
      expect(cells(rows()[0])[2]).toContain('Café Ñandú');
    });

    it('sin coincidencias avisa y «Limpiar filtros» restaura la tabla', () => {
      type('no existe');
      expect(text()).toContain('Ninguna visita coincide con los filtros');
      expect(rows().length).toBe(0);
      (Array.from(root().querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Limpiar filtros') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(rows().length).toBe(5);
      expect(input().value).toBe('');
      expect(select().value).toBe('');
    });

    it('filtrar no vuelve a pedir paquetes', () => {
      choose('pending');
      type('calle');
      http.expectNone((r) => r.url.startsWith('/gateway/packages'));
      expect(rows().length).toBe(1);
    });

    it('«Actualizar» vuelve a leer los paquetes y conserva los filtros', () => {
      type('calle');
      (Array.from(root().querySelectorAll('button')).find((b) => b.textContent?.includes('Actualizar')) as HTMLButtonElement).click();
      fixture.detectChanges();
      get('a').flush(pkg('a', 'Café Ñandú', 'Calle Mayor 1', 'attended'));
      get('b').flush(pkg('b', 'Tienda Sur', 'Avenida Sur 2'));
      get('c').flush(pkg('c', 'Calle Falsa', 'Calle Falsa 3'));
      fixture.detectChanges();
      expect(input().value).toBe('calle');
      expect(rows().length).toBe(2);
    });
  });

  describe('avance y cambio de estado', () => {
    beforeEach(() => loadAll('attended'));

    it('muestra «X de N visitas atendidas» como texto', () => {
      expect(text()).toContain('1 de 3 visitas atendidas');
      expect(root().querySelector('.bar')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('ofrece los estados activos menos el actual, con su etiqueta, y no «Devuelto»', async () => {
      changeButton('Tienda Sur').click();
      fixture.detectChanges();
      await wait();
      const labels = Array.from(overlay.querySelectorAll('button')).map((b) => b.textContent!.trim());
      expect(labels).toEqual(['Atendido', 'No atendido', 'Cancelado']);
    });

    it('cambia el estado, avisa y recalcula el avance', async () => {
      await pickStatus('Tienda Sur', 'Atendido');
      patch('b', 'attended').flush(pkg('b', 'Tienda Sur', 'Avenida Sur 2', 'attended'));
      fixture.detectChanges();
      expect(cells(rows()[2])[5]).toBe('Atendido');
      expect(text()).toContain('2 de 3 visitas atendidas');
      expect(root().querySelector('[role="status"].success')?.textContent).toContain('La visita «Tienda Sur» ahora está atendido');
    });

    it('mientras dura el cambio la acción de esa visita queda desactivada y la de las demás no', async () => {
      await pickStatus('Tienda Sur', 'Atendido');
      expect(changeButton('Tienda Sur').disabled).toBeTrue();
      expect(changeButton('Café Ñandú').disabled).toBeFalse();
      patch('b', 'attended').flush(pkg('b', 'Tienda Sur', 'Avenida Sur 2', 'attended'));
      fixture.detectChanges();
      expect(changeButton('Tienda Sur').disabled).toBeFalse();
    });

    it('si el gateway rechaza el cambio muestra el error y conserva el estado', async () => {
      await pickStatus('Tienda Sur', 'Atendido');
      patch('b', 'attended').flush({ message: 'no' }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();
      expect(cells(rows()[2])[5]).toBe('Pendiente');
      expect(root().querySelector('[role="alert"]')?.textContent?.trim()).toBeTruthy();
      expect(text()).toContain('1 de 3 visitas atendidas');
    });

    it('cancelar pide confirmación y solo cambia el estado si se acepta', async () => {
      await pickStatus('Tienda Sur', 'Cancelado');
      expect(overlay.textContent).toContain('¿Cancelar el paquete «Tienda Sur»?');
      overlayButton('Cancelar paquete').click();
      fixture.detectChanges();
      await wait();
      patch('b', 'cancelled').flush(pkg('b', 'Tienda Sur', 'Avenida Sur 2', 'cancelled'));
      fixture.detectChanges();
      expect(cells(rows()[2])[5]).toBe('Cancelado');
    });

    it('rechazar la confirmación no llama al gateway', async () => {
      await pickStatus('Tienda Sur', 'Cancelado');
      overlayButton('Volver').click();
      fixture.detectChanges();
      await wait();
      fixture.detectChanges();
      http.expectNone((r) => r.method === 'PATCH');
      expect(cells(rows()[2])[5]).toBe('Pendiente');
      expect(changeButton('Tienda Sur').disabled).toBeFalse();
    });
  });

  describe('etiquetas de estado', () => {
    it('cada visita muestra su estado como etiqueta con el tono de su significado', () => {
      loadAll('attended');
      const badges = rows().map((r) => r.querySelector('app-status-badge'));
      expect(badges[0]).toBeNull();
      expect(badges[1]?.getAttribute('data-tone')).toBe('success');
      expect(badges[2]?.getAttribute('data-tone')).toBe('neutral');
      expect(badges[3]?.querySelector('span')?.textContent).toBe('No disponible');
      expect(badges[3]?.getAttribute('data-tone')).toBe('neutral');
    });

    it('mientras carga, la etiqueta dice «Cargando…» en tono neutro', () => {
      const badge = rows()[1].querySelector('app-status-badge') as HTMLElement;
      expect(badge.querySelector('span')?.textContent).toBe('Cargando…');
      expect(badge.getAttribute('data-tone')).toBe('neutral');
      loadAll();
    });
  });
});
