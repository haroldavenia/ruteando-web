import { Signal, effect } from '@angular/core';
import { EMPTY } from 'rxjs';

import { AuditLog } from '../../core/api/models';
import { ListState } from '../../shared/data/list-state';

import { AuditFilters, applyAuditFilters } from './audit-filters';
import { AuditStore } from './audit.store';

export const FORBIDDEN_MESSAGE = 'No tienes permiso para ver este registro de auditoría';

/**
 * Lo que ve la tabla: los eventos del almacén ya pasados por los filtros que la tabla no tiene (rango, tipo, persona...). No pide
 * nada por su cuenta; «Reintentar» recarga el almacén. Si hay eventos pero los filtros no dejan ninguno sigue `ready`, para que la
 * tabla diga «No hay resultados» y no «Todavía no hay eventos». `total` es lo que dejan los filtros, no lo que informa el gateway.
 */
export class AuditViewState extends ListState<AuditLog> {
  override readonly clientSide: boolean = true;

  constructor(
    private readonly store: AuditStore,
    filters: Signal<AuditFilters>,
    now: () => number = Date.now,
  ) {
    super(() => EMPTY);
    effect(() => {
      const rows = applyAuditFilters(store.events(), filters(), now());
      const status = store.source.status();
      const error = store.errorStatus() === 403 ? FORBIDDEN_MESSAGE : store.source.error();
      this.rows.set(rows);
      this.total.set(rows.length);
      this.error.set(error);
      this.status.set(status);
    });
  }

  override load(): void {
    this.store.refresh();
  }
}
