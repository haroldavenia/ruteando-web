import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';

import { expectSameContract, Fixture, respondWith } from '../../../testing/api-testing';
import places from '../../../testing/fixtures/gateway/get__places.json';
import get from '../../../testing/fixtures/gateway/get__settings__id.json';
import create from '../../../testing/fixtures/gateway/post__settings.json';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { Settings } from '../../core/api/models';
import { buildSettingsUpdateBody, SettingsFormComponent } from './settings-form.component';

const fx = (f: unknown) => f as Fixture;
const EMPTY_PAGE = {
  response: { status: 200, body: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 200 } },
};

describe('SettingsFormComponent', () => {
  let fixture: ComponentFixture<SettingsFormComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const form = () => (fixture.componentInstance as unknown as { form: FormGroup }).form;
  const field = (control: string) => root().querySelector(`[formcontrolname="${control}"]`) as HTMLInputElement | null;
  const body = fx(create).request.body as {
    description: string;
    routeTopology: string;
    restrictionType: string;
    fixedRoutes: number;
    resourceIds: string[];
    placeStartId: string;
  };

  function setup(id: string | null, load: { places?: unknown } = {}): void {
    TestBed.configureTestingModule({
      imports: [SettingsFormComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SettingsFormComponent);
    fixture.detectChanges();
    http.match((r) => r.url === '/gateway/master-domains').forEach((r) => r.flush([]));
    const placesReq = http.expectOne((r) => r.url === '/gateway/places');
    expect(placesReq.request.params.get('size')).toBe('200');
    respondWith(placesReq, (load.places ?? places) as Fixture);
    fixture.detectChanges();
  }

  const type = (control: string, value: string) => {
    const el = field(control)!;
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const set = (values: Record<string, unknown>) => {
    for (const [name, value] of Object.entries(values)) {
      form().controls[name].setValue(value);
    }
    fixture.detectChanges();
  };
  const submit = () => {
    (root().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const fillFixed = () =>
    set({
      description: body.description,
      routeTopology: body.routeTopology,
      restrictionType: body.restrictionType,
      fixedRoutes: body.fixedRoutes,
      placeStartId: body.placeStartId,
    });

  afterEach(() => http.verify());

  describe('alta', () => {
    beforeEach(() => setup(null));

    it('sin datos no envía nada y muestra los errores', () => {
      submit();
      http.expectNone((r) => r.method === 'POST');
      expect(root().textContent).toContain('Este campo es obligatorio');
    });

    it('la cabecera ofrece volver a las configuraciones sobre el título', () => {
      const head = root().querySelector('app-form-head')!;

      expect(head.querySelector('h1')?.textContent).toBe('Nueva configuración');
      expect(head.querySelector('a.back')?.getAttribute('href')).toBe('/settings');
    });

    it('los campos van en cuatro secciones con icono y título', () => {
      const titles = Array.from(root().querySelectorAll('form section.form-section h2')).map((h) =>
        h.textContent?.trim()
      );

      expect(titles).toEqual(['Ruta', 'Lugares', 'Qué evalúa la planificación', 'Estancia en cada parada']);
      expect(root().querySelectorAll('form section.form-section h2 mat-icon[aria-hidden="true"]').length).toBe(4);
    });

    it('lo que evalúa la planificación son tres interruptores con los mismos controles y nombres de antes', () => {
      const toggles = Array.from(root().querySelectorAll('.toggles mat-slide-toggle'));

      expect(toggles.map((t) => [t.getAttribute('formcontrolname'), t.textContent?.trim()])).toEqual([
        ['evaluateWeight', 'Evaluar peso'],
        ['evaluateVolume', 'Evaluar volumen'],
        ['evaluateItineraryZone', 'Evaluar zona del itinerario'],
      ]);
      expect(root().querySelector('.toggles')?.getAttribute('aria-label')).toBe('Qué evalúa la planificación');
      expect(root().querySelectorAll('.toggles button[role="switch"]').length).toBe(3);
      expect(root().querySelector('mat-checkbox')).toBeNull();
    });

    it('pulsar un interruptor cambia su control y marca el formulario como modificado', () => {
      const weight = root().querySelector(
        'mat-slide-toggle[formcontrolname="evaluateWeight"] button'
      ) as HTMLButtonElement;
      expect(form().controls['evaluateWeight'].value).toBeFalse();

      weight.click();
      fixture.detectChanges();

      expect(form().controls['evaluateWeight'].value).toBeTrue();
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
    });

    describe('resumen «Así quedará»', () => {
      const sentence = () => root().querySelector('aside.summary .sentence')?.textContent?.trim();

      it('existe con su título, y sin datos dice solo lo que hay', () => {
        expect(root().querySelector('aside.summary h2')?.textContent).toBe('Así quedará');
        expect(root().querySelector('aside.summary')?.getAttribute('aria-labelledby')).toBe('summary-title');
        expect(sentence()).toBe('Planificará rutas.');
      });

      it('se actualiza al editar y solo da formato a los valores del formulario', () => {
        fillFixed();
        set({ evaluateWeight: true });
        const routes = body.fixedRoutes;

        expect(sentence()).toContain(`Planificará ${routes} ${routes === 1 ? 'ruta' : 'rutas'}`);
        expect(sentence()).toContain('desde Postman depot');
        // Con rutas fijas no hay peso ni volumen: el resumen no los menciona
        expect(sentence()).not.toContain('peso');

        set({ restrictionType: 'resource_vs_time', shiftDurationMin: '1h 30m' });
        expect(sentence()).toContain('rutas con turnos de 1 h 30 min');
        expect(sentence()).toMatch(/, evaluando peso\.$/);
      });

      it('no cambia lo que se envía: el resumen es solo texto', () => {
        fillFixed();
        submit();

        const req = http.expectOne((r) => r.method === 'POST' && r.url === '/gateway/settings');
        expect(Object.keys(req.request.body as object)).not.toContain('summary');
        respondWith(req, fx(create));
      });
    });

    it('las acciones siguen siendo Cancelar y Guardar, con el aviso de cambios sin guardar', () => {
      const actions = root().querySelector('app-form-actions')!;
      expect(actions.querySelector('a')?.getAttribute('href')).toBe('/settings');
      expect(actions.querySelector('button')?.getAttribute('type')).toBe('submit');

      type('description', 'Reparto');

      expect(actions.querySelector('[role="status"]')?.textContent).toContain('Cambios sin guardar');
    });

    it('ofrece topologías y restricciones en español, y lugares por su nombre', () => {
      const optionTexts = (selector: string) => {
        (root().querySelector(selector) as HTMLElement).click();
        fixture.detectChanges();
        const texts = Array.from(document.querySelectorAll('mat-option')).map((o) => o.textContent!.trim());
        document
          .querySelectorAll('mat-option')
          .forEach((o) => o.parentElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
        return texts;
      };
      expect(optionTexts('mat-select[formcontrolname="routeTopology"]')).toContain('Ida y vuelta');
      expect(optionTexts('mat-select[formcontrolname="restrictionType"]')).toContain('Rutas fijas');
      expect(optionTexts('mat-select[formcontrolname="placeStartId"]')).toContain('Postman depot');
    });

    it('envía el cuerpo del ejemplo real sin la llegada vacía', () => {
      fillFixed();
      spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      submit();

      const req = http.expectOne((r) => r.method === 'POST' && r.url === '/gateway/settings');
      // Con rutas fijas el cuerpo es el del ejemplo sin la flota
      const { resourceIds: _fleet, ...withoutFleet } = fx(create).request.body as Record<string, unknown>;
      expectSameContract(req, { ...fx(create), request: { ...fx(create).request, body: withoutFleet } });
      expect('placeEndId' in req.request.body).toBeFalse();
      respondWith(req, fx(create));
    });

    describe('campos según el tipo de restricción', () => {
      it('rutas fijas muestra el número de rutas y no el turno', () => {
        set({ restrictionType: 'fixed_routes' });
        expect(field('fixedRoutes')).not.toBeNull();
        expect(field('shiftStart')).toBeNull();
        expect(form().controls['shiftDurationMin'].disabled).toBeTrue();
      });

      for (const type of ['resource_vs_time', 'time_windows']) {
        it(`${type} muestra el turno y no el número de rutas`, () => {
          set({ restrictionType: type });
          expect(field('shiftStart')).not.toBeNull();
          expect(field('shiftDurationMin')).not.toBeNull();
          expect(field('breakDurationMin')).not.toBeNull();
          expect(field('fixedRoutes')).toBeNull();
          expect(form().controls['fixedRoutes'].disabled).toBeTrue();
        });
      }

      it('con rutas fijas el número de rutas es obligatorio, entero y de 1 o más', () => {
        fillFixed();
        for (const bad of [null, 0, 1.5, -2]) {
          form().controls['fixedRoutes'].setValue(bad);
          submit();
          http.expectNone((r) => r.method === 'POST');
        }
      });

      it('con el turno, una duración de 0 y un descanso que no sigue el formato se rechazan', () => {
        set({
          ...{
            description: 'X',
            routeTopology: 'round_trip',
            restrictionType: 'resource_vs_time',
            placeStartId: body.placeStartId,
          },
        });
        set({ shiftDurationMin: '0m' });
        submit();
        http.expectNone((r) => r.method === 'POST');
        expect(root().textContent).toContain('La duración debe ser mayor que 0');

        set({ shiftDurationMin: '8h', breakDurationMin: '-1' });
        submit();
        http.expectNone((r) => r.method === 'POST');
        expect(root().textContent).toContain('Usa el formato 2h 45m');
      });

      it('con turno envía el inicio en UTC y las duraciones en segundos, y no envía las rutas fijas', () => {
        set({
          description: 'Turno',
          routeTopology: 'round_trip',
          restrictionType: 'time_windows',
          placeStartId: body.placeStartId,
        });
        set({ shiftStart: '07:30', shiftDurationMin: '8h', breakDurationMin: '45m' });
        spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        submit();

        const req = http.expectOne((r) => r.method === 'POST');
        expect(req.request.body.shiftDurationSec).toBe(28800);
        expect(req.request.body.breakDurationSec).toBe(2700);
        expect(req.request.body.shiftStartUtc).toMatch(/T\d\d:\d\d:00Z$/);
        expect('fixedRoutes' in req.request.body).toBeFalse();
        req.flush({});
      });
    });

    describe('rutas fijas', () => {
      it('ocultan los interruptores de peso y volumen, y deja la zona del itinerario', () => {
        set({ restrictionType: 'resource_vs_time' });
        expect(field('evaluateWeight')).not.toBeNull();

        set({ restrictionType: 'fixed_routes' });
        expect(field('evaluateWeight')).toBeNull();
        expect(field('evaluateVolume')).toBeNull();
        expect(field('evaluateItineraryZone')).not.toBeNull();
      });

      it('se guardan sin peso ni volumen aunque se hubieran marcado antes', () => {
        set({ evaluateWeight: true, evaluateVolume: true });
        fillFixed();
        spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        submit();

        const req = http.expectOne((r) => r.method === 'POST');
        for (const name of ['evaluateWeight', 'evaluateVolume']) {
          expect(name in req.request.body).toBeFalse();
        }
        req.flush({});
      });

      it('la topología de la ruta está en la sección de lugares', () => {
        const places = Array.from(root().querySelectorAll('form section.form-section')).find(
          (s) => s.querySelector('h2')?.textContent?.trim() === 'Lugares'
        )!;
        expect(places.querySelector('[formcontrolname="routeTopology"]')).not.toBeNull();
      });
    });

    describe('estancia', () => {
      it('la estancia fija se escribe en horas y minutos, con el formato a la vista', () => {
        set({ typeLengthOfStay: 'fixed' });
        expect(field('lengthOfStay')?.getAttribute('placeholder')).toBe('1h 30m');
        expect(root().textContent).toContain('Usa este formato: 2h 45m (h = horas, m = minutos)');

        set({ lengthOfStay: 'dos horas' });
        expect(form().controls['lengthOfStay'].hasError('duration')).toBeTrue();
        set({ lengthOfStay: '1h 30m' });
        expect(form().controls['lengthOfStay'].valid).toBeTrue();
      });

      it('fija exige un valor positivo y se envía con su tipo', () => {
        fillFixed();
        set({ typeLengthOfStay: 'fixed' });
        expect(field('lengthOfStay')).not.toBeNull();
        submit();
        http.expectNone((r) => r.method === 'POST');
        expect(root().textContent).toContain('Este campo es obligatorio');

        set({ lengthOfStay: '0m' });
        submit();
        http.expectNone((r) => r.method === 'POST');

        set({ lengthOfStay: '1h 30m' });
        spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        submit();
        const req = http.expectOne((r) => r.method === 'POST');
        expect(req.request.body).toEqual(jasmine.objectContaining({ typeLengthOfStay: 'fixed', lengthOfStay: 90 }));
        req.flush({});
      });

      it('definida en el itinerario no pide ni envía valor', () => {
        fillFixed();
        set({ typeLengthOfStay: 'define_itinerary' });
        expect(field('lengthOfStay')).toBeNull();
        submit();
        const req = http.expectOne((r) => r.method === 'POST');
        expect(req.request.body.typeLengthOfStay).toBe('define_itinerary');
        expect('lengthOfStay' in req.request.body).toBeFalse();
        req.flush({});
      });
    });

    it('envía las casillas marcadas y el lugar de llegada elegido', () => {
      fillFixed();
      set({
        restrictionType: 'resource_vs_time',
        evaluateWeight: true,
        evaluateItineraryZone: true,
        placeEndId: body.placeStartId,
      });
      submit();
      const req = http.expectOne((r) => r.method === 'POST');
      expect(req.request.body).toEqual(
        jasmine.objectContaining({ evaluateWeight: true, evaluateItineraryZone: true, placeEndId: body.placeStartId })
      );
      expect('evaluateVolume' in req.request.body).toBeFalse();
      req.flush({});
    });

    it('con cambios sin guardar avisa al salir', () => {
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
      form().markAsDirty();
      expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
    });
  });

  describe('sin lugares', () => {
    it('lo explica y enlaza a su pantalla de creación', () => {
      setup(null, { places: EMPTY_PAGE });
      expect(root().textContent).toContain('Todavía no hay lugares');
      expect(root().querySelector('a[href="/places/new"]')).not.toBeNull();
    });

    it('con datos no muestra los enlaces', () => {
      setup(null);
      expect(root().querySelector('a[href="/places/new"]')).toBeNull();
    });
  });

  describe('edición', () => {
    const record = fx(get).response.body as Settings;
    const complete = { ...record, globalShiftActive: true, globalBreakActive: true, active: false } as Settings;

    it('rellena el formulario', () => {
      setup(record.id);
      http.expectOne(`/gateway/settings/${record.id}`).flush(complete);
      fixture.detectChanges();
      expect(field('description')!.value).toBe(record.description);
      expect(form().controls['placeStartId'].value).toBe(record.placeStartId);
    });

    it('al guardar reenvía los campos no editables y no envía los de solo lectura ni los resúmenes', () => {
      setup(record.id);
      http.expectOne(`/gateway/settings/${record.id}`).flush(complete);
      fixture.detectChanges();
      type('description', 'Renombrada');
      spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      submit();

      const req = http.expectOne((r) => r.method === 'PUT' && r.url === `/gateway/settings/${record.id}`);
      const sent = req.request.body;
      expect(sent.description).toBe('Renombrada');
      expect(sent.globalShiftActive).toBeTrue();
      expect(sent.globalBreakActive).toBeTrue();
      expect(sent.active).toBeFalse();
      for (const readOnly of [
        'id',
        'tenantId',
        'createdAt',
        'updatedAt',
        'createdBy',
        'placeStart',
        'placeEnd',
        'resources',
      ]) {
        expect(readOnly in sent)
          .withContext(readOnly)
          .toBeFalse();
      }
      req.flush(complete);
    });

    it('al cambiar de rutas fijas a turno envía las rutas fijas como null', () => {
      setup(record.id);
      http.expectOne(`/gateway/settings/${record.id}`).flush(complete);
      fixture.detectChanges();
      set({ restrictionType: 'resource_vs_time' });
      submit();
      const req = http.expectOne((r) => r.method === 'PUT');
      expect(req.request.body.fixedRoutes).toBeNull();
      expect(req.request.body.shiftDurationSec).toBe(28800);
      req.flush(complete);
    });

    it('al volver a rutas fijas el turno viaja como null', () => {
      setup(record.id);
      http.expectOne(`/gateway/settings/${record.id}`).flush(complete);
      fixture.detectChanges();
      submit();
      const req = http.expectOne((r) => r.method === 'PUT');
      expect(req.request.body.shiftStartUtc).toBeNull();
      expect(req.request.body.shiftDurationSec).toBeNull();
      expect(req.request.body.breakDurationSec).toBeNull();
      req.flush(complete);
    });

    it('con un id inexistente (404) enlaza al listado', () => {
      setup('x');
      http.expectOne('/gateway/settings/x').flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      expect(root().textContent).toContain('El registro ya no existe');
      expect(root().querySelector('a[href="/settings"]')).not.toBeNull();
    });
  });
});

describe('buildSettingsUpdateBody', () => {
  it('lo editado manda sobre el registro y se quitan los campos de solo lectura', () => {
    const record = {
      id: '1',
      tenantId: 't',
      createdAt: 'a',
      updatedAt: 'b',
      createdBy: 'u',
      placeStart: {},
      placeEnd: {},
      resources: [],
      description: 'viejo',
      active: true,
    } as unknown as Settings;
    expect(buildSettingsUpdateBody(record, { description: 'nuevo' })).toEqual({
      description: 'nuevo',
      active: true,
    } as never);
  });
});
