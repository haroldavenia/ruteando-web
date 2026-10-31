import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AUDIT_FIXTURE_LOGS, auditLog, localIso } from '../../../testing/audit';
import { AuditLog } from '../../core/api/models';

import { ActivityPanelComponent, PickedDays } from './activity-panel.component';
import { EMPTY_FILTERS } from './audit-filters';
import { AuditKind } from './audit-labels';

const KEY = 'ruteando-audit-panel';

describe('ActivityPanelComponent', () => {
  let fixture: ComponentFixture<ActivityPanelComponent>;
  const root = () => fixture.nativeElement as HTMLElement;
  const kpis = () => Array.from(root().querySelectorAll('.kpi')).map((el) => `${el.querySelector('.num')?.textContent?.trim()} ${el.querySelector('.lbl')?.textContent?.trim()}`);
  const bars = () => Array.from(root().querySelectorAll('button.audit-bar')) as HTMLButtonElement[];
  const legend = () => Array.from(root().querySelectorAll('button.audit-legend-item')) as HTMLButtonElement[];

  const setup = (rows: readonly AuditLog[], filters = EMPTY_FILTERS) => {
    fixture = TestBed.createComponent(ActivityPanelComponent);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('filters', filters);
    fixture.detectChanges();
  };

  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => localStorage.removeItem(KEY));

  describe('cifras', () => {
    it('cuenta eventos, personas, lo más modificado y el último evento', () => {
      setup(AUDIT_FIXTURE_LOGS);
      const text = kpis();
      expect(text[0]).toContain('20 Eventos');
      expect(text[1]).toContain('1 Persona activa');
      expect(text[2]).toContain('Vehículo · 5');
      expect(text[2]).toContain('Lo más modificado');
      expect(text[3]).toContain('Último evento');
    });

    it('no cuenta como persona a quien no trae correo', () => {
      setup([auditLog({ actorEmail: null }), auditLog({ actorEmail: 'a@x.com' }), auditLog({ actorEmail: 'b@x.com' })]);
      expect(kpis()[1]).toContain('2 Personas activas');
    });

    it('en «Mi actividad» no cuenta personas: serían siempre la misma', () => {
      setup(AUDIT_FIXTURE_LOGS);
      fixture.componentRef.setInput('showPeople', false);
      fixture.detectChanges();
      expect(kpis().length).toBe(3);
      expect(kpis().some((text) => text.includes('Persona'))).toBeFalse();
    });

    it('sin eventos muestra ceros, rayas y no revienta', () => {
      setup([]);
      expect(kpis()[0]).toContain('0 Eventos');
      expect(kpis()[2]).toContain('—');
      expect(kpis()[3]).toContain('—');
      expect(root().textContent).toContain('No hay eventos para resumir con estos filtros');
    });

    it('se recalcula cuando cambian los eventos', () => {
      setup(AUDIT_FIXTURE_LOGS);
      fixture.componentRef.setInput('rows', AUDIT_FIXTURE_LOGS.slice(0, 3));
      fixture.detectChanges();
      expect(kpis()[0]).toContain('3 Eventos');
    });
  });

  describe('actividad por día', () => {
    const week = () => {
      const day = (offset: number, hour = 10) => {
        const d = new Date();
        d.setDate(d.getDate() - offset);
        d.setHours(hour, 0, 0, 0);
        return d.toISOString();
      };
      return [auditLog({ createdAt: day(0, 8) }), auditLog({ createdAt: day(0, 9) }), auditLog({ createdAt: day(3) })];
    };

    it('«7 días» son siete barras y la de hoy es parcial', () => {
      setup(week(), { ...EMPTY_FILTERS, range: '7d' });
      expect(bars().length).toBe(7);
      expect(bars()[6].classList).toContain('partial');
      expect(bars()[0].classList).not.toContain('partial');
    });

    it('cada barra dice su día y su cantidad (y el día vacío, cero)', () => {
      setup(week(), { ...EMPTY_FILTERS, range: '7d' });
      expect(bars()[6].getAttribute('title')).toContain('2 eventos');
      expect(bars()[6].getAttribute('title')).toContain('hoy');
      expect(bars()[3].getAttribute('title')).toContain('1 evento');
      expect(bars()[0].getAttribute('title')).toContain('0 eventos');
      expect(bars()[0].getAttribute('aria-label')).toBe(bars()[0].getAttribute('title'));
    });

    it('elegir una barra avisa de su día', () => {
      setup(week(), { ...EMPTY_FILTERS, range: '7d' });
      const picked: PickedDays[] = [];
      fixture.componentInstance.dayPicked.subscribe((days) => picked.push(days));
      bars()[6].click();
      expect(picked.length).toBe(1);
      expect(picked[0].from).toBe(picked[0].to);
    });

    it('la barra del día elegido queda marcada', () => {
      setup(week(), { ...EMPTY_FILTERS, range: '7d' });
      let picked!: PickedDays;
      fixture.componentInstance.dayPicked.subscribe((days) => (picked = days));
      bars()[6].click();
      fixture.componentRef.setInput('filters', { ...EMPTY_FILTERS, range: 'personalizado', from: picked.from, to: picked.to });
      fixture.detectChanges();
      expect(bars().filter((bar) => bar.getAttribute('aria-pressed') === 'true').length).toBe(1);
    });

    it('con pocas barras pone el número encima y con muchas lo deja en el título', () => {
      setup(week(), { ...EMPTY_FILTERS, range: '7d' });
      expect(Array.from(root().querySelectorAll('.audit-value')).map((el) => el.textContent?.trim())).toEqual(['1', '2']);
      fixture.componentRef.setInput('filters', { ...EMPTY_FILTERS, range: '30d' });
      fixture.detectChanges();
      expect(root().querySelectorAll('.audit-value').length).toBe(0);
      expect(bars().length).toBe(30);
    });

    it('más de 31 días se agrupan por semana y lo dice', () => {
      setup([auditLog({ createdAt: localIso(2026, 1, 5) }), auditLog()], EMPTY_FILTERS);
      expect(root().querySelector('figcaption')?.textContent).toContain('Eventos por semana');
      expect(bars().every((bar) => bar.getAttribute('title')?.startsWith('Semana del'))).toBeTrue();
    });

    it('el resumen en texto dice el total y el día con más actividad', () => {
      setup(week(), { ...EMPTY_FILTERS, range: '7d' });
      const summary = root().querySelector('#audit-bars-summary')?.textContent ?? '';
      expect(summary).toContain('3 eventos en 7 días');
      expect(summary).toContain('con 2');
    });

    it('la tabla alternativa trae un día por fila y un botón para elegirlo', () => {
      setup(week(), { ...EMPTY_FILTERS, range: '7d' });
      const rows = Array.from(root().querySelectorAll('.audit-table-toggle tbody tr'));
      expect(rows.length).toBe(7);
      expect(rows[6].textContent).toContain('(hoy)');
      const picked: PickedDays[] = [];
      fixture.componentInstance.dayPicked.subscribe((days) => picked.push(days));
      (rows[3].querySelector('button') as HTMLButtonElement).click();
      expect(picked.length).toBe(1);
    });
  });

  describe('reparto por tipo de acción', () => {
    it('lista cada tipo con su recuento y su porcentaje, sin los tipos vacíos', () => {
      setup(AUDIT_FIXTURE_LOGS);
      const items = legend().map((el) => el.textContent?.replace(/\s+/g, ' ').trim());
      expect(items.length).toBe(6);
      expect(items[0]).toContain('Creación');
      expect(items[0]).toContain('7');
      expect(items[0]).toMatch(/35\s?%/);
      setup([auditLog({ action: 'journey.delete' })]);
      expect(legend().map((el) => el.textContent)).toEqual([jasmine.stringContaining('Eliminación')]);
    });

    it('elegir un tipo avisa de él', () => {
      setup(AUDIT_FIXTURE_LOGS);
      const picked: AuditKind[] = [];
      fixture.componentInstance.kindPicked.subscribe((kind) => picked.push(kind));
      legend()[2].click();
      expect(picked).toEqual(['eliminacion']);
    });

    it('el tipo filtrado queda marcado', () => {
      setup(AUDIT_FIXTURE_LOGS, { ...EMPTY_FILTERS, kind: 'estado' });
      expect(legend().filter((el) => el.getAttribute('aria-pressed') === 'true').map((el) => el.textContent)).toEqual([jasmine.stringContaining('Cambio de estado')]);
    });

    it('la barra apilada se describe con texto y no depende del color: cada tipo tiene su nombre y su glifo', () => {
      setup(AUDIT_FIXTURE_LOGS);
      expect(root().querySelector('.audit-stack')?.getAttribute('aria-label')).toContain('Creación: 7 eventos');
      expect(root().querySelectorAll('.audit-legend-item mat-icon').length).toBe(6);
    });
  });

  describe('plegado', () => {
    it('se puede ocultar y la elección se recuerda', () => {
      setup(AUDIT_FIXTURE_LOGS);
      const toggle = root().querySelector('.audit-panel-toggle') as HTMLButtonElement;
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      toggle.click();
      fixture.detectChanges();
      expect(toggle.textContent).toContain('Mostrar resumen');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect((root().querySelector('#audit-panel-body') as HTMLElement).hidden).toBeTrue();
      expect(localStorage.getItem(KEY)).toBe('closed');

      TestBed.resetTestingModule();
      setup(AUDIT_FIXTURE_LOGS);
      expect((root().querySelector('#audit-panel-body') as HTMLElement).hidden).toBeTrue();
    });

    it('si el navegador no deja guardar la preferencia funciona igual', () => {
      spyOn(Storage.prototype, 'getItem').and.throwError('bloqueado');
      spyOn(Storage.prototype, 'setItem').and.throwError('bloqueado');
      setup(AUDIT_FIXTURE_LOGS);
      expect((root().querySelector('#audit-panel-body') as HTMLElement).hidden).toBeFalse();
      (root().querySelector('.audit-panel-toggle') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect((root().querySelector('#audit-panel-body') as HTMLElement).hidden).toBeTrue();
    });
  });
});
