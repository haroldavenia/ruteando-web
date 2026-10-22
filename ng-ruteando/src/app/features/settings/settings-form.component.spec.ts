import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { Fixture, expectSameContract, respondWith } from '../../../testing/api-testing';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { Settings } from '../../core/api/models';

import { SettingsFormComponent, buildSettingsUpdateBody } from './settings-form.component';

import create from '../../../testing/fixtures/gateway/post__settings.json';
import get from '../../../testing/fixtures/gateway/get__settings__id.json';
import places from '../../../testing/fixtures/gateway/get__places.json';
import resources from '../../../testing/fixtures/gateway/get__resources.json';

const fx = (f: unknown) => f as Fixture;
const EMPTY_PAGE = { response: { status: 200, body: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 200 } } };

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

  function setup(id: string | null, load: { places?: unknown; resources?: unknown } = {}): void {
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
    const resourcesReq = http.expectOne((r) => r.url === '/gateway/resources');
    expect(placesReq.request.params.get('size')).toBe('200');
    expect(resourcesReq.request.params.get('size')).toBe('200');
    respondWith(placesReq, (load.places ?? places) as Fixture);
    respondWith(resourcesReq, (load.resources ?? resources) as Fixture);
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
      resourceIds: body.resourceIds,
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

    it('ofrece topologías y restricciones en español, y lugares y vehículos por su nombre', () => {
      const optionTexts = (selector: string) => {
        (root().querySelector(selector) as HTMLElement).click();
        fixture.detectChanges();
        const texts = Array.from(document.querySelectorAll('mat-option')).map((o) => o.textContent!.trim());
        document.querySelectorAll('mat-option').forEach((o) => o.parentElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
        return texts;
      };
      expect(optionTexts('mat-select[formcontrolname="routeTopology"]')).toContain('Ida y vuelta');
      expect(optionTexts('mat-select[formcontrolname="restrictionType"]')).toContain('Rutas fijas');
      expect(optionTexts('mat-select[formcontrolname="placeStartId"]')).toContain('Postman depot');
      expect(optionTexts('mat-select[formcontrolname="resourceIds"]')).toContain('Postman resource');
    });

    it('envía el cuerpo del ejemplo real sin la llegada vacía', () => {
      fillFixed();
      spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      submit();

      const req = http.expectOne((r) => r.method === 'POST' && r.url === '/gateway/settings');
      expectSameContract(req, fx(create));
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

      it('con el turno, una duración de 0 o negativa y un descanso negativo se rechazan', () => {
        set({ ...{ description: 'X', routeTopology: 'round_trip', restrictionType: 'resource_vs_time', resourceIds: body.resourceIds, placeStartId: body.placeStartId } });
        set({ shiftDurationMin: 0 });
        submit();
        http.expectNone((r) => r.method === 'POST');
        expect(root().textContent).toContain('La duración debe ser mayor que 0');

        set({ shiftDurationMin: 480, breakDurationMin: -1 });
        submit();
        http.expectNone((r) => r.method === 'POST');
        expect(root().textContent).toContain('El descanso no puede ser negativo');
      });

      it('con turno envía el inicio en UTC y las duraciones en segundos, y no envía las rutas fijas', () => {
        set({ description: 'Turno', routeTopology: 'round_trip', restrictionType: 'time_windows', resourceIds: body.resourceIds, placeStartId: body.placeStartId });
        set({ shiftStart: '07:30', shiftDurationMin: 480, breakDurationMin: 45 });
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

    describe('estancia', () => {
      it('fija exige un valor positivo y se envía con su tipo', () => {
        fillFixed();
        set({ typeLengthOfStay: 'fixed' });
        expect(field('lengthOfStay')).not.toBeNull();
        submit();
        http.expectNone((r) => r.method === 'POST');
        expect(root().textContent).toContain('Este campo es obligatorio');

        set({ lengthOfStay: 0 });
        submit();
        http.expectNone((r) => r.method === 'POST');

        set({ lengthOfStay: 5 });
        spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        submit();
        const req = http.expectOne((r) => r.method === 'POST');
        expect(req.request.body).toEqual(jasmine.objectContaining({ typeLengthOfStay: 'fixed', lengthOfStay: 5 }));
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
      set({ evaluateWeight: true, evaluateItineraryZone: true, placeEndId: body.placeStartId });
      submit();
      const req = http.expectOne((r) => r.method === 'POST');
      expect(req.request.body).toEqual(
        jasmine.objectContaining({ evaluateWeight: true, evaluateItineraryZone: true, placeEndId: body.placeStartId }),
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

  describe('sin lugares ni vehículos', () => {
    it('lo explica y enlaza a su pantalla de creación', () => {
      setup(null, { places: EMPTY_PAGE, resources: EMPTY_PAGE });
      expect(root().textContent).toContain('Todavía no hay lugares');
      expect(root().querySelector('a[href="/lugares/nuevo"]')).not.toBeNull();
      expect(root().textContent).toContain('Todavía no hay vehículos');
      expect(root().querySelector('a[href="/flota/vehiculos/nuevo"]')).not.toBeNull();
    });

    it('con datos no muestra los enlaces', () => {
      setup(null);
      expect(root().querySelector('a[href="/lugares/nuevo"]')).toBeNull();
      expect(root().querySelector('a[href="/flota/vehiculos/nuevo"]')).toBeNull();
    });
  });

  describe('edición', () => {
    const record = fx(get).response.body as Settings;
    const complete = { ...record, globalShiftActive: true, globalBreakActive: true, active: false } as Settings;

    it('rellena el formulario, incluidos los vehículos seleccionados', () => {
      setup(record.id);
      http.expectOne(`/gateway/settings/${record.id}`).flush(complete);
      fixture.detectChanges();
      expect(field('description')!.value).toBe(record.description);
      expect(form().controls['resourceIds'].value).toEqual(record.resourceIds);
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
      for (const readOnly of ['id', 'tenantId', 'createdAt', 'updatedAt', 'createdBy', 'placeStart', 'placeEnd', 'resources']) {
        expect(readOnly in sent).withContext(readOnly).toBeFalse();
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
      expect(root().querySelector('a[href="/configuraciones"]')).not.toBeNull();
    });
  });
});

describe('buildSettingsUpdateBody', () => {
  it('lo editado manda sobre el registro y se quitan los campos de solo lectura', () => {
    const record = { id: '1', tenantId: 't', createdAt: 'a', updatedAt: 'b', createdBy: 'u', placeStart: {}, placeEnd: {}, resources: [], description: 'viejo', active: true } as unknown as Settings;
    expect(buildSettingsUpdateBody(record, { description: 'nuevo' })).toEqual({ description: 'nuevo', active: true } as never);
  });
});
