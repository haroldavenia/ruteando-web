import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { DomainWaypoint } from '../../core/api/models';

import { RouteVisitsStore, VISITS_CONCURRENCY } from './route-visits.store';

const stop = (sequence: number, packageId: string | null): DomainWaypoint =>
  ({ sequence, stopType: packageId ? 'delivery' : 'depot', packageId, position: null }) as DomainWaypoint;

const pkg = (id: string, status = 'pending') => ({ id, name: `Paquete ${id}`, guideNumber: null, address: `Calle ${id}`, standardizedAddress: null, status });

describe('RouteVisitsStore', () => {
  let store: RouteVisitsStore;
  let http: HttpTestingController;
  let dialog: jasmine.SpyObj<MatDialog>;

  beforeEach(() => {
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    TestBed.configureTestingModule({
      providers: [
        RouteVisitsStore,
        { provide: API_BASE_URL, useValue: '/gateway' },
        { provide: MatDialog, useValue: dialog },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    store = TestBed.inject(RouteVisitsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const get = (id: string) => http.expectOne((r) => r.method === 'GET' && r.url === `/gateway/packages/${id}`);

  it('crea una visita por parada con paquete y carga cada paquete', () => {
    store.load([stop(0, null), stop(1, 'a'), stop(2, 'b')]);
    expect(store.visits().map((v) => v.state)).toEqual(['loading', 'loading']);
    expect(store.pending()).toBe(2);
    get('a').flush(pkg('a', 'attended'));
    get('b').flush(pkg('b'));
    expect(store.visits().map((v) => v.pkg?.status)).toEqual(['attended', 'pending']);
    expect(store.pending()).toBe(0);
    expect(store.progress()).toEqual({ attended: 1, total: 2 });
  });

  it('un paquete que falla queda «No disponible» sin afectar al resto', () => {
    store.load([stop(1, 'a'), stop(2, 'b')]);
    get('a').flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
    get('b').flush(pkg('b'));
    expect(store.visits().map((v) => v.state)).toEqual(['unavailable', 'ready']);
    expect(store.progress().total).toBe(2);
  });

  it('limita las peticiones simultáneas y pide las siguientes al terminar', () => {
    const ids = Array.from({ length: VISITS_CONCURRENCY + 3 }, (_, i) => `p${i}`);
    store.load(ids.map((id, i) => stop(i, id)));
    const first = http.match((r) => r.method === 'GET');
    expect(first.length).toBe(VISITS_CONCURRENCY);
    first.forEach((req, i) => req.flush(pkg(`p${i}`)));
    const second = http.match((r) => r.method === 'GET');
    expect(second.length).toBe(3);
    second.forEach((req, i) => req.flush(pkg(`p${VISITS_CONCURRENCY + i}`)));
    expect(store.pending()).toBe(0);
  });

  it('no repite la lectura de un paquete que aparece dos veces y actualiza ambas visitas', () => {
    store.load([stop(1, 'a'), stop(2, 'a')]);
    get('a').flush(pkg('a'));
    expect(store.visits().every((v) => v.state === 'ready')).toBeTrue();
  });

  it('reload vuelve a leer los paquetes y conserva los filtros', () => {
    store.load([stop(1, 'a')]);
    get('a').flush(pkg('a'));
    store.setTextFilter('calle');
    store.reload();
    expect(store.filters().text).toBe('calle');
    expect(store.visits()[0].state).toBe('loading');
    get('a').flush(pkg('a', 'attended'));
    expect(store.visits()[0].pkg?.status).toBe('attended');
  });

  describe('cambio de estado', () => {
    beforeEach(() => {
      store.load([stop(1, 'a'), stop(2, 'b')]);
      get('a').flush(pkg('a'));
      get('b').flush(pkg('b'));
    });

    const patch = (id: string, status: string) =>
      http.expectOne((r) => r.method === 'PATCH' && r.url === `/gateway/packages/${id}/status/${status}`);

    it('cambia el estado cuando el gateway responde y recalcula el avance', () => {
      store.change(store.visits()[0], 'attended');
      expect(store.visits()[0].pkg?.status).toBe('pending');
      patch('a', 'attended').flush(pkg('a', 'attended'));
      expect(store.visits()[0].pkg?.status).toBe('attended');
      expect(store.progress()).toEqual({ attended: 1, total: 2 });
      expect(store.success()).toBe('La visita «Paquete a» ahora está atendido');
      expect(store.busy().size).toBe(0);
    });

    it('un cambio rechazado conserva el estado y muestra el error', () => {
      store.change(store.visits()[0], 'attended');
      patch('a', 'attended').flush({ message: 'no' }, { status: 400, statusText: 'Bad Request' });
      expect(store.visits()[0].pkg?.status).toBe('pending');
      expect(store.error()).toBeTruthy();
      expect(store.busy().size).toBe(0);
    });

    it('bloquea un segundo cambio de la misma visita mientras el primero sigue en curso, sin bloquear las demás', () => {
      store.change(store.visits()[0], 'attended');
      expect(store.isBusy(store.visits()[0])).toBeTrue();
      expect(store.isBusy(store.visits()[1])).toBeFalse();
      store.change(store.visits()[0], 'unattended');
      store.change(store.visits()[1], 'attended');
      patch('a', 'attended').flush(pkg('a', 'attended'));
      patch('b', 'attended').flush(pkg('b', 'attended'));
      expect(store.progress().attended).toBe(2);
    });

    it('cancelar pide confirmación y no cambia nada si se rechaza', () => {
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);
      store.change(store.visits()[0], 'cancelled');
      expect(dialog.open).toHaveBeenCalled();
      http.expectNone((r) => r.method === 'PATCH');
      expect(store.busy().size).toBe(0);
      expect(store.visits()[0].pkg?.status).toBe('pending');
    });

    it('no cambia una visita cuyo paquete no se pudo leer', () => {
      store.load([stop(1, 'c')]);
      get('c').flush({ message: 'nf' }, { status: 404, statusText: 'x' });
      store.change(store.visits()[0], 'attended');
      http.expectNone((r) => r.method === 'PATCH');
      expect(store.busy().size).toBe(0);
    });
  });
});
