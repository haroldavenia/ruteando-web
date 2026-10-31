import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injectable,
  PLATFORM_ID,
  TemplateRef,
  computed,
  contentChild,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';

import { StatusBadgeComponent } from '../ui/status-badge.component';
import { StatusTone } from '../ui/status-tone';

import { readPref, writePref } from './list-prefs';
import { DEFAULT_PAGE_SIZE, ListState } from './list-state';

export interface DataColumn<T> {
  id: string;
  header: string;
  /** Texto de la celda; también es el que busca el filtro. */
  cell: (row: T) => string;
  /** Si se indica, el texto de la celda es un enlace a esta ruta. */
  link?: (row: T) => string | readonly string[];
  /** Si se indica, antes del texto se pinta una muestra de este color (`#RRGGBB`); `null` no pinta nada. */
  swatch?: (row: T) => string | null;
  /** Si se indica, la celda se muestra como etiqueta de estado con este tono (el texto es el de `cell`). */
  tone?: (row: T) => StatusTone;
  /** La columna que se queda fija al desplazar la tabla en pantallas estrechas; si ninguna lo dice, la primera. */
  primary?: boolean;
  /** Aspecto del texto: `id` es una referencia en monoespaciada, `strong` un nombre en negrita y `muted` un dato secundario. */
  kind?: 'id' | 'strong' | 'muted';
}

/**
 * Chips de estado sobre una lista que está entera en el cliente: cómo se lee el estado de una fila y qué estados se ofrecen, en
 * orden. Cada chip lleva cuántas filas tiene; los estados sin filas se ocultan salvo el elegido.
 */
export interface DataFacet<T> {
  /** Nombre del grupo para los lectores de pantalla («Estado»). */
  label: string;
  of: (row: T) => string;
  options: readonly { key: string; label: string }[];
}

/** Lo que recibe la plantilla `#selectionActions`: las filas elegidas y cómo quitar la selección. */
export interface SelectionContext<T> {
  $implicit: readonly T[];
  clear: () => void;
}

type Density = 'comfortable' | 'compact';
type View = 'table' | 'cards';
const DENSITY_KEY = 'ruteando-density';
const VIEW_KEY = 'ruteando-list-view';

/** Normaliza para comparar sin distinguir mayúsculas ni acentos. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

@Injectable()
class SpanishPaginatorIntl extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Filas por página';
  override nextPageLabel = 'Página siguiente';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel = 'Primera página';
  override lastPageLabel = 'Última página';
  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0) {
      return '0 de 0';
    }
    const start = page * pageSize + 1;
    return `${start} – ${Math.min(start + pageSize - 1, length)} de ${length}`;
  };
}

/**
 * Tabla de un listado. Con un `ListState` (paginado desde el servidor) filtra solo la página cargada; con un `FullListState`
 * (todo el listado en el cliente) busca, cuenta por estado (`facet`) y pagina sobre todos los registros. Muestra los estados de
 * carga, vacío, sin coincidencias y error (con "Reintentar"), la densidad de las filas (cómoda o compacta, se recuerda) y, si se
 * pide, casillas de selección con una barra de acciones y una vista de tarjetas.
 *
 * Las acciones de cada fila las aporta quien la usa con `<ng-template #rowActions let-row>`, las de la selección con
 * `<ng-template #selectionActions let-rows let-clear="clear">` y las tarjetas con `<ng-template #card let-row>`; el contenido con
 * el atributo `empty-action` se muestra solo cuando la lista está vacía.
 */
