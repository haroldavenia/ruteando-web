import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';

import { Fixture, expectSameContract, respondWith } from '../../../testing/api-testing';
import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';

import { JourneyFormComponent } from './journey-form.component';

import plan from '../../../testing/fixtures/gateway/post__journeys__plan.json';
import packages from '../../../testing/fixtures/gateway/get__packages.json';
import settings from '../../../testing/fixtures/gateway/get__settings.json';

const fx = (f: unknown) => f as Fixture;
const planBody = fx(plan).request.body as { settingsId: string; packageIds: string[]; name: string };
const pkg = (id: string, n: number) => ({ ...(fx(packages).response.body as { content: object[] }).content[0], id, name: `P${n}`, guideNumber: `G-${n}` });
const page = (content: object[], total = content.length) => ({ content, page: 0, size: 20, totalElements: total, totalPages: 1 });
const settingsPage = (id = planBody.settingsId) => page([{ ...(fx(settings).response.body as { content: object[] }).content[0], id, description: 'Capture settings' }]);

describe('JourneyFormComponent', () => {
  let fixture: ComponentFixture<JourneyFormComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const form = () => (fixture.componentInstance as unknown as { form: FormGroup }).form;
  const checkbox = (label: string) => root().querySelector(`input[type="checkbox"][aria-label="${label}"]`) as HTMLInputElement;
  const button = (text: string) => (Array.from(root().querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes(text))!;

  function setup(data: { settings?: object; packages?: object } = {}): void {
    TestBed.configureTestingModule({
      imports: [JourneyFormComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(JourneyFormComponent);
    fixture.detectChanges();
    const settingsReq = http.expectOne((r) => r.url === '/gateway/settings');
    expect(settingsReq.request.params.get('size')).toBe('200');
    settingsReq.flush(data.settings ?? settingsPage());
    http.expectOne((r) => r.url === '/gateway/packages' && r.params.get('size') === '20').flush(data.packages ?? page([pkg(planBody.packageIds[0], 1), pkg(planBody.packageIds[1], 2)]));
    fixture.detectChanges();
  }

  const fill = () => {
    form().controls['name'].setValue(planBody.name);
    form().controls['settingsId'].setValue(planBody.settingsId);
    checkbox('Seleccionar paquete G-1').click();
    checkbox('Seleccionar paquete G-2').click();
    fixture.detectChanges();
  };
  const submit = () => {
    (root().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const planRequest = (): TestRequest => http.expectOne((r) => r.method === 'POST' && r.url === '/gateway/journeys/plan');

  afterEach(() => http.verify());

  describe('presentación', () => {
    const review = () => Array.from(root().querySelectorAll('aside.summary .review > div')).map((row) => [row.querySelector('dt')?.textContent?.trim(), row.querySelector('dd')?.textContent?.trim()]);

    it('la cabecera ofrece volver a las jornadas sobre el título', () => {
      setup();

      expect(root().querySelector('app-form-head h1')?.textContent).toBe('Planificar jornada');
      expect(root().querySelector('app-form-head a.back')?.getAttribute('href')).toBe('/jornadas');
    });

    it('son dos secciones numeradas, Configuración y Paquetes, en una sola página con un único formulario', () => {
      setup();
      const sections = Array.from(root().querySelectorAll('form section.form-section'));

      expect(sections.map((s) => s.querySelector('h2')?.textContent?.trim())).toEqual(['1Configuración', '2Paquetes']);
      expect(sections.every((s) => s.querySelector('h2 .step-num')?.getAttribute('aria-hidden') === 'true')).toBeTrue();
      expect(root().querySelectorAll('form').length).toBe(1);
      expect(sections[1].querySelector('app-package-picker')).not.toBeNull();
    });

    it('el resumen «Revisa» es el tercer paso y, sin datos, dice lo que falta', () => {
      setup();

      expect(root().querySelector('aside.summary h2')?.textContent?.trim()).toBe('3Revisa');
      expect(root().querySelector('aside.summary')?.getAttribute('aria-labelledby')).toBe('review-title');
      expect(review()).toEqual([
        ['Nombre', 'Sin escribir'],
        ['Configuración', 'Sin elegir'],
        ['Paquetes', 'Ninguno elegido'],
      ]);
      expect(root().querySelectorAll('aside.summary dd.empty').length).toBe(3);
    });

    it('el resumen se actualiza al escribir el nombre, elegir la configuración y los paquetes', () => {
      setup();
      fill();

      expect(review()).toEqual([
        ['Nombre', planBody.name],
        ['Configuración', 'Capture settings'],
        ['Paquetes', '2 paquetes'],
      ]);
      expect(root().querySelectorAll('aside.summary dd.empty').length).toBe(0);
    });

    it('con un solo paquete lo dice en singular', () => {
      setup();
      checkbox('Seleccionar paquete G-1').click();
      fixture.detectChanges();

      expect(review()[2]).toEqual(['Paquetes', '1 paquete']);
    });

    it('el resumen es solo texto: planificar sigue enviando un único POST con el mismo cuerpo de siempre', () => {
      setup();
      fill();
      submit();

      const req = planRequest();
      expect(Object.keys(req.request.body as object).sort()).toEqual(['name', 'packageIds', 'settingsId']);
      expect(http.match((r) => r.method === 'POST').length).toBe(0);
      respondWith(req, fx(plan));
    });

    it('las acciones son Cancelar y Planificar, con el aviso de cambios sin guardar', () => {
      setup();
      const actions = root().querySelector('app-form-actions')!;

      expect(actions.querySelector('a')?.getAttribute('href')).toBe('/jornadas');
      expect(actions.querySelector('button')?.textContent?.trim()).toBe('Planificar');
      expect(actions.querySelector('[role="status"]')?.textContent?.trim()).toBe('');

      form().controls['name'].setValue('Reparto');
      form().markAsDirty();
      fixture.detectChanges();

      expect(actions.querySelector('[role="status"]')?.textContent).toContain('Cambios sin guardar');
    });
  });

  it('sin nombre, configuración ni paquetes no envía nada y muestra los errores', () => {
    setup();
    submit();
    http.expectNone((r) => r.method === 'POST');
    expect(root().textContent).toContain('Este campo es obligatorio');
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Elige al menos un paquete');
  });

  it('con paquetes pero sin nombre tampoco envía', () => {
    setup();
    checkbox('Seleccionar paquete G-1').click();
    form().controls['settingsId'].setValue(planBody.settingsId);
    submit();
    http.expectNone((r) => r.method === 'POST');
  });

  it('envía el cuerpo del ejemplo real y abre el detalle de la jornada creada', () => {
    setup();
    fill();
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    submit();

    const req = planRequest();
    expectSameContract(req, fx(plan));
    respondWith(req, fx(plan));
    const created = (fx(plan).response.body as { id: string }).id;
    expect(navigate).toHaveBeenCalledWith(['/jornadas', created]);
  });

  it('muestra el progreso, desactiva el botón y no permite una segunda planificación', () => {
    setup();
    fill();
    submit();
    const req = planRequest();
    fixture.detectChanges();

    expect(root().querySelector('mat-progress-bar[aria-label="Planificando la jornada"]')).not.toBeNull();
    expect(root().textContent).toContain('Planificando la jornada…');
    expect(button('Planificar').disabled).toBeTrue();
    submit();
    http.expectNone((r) => r.method === 'POST');
    req.flush({}, { status: 500, statusText: 'x' });
  });

  describe('errores de planificación', () => {
    it('400 con el defecto de los ids hexadecimales muestra el mensaje del gateway', () => {
      setup();
      fill();
      submit();
      planRequest().flush(
        { error: 'Bad Request', message: 'For input string: "6acb99b48275a26dbdf8fcf6"', path: '/api/v1/journeys/plan' },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();
      const alert = root().querySelector('[role="alert"]')!.textContent!;
      expect(alert).toContain('No se pudo planificar la jornada');
      expect(alert).toContain('For input string: "6acb99b48275a26dbdf8fcf6"');
    });

    it('422 sin mensaje muestra el texto genérico de planificación', () => {
      setup();
      fill();
      submit();
      planRequest().flush({}, { status: 422, statusText: 'Unprocessable' });
      fixture.detectChanges();
      expect(root().querySelector('[role="alert"]')?.textContent?.trim()).toContain('No se pudo planificar la jornada');
    });

    for (const status of [502, 504]) {
      it(`${status} explica que tardó demasiado`, () => {
        setup();
        fill();
        submit();
        planRequest().flush({ message: 'timeout' }, { status, statusText: 'x' });
        fixture.detectChanges();
        expect(root().querySelector('[role="alert"]')?.textContent).toContain('La planificación tardó demasiado o el servicio no respondió');
      });
    }

    it('404 dice que la configuración o algún paquete ya no existe', () => {
      setup();
      fill();
      submit();
      planRequest().flush({ message: 'nf' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      expect(root().querySelector('[role="alert"]')?.textContent).toContain('ya no existe');
    });

    it('tras fallar conserva los datos y reintentar envía el mismo cuerpo', () => {
      setup();
      fill();
      submit();
      planRequest().flush({ message: 'x' }, { status: 504, statusText: 'x' });
      fixture.detectChanges();

      expect(button('Planificar').disabled).toBeFalse();
      expect((root().querySelector('input[formcontrolname="name"]') as HTMLInputElement).value).toBe(planBody.name);
      expect(checkbox('Seleccionar paquete G-1').checked).toBeTrue();
      submit();
      const retry = planRequest();
      expectSameContract(retry, fx(plan));
      retry.flush({}, { status: 500, statusText: 'x' });
    });
  });

  it('sin configuraciones lo explica y enlaza a /configuraciones/nuevo', () => {
    setup({ settings: page([]) });
    expect(root().textContent).toContain('Todavía no hay configuraciones');
    expect(root().querySelector('a[href="/configuraciones/nuevo"]')).not.toBeNull();
  });

  it('sin paquetes lo explica y enlaza a /paquetes/nuevo', () => {
    setup({ packages: page([]) });
    expect(root().textContent).toContain('Todavía no hay paquetes. Primero');
    expect(root().querySelector('a[href="/paquetes/nuevo"]:not([empty-action])')).not.toBeNull();
  });

  it('con datos no muestra los enlaces de creación', () => {
    setup();
    expect(root().querySelector('a[href="/configuraciones/nuevo"]')).toBeNull();
    expect(root().querySelector('.hint a[href="/paquetes/nuevo"]')).toBeNull();
  });

  it('con datos escritos o paquetes elegidos avisa al salir, y tras planificar ya no', () => {
    setup();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    checkbox('Seleccionar paquete G-1').click();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
  });
});
