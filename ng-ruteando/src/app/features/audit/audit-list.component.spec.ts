import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AUDIT_FIXTURE_LOGS, auditLog, gatewayAuditPage, localIso } from '../../../testing/audit';
import { iconButtonsWithoutTitle } from '../../../testing/icon-button-titles';
import { makeUser } from '../../../testing/session';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { AuditLog } from '../../core/api/models';
import { CurrentUser } from '../../core/auth/current-user';
import { UserRole } from '../../core/auth/session.model';

import { AuditListComponent } from './audit-list.component';

const PREFS = ['ruteando-list-view', 'ruteando-density', 'ruteando-audit-tech', 'ruteando-audit-panel'];
const wait = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

describe('AuditListComponent', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  const root = () => harness.routeNativeElement as HTMLElement;
  const page = (n = 0, scope = 'audit-logs') => `/gateway/${scope}?page=${n}&size=100`;
  const cards = () => Array.from(root().querySelectorAll('app-data-table .audit-event')) as HTMLElement[];
  const chip = (text: string) => (Array.from(root().querySelectorAll('button.audit-chip')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === text)!;
  const button = (text: string) => (Array.from(root().querySelectorAll('button, a')) as HTMLElement[]).find((b) => b.textContent?.trim().includes(text))!;
  const url = () => TestBed.inject(Router).url;
  const overlay = () => TestBed.inject(OverlayContainer).getContainerElement();
  const modal = () => overlay().querySelector('app-audit-detail-dialog') as HTMLElement | null;
  const eyes = () => Array.from(root().querySelectorAll('button.audit-eye')) as HTMLButtonElement[];

  async function open(role: UserRole, to = '/auditoria', rows: AuditLog[] | null = AUDIT_FIXTURE_LOGS, scope = 'audit-logs'): Promise<void> {
    TestBed.inject(CurrentUser).set(makeUser({ role }));
    harness = await RouterTestingHarness.create();
    // El router escucha la ubicación simulada: así «atrás» y el cierre de la modal cambian la dirección de verdad
    TestBed.inject(Router).initialNavigation();
    await harness.navigateByUrl(to, AuditListComponent);
    if (rows) {
      http.expectOne(page(0, scope)).flush(gatewayAuditPage(rows));
    }
    await settle();
  }

  /** Abrir la modal descarga su trozo la primera vez: se espera un poco antes de mirar. */
  async function settleModal(): Promise<void> {
    await settle();
    await wait(60);
    await settle();
  }

  async function settle(): Promise<void> {
    TestBed.tick();
    harness.detectChanges();
    await harness.fixture.whenStable();
    TestBed.tick();
    harness.detectChanges();
  }

  beforeEach(() => {
    PREFS.forEach((key) => localStorage.removeItem(key));
    TestBed.configureTestingModule({
      providers: [
        provideLocationMocks(),
        provideRouter([{ path: '', children: [] }, { path: 'auditoria', component: AuditListComponent }, { path: 'paquetes/:id', children: [] }]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    PREFS.forEach((key) => localStorage.removeItem(key));
  });

  describe('según el rol', () => {
    it('un administrador de empresa ve los eventos de su empresa y puede cambiar a su actividad', async () => {
      await open('tenant_admin');
      expect(root().querySelector('h1')?.textContent).toContain('Auditoría');
      expect(root().querySelector('.subtitle')?.textContent).toContain('20 eventos');
      const scopes = Array.from(root().querySelectorAll('.audit-scope-group .mat-button-toggle')).map((el) => el.textContent?.trim());
      expect(scopes).toEqual(['Mi empresa', 'Mi actividad']);
      expect(cards().length).toBe(20);
    });

    it('un agente solo ve su actividad: título «Mi actividad», sin selector, pidiendo /me', async () => {
      await open('agent', '/auditoria', AUDIT_FIXTURE_LOGS, 'audit-logs/me');
      expect(root().querySelector('h1')?.textContent).toContain('Mi actividad');
      expect(root().querySelector('.audit-scope-group')).toBeNull();
      expect(cards().length).toBe(20);
    });

    it('el superadministrador ve todas las empresas y puede limitarlas con el identificador de una', async () => {
      await open('super_admin', '/auditoria', AUDIT_FIXTURE_LOGS, 'audit-logs/admin');
      const scopes = Array.from(root().querySelectorAll('.audit-scope-group .mat-button-toggle')).map((el) => el.textContent?.trim());
      expect(scopes).toEqual(['Todas las empresas', 'Mi actividad']);

      const input = root().querySelector('.audit-tenant input') as HTMLInputElement;
      input.value = 'abc123';
      input.dispatchEvent(new Event('input'));
      (root().querySelector('.audit-tenant button[type=submit]') as HTMLButtonElement).click();
      await settle();

      expect(url()).toContain('empresa=abc123');
      http.expectOne('/gateway/audit-logs/admin?page=0&size=100&tenantId=abc123').flush(gatewayAuditPage(AUDIT_FIXTURE_LOGS.slice(0, 3)));
      await settle();
      expect(cards().length).toBe(3);
    });

    it('«Mi actividad» no ofrece filtrar por persona ni cuenta personas, aunque la dirección lo pida', async () => {
      await open('agent', '/auditoria?persona=ana@example.com', AUDIT_FIXTURE_LOGS, 'audit-logs/me');
      const labels = Array.from(root().querySelectorAll('app-audit-filters mat-label')).map((el) => el.textContent?.trim());
      expect(labels).toEqual(['Tipo de acción']);
      expect(cards().length).toBe(20);
      expect(root().querySelector('app-activity-panel')?.textContent).not.toContain('Persona activa');
    });

    it('un ámbito que el rol no puede consultar se ignora y se abre el suyo', async () => {
      await open('agent', '/auditoria?ambito=todas', AUDIT_FIXTURE_LOGS, 'audit-logs/me');
      expect(cards().length).toBe(20);
    });
  });

  describe('lectura de los eventos', () => {
    it('cada tarjeta muestra solo lo esencial: la acción en español, cuándo, quién y sobre qué tipo de cosa', async () => {
      await open('tenant_admin', '/auditoria', [
        auditLog({ action: 'journey.delete', entityType: 'journey', description: 'Journey eliminado: name=Reparto', actorEmail: 'ana@example.com', actorRole: 'TENANT_ADMIN' }),
      ]);
      const card = cards()[0];
      expect(card.querySelector('app-status-badge')?.textContent).toContain('Jornada eliminada');
      expect(card.textContent).toContain('ana@example.com · Administrador');
      expect(card.textContent).toContain('Jornada');
      expect(card.querySelector('time')).not.toBeNull();
    });

    it('el detalle completo no está en el listado: ni la descripción ni los identificadores', async () => {
      await open('tenant_admin', '/auditoria', [
        auditLog({ action: 'resource.assign.driver', entityType: 'resource', entityId: '6acb99b48275a26dbdf8fcf5', description: 'Driver 6acb99b1a2fa810fb39fb5a9 asignado' }),
      ]);
      expect(cards()[0].textContent).not.toContain('Driver');
      expect(cards()[0].textContent).not.toContain('6acb99b1a2fa810fb39fb5a9');
      expect(cards()[0].textContent).not.toContain('f8fcf5');
    });

    it('sin correo dice «Sin identificar» y con rol anonymous «Anónimo»', async () => {
      await open('tenant_admin', '/auditoria', [
        auditLog({ actorEmail: null, actorRole: 'TENANT_ADMIN' }),
        auditLog({ actorEmail: null, actorRole: 'anonymous' }),
      ]);
      const texts = cards().map((card) => card.textContent);
      expect(texts[0]).toContain('Sin identificar · Administrador');
      expect(texts[1]).toContain('Anónimo');
    });

    it('con los datos técnicos la tarjeta añade la clave de la acción, y sin ellos no', async () => {
      await open('tenant_admin', '/auditoria', [auditLog({ action: 'resource.assign.driver', entityType: 'resource' })]);
      expect(cards()[0].querySelector('.audit-key')).toBeNull();
      (root().querySelectorAll('.audit-switches button[role=switch]')[1] as HTMLButtonElement).click();
      await settle();
      expect(cards()[0].querySelector('.audit-key')?.textContent).toBe('resource.assign.driver');
    });

    it('la tabla tiene solo tres columnas: acción, quién y cuándo', async () => {
      localStorage.setItem('ruteando-list-view', 'table');
      await open('tenant_admin', '/auditoria', [auditLog({ action: 'place.create', entityType: 'place', description: 'Lugar creado: name=Bodega' })]);
      // La columna de acciones tiene un encabezado solo para lectores de pantalla
      const headers = Array.from(root().querySelectorAll('app-data-table th'))
        .map((th) => th.textContent?.trim())
        .filter((text) => text && text !== 'Acciones');
      expect(headers).toEqual(['Acción', 'Quién', 'Cuándo']);
      expect(root().querySelector('app-data-table tbody')?.textContent).toContain('Lugar creado');
      expect(root().querySelector('app-data-table tbody')?.textContent).not.toContain('Bodega');
    });

    it('con los datos técnicos la tabla añade una columna con la clave de la acción', async () => {
      localStorage.setItem('ruteando-list-view', 'table');
      await open('tenant_admin', '/auditoria', [auditLog({ action: 'place.create', entityType: 'place' })]);
      (root().querySelectorAll('.audit-switches button[role=switch]')[1] as HTMLButtonElement).click();
      await settle();
      const headers = Array.from(root().querySelectorAll('app-data-table th')).map((th) => th.textContent?.trim()).filter((text) => text && text !== 'Acciones');
      expect(headers).toEqual(['Acción', 'Quién', 'Cuándo', 'Clave']);
      expect(root().querySelector('app-data-table tbody')?.textContent).toContain('place.create');
    });

    it('con la lista vacía lo dice sin ofrecer crear nada', async () => {
      await open('tenant_admin', '/auditoria', []);
      expect(root().querySelector('app-data-table .state')?.textContent).toContain('Todavía no hay eventos de auditoría');
      expect(root().querySelector('app-data-table a[routerLink]')).toBeNull();
    });
  });

  describe('el ojo y la modal de detalle', () => {
    const one = () => auditLog({ id: 'evento-1', action: 'package.status.change', entityType: 'package', entityId: 'pkg1', description: 'Status cambiado', changes: { before: { status: 'pending' }, after: { status: 'attended' } } });

    it('cada fila de la tabla trae un ojo siempre visible que dice qué evento abre', async () => {
      localStorage.setItem('ruteando-list-view', 'table');
      await open('tenant_admin', '/auditoria', [one(), auditLog()]);
      expect(eyes().length).toBe(2);
      expect(eyes()[0].getAttribute('aria-label')).toContain('Ver el detalle de «Estado de paquete cambiado»');
      expect(eyes()[0].getAttribute('title')).toBe(eyes()[0].getAttribute('aria-label'));
      expect(getComputedStyle(eyes()[0].closest('td')!.firstElementChild as HTMLElement).opacity).toBe('1');
    });

    it('pulsar el ojo abre la modal con el detalle completo y pone el evento en la dirección', async () => {
      localStorage.setItem('ruteando-list-view', 'table');
      await open('tenant_admin', '/auditoria', [one()]);
      eyes()[0].click();
      await settleModal();
      expect(url()).toBe('/auditoria?evento=evento-1');
      expect(modal()).not.toBeNull();
      expect(modal()!.textContent).toContain('Estado de paquete cambiado');
      expect(modal()!.textContent).toContain('Qué cambió');
      expect(modal()!.textContent).toContain('Pendiente');
      expect(modal()!.textContent).toContain('Atendido');
      http.expectNone('/gateway/audit-logs/evento-1');
    });

    it('la tarjeta entera abre la misma modal', async () => {
      await open('tenant_admin', '/auditoria', [one()]);
      cards()[0].click();
      await settleModal();
      expect(url()).toBe('/auditoria?evento=evento-1');
      expect(modal()?.textContent).toContain('Qué cambió');
    });

    it('un enlace con ?evento= abre la modal al terminar de cargar, con el evento que ya se trajo', async () => {
      await open('tenant_admin', '/auditoria?evento=evento-1', null);
      expect(modal()).toBeNull();
      http.expectOne(page(0)).flush(gatewayAuditPage([one(), auditLog()]));
      await settleModal();
      expect(modal()?.textContent).toContain('Estado de paquete cambiado');
      http.expectNone('/gateway/audit-logs/evento-1');
    });

    it('un evento que no está entre los traídos se pide al gateway por su identificador', async () => {
      await open('tenant_admin', '/auditoria?evento=lejano');
      http.expectOne('/gateway/audit-logs/lejano').flush({ ...one(), id: 'lejano', action: 'journey.delete', entityType: 'journey', changes: null });
      await settleModal();
      expect(modal()?.textContent).toContain('Jornada eliminada');
    });

    it('cerrar con el botón quita el evento de la dirección y vuelve a la vista anterior', async () => {
      localStorage.setItem('ruteando-list-view', 'table');
      await open('tenant_admin', '/auditoria?accion=estado', [one()]);
      eyes()[0].click();
      await settleModal();
      expect(url()).toContain('evento=evento-1');
      ((Array.from(overlay().querySelectorAll('mat-dialog-actions button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === 'Cerrar')!).click();
      await wait(50);
      await settleModal();
      expect(url()).toBe('/auditoria?accion=estado');
      expect(modal()).toBeNull();
    });

    it('el botón «atrás» del navegador cierra la modal', async () => {
      await open('tenant_admin', '/auditoria', [one()]);
      cards()[0].click();
      await settleModal();
      expect(modal()).not.toBeNull();
      TestBed.inject(Location).back();
      await wait(50);
      await settleModal();
      expect(url()).toBe('/auditoria');
      expect(modal()).toBeNull();
    });

    it('«Ver eventos de esta entidad» cierra la modal y filtra el listado por esa entidad', async () => {
      await open('tenant_admin', '/auditoria', [one(), auditLog({ entityId: 'otra' })]);
      cards()[0].click();
      await settleModal();
      ((Array.from(overlay().querySelectorAll('mat-dialog-actions button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes('Ver eventos de esta entidad'))!).click();
      await wait(50);
      await settleModal();
      expect(url()).toBe('/auditoria?id=pkg1');
      expect(modal()).toBeNull();
      expect(cards().length).toBe(1);
    });

    it('la modal ofrece otros eventos de la misma entidad de los ya cargados y se puede saltar a uno', async () => {
      const a = auditLog({ id: 'a', action: 'package.create', entityType: 'package', entityId: 'pkg1' });
      const b = auditLog({ id: 'b', action: 'package.status.change', entityType: 'package', entityId: 'pkg1' });
      const c = auditLog({ id: 'c', action: 'place.create', entityType: 'place', entityId: 'lug1' });
      await open('tenant_admin', '/auditoria', [a, b, c]);
      cards()[0].click();
      await settleModal();
      expect(url()).toBe('/auditoria?evento=a');
      const items = () => Array.from(overlay().querySelectorAll('.audit-timeline-item')) as HTMLButtonElement[];
      expect(items().length).toBe(1);
      expect(items()[0].textContent).toContain('Estado de paquete cambiado');

      items()[0].click();
      await wait(50);
      await settleModal();
      expect(url()).toBe('/auditoria?evento=b');
      expect(modal()?.querySelector('h2')?.textContent).toContain('Estado de paquete cambiado');

      // Saltar de evento reemplaza la dirección: un solo «atrás» cierra la modal
      TestBed.inject(Location).back();
      await wait(50);
      await settleModal();
      expect(url()).toBe('/auditoria');
      expect(modal()).toBeNull();
    });

    it('una dirección con un evento inválido no abre nada', async () => {
      await open('tenant_admin', '/auditoria?evento=%3Cscript%3E');
      expect(modal()).toBeNull();
    });
  });

  describe('filtros y dirección de la página', () => {
    it('los filtros de la dirección se aplican al abrirla', async () => {
      await open('tenant_admin', '/auditoria?accion=eliminacion');
      expect(cards().length).toBe(2);
      expect(root().querySelector('.subtitle')?.textContent).toContain('2 de 20 eventos');
    });

    it('elegir un rango escribe la dirección y lo marca como elegido', async () => {
      await open('tenant_admin');
      chip('7 días').click();
      await settle();
      expect(url()).toContain('rango=7d');
      expect(chip('7 días').getAttribute('aria-pressed')).toBe('true');
      expect(chip('Todo').getAttribute('aria-pressed')).toBe('false');
    });

    it('«Personalizado» se abre ya aplicado con los últimos siete días y pide las dos fechas', async () => {
      await open('tenant_admin');
      chip('Personalizado').click();
      await settle();
      expect(url()).toMatch(/desde=\d{4}-\d{2}-\d{2}&hasta=\d{4}-\d{2}-\d{2}/);
      expect(root().querySelectorAll('.audit-dates input[type=date]').length).toBe(2);
    });

    it('un inicio posterior al fin se avisa y no se aplica', async () => {
      await open('tenant_admin', '/auditoria?desde=2026-10-05&hasta=2026-10-07');
      const from = root().querySelectorAll('.audit-dates input[type=date]')[0] as HTMLInputElement;
      from.value = '2026-10-20';
      from.dispatchEvent(new Event('change'));
      await settle();
      expect(root().querySelector('.audit-error')?.textContent).toContain('El inicio no puede ser posterior al fin');
      expect(url()).toContain('desde=2026-10-05');
    });

    it('«Limpiar filtros» solo aparece con filtros y lo deja todo como al empezar', async () => {
      await open('tenant_admin');
      expect(button('Limpiar filtros')).toBeUndefined();
      chip('30 días').click();
      await settle();
      button('Limpiar filtros').click();
      await settle();
      expect(url()).toBe('/auditoria');
      expect(button('Limpiar filtros')).toBeUndefined();
    });

    it('«solo con cambios de valores» deja los eventos que cambian algo', async () => {
      await open('tenant_admin');
      (root().querySelector('.audit-switches button[role=switch]') as HTMLButtonElement).click();
      await settle();
      expect(url()).toContain('cambios=1');
      expect(cards().length).toBe(4);
    });

    it('el historial de una entidad filtra por su identificador y se puede quitar', async () => {
      await open('tenant_admin', '/auditoria?id=6acb99b48275a26dbdf8fcf5');
      expect(cards().length).toBe(5);
      const remove = root().querySelector('button[aria-label="Quitar el filtro de entidad"]') as HTMLButtonElement;
      expect(remove.textContent).toContain('Vehículo');
      remove.click();
      await settle();
      expect(cards().length).toBe(20);
    });

    it('un valor inválido en la dirección se ignora y el resto se aplica', async () => {
      await open('tenant_admin', '/auditoria?rango=1000d&accion=eliminacion&desde=2026-02-31');
      expect(cards().length).toBe(2);
    });

    it('el chip de entidad lleva su recuento y escribe la dirección', async () => {
      await open('tenant_admin');
      const chips = Array.from(root().querySelectorAll('app-data-table .chip')).map((c) => c.textContent?.replace(/\s+/g, ' ').trim());
      expect(chips[0]).toBe('Todos 20');
      expect(chips).toContain('Vehículo 5');
      (Array.from(root().querySelectorAll('app-data-table .chip')).find((c) => c.textContent?.includes('Vehículo')) as HTMLButtonElement).click();
      await settle();
      expect(url()).toContain('entidad=resource');
      expect(cards().length).toBe(5);
    });

    it('la búsqueda se escribe en la dirección al dejar de teclear', async () => {
      await open('tenant_admin');
      const input = root().querySelector('app-data-table input[type=search]') as HTMLInputElement;
      input.value = 'paquete';
      input.dispatchEvent(new Event('input'));
      await settle();
      expect(url()).not.toContain('q=');
      await wait(320);
      await settle();
      expect(url()).toContain('q=paquete');
    });

    it('abrir una dirección con búsqueda la deja escrita en el campo', async () => {
      await open('tenant_admin', '/auditoria?q=paquete');
      expect((root().querySelector('app-data-table input[type=search]') as HTMLInputElement).value).toBe('paquete');
      expect(cards().length).toBeGreaterThan(0);
      expect(cards().length).toBeLessThan(20);
      expect(cards().every((card) => /paquete/i.test(card.textContent ?? ''))).toBeTrue();
    });
  });

  describe('avisos y errores', () => {
    it('avisa cuando hay más eventos de los que se traen', async () => {
      TestBed.inject(CurrentUser).set(makeUser({ role: 'tenant_admin' }));
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/auditoria', AuditListComponent);
      for (let n = 0; n < 10; n++) {
        http.expectOne(page(n)).flush(gatewayAuditPage(Array.from({ length: 100 }, () => auditLog()), 1500, n));
      }
      await settle();
      expect(root().querySelector('.audit-notice')?.textContent).toContain('Se muestran los 1000 eventos más recientes de 1500');
    });

    it('un 403 se explica y ofrece ver la propia actividad, que carga sus eventos', async () => {
      await open('tenant_admin', '/auditoria', null);
      http.expectOne(page(0)).flush(null, { status: 403, statusText: 'Forbidden' });
      await settle();
      expect(root().querySelector('.audit-notice.warn')?.textContent).toContain('Tu rol no puede consultar estos eventos');
      expect(root().querySelector('app-data-table .state.error')?.textContent).toContain('No tienes permiso para ver este registro de auditoría');

      button('Ver mi actividad').click();
      await settle();
      expect(url()).toContain('ambito=mia');
      http.expectOne(page(0, 'audit-logs/me')).flush(gatewayAuditPage(AUDIT_FIXTURE_LOGS.slice(0, 2)));
      await settle();
      expect(cards().length).toBe(2);
    });

    it('un fallo del gateway conserva los filtros y se puede reintentar', async () => {
      await open('tenant_admin', '/auditoria?accion=eliminacion', null);
      http.expectOne(page(0)).flush(null, { status: 500, statusText: 'Server Error' });
      await settle();
      const retry = (Array.from(root().querySelectorAll('app-data-table button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === 'Reintentar')!;
      expect(url()).toContain('accion=eliminacion');
      retry.click();
      http.expectOne(page(0)).flush(gatewayAuditPage(AUDIT_FIXTURE_LOGS));
      await settle();
      expect(cards().length).toBe(2);
    });

    it('«Actualizar» vuelve a pedir los eventos', async () => {
      await open('tenant_admin');
      button('Actualizar').click();
      http.expectOne(page(0)).flush(gatewayAuditPage(AUDIT_FIXTURE_LOGS.slice(0, 5)));
      await settle();
      expect(cards().length).toBe(5);
    });
  });

  describe('exportación', () => {
    let blobs: Blob[];

    beforeEach(() => {
      blobs = [];
      spyOn(URL, 'createObjectURL').and.callFake((blob: Blob | MediaSource) => {
        blobs.push(blob as Blob);
        return 'blob:prueba';
      });
      spyOn(URL, 'revokeObjectURL');
      spyOn(HTMLAnchorElement.prototype, 'click').and.stub();
    });

    it('exporta a CSV lo que dejan los filtros, no solo la página', async () => {
      await open('tenant_admin', '/auditoria?accion=eliminacion');
      button('Exportar CSV').click();
      await settle();
      expect(blobs.length).toBe(1);
      const text = await blobs[0].text();
      expect(text.split('\r\n').filter(Boolean).length).toBe(3);
      expect(text).toContain('journey.delete');
    });

    it('con 50 eventos y páginas de 20 exporta los 50', async () => {
      await open('tenant_admin', '/auditoria', Array.from({ length: 50 }, (_, i) => auditLog({ description: `Evento ${i}` })));
      button('Exportar CSV').click();
      const text = await blobs[0].text();
      expect(text.split('\r\n').filter(Boolean).length).toBe(51);
    });

    it('con la lista vacía el botón está desactivado', async () => {
      await open('tenant_admin', '/auditoria', []);
      expect((button('Exportar CSV') as HTMLButtonElement).disabled).toBeTrue();
    });
  });

  describe('seguridad y accesibilidad', () => {
    it('muestra como texto lo que trae el gateway, sin interpretarlo como HTML', async () => {
      await open('tenant_admin', '/auditoria', [auditLog({ actorEmail: '<img src=x onerror=alert(1)><b>negrita</b>@x.com' })]);
      expect(root().querySelector('app-data-table img')).toBeNull();
      expect(Array.from(root().querySelectorAll('app-data-table b')).some((b) => b.textContent === 'negrita')).toBeFalse();
      expect(cards()[0].textContent).toContain('<img src=x onerror=alert(1)>');
    });

    it('los botones de solo icono llevan título', async () => {
      localStorage.setItem('ruteando-list-view', 'table');
      await open('tenant_admin');
      expect(root().querySelectorAll('.mat-mdc-icon-button').length).toBeGreaterThan(1);
      expect(iconButtonsWithoutTitle(root())).toEqual([]);
    });

    it('anuncia con una región educada cuántos eventos quedan al cambiar los filtros', async () => {
      await open('tenant_admin');
      const live = () => root().querySelector('.visually-hidden[role=status][aria-live=polite]')?.textContent?.trim();
      expect(live()).toBe('20 eventos');
      (root().querySelector('.audit-switches button[role=switch]') as HTMLButtonElement).click();
      await settle();
      expect(live()).toBe('4 de 20 eventos');
    });

    it('los filtros tienen nombre accesible', async () => {
      await open('tenant_admin');
      expect(root().querySelector('[role=group][aria-labelledby=audit-range-label]')).not.toBeNull();
      expect(root().querySelector('mat-select')?.closest('mat-form-field')?.textContent).toContain('Tipo de acción');
      expect(root().querySelector('app-data-table input[type=search]')?.getAttribute('aria-label')).toBe('Buscar por acción o persona');
    });
  });

  describe('fechas', () => {
    it('los eventos de hoy y de ayer se separan en el rango «24 horas»', async () => {
      const now = Date.now();
      await open('tenant_admin', '/auditoria?rango=24h', [
        auditLog({ id: 'a', createdAt: new Date(now - 3_600_000).toISOString() }),
        auditLog({ id: 'b', createdAt: new Date(now - 48 * 3_600_000).toISOString() }),
        auditLog({ id: 'c', createdAt: localIso(2020, 1, 1) }),
      ]);
      expect(cards().length).toBe(1);
    });
  });
});