@Component({
  selector: 'app-data-table',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressBarModule,
    StatusBadgeComponent,
  ],
  providers: [{ provide: MatPaginatorIntl, useClass: SpanishPaginatorIntl }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'focusSearchOnSlash($event)' },
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent<T> {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly state = input.required<ListState<T>>();
  readonly columns = input.required<readonly DataColumn<T>[]>();
  /** Nombre del tipo de registro en plural, para los mensajes ("vehículos"). */
  readonly entityPlural = input('registros');
  readonly emptyMessage = input('Todavía no hay registros');
  readonly pageSizeOptions = input<readonly number[]>([10, 20, 50]);
  /** Pista del campo de búsqueda («Buscar por guía, nombre o dirección»). */
  readonly searchPlaceholder = input('Buscar en esta página');
  /** Chips de estado con recuento (solo con una lista entera en el cliente). */
  readonly facet = input<DataFacet<T> | null>(null);
  /** Casillas por fila y barra de acciones de la selección. */
  readonly selectable = input(false);
  /** Identifica una fila al seleccionarla; por defecto, su `id`. */
  readonly rowKey = input<(row: T) => string>((row) => String((row as { id?: unknown }).id ?? ''));

  protected readonly rowActions = contentChild<TemplateRef<{ $implicit: T }>>('rowActions');
  protected readonly selectionActions = contentChild<TemplateRef<SelectionContext<T>>>('selectionActions');
  protected readonly card = contentChild<TemplateRef<{ $implicit: T }>>('card');
  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('search');

  /**
   * Texto de la búsqueda. Es enlazable (`[(filter)]`) para quien quiera guardarlo, por ejemplo en la dirección de la página; sin
   * enlazar se comporta como un estado interno.
   */
  readonly filter = model('');
  protected readonly density = signal<Density>(readPref(DENSITY_KEY, ['comfortable', 'compact'], 'comfortable', this.browser));
  private readonly preferredView = signal<View>(readPref(VIEW_KEY, ['table', 'cards'], 'cards', this.browser));
  /** Vista efectiva: sin plantilla de tarjetas solo hay tabla. */
  protected readonly view = computed<View>(() => (this.card() ? this.preferredView() : 'table'));

  /** Estado elegido en los chips; `null` es «Todos». Enlazable como `filter`. */
  readonly facetKey = model<string | null>(null);
  private readonly clientPage = signal(0);
  private readonly clientSize = signal(DEFAULT_PAGE_SIZE);
  private readonly selected = signal<ReadonlySet<string>>(new Set());

  /** Columna que no se recorta al desplazar la tabla en horizontal. */
  protected readonly stickyId = computed(() => (this.columns().find((c) => c.primary) ?? this.columns()[0])?.id ?? null);

  /** Filas de esqueleto mientras carga: la tabla ya tiene su forma. */
  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  protected readonly displayedColumns = computed(() => [
    ...(this.selectable() ? ['select'] : []),
    ...this.columns().map((c) => c.id),
    ...(this.rowActions() ? ['actions'] : []),
  ]);

  protected readonly clientSide = computed(() => this.state().clientSide);

  /** Filas que cumplen la búsqueda (de toda la lista en el cliente; de la página cargada con el servidor). */
  private readonly searched = computed(() => {
    const text = normalizeText(this.filter().trim());
    const rows = this.state().rows();
    if (!text) {
      return rows;
    }
    const columns = this.columns();
    return rows.filter((row) => columns.some((c) => normalizeText(c.cell(row)).includes(text)));
  });

  /** Lo que queda tras la búsqueda y el chip de estado (todas las filas, no solo la página); lo usan los mapas que acompañan a la lista. */
  readonly filtered = computed(() => {
    const facet = this.facet();
    const key = this.facetKey();
    const rows = this.searched();
    return this.clientSide() && facet && key !== null ? rows.filter((row) => facet.of(row) === key) : rows;
  });

  /** Filas que se pintan: la página actual de lo filtrado (en el cliente) o la página cargada ya filtrada (con el servidor). */
  protected readonly visibleRows = computed(() => {
    if (!this.clientSide()) {
      return this.filtered();
    }
    const size = this.clientSize();
    const start = this.pageIndex() * size;
    return this.filtered().slice(start, start + size);
  });

  protected readonly pageIndex = computed(() => (this.clientSide() ? Math.min(this.clientPage(), this.lastPage()) : this.state().page()));
  protected readonly pageSize = computed(() => (this.clientSide() ? this.clientSize() : this.state().size()));
  protected readonly length = computed(() => (this.clientSide() ? this.filtered().length : this.state().total()));
  private readonly lastPage = computed(() => Math.max(0, Math.ceil(this.filtered().length / this.clientSize()) - 1));

  /** Chips de estado: «Todos» y cada estado con filas (o el elegido), con su recuento sobre lo que cumple la búsqueda. */
  protected readonly chips = computed(() => {
    const facet = this.facet();
    if (!this.clientSide() || !facet || this.state().status() !== 'ready') {
      return null;
    }
    const rows = this.searched();
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = facet.of(row);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const chosen = this.facetKey();
    return [
      { key: null, label: 'Todos', count: rows.length, on: chosen === null },
      ...facet.options
        .filter((option) => (counts.get(option.key) ?? 0) > 0 || option.key === chosen)
        .map((option) => ({ key: option.key as string | null, label: option.label, count: counts.get(option.key) ?? 0, on: chosen === option.key })),
    ];
  });

  /**
   * Sobre cuántas filas actúa la búsqueda y cuántas se ven. Con el servidor solo recorre la página cargada, no todo el listado, y
   * conviene decirlo; con todo el listado en el cliente solo habla cuando hay un filtro o cuando hay más registros de los traídos.
   */
  protected readonly scopeText = computed(() => {
    const state = this.state();
    if (state.status() !== 'ready') {
      return '';
    }
    const loaded = state.rows().length;
    if (!this.clientSide()) {
      return this.filter().trim() ? `${this.filtered().length} de ${loaded} filas de esta página` : `Mostrando ${loaded} de ${state.total()}`;
    }
    const filtering = this.filter().trim() !== '' || this.facetKey() !== null;
    const more = state.total() > loaded ? `Se muestran los primeros ${loaded} ${this.entityPlural()} de ${state.total()}` : '';
    return [filtering ? `${this.filtered().length} de ${loaded}` : '', more].filter(Boolean).join(' · ');
  });

  protected readonly selectedRows = computed(() => {
    const selected = this.selected();
    return selected.size === 0 ? [] : this.state().rows().filter((row) => selected.has(this.rowKey()(row)));
  });
  protected readonly allVisibleSelected = computed(() => this.visibleRows().length > 0 && this.visibleRows().every((row) => this.isSelected(row)));
  protected readonly someVisibleSelected = computed(() => !this.allVisibleSelected() && this.visibleRows().some((row) => this.isSelected(row)));

  protected pageChanged(event: PageEvent): void {
    if (this.clientSide()) {
      this.clientPage.set(event.pageIndex);
      this.clientSize.set(event.pageSize);
      return;
    }
    this.state().goTo(event.pageIndex, event.pageSize);
  }

  protected setFilter(value: string): void {
    this.filter.set(value);
    this.clientPage.set(0);
  }

  protected clearFilter(): void {
    this.setFilter('');
    this.facetKey.set(null);
  }

  protected pickFacet(key: string | null): void {
    this.facetKey.set(key);
    this.clientPage.set(0);
  }

  protected setDensity(value: Density): void {
    this.density.set(value);
    writePref(DENSITY_KEY, value, this.browser);
  }

  protected setView(value: View): void {
    this.preferredView.set(value);
    writePref(VIEW_KEY, value, this.browser);
  }

  protected isSelected(row: T): boolean {
    return this.selected().has(this.rowKey()(row));
  }

  protected toggleRow(row: T): void {
    const key = this.rowKey()(row);
    this.selected.update((set) => {
      const next = new Set(set);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });
  }

  /** Marca o desmarca las filas que se ven (la página actual). */
  protected toggleVisible(): void {
    const unselect = this.allVisibleSelected();
    this.selected.update((set) => {
      const next = new Set(set);
      for (const row of this.visibleRows()) {
        if (unselect) {
          next.delete(this.rowKey()(row));
        } else {
          next.add(this.rowKey()(row));
        }
      }
      return next;
    });
  }

  protected readonly clearSelection = (): void => this.selected.set(new Set());

  /** El nombre de una fila para los lectores de pantalla: el texto de su columna principal. */
  protected rowLabel(row: T): string {
    const column = this.columns().find((c) => c.id === this.stickyId());
    return column ? column.cell(row) : '';
  }

  /** `/` lleva el foco a la búsqueda, como en los buscadores que la tienen, salvo que ya se esté escribiendo en un campo. */
  protected focusSearchOnSlash(event: KeyboardEvent): void {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
      return;
    }
    const field = this.searchField()?.nativeElement;
    if (field) {
      event.preventDefault();
      field.focus();
    }
  }
}
