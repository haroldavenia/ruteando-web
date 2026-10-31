import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from '../../core/api/api-config';
import { errorInterceptor } from '../../core/api/error.interceptor';

import { PackagePickerComponent } from './package-picker.component';

import list from '../../../testing/fixtures/gateway/get__packages.json';

type Item = { id: string; name: string; guideNumber: string | null; status: string };
const base = (list.response.body.content[0]) as unknown as Item;
const item = (n: number, status = 'pending'): Item => ({ ...base, id: `id${n}`, name: `P${n}`, guideNumber: `G-${n}`, status });
const page = (items: Item[], number: number, total: number, size = 20) => ({
  content: items,
  page: number,
  size,
  totalElements: total,
  totalPages: Math.ceil(total / size),
});

describe('PackagePickerComponent', () => {
  let fixture: ComponentFixture<PackagePickerComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const selected = () => fixture.componentInstance.selectedIds();
  const checkbox = (label: string) => root().querySelector(`input[type="checkbox"][aria-label="${label}"]`) as HTMLInputElement | null;
  const button = (text: string) => (Array.from(root().querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes(text))!;
  const firstPage = () => http.expectOne((r) => r.url === '/gateway/packages' && r.params.get('size') === '20');

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PackagePickerComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: '/gateway' },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PackagePickerComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('cada casilla nombra el paquete y la selección se cuenta', () => {
    firstPage().flush(page([item(1), item(2)], 0, 2));
    fixture.detectChanges();

    expect(checkbox('Seleccionar paquete G-1')).not.toBeNull();
    expect(root().textContent).toContain('Ningún paquete seleccionado');
    checkbox('Seleccionar paquete G-1')!.click();
    fixture.detectChanges();
    expect(selected()).toEqual(['id1']);
    expect(root().textContent).toContain('1 paquete seleccionado');
    checkbox('Seleccionar paquete G-2')!.click();
    fixture.detectChanges();
    expect(root().textContent).toContain('2 paquetes seleccionados');
  });

  it('en una caja estrecha cada paquete es una tarjeta con su nombre de título y la casilla dice «Seleccionar»', () => {
    firstPage().flush(page([item(1)], 0, 1));
    fixture.detectChanges();
    const row = root().querySelector('tbody tr') as HTMLElement;
    const label = row.querySelector('.stack-only') as HTMLElement;

    root().style.display = 'block';
    root().style.width = '900px';
    expect(getComputedStyle(label).display).toBe('none');

    root().style.width = '360px';
    expect(getComputedStyle(label).display).not.toBe('none');
    expect(label.textContent).toBe('Seleccionar');
    expect(row.querySelector('td.primary-cell')?.getAttribute('data-label')).toBe('Nombre');
    expect(checkbox('Seleccionar paquete G-1')).not.toBeNull();
  });

  it('la selección sobrevive al cambio de página', () => {
    firstPage().flush(page([item(1), item(2)], 0, 45));
    fixture.detectChanges();
    checkbox('Seleccionar paquete G-1')!.click();
    fixture.detectChanges();

    (root().querySelector('button[aria-label="Página siguiente"]') as HTMLButtonElement).click();
    http.expectOne((r) => r.params.get('page') === '1').flush(page([item(21), item(22)], 1, 45));
    fixture.detectChanges();
    checkbox('Seleccionar paquete G-21')!.click();
    fixture.detectChanges();
    expect(selected()).toEqual(['id1', 'id21']);

    (root().querySelector('button[aria-label="Página anterior"]') as HTMLButtonElement).click();
    http.expectOne((r) => r.params.get('page') === '0').flush(page([item(1), item(2)], 0, 45));
    fixture.detectChanges();
    expect(checkbox('Seleccionar paquete G-1')!.checked).toBeTrue();
    expect(checkbox('Seleccionar paquete G-2')!.checked).toBeFalse();
  });

  it('desmarcar quita el paquete de la selección', () => {
    firstPage().flush(page([item(1)], 0, 1));
    fixture.detectChanges();
    checkbox('Seleccionar paquete G-1')!.click();
    fixture.detectChanges();
    checkbox('Seleccionar paquete G-1')!.click();
    fixture.detectChanges();
    expect(selected()).toEqual([]);
  });

  it('«Seleccionar todos los pendientes» pide todas las páginas y marca solo los pendientes', () => {
    firstPage().flush(page([item(1), item(2, 'attended')], 0, 3));
    fixture.detectChanges();

    button('Seleccionar todos los pendientes').click();
    fixture.detectChanges();
    const all = http.expectOne((r) => r.params.get('size') === '200' && r.params.get('page') === '0');
    all.flush(page([item(1), item(2, 'attended')], 0, 3, 2));
    fixture.detectChanges();
    expect(root().textContent).toContain('Buscando paquetes pendientes… 2 de 3');
    http.expectOne((r) => r.params.get('size') === '200' && r.params.get('page') === '1').flush(page([item(3), item(4, 'cancelled')], 1, 3, 2));
    fixture.detectChanges();

    expect(selected().sort()).toEqual(['id1', 'id3']);
    expect(root().textContent).toContain('2 paquetes seleccionados');
  });

  it('los pendientes se suman a lo que ya estaba marcado', () => {
    firstPage().flush(page([item(1), item(2, 'attended')], 0, 2));
    fixture.detectChanges();
    checkbox('Seleccionar paquete G-2')!.click();
    fixture.detectChanges();

    button('Seleccionar todos los pendientes').click();
    http.expectOne((r) => r.params.get('size') === '200').flush(page([item(1), item(2, 'attended')], 0, 2, 200));
    fixture.detectChanges();
    expect(selected().sort()).toEqual(['id1', 'id2']);
  });

  it('un paquete no pendiente se puede marcar a mano', () => {
    firstPage().flush(page([item(2, 'attended')], 0, 1));
    fixture.detectChanges();
    checkbox('Seleccionar paquete G-2')!.click();
    expect(selected()).toEqual(['id2']);
  });

  it('«Quitar la selección» la vacía', () => {
    firstPage().flush(page([item(1)], 0, 1));
    fixture.detectChanges();
    checkbox('Seleccionar paquete G-1')!.click();
    fixture.detectChanges();
    button('Quitar la selección').click();
    fixture.detectChanges();
    expect(selected()).toEqual([]);
    expect(checkbox('Seleccionar paquete G-1')!.checked).toBeFalse();
  });

  it('un fallo al pedir las páginas se avisa y no cambia la selección', () => {
    firstPage().flush(page([item(1)], 0, 1));
    fixture.detectChanges();
    button('Seleccionar todos los pendientes').click();
    http.expectOne((r) => r.params.get('size') === '200').flush({ message: 'x' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('No se pudieron cargar todos los paquetes');
    expect(selected()).toEqual([]);
    expect(button('Seleccionar todos los pendientes').disabled).toBeFalse();
  });
});
