import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injectable, TemplateRef, computed, contentChild, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';

import { ListState } from './list-state';

export interface DataColumn<T> {
  id: string;
  header: string;
  /** Texto de la celda; también es el que busca el filtro. */
  cell: (row: T) => string;
  /** Si se indica, el texto de la celda es un enlace a esta ruta. */
  link?: (row: T) => string | readonly string[];
  /** Si se indica, antes del texto se pinta una muestra de este color (`#RRGGBB`); `null` no pinta nada. */
  swatch?: (row: T) => string | null;
}

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
 * Tabla de un listado paginado desde el servidor. Muestra los estados de carga, vacío, sin
 * coincidencias y error (con "Reintentar"). El filtro solo actúa sobre la página cargada.
 *
 * Las acciones de cada fila las aporta quien la usa con `<ng-template #rowActions let-row>`; el
 * contenido con el atributo `empty-action` se muestra solo cuando la lista está vacía.
 */
@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet, RouterLink, FormsModule, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  providers: [{ provide: MatPaginatorIntl, useClass: SpanishPaginatorIntl }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent<T> {
  readonly state = input.required<ListState<T>>();
  readonly columns = input.required<readonly DataColumn<T>[]>();
  /** Nombre del tipo de registro en plural, para los mensajes ("vehículos"). */
  readonly entityPlural = input('registros');
  readonly emptyMessage = input('Todavía no hay registros');
  readonly pageSizeOptions = input<readonly number[]>([10, 20, 50]);

  protected readonly rowActions = contentChild<TemplateRef<{ $implicit: T }>>('rowActions');
  protected readonly filter = signal('');

  protected readonly displayedColumns = computed(() => [...this.columns().map((c) => c.id), ...(this.rowActions() ? ['actions'] : [])]);

  protected readonly visibleRows = computed(() => {
    const text = normalizeText(this.filter().trim());
    const rows = this.state().rows();
    if (!text) {
      return rows;
    }
    const columns = this.columns();
    return rows.filter((row) => columns.some((c) => normalizeText(c.cell(row)).includes(text)));
  });

  protected pageChanged(event: PageEvent): void {
    this.state().goTo(event.pageIndex, event.pageSize);
  }

  protected clearFilter(): void {
    this.filter.set('');
  }
}
