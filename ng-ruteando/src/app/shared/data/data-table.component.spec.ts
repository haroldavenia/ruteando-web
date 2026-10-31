import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';

import { Page, PageParams } from '../../core/api/api-config';
import { ApiError } from '../../core/api/api-error';
import { OUTLINED_FIELDS_PROVIDER } from '../form/outlined-fields';

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

  async function render(fetch: (p: PageParams) => Observable<Page<Row>>, load = true, columns?: DataColumn<Row>[]): Promise<void> {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    host.fetch = fetch;
    if (columns) {
      host.columns = columns;
    }
    if (load) {
      host.state.load(0);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideNoopAnimations(), provideRouter([]), OUTLINED_FIELDS_PROVIDER] }));

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
    expect(focusables[0].matches('input[type="search"]')).toBeTrue();
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

  it('una columna con muestra de color pinta el cuadro antes del texto y nada si no hay color', async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    host.fetch = () => of(page([{ name: 'Con color', plate: '#0072B2' }, { name: 'Sin color', plate: '' }]));
    (host as { columns: DataColumn<Row>[] }).columns = [{ ...COLUMNS[0], swatch: (r) => r.plate || null }, COLUMNS[1]];
    host.state.load(0);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = root().querySelectorAll('tr.mat-mdc-row');
    const swatch = rows[0].querySelector('.swatch') as HTMLElement;
    expect(swatch.style.background).toContain('rgb(0, 114, 178)');
    expect(swatch.getAttribute('aria-hidden')).toBe('true');
    expect(rows[1].querySelector('.swatch')).toBeNull();
    expect(rows[0].querySelector('td')!.textContent!.trim()).toBe('Con color');
  });

  describe('alcance del filtro, esqueleto y columna fija', () => {
    const scope = () => root().querySelector('.scope');
    const filterBy = (value: string) => {
      const input = root().querySelector('input[type="search"]') as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const two = [{ name: 'Camión grande', plate: 'AAA111' }, { name: 'Furgón', plate: 'BBB222' }];

    it('sin filtro dice cuántas filas se ven del total que informa el gateway', async () => {
      await render(() => of(page(two, 0, 45)));

      expect(scope()?.textContent?.trim()).toBe('Mostrando 2 de 45');
    });

    it('con un filtro dice sobre cuántas filas de la página actúa, no sobre todo el listado', async () => {
      await render(() => of(page(two, 0, 45)));
      filterBy('camion');

      expect(scope()?.textContent?.trim()).toBe('1 de 2 filas de esta página');
    });

    it('lo anuncia a los lectores de pantalla sin interrumpir', async () => {
      await render(() => of(page(two)));

      expect(scope()?.getAttribute('aria-live')).toBe('polite');
    });

    it('mientras carga, con error o sin registros no dice nada', async () => {
      await render(() => new Subject<Page<Row>>());
      expect(scope()).toBeNull();

      fixture.destroy();
      await render(() => throwError(() => new ApiError({ status: 500, message: 'x' })));
      expect(scope()).toBeNull();

      fixture.destroy();
      await render(() => of(page([])));
      expect(scope()).toBeNull();
    });

    it('mientras carga enseña filas de esqueleto ocultas a los lectores, y conserva la barra y el mensaje', async () => {
      await render(() => new Subject<Page<Row>>());
      const skeleton = root().querySelector('.skeleton-rows');

      expect(skeleton?.getAttribute('aria-hidden')).toBe('true');
      expect(skeleton?.querySelectorAll('.skeleton-row').length).toBe(5);
      expect(root().querySelector('mat-progress-bar')).not.toBeNull();
      expect(text()).toContain('Cargando vehículos');
    });

    it('al cargar quita el esqueleto', async () => {
      await render(() => of(page(two)));

      expect(root().querySelector('.skeleton-rows')).toBeNull();
    });

    it('la primera columna se queda fija al desplazar la tabla, con su propio fondo', async () => {
      await render(() => of(page(two)));
      // En una caja estrecha las filas se apilan y no hay columna fija: la tabla entera solo se ve a partir de 840px
      root().style.display = 'block';
      root().style.width = '900px';
      const sticky = Array.from(root().querySelectorAll('th.mat-mdc-table-sticky, td.mat-mdc-table-sticky'));

      expect(sticky.length).toBe(3);
      expect(sticky.map((c) => c.textContent?.trim())).toEqual(['Nombre', 'Camión grande', 'Furgón']);
      expect(getComputedStyle(sticky[1]).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    it('una columna marcada como primary sustituye a la primera como columna fija', async () => {
      await render(() => of(page(two)), true, [
        { id: 'name', header: 'Nombre', cell: (r) => r.name },
        { id: 'plate', header: 'Matrícula', cell: (r) => r.plate, primary: true },
      ]);

      expect(Array.from(root().querySelectorAll('th.mat-mdc-table-sticky')).map((c) => c.textContent?.trim())).toEqual(['Matrícula']);
    });

    it('el enlace de una celda es un objetivo de al menos 44px y se distingue del texto con el color de la marca', async () => {
      await render(() => of(page(two)), true, [{ id: 'name', header: 'Nombre', cell: (r) => r.name, link: () => ['/x'] }]);
      const link = root().querySelector('td a') as HTMLElement;

      expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      expect(getComputedStyle(link).color).not.toBe(getComputedStyle(root().querySelector('th')!).color);
    });

    it('el campo del filtro mide 44px de alto', async () => {
      await render(() => of(page(two)));

      expect((root().querySelector('.filter .mat-mdc-text-field-wrapper') as HTMLElement).getBoundingClientRect().height).toBe(44);
    });
  });

  describe('presentación', () => {
    const icon = (selector: string) => root().querySelector(`${selector} .state-icon`)?.textContent?.trim();

    it('filtro, tabla y paginador están dentro de una misma tarjeta', async () => {
      await render(() => of(page([{ name: 'Furgoneta', plate: 'ABC-123' }])));
      const card = root().querySelector('section.card.flush')!;
      expect(card.querySelector('.filter')).not.toBeNull();
      expect(card.querySelector('table')).not.toBeNull();
      expect(card.querySelector('mat-paginator')).not.toBeNull();
      expect(getComputedStyle(card).borderTopLeftRadius).toBe('20px');
    });

    it('la cabecera de columnas y las filas tienen su propio estilo dentro de la tarjeta', async () => {
      await render(() => of(page([{ name: 'Furgoneta', plate: 'ABC-123' }])));
      // La cabecera solo se ve cuando la tabla es tabla (a partir de 840px de caja)
      root().style.display = 'block';
      root().style.width = '900px';
      const header = getComputedStyle(root().querySelector('th.mat-mdc-header-cell')!);
      const table = root().querySelector('table')!;
      expect(header.backgroundColor).not.toBe(getComputedStyle(table).backgroundColor);
      expect(getComputedStyle(table).getPropertyValue('--mat-table-background-color').trim()).toBe('transparent');
    });

    it('la carga, el vacío, el error y la falta de coincidencias llevan un icono', async () => {
      await render(() => new Subject<Page<Row>>(), true);
      expect(icon('.state[role="status"]')).toBe('hourglass_empty');

      await render(() => of(page([])));
      expect(icon('.state')).toBe('inbox');
      expect(text()).toContain('No hay vehículos');
      expect(root().querySelector('[empty-action]')).not.toBeNull();

      await render(() => throwError(() => new ApiError({ status: 500, message: 'caído' })));
      expect(icon('.state.error')).toBe('error');
      expect(root().querySelector('.state.error')?.getAttribute('role')).toBe('alert');

      await render(() => of(page([{ name: 'Furgoneta', plate: 'ABC-123' }])));
      const input = root().querySelector('input[type="search"]') as HTMLInputElement;
      input.value = 'zzz';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(icon('.state[role="status"]')).toBe('search_off');
    });

    it('los iconos de los bloques son decorativos', async () => {
      await render(() => of(page([])));
      expect(root().querySelector('.state-icon')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('una columna con tono pinta el texto como etiqueta de estado con icono y tono', async () => {
      await render(() => of(page([{ name: 'Atendido', plate: 'a' }, { name: 'Cancelado', plate: 'b' }])), true, [
        { id: 'name', header: 'Estado', cell: (r) => r.name, tone: (r) => (r.name === 'Atendido' ? 'success' : 'danger') },
      ]);
      const badges = Array.from(root().querySelectorAll('app-status-badge'));
      expect(badges.map((b) => b.querySelector('span')?.textContent)).toEqual(['Atendido', 'Cancelado']);
      expect(badges.map((b) => b.getAttribute('data-tone'))).toEqual(['success', 'danger']);
      expect(badges[0].querySelector('mat-icon')?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('en una caja estrecha', () => {
    const rows: Row[] = [{ name: 'Furgón', plate: 'ABC123' }, { name: '', plate: 'XYZ789' }];

    /** Pone el ancho de la caja que contiene la tabla: la tabla decide según ella y no según la ventana. */
    function widthOf(px: number): void {
      root().style.display = 'block';
      root().style.width = px + 'px';
    }
    const firstRow = () => root().querySelector('tbody tr.mat-mdc-row') as HTMLElement;

    it('cada celda repite su encabezado, la primera es el título y un dato vacío se marca', async () => {
      await render(() => of(page(rows)));
      const [first, second] = Array.from(root().querySelectorAll('tbody tr.mat-mdc-row')) as HTMLElement[];

      expect(Array.from(first.querySelectorAll('td')).map((td) => td.getAttribute('data-label'))).toEqual(['Nombre', 'Matrícula', null]);
      expect(first.querySelector('td')?.classList).toContain('primary-cell');
      expect(first.querySelectorAll('.empty-cell').length).toBe(0);
      expect(second.querySelector('td.empty-cell')).not.toBeNull();
    });

    it('con menos de 840px las filas se apilan: no se desplaza ni la tabla ni la página y el encabezado sigue para los lectores', async () => {
      await render(() => of(page(rows)));
      widthOf(360);
      const scroll = root().querySelector('.stack-scope') as HTMLElement;
      const head = root().querySelector('thead') as HTMLElement;

      expect(getComputedStyle(firstRow()).display).toBe('grid');
      expect(head.getBoundingClientRect().height).toBeLessThanOrEqual(1);
      expect(head.querySelectorAll('th').length).toBe(3);
      expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth);
      expect(getComputedStyle(root().querySelector('td.mat-mdc-table-sticky') as HTMLElement).position).toBe('static');
    });

    it('con 900px o más sigue siendo una tabla, con su primera columna fija', async () => {
      await render(() => of(page(rows)));
      widthOf(900);

      expect(getComputedStyle(firstRow()).display).toBe('table-row');
      expect(getComputedStyle(root().querySelector('td.mat-mdc-table-sticky') as HTMLElement).position).toBe('sticky');
    });
  });
});
