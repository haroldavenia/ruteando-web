import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AUDIT_FIXTURE_LOGS, auditLog, gatewayAuditPage, localIso } from '../../../testing/audit';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { AuditLog } from '../../core/api/models';

import { AuditFilters, EMPTY_FILTERS } from './audit-filters';
import { AuditViewState, FORBIDDEN_MESSAGE } from './audit-view-state';
import { AuditStore } from './audit.store';

describe('AuditStore y AuditViewState', () => {
  let http: HttpTestingController;
  let store: AuditStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuditStore,
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuditStore);
  });

  afterEach(() => http.verify());

  const flushEffects = () => TestBed.tick();
  const page = (n: number) => `/gateway/audit-logs?page=${n}&size=100`;

  describe('almacén', () => {
    it('pide los eventos del ámbito y los ordena del más reciente al más antiguo', () => {
      store.open('empresa', '');
      const old = auditLog({ id: 'viejo', createdAt: localIso(2026, 10, 1) });
      const recent = auditLog({ id: 'reciente', createdAt: localIso(2026, 10, 9) });
      const middle = auditLog({ id: 'medio', createdAt: localIso(2026, 10, 5) });
      http.expectOne(page(0)).flush(gatewayAuditPage([old, recent, middle]));

      expect(store.events().map((log) => log.id)).toEqual(['reciente', 'medio', 'viejo']);
      expect(store.source.status()).toBe('ready');
    });

    it('cada ámbito pide su endpoint', () => {
      store.open('mia', '');
      http.expectOne('/gateway/audit-logs/me?page=0&size=100').flush(gatewayAuditPage([auditLog()]));
      expect(store.events().length).toBe(1);
      store.open('todas', 'abc123');
      http.expectOne('/gateway/audit-logs/admin?page=0&size=100&tenantId=abc123').flush(gatewayAuditPage([auditLog(), auditLog()]));
      expect(store.events().length).toBe(2);
      store.open('empresa', '');
      http.expectOne(page(0)).flush(gatewayAuditPage([]));
      expect(store.events().length).toBe(0);
    });

    it('abrir el mismo ámbito otra vez no vuelve a pedir nada', () => {
      store.open('empresa', '');
      http.expectOne(page(0)).flush(gatewayAuditPage(AUDIT_FIXTURE_LOGS));
      store.open('empresa', '');
      http.expectNone(page(0));
      expect(store.events().length).toBe(20);
    });

    it('la empresa solo cuenta en «todas las empresas»', () => {
      store.open('empresa', 'abc123');
      http.expectOne(page(0)).flush(gatewayAuditPage([]));
      expect(store.tenant()).toBe('');
      store.open('empresa', 'otra');
      http.expectNone(page(0));
    });

    it('cambiar de ámbito cancela la carga anterior', () => {
      store.open('empresa', '');
      const first = http.expectOne(page(0));
      store.open('mia', '');
      expect(first.cancelled).toBeTrue();
      http.expectOne('/gateway/audit-logs/me?page=0&size=100').flush(gatewayAuditPage([auditLog()]));
      expect(store.events().length).toBe(1);
    });

    it('trae todas las páginas de 100 y se detiene en 1000 avisando que hay más', () => {
      store.open('empresa', '');
      for (let n = 0; n < 10; n++) {
        const rows = Array.from({ length: 100 }, () => auditLog());
        http.expectOne(page(n)).flush(gatewayAuditPage(rows, 1500, n));
      }
      http.expectNone(page(10));
      expect(store.source.rows().length).toBe(1000);
      expect(store.source.truncated()).toBeTrue();
      expect(store.source.total()).toBe(1500);
    });

    it('con pocos eventos pide una sola página', () => {
      store.open('empresa', '');
      http.expectOne(page(0)).flush(gatewayAuditPage(AUDIT_FIXTURE_LOGS, 20));
      http.expectNone(page(1));
      expect(store.source.truncated()).toBeFalse();
      expect(store.events().length).toBe(20);
    });

    it('recuerda el estado del fallo para poder ofrecer otra salida ante un 403', () => {
      store.open('empresa', '');
      http.expectOne(page(0)).flush(null, { status: 403, statusText: 'Forbidden' });
      expect(store.errorStatus()).toBe(403);
      expect(store.source.status()).toBe('error');
      store.refresh();
      expect(store.errorStatus()).toBeNull();
      http.expectOne(page(0)).flush(gatewayAuditPage([]));
    });

    it('marca la hora de la última carga terminada', () => {
      store.open('empresa', '');
      expect(store.updatedAt()).toBeNull();
      http.expectOne(page(0)).flush(gatewayAuditPage([auditLog()]));
      flushEffects();
      expect(store.updatedAt()).not.toBeNull();
    });
  });

  describe('estado de la tabla', () => {
    const filters = signal<AuditFilters>(EMPTY_FILTERS);
    let view: AuditViewState;
    const NOW = new Date(2026, 9, 12, 12).getTime();

    const load = (rows: AuditLog[]) => {
      store.open('empresa', '');
      http.expectOne(page(0)).flush(gatewayAuditPage(rows));
      flushEffects();
    };

    beforeEach(() => {
      filters.set(EMPTY_FILTERS);
      view = TestBed.runInInjectionContext(() => new AuditViewState(store, filters, () => NOW));
    });

    it('refleja los eventos filtrados y su recuento', () => {
      load(AUDIT_FIXTURE_LOGS);
      expect(view.status()).toBe('ready');
      expect(view.rows().length).toBe(20);
      expect(view.total()).toBe(20);

      filters.set({ ...EMPTY_FILTERS, kind: 'eliminacion' });
      flushEffects();
      expect(view.rows().length).toBe(2);
      expect(view.total()).toBe(2);
    });

    it('si hay eventos pero los filtros no dejan ninguno sigue «ready» (la tabla dirá «No hay resultados»)', () => {
      load(AUDIT_FIXTURE_LOGS);
      filters.set({ ...EMPTY_FILTERS, kind: 'estado', onlyChanges: true, entityId: 'no-existe' });
      flushEffects();
      expect(view.rows()).toEqual([]);
      expect(view.status()).toBe('ready');
    });

    it('sin eventos en el ámbito está vacía', () => {
      load([]);
      expect(view.status()).toBe('empty');
    });

    it('mientras carga y si falla copia el estado del almacén', () => {
      store.open('empresa', '');
      flushEffects();
      expect(view.status()).toBe('loading');
      http.expectOne(page(0)).flush(null, { status: 500, statusText: 'Server Error' });
      flushEffects();
      expect(view.status()).toBe('error');
      expect(view.error()).not.toBeNull();
      expect(view.error()).not.toBe(FORBIDDEN_MESSAGE);
    });

    it('un 403 se explica con el mensaje de permiso', () => {
      store.open('empresa', '');
      http.expectOne(page(0)).flush(null, { status: 403, statusText: 'Forbidden' });
      flushEffects();
      expect(view.error()).toBe(FORBIDDEN_MESSAGE);
    });

    it('«Reintentar» recarga el almacén', () => {
      load([auditLog()]);
      view.reload();
      http.expectOne(page(0)).flush(gatewayAuditPage([auditLog(), auditLog()]));
      flushEffects();
      expect(view.rows().length).toBe(2);
    });

    it('trabaja sobre todos los eventos en el cliente', () => {
      expect(view.clientSide).toBeTrue();
    });
  });
});
