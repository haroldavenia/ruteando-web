import { DestroyRef, PLATFORM_ID, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';

import { bulkDeleteMessages, deleteMany } from '../../shared/data/bulk-run';
import { downloadCsv } from '../../shared/data/csv';
import { DeleteFlow } from '../../shared/data/delete-flow';

import { csvFileName } from './fleet-export';

export interface FleetListConfig<T> {
  /** «vehículo» / «vehículos». */
  singular: string;
  plural: string;
  /** Primera parte del nombre del CSV («vehiculos»). */
  fileBase: string;
  /** Cómo se nombra una fila en los avisos. */
  label: (row: T) => string;
  remove: (id: string) => Observable<unknown>;
  /** Texto por estado HTTP al borrar (por ejemplo, el registro está en uso). */
  byStatus?: Readonly<Record<number, string>>;
  /** Recarga el listado tras borrar. */
  reload: () => void;
  csv: (rows: readonly T[]) => string;
}

/**
 * Lo que comparten los tres listados de flota para las filas elegidas: borrar varias con una sola confirmación y exportarlas a CSV.
 * Los avisos van al `DeleteFlow` de la pantalla (el mismo que usa el borrado de una fila). Se crea en un contexto de inyección.
 */
export class FleetListActions<T extends { id: string }> {
  private readonly dialog = inject(MatDialog);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly deleter: DeleteFlow,
    private readonly config: FleetListConfig<T>,
  ) {}

  removeMany(rows: readonly T[], clear: () => void): void {
    const { singular, plural } = this.config;
    this.deleter.success.set(null);
    this.deleter.error.set(null);
    deleteMany(this.dialog, {
      singular,
      plural,
      targets: rows.map((row) => ({ id: row.id, label: this.config.label(row) })),
      remove: this.config.remove,
      byStatus: this.config.byStatus,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        const { success, error } = bulkDeleteMessages(result, singular, plural);
        this.deleter.success.set(success);
        this.deleter.error.set(error);
        clear();
        this.config.reload();
      });
  }

  /** Descarga las filas (ya están cargadas: no hace falta pedirlas otra vez) en un CSV con la fecha en el nombre. */
  exportRows(rows: readonly T[]): void {
    const { singular, plural } = this.config;
    const fileName = csvFileName(this.config.fileBase);
    this.deleter.error.set(null);
    downloadCsv(fileName, this.config.csv(rows), this.platformId);
    this.deleter.success.set(`Se ${rows.length === 1 ? `exportó 1 ${singular}` : `exportaron ${rows.length} ${plural}`} a ${fileName}`);
  }
}
