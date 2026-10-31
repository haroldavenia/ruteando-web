import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { Page, PageParams } from '../../core/api/api-config';
import { ApiError } from '../../core/api/api-error';
import { AuditLogsApi } from '../../core/api/data/audit-logs.api';
import { AuditLog } from '../../core/api/models';
import { FullListState } from '../../shared/data/full-list-state';

import { AuditScopeId } from './audit-scopes';

const newestFirst = (a: AuditLog, b: AuditLog): number => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);

/**
 * Los eventos de un ámbito, todos en el cliente (páginas de 100 hasta el tope de `FullListState`). Se provee en la pantalla del
 * listado, no en la raíz: vive lo que ella. Cambiar de ámbito o de empresa cancela la carga anterior y empieza otra.
 */
@Injectable()
export class AuditStore {
  private readonly api = inject(AuditLogsApi);
  private opened = false;

  readonly scope = signal<AuditScopeId>('mia');
  /** Empresa a la que se limita «Todas las empresas» (vacío = todas). */
  readonly tenant = signal('');
  /** Estado HTTP del último fallo, para poder ofrecer otra salida ante un 403. */
  readonly errorStatus = signal<number | null>(null);
  /** Instante de la última carga terminada. */
  readonly updatedAt = signal<number | null>(null);

  readonly source = new FullListState<AuditLog>((params) => this.fetch(params));
  /** Los eventos traídos, del más reciente al más antiguo (el gateway ya los manda así; no se depende de ello). */
  readonly events = computed(() => [...this.source.rows()].sort(newestFirst));

  constructor() {
    effect(() => {
      const status = this.source.status();
      if (status === 'ready' || status === 'empty') {
        untracked(() => this.updatedAt.set(Date.now()));
      }
    });
  }

  /** Empieza a mostrar un ámbito; si ya es el que se muestra no vuelve a pedir nada. */
  open(scope: AuditScopeId, tenant: string): void {
    const effectiveTenant = scope === 'todas' ? tenant : '';
    if (this.opened && scope === this.scope() && effectiveTenant === this.tenant()) {
      return;
    }
    this.opened = true;
    this.scope.set(scope);
    this.tenant.set(effectiveTenant);
    this.source.load();
  }

  refresh(): void {
    this.source.load();
  }

  private fetch(params: PageParams): Observable<Page<AuditLog>> {
    this.errorStatus.set(null);
    const request =
      this.scope() === 'empresa'
        ? this.api.list(params)
        : this.scope() === 'todas'
          ? this.api.listAll(params, this.tenant() || null)
          : this.api.listMine(params);
    return request.pipe(tap({ error: (error: unknown) => this.errorStatus.set(error instanceof ApiError ? error.status : null) }));
  }
}
