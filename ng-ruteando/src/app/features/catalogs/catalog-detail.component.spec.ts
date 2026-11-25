import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { MasterDomain } from '../../core/api/models';
import { CatalogDetailComponent, sortValues } from './catalog-detail.component';

const domain = (): MasterDomain => ({
  id: 'd1',
  code: 'PackageStatus',
  description: 'Estados del paquete',
  system: true,
  values: [
    { key: 'returned', label: 'Returned', description: null, sortOrder: null, active: false },
    { key: 'attended', label: 'Attended', description: 'Atendido', sortOrder: 2, active: true },
    { key: 'pending', label: 'Pending', description: null, sortOrder: 1, active: true },
  ],
});

describe('CatalogDetailComponent', () => {
  let fixture: ComponentFixture<CatalogDetailComponent>;
  let http: HttpTestingController;
  let overlay: HTMLElement;
  const root = () => fixture.nativeElement as HTMLElement;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
  // El formulario es protegido: las pruebas lo escriben por su modelo, no por la interfaz de Material
  const form = () => (fixture.componentInstance as unknown as { form: FormGroup }).form;
  const rowKeys = () =>
    Array.from(root().querySelectorAll('tr.mat-mdc-row')).map((r) => r.querySelector('td')?.textContent?.trim());
  const submit = () => {
    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  function setup(): void {
    TestBed.configureTestingModule({
      imports: [CatalogDetailComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ code: 'PackageStatus' }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    fixture = TestBed.createComponent(CatalogDetailComponent);
    fixture.detectChanges();
    http.expectOne('/gateway/master-domains/PackageStatus').flush(domain());
    fixture.detectChanges();
  }
  /** Tras un cambio el componente vuelve a pedir los catálogos para que los selectores se enteren. */
  const answerRefresh = () => http.match('/gateway/master-domains').forEach((r) => r.flush([domain()]));

  afterEach(() => http.verify());

  it('muestra el catálogo y sus valores por orden (los sin orden al final)', () => {
    setup();
    expect(root().querySelector('h1')?.textContent?.trim()).toBe('PackageStatus');
    expect(rowKeys()).toEqual(['pending', 'attended', 'returned']);
    expect(root().textContent).toContain('2 de 3');
  });

  it('sortValues ordena por orden y luego por nombre', () => {
    expect(
      sortValues([
        { key: 'b', label: 'B', description: null, sortOrder: null, active: true },
        { key: 'a', label: 'A', description: null, sortOrder: null, active: true },
        { key: 'c', label: 'C', description: null, sortOrder: 0, active: true },
      ]).map((v) => v.key)
    ).toEqual(['c', 'a', 'b']);
  });

  it('añade un valor con su clave sin espacios en los extremos y el orden como número', () => {
    setup();
    form().setValue({ key: ' lost ', label: ' Lost ', description: '', sortOrder: '7' });
    submit();
    const req = http.expectOne('/gateway/master-domains/PackageStatus/values');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ key: 'lost', label: 'Lost', sortOrder: 7 });
    const updated = domain();
    updated.values.push({ key: 'lost', label: 'Lost', description: null, sortOrder: 7, active: true });
    req.flush(updated);
    answerRefresh();
    fixture.detectChanges();
    expect(rowKeys()).toContain('lost');
    expect(root().textContent).toContain('Se añadió el valor «lost»');
    expect(form().value['key']).toBe('');
  });

  it('no envía una clave vacía, con espacios en medio ni un orden que no sea número', () => {
    setup();
    form().setValue({ key: 'dos palabras', label: 'X', description: '', sortOrder: '' });
    submit();
    expect(form().controls['key'].hasError('spaces')).toBeTrue();
    form().setValue({ key: 'ok', label: 'X', description: '', sortOrder: '1.5' });
    submit();
    expect(form().controls['sortOrder'].invalid).toBeTrue();
    form().setValue({ key: '', label: '', description: '', sortOrder: '' });
    submit();
    http.expectNone('/gateway/master-domains/PackageStatus/values');
  });

  it('una clave repetida (409) lo dice y conserva lo escrito', () => {
    setup();
    form().setValue({ key: 'pending', label: 'Otra', description: '', sortOrder: '' });
    submit();
    http
      .expectOne('/gateway/master-domains/PackageStatus/values')
      .flush({ message: 'dup' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(root().textContent).toContain('Ya existe un valor con esa clave en este catálogo');
    expect(form().value['key']).toBe('pending');
  });

  it('activar un valor apagado no pide confirmación', () => {
    setup();
    const buttons = Array.from(root().querySelectorAll('button[aria-label^="Activar valor"]')) as HTMLButtonElement[];
    expect(buttons.length).toBe(1);
    buttons[0].click();
    const req = http.expectOne('/gateway/master-domains/PackageStatus/values/returned/toggle');
    expect(req.request.method).toBe('PATCH');
    const updated = domain();
    updated.values[0].active = true;
    req.flush(updated);
    answerRefresh();
    fixture.detectChanges();
    expect(root().textContent).toContain('Se activó el valor «returned»');
    expect(root().textContent).toContain('3 de 3');
  });

  it('desactivar un valor pide confirmación y, si se cancela, no cambia nada', async () => {
    setup();
    (root().querySelector('button[aria-label^="Desactivar valor"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    await wait();
    const cancel = Array.from(overlay.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Cancelar');
    cancel!.click();
    await wait();
    http.expectNone((r) => r.method === 'PATCH');
  });

  it('desactivar un valor confirmado lo apaga y lo avisa', async () => {
    setup();
    (root().querySelector('button[aria-label^="Desactivar valor"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    await wait();
    const confirm = Array.from(overlay.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Desactivar');
    confirm!.click();
    await wait();
    const req = http.expectOne('/gateway/master-domains/PackageStatus/values/pending/toggle');
    const updated = domain();
    updated.values[2].active = false;
    req.flush(updated);
    answerRefresh();
    fixture.detectChanges();
    expect(root().textContent).toContain('Se desactivó el valor «pending»');
    expect(root().textContent).toContain('1 de 3');
  });

  it('las acciones de fila, que son solo un icono, llevan título', () => {
    setup();
    const buttons = Array.from(root().querySelectorAll('tr.mat-mdc-row button.mat-mdc-icon-button'));
    expect(buttons.length).toBe(3);
    expect(buttons.every((b) => !!b.getAttribute('title'))).toBeTrue();
  });
});
