import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';

import { Page, PageParams } from '../../core/api/api-config';
import { OUTLINED_FIELDS_PROVIDER } from '../form/outlined-fields';

import { DataColumn, DataFacet, DataTableComponent } from './data-table.component';
import { FullListState } from './full-list-state';

interface Pack {
  id: string;
  ref: string;
  name: string;
  status: 'pending' | 'attended' | 'cancelled';
}

const LABELS = { pending: 'Pendiente', attended: 'Atendido', cancelled: 'Cancelado' };
const COLUMNS: DataColumn<Pack>[] = [
  { id: 'ref', header: 'Referencia', cell: (p) => p.ref, kind: 'id' },
  { id: 'name', header: 'Nombre', cell: (p) => p.name, primary: true },
  { id: 'status', header: 'Estado', cell: (p) => LABELS[p.status] },
];
const FACET: DataFacet<Pack> = {
  label: 'Estado',
  of: (p) => p.status,
  options: [
    { key: 'pending', label: 'Pendiente' },
    { key: 'attended', label: 'Atendido' },
    { key: 'cancelled', label: 'Cancelado' },
  ],
};

/** `n` paquetes: cada tercero está atendido y cada séptimo cancelado, el resto pendiente. */
function packs(n: number): Pack[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    ref: `PKG-${String(i).padStart(4, '0')}`,
    name: `Cliente ${i}`,
    status: i % 7 === 6 ? 'cancelled' : i % 3 === 2 ? 'attended' : 'pending',
  }));
}

