import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';

import { Page, PageParams } from '../../core/api/api-config';
import { ApiError } from '../../core/api/api-error';

import { DataColumn, DataTableComponent } from './data-table.component';
import { ListState } from './list-state';

interface Row {
  name: string;
  plate: string;
}

const COLUMNS: DataColumn<Row>[] = [
  { id: 'name', header: 'Nombre', cell: (r) => r.name },
  { id: 'plate', header: 'Matrícula', cell: (r) => r.plate },
];

function page(content: Row[], number = 0, total = content.length): Page<Row> {
  return { content, page: number, size: 20, totalElements: total, totalPages: Math.ceil(total / 20) };
}

@Component({
  imports: [DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-data-table [state]="state" [columns]="columns" entityPlural="vehículos" emptyMessage="No hay vehículos">
      <ng-template #rowActions let-row>
        <button type="button" [attr.aria-label]="'Eliminar vehículo ' + row.plate">Eliminar</button>
      </ng-template>
      <a empty-action href="/nuevo">Crear el primero</a>
    </app-data-table>
  `,
})
class HostComponent {
  fetch: (p: PageParams) => Observable<Page<Row>> = () => of(page([]));
  readonly state = new ListState<Row>((p) => this.fetch(p));
  columns: DataColumn<Row>[] = COLUMNS;
}

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent ?? '';

  async function render(fetch: (p: PageParams) => Observable<Page<Row>>, load = true): Promise<void> {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    host.fetch = fetch;
    if (load) {
      host.state.load(0);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideNoopAnimations(), provideRouter([])] }));

  it('muestra el indicador de carga mientras espera', async () => {
    await render(() => new Subject<Page<Row>>(), true);
    expect(root().querySelector('mat-progress-bar')).not.toBeNull();
    expect(text()).toContain('Cargando vehículos');
  });

  it('muestra las filas, el total y las acciones con etiqueta que nombra el registro', async () => {
    await render(() => of(page([{ name: 'Furgón', plate: 'ABC123' }, { name: 'Camión', plate: 'XYZ789' }], 0, 45)));
    expect(root().querySelectorAll('tr.mat-mdc-row').length).toBe(2);
    expect(text()).toContain('1 – 20 de 45');
    expect(root().querySelector('button[aria-label="Eliminar vehículo ABC123"]')).not.toBeNull();
  });

  it('filtra la página sin distinguir mayúsculas ni acentos', async () => {
    await render(() => of(page([{ name: 'Camión grande', plate: 'AAA111' }, { name: 'Furgón', plate: 'BBB222' }])));
    const input = root().querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'CAMION';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const rows = Array.from(root().querySelectorAll('tr.mat-mdc-row')).map((r) => r.textContent);
    expect(rows.length).toBe(1);
    expect(rows[0]).toContain('Camión grande');
  });

  it('sin coincidencias avisa y permite limpiar la búsqueda', async () => {
    await render(() => of(page([{ name: 'Furgón', plate: 'BBB222' }])));
    const input = root().querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'nada';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(text()).toContain('No hay resultados');
    (Array.from(root().querySelectorAll('button')).find((b) => b.textContent?.includes('Limpiar búsqueda')) as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root().querySelectorAll('tr.mat-mdc-row').length).toBe(1);
  });

  it('con la lista vacía muestra el mensaje y la acción de crear', async () => {
    await render(() => of(page([])));
    expect(text()).toContain('No hay vehículos');
    expect(root().querySelector('a[empty-action]')).not.toBeNull();
  });

  it('con error muestra el mensaje en un alert y "Reintentar" pide otra vez la misma página', async () => {
    const fetch = jasmine.createSpy().and.returnValue(throwError(() => new ApiError({ status: 500, message: 'El servicio no está disponible' })));
    await render(fetch);
    const alert = root().querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('El servicio no está disponible');

    fetch.and.returnValue(of(page([{ name: 'Furgón', plate: 'BBB222' }])));
    (Array.from(root().querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar')) as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fetch.calls.count()).toBe(2);
    expect(fetch.calls.mostRecent().args[0]).toEqual({ page: 0, size: 20 });
    expect(root().querySelectorAll('tr.mat-mdc-row').length).toBe(1);
  });

  it('el paginador está en español y pide la página elegida', async () => {
    const fetch = jasmine.createSpy().and.callFake((p: PageParams) => of(page([{ name: 'A', plate: 'P' }], p.page ?? 0, 100)));
    await render(fetch);
    const next = root().querySelector('button[aria-label="Página siguiente"]') as HTMLButtonElement;
    expect(next).not.toBeNull();
    next.click();
    fixture.detectChanges();
    expect(fetch.calls.mostRecent().args[0]).toEqual({ page: 1, size: 20 });
  });

  it('el orden de tabulación es filtro, acciones de fila y paginador', async () => {
    await render(() => of(page([{ name: 'A', plate: 'P1' }, { name: 'B', plate: 'P2' }], 0, 45)));
    const focusables = Array.from(root().querySelectorAll<HTMLElement>('input, button:not([disabled]), a[href]'));
    const labels = focusables.map((el) => el.getAttribute('aria-label') ?? el.tagName.toLowerCase());
    expect(labels.indexOf('input')).toBe(0);
    expect(labels.indexOf('Eliminar vehículo P1')).toBeLessThan(labels.indexOf('Eliminar vehículo P2'));
    expect(labels.indexOf('Eliminar vehículo P2')).toBeLessThan(labels.indexOf('Página siguiente'));
  });

  it('a 360 px la página no se desborda: la tabla se desplaza dentro de su contenedor', async () => {
    await render(() => of(page([{ name: 'N'.repeat(120), plate: 'P'.repeat(120) }])));
    const container = document.createElement('div');
    container.style.width = '360px';
    container.style.overflowX = 'hidden';
    container.appendChild(root());
    document.body.appendChild(container);
    fixture.detectChanges();

    const scroller = root().querySelector('.table-scroll') as HTMLElement;
    expect(getComputedStyle(scroller).overflowX).toBe('auto');
    expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
    container.remove();
  });

  it('una columna con enlace pinta el texto como enlace a su ruta', async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    host.fetch = () => of(page([{ name: 'Furgón', plate: 'ABC123' }]));
    (host as { columns: DataColumn<Row>[] }).columns = [{ ...COLUMNS[0], link: (r) => ['/flota', r.plate] }, COLUMNS[1]];
    host.state.load(0);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const link = root().querySelector('td a') as HTMLAnchorElement | null;
    expect(link?.textContent?.trim()).toBe('Furgón');
    expect(link?.getAttribute('href')).toBe('/flota/ABC123');
    expect(root().querySelectorAll('td a').length).toBe(1);
  });
});
