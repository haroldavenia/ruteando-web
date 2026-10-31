import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { Fixture, respondWith } from '../../../testing/api-testing';
import { auditLog } from '../../../testing/audit';
import { iconButtonsWithoutTitle } from '../../../testing/icon-button-titles';
import { makeUser } from '../../../testing/session';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { AuditLog } from '../../core/api/models';
import { CurrentUser } from '../../core/auth/current-user';
import { UserRole } from '../../core/auth/session.model';

import { AuditDetailData, AuditDetailDialogComponent, AuditDetailResult, DIRECT_FORBIDDEN, EVENT_GONE } from './audit-detail-dialog.component';

import one from '../../../testing/fixtures/gateway/get__audit-logs__id.json';

describe('AuditDetailDialogComponent', () => {
  let http: HttpTestingController;
  let ref: MatDialogRef<AuditDetailDialogComponent, AuditDetailResult>;
  let overlay: HTMLElement;
  const root = () => overlay.querySelector('app-audit-detail-dialog') as HTMLElement;
  const text = () => root().textContent?.replace(/\s+/g, ' ') ?? '';
  const fact = (label: string) => (Array.from(root().querySelectorAll('.audit-facts dt')).find((dt) => dt.textContent?.trim() === label)?.nextElementSibling?.textContent ?? '').replace(/ +/g, ' ').trim();
  const link = (label: string) => (Array.from(root().querySelectorAll('a')) as HTMLAnchorElement[]).find((a) => a.textContent?.includes(label));
  const action = (label: string) => (Array.from(root().querySelectorAll('mat-dialog-actions button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes(label));
  const settle = async () => {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 20));
    TestBed.tick();
  };

  async function open(data: AuditDetailData, role: UserRole = 'tenant_admin'): Promise<void> {
    TestBed.inject(CurrentUser).set(makeUser({ role }));
    ref = TestBed.inject(MatDialog).open(AuditDetailDialogComponent, { data, width: '760px' });
    await settle();
  }

  const changed = (): AuditLog =>
    auditLog({
      id: 'e1',
      action: 'package.status.change',
      entityType: 'package',
      entityId: 'pkg1',
      description: 'Status de paquete cambiado: pending -> attended',
      actorEmail: 'ana@example.com',
      actorRole: 'TENANT_ADMIN',
      changes: { before: { status: 'pending' }, after: { status: 'attended' } },
      ipAddress: '172.18.0.1',
    });
  const withLog = (log: AuditLog, related?: AuditDetailData['related']): AuditDetailData => ({ id: log.id, log, related });

  beforeEach(() => {
    localStorage.removeItem('ruteando-audit-tech');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'paquetes/:id', children: [] },
          { path: 'lugares/:id', children: [] },
        ]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
  });

  afterEach(() => {
    ref?.close();
    http.verify();
    localStorage.removeItem('ruteando-audit-tech');
  });

  describe('con el evento ya a mano', () => {
    it('aparece de inmediato, sin pedirlo al gateway, con la acción como título', async () => {
      await open(withLog(changed()));
      http.expectNone(() => true);
      expect(root().querySelector('h2[mat-dialog-title]')?.textContent).toContain('Estado de paquete cambiado');
      expect(text()).toContain('Cambio de estado');
    });

    it('dice la frase, quién, cuándo y sobre qué', async () => {
      await open(withLog(changed()));
      expect(root().querySelector('.audit-quote')?.textContent).toContain('Status de paquete cambiado: pending -> attended');
      expect(fact('Quién')).toContain('ana@example.com');
      expect(fact('Quién')).toContain('Administrador');
      expect(fact('Cuándo')).toContain('octubre de 2026');
      expect(fact('Sobre')).toContain('Paquete');
      expect(fact('Desde la IP')).toContain('172.18.0.1');
    });

    it('no repite la frase si dice lo mismo que el título', async () => {
      await open(withLog(auditLog({ id: 'e2', action: 'invitation.created', entityType: 'invitation', description: 'invitation.created' })));
      expect(root().querySelector('.audit-quote')).toBeNull();
    });

    it('abrevia los identificadores largos de la frase', async () => {
      await open(withLog(auditLog({ id: 'e3', action: 'resource.assign.driver', entityType: 'resource', description: 'Driver 6acb99b1a2fa810fb39fb5a9 asignado' })));
      expect(root().querySelector('.audit-quote')?.textContent).toContain('Driver #9fb5a9 asignado');
    });

    it('un evento de la actividad propia no muestra la dirección IP', async () => {
      await open(withLog({ ...changed(), ipAddress: undefined }));
      expect(text()).not.toContain('Desde la IP');
    });
  });

  describe('presentación', () => {
    const head = () => root().querySelector('.audit-modal-head') as HTMLElement;
    const tone = () => root().getAttribute('data-tone');

    it('la cabecera lleva el tono, el glifo y el tipo de la acción', async () => {
      await open(withLog(changed()));
      expect(tone()).toBe('warning');
      expect(head().querySelector('.audit-modal-icon mat-icon')?.textContent).toBe('published_with_changes');
      expect(head().querySelector('.audit-modal-kind')?.textContent).toBe('Cambio de estado');
      expect(head().querySelector('.audit-modal-when')?.textContent).toMatch(/hace/);
    });

    it('cada tipo de acción tiene su tono', async () => {
      for (const [action, expected] of [['journey.delete', 'danger'], ['place.create', 'success'], ['place.update', 'info'], ['notification.push_registered', 'neutral']] as const) {
        await open(withLog(auditLog({ id: action, action, entityType: 'place' })));
        expect(root().getAttribute('data-tone')).withContext(action).toBe(expected);
        ref.close();
      }
    });

    it('el avatar lleva las iniciales de quien actuó y, sin correo, un icono', async () => {
      await open(withLog(auditLog({ id: 'av1', actorEmail: 'ana.martinez@x.com' })));
      expect(root().querySelector('.audit-avatar')?.textContent?.trim()).toBe('AM');
      ref.close();
      await open(withLog(auditLog({ id: 'av2', actorEmail: null, actorRole: 'anonymous' })));
      expect(root().querySelector('.audit-avatar')?.textContent?.trim()).toBe('person');
      expect(fact('Quién')).toContain('Anónimo');
    });

    it('mientras carga y si falla la cabecera es neutra', async () => {
      await open({ id: 'x', log: null });
      expect(tone()).toBe('neutral');
      expect(head().querySelector('.audit-modal-kind')?.textContent).toBe('Auditoría');
      http.expectOne('/gateway/audit-logs/x').flush(null, { status: 404, statusText: 'Not Found' });
      await settle();
      expect(tone()).toBe('neutral');
    });
  });

  describe('más de esta entidad', () => {
    const others = () => [
      auditLog({ id: 'o1', action: 'package.create', entityType: 'package', entityId: 'pkg1', actorEmail: 'luis@x.com' }),
      auditLog({ id: 'o2', action: 'package.status.change', entityType: 'package', entityId: 'pkg1', actorEmail: null }),
    ];
    const items = () => Array.from(root().querySelectorAll('.audit-timeline-item')) as HTMLButtonElement[];

    it('muestra otros eventos de la misma entidad con su tipo, quién y hace cuánto', async () => {
      await open(withLog(changed(), () => others()));
      expect(root().querySelector('#audit-related-title')?.textContent).toContain('Más de esta entidad');
      expect(items().length).toBe(2);
      expect(items()[0].textContent).toContain('Paquete creado');
      expect(items()[0].textContent).toContain('luis@x.com');
      expect(items()[1].textContent).toContain('Sin identificar');
      expect(root().querySelector('.audit-dot[data-tone="success"]')).not.toBeNull();
    });

    it('recibe el evento abierto para elegir cuáles mostrar', async () => {
      const seen: AuditLog[] = [];
      await open(withLog(changed(), (log) => {
        seen.push(log);
        return [];
      }));
      expect(seen[0].id).toBe('e1');
    });

    it('muestra como mucho cinco', async () => {
      const many = Array.from({ length: 9 }, (_, i) => auditLog({ id: `m${i}`, entityId: 'pkg1' }));
      await open(withLog(changed(), () => many));
      expect(items().length).toBe(5);
    });

    it('sin otros eventos no hay línea de tiempo', async () => {
      await open(withLog(changed(), () => []));
      expect(root().querySelector('app-audit-related')).toBeNull();
    });

    it('sin la función de eventos relacionados tampoco', async () => {
      await open(withLog(changed()));
      expect(root().querySelector('app-audit-related')).toBeNull();
    });

    it('elegir uno cierra la modal pidiendo abrir ese evento', async () => {
      await open(withLog(changed(), () => others()));
      const closed = ref.afterClosed().toPromise();
      items()[1].click();
      expect(await closed).toEqual({ eventId: 'o2' });
    });

    it('cada evento de la línea de tiempo se nombra para quien no lo ve', async () => {
      await open(withLog(changed(), () => others()));
      expect(items()[0].getAttribute('aria-label')).toMatch(/^Abrir: Paquete creado, luis@x.com, /);
    });
  });

  describe('qué cambió', () => {
    it('muestra el campo que cambió con su antes y su después, marcado con un texto además del color', async () => {
      await open(withLog(changed()));
      const row = root().querySelector('.audit-changes li') as HTMLElement;
      expect(row.classList).toContain('changed');
      expect(row.textContent).toContain('Estado');
      expect(row.textContent).toContain('Cambió');
      expect(row.querySelector('.audit-old')?.textContent).toBe('Pendiente');
      expect(row.querySelector('.audit-new')?.textContent).toBe('Atendido');
      expect(Array.from(row.querySelectorAll('small')).map((el) => el.textContent?.trim())).toEqual(['Antes', 'Después']);
    });

    it('los valores vacíos se leen «(vacío)»', async () => {
      await open(withLog(auditLog({ id: 'e4', changes: { before: { driverId: '' }, after: { driverId: '6acb99b1a2fa810fb39fb5a9' } } })));
      const before = root().querySelector('.audit-flow .audit-before') as HTMLElement;
      expect(before.textContent).toContain('(vacío)');
      expect(before.classList).toContain('is-empty');
      expect(root().querySelector('.audit-old')).toBeNull();
    });

    it('antes y después idénticos: lo dice y no resalta nada', async () => {
      await open(withLog(auditLog({ id: 'e5', action: 'settings.update', entityType: 'settings', changes: { before: { name: 'A' }, after: { name: 'A' } } })));
      expect(text()).toContain('El evento no registra cambios de valores');
      expect(root().querySelector('.audit-changes li.changed')).toBeNull();
      expect(root().querySelectorAll('.audit-changes li').length).toBe(1);
    });

    it('sin changes dice que no registra valores y no hay lista', async () => {
      await open(withLog(auditLog({ id: 'e6', changes: null })));
      expect(text()).toContain('Este evento no registra valores.');
      expect(root().querySelector('.audit-changes')).toBeNull();
    });

    it('los campos que cambiaron van primero', async () => {
      await open(withLog(auditLog({ id: 'e7', changes: { before: { a: 1, b: 2 }, after: { a: 1, b: 3 } } })));
      const names = Array.from(root().querySelectorAll('.audit-field b')).map((b) => b.textContent?.trim());
      expect(names).toEqual(['b', 'a']);
    });

    it('un objeto o una lista se muestra como JSON compacto', async () => {
      await open(withLog(auditLog({ id: 'e8', changes: { before: {}, after: { zonas: [1, 2], punto: { x: 1 } } } })));
      const cells = Array.from(root().querySelectorAll('.audit-new')).map((el) => el.textContent?.trim());
      expect(cells).toEqual(['[1,2]', '{"x":1}']);
    });
  });

  describe('acciones', () => {
    it('enlaza a la pantalla de la entidad y cierra la modal al ir', async () => {
      await open(withLog(changed()));
      const open_ = link('Abrir paquete')!;
      expect(open_.getAttribute('href')).toBe('/paquetes/pkg1');
      const closed = ref.afterClosed().toPromise();
      open_.click();
      await closed;
    });

    it('una eliminación no enlaza y lo dice', async () => {
      await open(withLog(auditLog({ id: 'e9', action: 'journey.delete', entityType: 'journey' })));
      expect(link('Abrir jornada')).toBeUndefined();
      expect(text()).toContain('Esta entidad fue eliminada');
    });

    it('una entidad sin pantalla propia no enlaza ni dice que se eliminó', async () => {
      await open(withLog(auditLog({ id: 'e10', action: 'user.updated', entityType: 'user' })));
      expect(root().querySelector('mat-dialog-actions a')).toBeNull();
      expect(text()).not.toContain('fue eliminada');
    });

    it('el agente solo recibe enlaces a lo que puede abrir', async () => {
      await open(withLog(auditLog({ id: 'e11', action: 'place.update', entityType: 'place', entityId: 'lug1' })), 'agent');
      expect(link('Abrir lugar')).toBeUndefined();
      ref.close();
      await open(withLog(changed()), 'agent');
      expect(link('Abrir paquete')).toBeDefined();
    });

    it('«Ver eventos de esta entidad» cierra la modal con el identificador de la entidad', async () => {
      await open(withLog(changed()));
      const closed = ref.afterClosed().toPromise();
      action('Ver eventos de esta entidad')!.click();
      expect(await closed).toEqual({ entityId: 'pkg1' });
    });

    it('«Cerrar» y la equis cierran sin resultado', async () => {
      await open(withLog(changed()));
      let closed = ref.afterClosed().toPromise();
      action('Cerrar')!.click();
      expect(await closed).toBeUndefined();

      await open(withLog(changed()));
      closed = ref.afterClosed().toPromise();
      (root().querySelector('.audit-modal-head button') as HTMLButtonElement).click();
      expect(await closed).toBeUndefined();
    });
  });

  describe('sin el evento (enlace directo)', () => {
    it('lo pide por su identificador y muestra la carga mientras llega', async () => {
      await open({ id: '6acb99b6a2fa810fb39fb5c5', log: null });
      expect(text()).toContain('Cargando el evento');
      respondWith(http.expectOne('/gateway/audit-logs/6acb99b6a2fa810fb39fb5c5'), one as unknown as Fixture);
      await settle();
      expect(root().querySelector('h2')?.textContent).toContain('Jornada eliminada');
      expect(text()).toContain('Esta entidad fue eliminada');
    });

    it('un evento inexistente (404) se explica sin enseñar el cuerpo del servidor', async () => {
      await open({ id: 'no-existe', log: null });
      http.expectOne('/gateway/audit-logs/no-existe').flush(null, { status: 404, statusText: 'Not Found' });
      await settle();
      expect(root().querySelector('[role=alert]')?.textContent).toContain(EVENT_GONE);
      expect(text()).not.toContain('Not Found');
      expect(root().querySelector('h2')?.textContent).toContain('No se pudo abrir el evento');
    });

    it('sin permiso para abrirlo directamente (403) lo explica', async () => {
      await open({ id: 'prohibido', log: null }, 'agent');
      http.expectOne('/gateway/audit-logs/prohibido').flush(null, { status: 403, statusText: 'Forbidden' });
      await settle();
      expect(root().querySelector('[role=alert]')?.textContent).toContain(DIRECT_FORBIDDEN);
    });

    it('un fallo del gateway no enseña su cuerpo', async () => {
      await open({ id: 'x', log: null });
      http.expectOne('/gateway/audit-logs/x').flush({ secreto: 'detalle interno' }, { status: 500, statusText: 'Server Error' });
      await settle();
      expect(text()).not.toContain('detalle interno');
      expect(root().querySelector('[role=alert]')).not.toBeNull();
    });
  });

  describe('datos técnicos', () => {
    const details = () => root().querySelector('details.audit-tech') as HTMLDetailsElement;

    it('quedan plegados y traen claves, identificadores, instante UTC, descripción original y JSON', async () => {
      await open(withLog(changed()));
      expect(details().open).toBeFalse();
      const tech = details().textContent?.replace(/\s+/g, ' ') ?? '';
      expect(tech).toContain('package.status.change');
      expect(tech).toContain('pkg1');
      expect(tech).toContain('TENANT_ADMIN');
      expect(tech).toContain('Status de paquete cambiado: pending -> attended');
      expect(tech).toContain(new Date(changed().createdAt).toISOString());
      expect(details().querySelector('.audit-json')?.textContent).toContain('"status": "pending"');
    });

    it('se abren solos si la persona prefiere ver los datos técnicos', async () => {
      localStorage.setItem('ruteando-audit-tech', 'on');
      await open(withLog(changed()));
      expect(details().open).toBeTrue();
    });

    it('sin changes no hay bloque de JSON', async () => {
      await open(withLog(auditLog({ id: 'e12', changes: null })));
      expect(details().querySelector('.audit-json')).toBeNull();
    });
  });

  describe('copiar', () => {
    const copyButton = (label: string) => root().querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;
    const wait = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

    it('copia el identificador y avisa', async () => {
      const write = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
      await open(withLog(changed()));
      copyButton('Copiar el identificador del evento').click();
      await wait();
      expect(write).toHaveBeenCalledOnceWith('e1');
      expect(overlay.textContent).toContain('Identificador copiado');
    });

    it('copia el enlace de la pantalla (el que lleva ?evento=)', async () => {
      const write = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
      await open(withLog(changed()));
      action('Copiar enlace')!.click();
      await wait();
      expect(write).toHaveBeenCalledOnceWith(window.location.href);
      expect(overlay.textContent).toContain('Enlace copiado');
    });

    it('si el navegador no deja copiar, el aviso trae el texto para copiarlo a mano', async () => {
      spyOn(navigator.clipboard, 'writeText').and.rejectWith(new Error('bloqueado'));
      await open(withLog(changed()));
      copyButton('Copiar el identificador de la entidad').click();
      await wait();
      expect(overlay.textContent).toContain('No se pudo copiar automáticamente');
      expect(overlay.textContent).toContain('pkg1');
    });
  });

  describe('seguridad y accesibilidad', () => {
    it('muestra como texto lo que trae el gateway, sin interpretarlo como HTML', async () => {
      await open(
        withLog(
          auditLog({
            id: 'xss',
            description: '<img src=x onerror=alert(1)> y <b>negrita</b>',
            actorEmail: '"><script>alert(2)</script>@x.com',
            changes: { before: { nombre: '<script>alert(3)</script>' }, after: { nombre: '<iframe src=javascript:alert(4)>' } },
          }),
        ),
      );
      expect(root().querySelector('img, script, iframe')).toBeNull();
      expect(Array.from(root().querySelectorAll('b')).some((b) => b.textContent === 'negrita')).toBeFalse();
      expect(text()).toContain('<img src=x onerror=alert(1)>');
      expect(text()).toContain('<script>alert(3)</script>');
      expect(root().querySelector('.audit-json')?.textContent).toContain('<iframe src=javascript:alert(4)>');
    });

    it('los botones de solo icono llevan título', async () => {
      await open(withLog(changed()));
      expect(root().querySelectorAll('.mat-mdc-icon-button').length).toBeGreaterThan(1);
      expect(iconButtonsWithoutTitle(root())).toEqual([]);
    });

    it('la modal se nombra con su título y tiene encabezados para quien navega por ellos', async () => {
      await open(withLog(changed()));
      const dialog = overlay.querySelector('[role=dialog]') as HTMLElement;
      expect(dialog.getAttribute('aria-labelledby')).toBe(root().querySelector('h2')?.id ?? null);
      expect(Array.from(root().querySelectorAll('h3')).map((h) => h.textContent?.trim())).toEqual(['Qué cambió']);
      ref.close();
      await settle();
      await open(withLog(changed(), () => [auditLog({ id: 'o9', entityId: 'pkg1' })]));
      expect(Array.from(root().querySelectorAll('h3')).map((h) => h.textContent?.trim())).toEqual(['Qué cambió', 'Más de esta entidad']);
    });
  });
});