@Component({
  imports: [DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-data-table [state]="state" [columns]="columns" [facet]="facet" [selectable]="selectable" entityPlural="paquetes" searchPlaceholder="Buscar por referencia o nombre">
      <ng-template #selectionActions let-rows let-clear="clear">
        <button type="button" class="act" (click)="acted = rows.length; clear()">Actuar</button>
      </ng-template>
      <ng-template #card let-row><article class="tarjeta">{{ row.name }}</article></ng-template>
    </app-data-table>
  `,
})
class HostComponent {
  fetch: (p: PageParams) => Observable<Page<Pack>> = () => of({ content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 });
  readonly state = new FullListState<Pack>((p) => this.fetch(p));
  columns = COLUMNS;
  facet: DataFacet<Pack> | null = FACET;
  selectable = true;
  acted = 0;
}

describe('DataTableComponent con todo el listado en el cliente', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const root = () => fixture.nativeElement as HTMLElement;
  const q = <E extends Element>(selector: string) => root().querySelector<E>(selector);
  const all = <E extends Element>(selector: string) => Array.from(root().querySelectorAll<E>(selector));
  const rows = () => all('tbody tr.mat-mdc-row');

  /** Cuántos de los `n` paquetes tienen ese estado (los datos de `packs`). */
  const countOf = (n: number, status: Pack['status'], text = ''): number => packs(n).filter((p) => p.status === status && `${p.name} ${p.ref}`.toLowerCase().includes(text)).length;

  async function render(total = 50, configure?: (h: HostComponent) => void, view: 'table' | 'cards' = 'table'): Promise<void> {
    localStorage.removeItem('ruteando-density');
    localStorage.setItem('ruteando-list-view', view);
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    const data = packs(total);
    host.fetch = ({ page = 0, size = 20 }) => of({ content: data.slice(page * size, page * size + size), page, size, totalElements: total, totalPages: Math.ceil(total / size) });
    configure?.(host);
    host.state.load();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function search(value: string): void {
    const input = q<HTMLInputElement>('input[type="search"]')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  const chip = (label: string) => all<HTMLButtonElement>('.chips .chip').find((c) => c.textContent?.trim().startsWith(label))!;

  beforeEach(() => TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideNoopAnimations(), provideRouter([]), OUTLINED_FIELDS_PROVIDER] }));

  describe('búsqueda y paginación', () => {
    it('busca en todos los registros, no solo en la página que se ve', async () => {
      await render(50);
      expect(rows().length).toBe(20);

      search('cliente 47');

      expect(rows().length).toBe(1);
      expect(rows()[0].textContent).toContain('PKG-0047');
    });

    it('pagina sobre lo filtrado y vuelve a la primera página al buscar', async () => {
      await render(50);
      (q('button[aria-label="Página siguiente"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(rows()[0].textContent).toContain('PKG-0020');

      search('cliente 3');
      fixture.detectChanges();

      expect(q('.mat-mdc-paginator-range-label')?.textContent?.trim()).toBe('1 – 11 de 11');
      expect(rows().length).toBe(11);
    });

    it('dice cuántas filas cumplen la búsqueda sobre el total cargado, y calla sin filtro', async () => {
      await render(50);
      expect(q('.scope')).toBeNull();

      search('cliente 3');

      expect(q('.scope')?.textContent?.trim()).toBe('11 de 50');
    });

    it('con la pista de la búsqueda de cada listado y el atajo / a la vista', async () => {
      await render(5);

      expect(q<HTMLInputElement>('input[type="search"]')!.placeholder).toBe('Buscar por referencia o nombre');
      expect(q('kbd.slash')?.textContent?.trim()).toBe('/');
    });

    it('si hay más registros que el tope lo dice', async () => {
      await render(5);
      host.state.total.set(1340);
      host.state.truncated.set(true);
      fixture.detectChanges();

      expect(q('.scope')?.textContent?.trim()).toBe('Se muestran los primeros 5 paquetes de 1340');
    });
  });

  describe('chips de estado', () => {
    it('ofrecen «Todos» y cada estado con filas, con su recuento sobre todo el listado', async () => {
      await render(50);
      const chips = all('.chips .chip').map((c) => c.textContent?.replace(/\s+/g, ' ').trim());

      expect(chips).toEqual(['Todos 50', `Pendiente ${countOf(50, 'pending')}`, `Atendido ${countOf(50, 'attended')}`, `Cancelado ${countOf(50, 'cancelled')}`]);
      expect(q('.chips')?.getAttribute('aria-label')).toBe('Estado');
    });

    it('al elegir uno filtra todo el listado y lo marca como pulsado', async () => {
      await render(50);
      chip('Atendido').click();
      fixture.detectChanges();

      expect(chip('Atendido').getAttribute('aria-pressed')).toBe('true');
      expect(chip('Todos').getAttribute('aria-pressed')).toBe('false');
      expect(rows().length).toBe(countOf(50, 'attended'));
      expect(rows().every((r) => r.textContent?.includes('Atendido'))).toBeTrue();
    });

    it('se combinan con la búsqueda y los recuentos siguen a la búsqueda', async () => {
      await render(50);
      search('cliente 1');
      const counts = all('.chips .chip b').map((b) => b.textContent);

      expect(counts).toEqual(['11', ...(['pending', 'attended', 'cancelled'] as const).map((s) => String(countOf(50, s, 'cliente 1')))].filter((c) => c !== '0'));
      chip('Pendiente').click();
      fixture.detectChanges();
      expect(rows().length).toBe(countOf(50, 'pending', 'cliente 1'));
    });

    it('sin coincidencias, «Limpiar búsqueda» quita también el chip', async () => {
      await render(50);
      chip('Cancelado').click();
      search('cliente 1');
      fixture.detectChanges();
      search('zzz');

      (all<HTMLButtonElement>('button').find((b) => b.textContent?.includes('Limpiar búsqueda')) as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(chip('Todos').getAttribute('aria-pressed')).toBe('true');
      expect(rows().length).toBe(20);
    });

    it('sin facet no hay chips', async () => {
      await render(10, (h) => (h.facet = null));

      expect(q('.chips')).toBeNull();
    });
  });

  describe('aspecto de las celdas', () => {
    it('la referencia va en monoespaciada y el texto secundario en el color secundario', async () => {
      await render(5, (h) => {
        h.selectable = false;
        h.columns = [
          { id: 'ref', header: 'Referencia', cell: (p) => p.ref, kind: 'id' },
          { id: 'name', header: 'Nombre', cell: (p) => p.name, kind: 'strong', primary: true },
          { id: 'status', header: 'Estado', cell: (p) => p.status, kind: 'muted' },
        ];
      });
      root().style.display = 'block';
      root().style.width = '900px';
      const [ref, name, muted] = Array.from(rows()[0].querySelectorAll('td')).map((td) => getComputedStyle(td));

      expect(ref.fontFamily).toMatch(/mono|Consolas|Menlo/i);
      expect(Number(name.fontWeight)).toBeGreaterThanOrEqual(600);
      expect(muted.color).not.toBe(name.color);
    });

    it('la columna fija no se pone en negrita por serlo: eso lo decide kind', async () => {
      await render(5, (h) => {
        h.selectable = false;
        h.columns = [{ id: 'ref', header: 'Referencia', cell: (p) => p.ref, primary: true }];
      });
      root().style.display = 'block';
      root().style.width = '900px';

      expect(Number(getComputedStyle(rows()[0].querySelector('td')!).fontWeight)).toBeLessThan(600);
    });

    it('la cabecera va en mayúsculas pequeñas y monoespaciada', async () => {
      await render(5);
      root().style.display = 'block';
      root().style.width = '900px';
      const header = getComputedStyle(q('th.mat-mdc-header-cell')!);

      expect(header.textTransform).toBe('uppercase');
      expect(header.fontFamily).toMatch(/mono|Consolas|Menlo/i);
    });
  });

  describe('selección', () => {
    it('cada fila tiene su casilla con el nombre del registro y la cabecera marca las que se ven', async () => {
      await render(50);
      const first = rows()[0].querySelector('mat-checkbox')!;

      expect(first.querySelector('input')?.getAttribute('aria-label')).toBe('Seleccionar Cliente 0');
      expect(q('thead mat-checkbox input')?.getAttribute('aria-label')).toBe('Seleccionar las filas que se ven');
    });

    it('sin selección no hay barra; con filas elegidas dice cuántas y ofrece las acciones y quitarla', async () => {
      await render(50);
      expect(q('.selbar')).toBeNull();

      rows()[0].querySelector<HTMLInputElement>('mat-checkbox input')!.click();
      rows()[1].querySelector<HTMLInputElement>('mat-checkbox input')!.click();
      fixture.detectChanges();

      const bar = q('.selbar')!;
      expect(bar.getAttribute('role')).toBe('region');
      expect(bar.querySelector('.count')?.textContent?.trim()).toBe('2 seleccionados');
      expect(bar.querySelector('.act')).not.toBeNull();
      expect(rows()[0].classList).toContain('selected');
    });

    it('la acción recibe las filas elegidas y puede quitar la selección', async () => {
      await render(50);
      rows()[2].querySelector<HTMLInputElement>('mat-checkbox input')!.click();
      rows()[4].querySelector<HTMLInputElement>('mat-checkbox input')!.click();
      fixture.detectChanges();

      q<HTMLButtonElement>('.selbar .act')!.click();
      fixture.detectChanges();

      expect(host.acted).toBe(2);
      expect(q('.selbar')).toBeNull();
    });

    it('la casilla de la cabecera elige las filas que se ven y la selección sobrevive al cambiar de página', async () => {
      await render(50);
      q<HTMLInputElement>('thead mat-checkbox input')!.click();
      fixture.detectChanges();
      expect(q('.selbar .count')?.textContent?.trim()).toBe('20 seleccionados');

      (q('button[aria-label="Página siguiente"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      rows()[0].querySelector<HTMLInputElement>('mat-checkbox input')!.click();
      fixture.detectChanges();

      expect(q('.selbar .count')?.textContent?.trim()).toBe('21 seleccionados');
    });

    it('con una sola fila elegida habla en singular', async () => {
      await render(50);
      rows()[0].querySelector<HTMLInputElement>('mat-checkbox input')!.click();
      fixture.detectChanges();

      expect(q('.selbar .count')?.textContent?.trim()).toBe('1 seleccionado');
    });

    it('sin selectable no hay casillas ni barra', async () => {
      await render(10, (h) => (h.selectable = false));

      expect(q('mat-checkbox')).toBeNull();
      expect(q('.selbar')).toBeNull();
    });
  });

  describe('densidad y vista', () => {
    it('la densidad es cómoda por defecto, se cambia a compacta, se recuerda y se anuncia como pulsada', async () => {
      await render(10);
      const compact = q<HTMLButtonElement>('button[aria-label="Filas compactas"]')!;
      expect(q('section.card')?.classList).not.toContain('compact');
      expect(compact.title).toBe('Filas compactas');

      compact.click();
      fixture.detectChanges();

      expect(q('section.card')?.classList).toContain('compact');
      expect(compact.getAttribute('aria-pressed')).toBe('true');
      expect(localStorage.getItem('ruteando-density')).toBe('compact');
    });

    it('las filas compactas siguen siendo un objetivo de al menos 44px', async () => {
      await render(10);
      root().style.display = 'block';
      root().style.width = '900px';
      q<HTMLButtonElement>('button[aria-label="Filas compactas"]')!.click();
      fixture.detectChanges();

      expect(rows()[0].getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    });

    it('con una plantilla de tarjetas ofrece alternar tarjetas y tabla', async () => {
      await render(10, undefined, 'cards');
      expect(q('.card-grid')).not.toBeNull();
      expect(all('.card-grid .tarjeta').length).toBe(10);
      expect(q('table')).toBeNull();
      expect(q('button[aria-label="Filas compactas"]')).toBeNull();

      q<HTMLButtonElement>('button[aria-label="Ver como tabla"]')!.click();
      fixture.detectChanges();

      expect(q('.card-grid')).toBeNull();
      expect(rows().length).toBe(10);
      expect(localStorage.getItem('ruteando-list-view')).toBe('table');
    });
  });

  describe('atajo de la búsqueda', () => {
    const press = (key: string, target: EventTarget = document.body, init: KeyboardEventInit = {}) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
      target.dispatchEvent(event);
      return event;
    };

    it('«/» lleva el foco a la búsqueda', async () => {
      await render(10);
      document.body.appendChild(root());
      try {
        const event = press('/');

        expect(document.activeElement).toBe(q('input[type="search"]'));
        expect(event.defaultPrevented).toBeTrue();
      } finally {
        root().remove();
      }
    });

    it('no roba la barra mientras se escribe en otro campo ni con teclas modificadoras', async () => {
      await render(10);
      document.body.appendChild(root());
      const other = document.createElement('input');
      document.body.appendChild(other);
      try {
        other.focus();
        expect(press('/', other).defaultPrevented).toBeFalse();
        expect(document.activeElement).toBe(other);
        expect(press('/', document.body, { ctrlKey: true }).defaultPrevented).toBeFalse();
      } finally {
        other.remove();
        root().remove();
      }
    });
  });
});
