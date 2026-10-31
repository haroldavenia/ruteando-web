import { Location, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';

import { CurrentUser } from '../../core/auth/current-user';
import { AuditLog } from '../../core/api/models';
import { downloadCsv } from '../../shared/data/csv';
import { DataColumn, DataFacet, DataTableComponent } from '../../shared/data/data-table.component';
import { PageHeaderComponent } from '../../shared/data/page-header.component';
import { readPref, writePref } from '../../shared/data/list-prefs';
import { notify } from '../../shared/form/notify';
import { formatDateTime } from '../../shared/format';
import { ActionTitleDirective } from '../../shared/ui/action-title.directive';

import { ActivityPanelComponent, PickedDays } from './activity-panel.component';
import type { AuditDetailData, AuditDetailDialogComponent, AuditDetailResult } from './audit-detail-dialog.component';
import { AuditEventCardComponent } from './audit-event-card.component';
import { AuditFiltersBarComponent } from './audit-filters-bar.component';
import { AuditFilters, AuditQuery, EMPTY_QUERY, parseAuditQuery, toQueryParams } from './audit-filters';
import { formatClock, formatNumber } from './audit-format';
import { auditCsvFileName, auditToCsv } from './audit-export';
import { AuditKind, auditActionLabel, auditActor, auditEntityLabel, auditKind, auditKindTone } from './audit-labels';
import { AuditScopeId, resolveScope, scopesFor } from './audit-scopes';
import { AuditViewState } from './audit-view-state';
import { AuditStore } from './audit.store';

const TECH_KEY = 'ruteando-audit-tech';
const SEARCH_DELAY_MS = 250;

/**
 * Auditoría: qué se hizo, quién y cuándo. Los eventos del ámbito (empresa, propia actividad o todas las empresas) se traen enteros
 * (`AuditStore`) y se filtran aquí; la dirección de la página es la única fuente de verdad de los filtros, de modo que una vista se
 * comparte con un enlace. La tabla (`DataTableComponent`) pone la búsqueda y el chip de entidad, esta pantalla el resto.
 */
@Component({
  selector: 'app-audit-list',
  imports: [
    DataTableComponent,
    PageHeaderComponent,
    ActivityPanelComponent,
    AuditFiltersBarComponent,
    AuditEventCardComponent,
    ActionTitleDirective,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  providers: [AuditStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './audit-list.component.html',
  styleUrl: './audit-list.component.scss',
})
export class AuditListComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly dialog = inject(MatDialog);
  private readonly location = inject(Location);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly role = inject(CurrentUser).role;
  private readonly table = viewChild<DataTableComponent<AuditLog>>(DataTableComponent);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private searchPending = false;
  /** La modal de detalle que está abierta y de qué evento. */
  private detail: MatDialogRef<AuditDetailDialogComponent, AuditDetailResult> | null = null;
  private detailId: string | null = null;
  /** La dirección se empujó al abrir la modal (cerrarla es volver atrás) en lugar de abrirse con un enlace. */
  private pushedForDetail = false;

  protected readonly store = inject(AuditStore);

  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });

  /** Lo que dice la dirección, con el ámbito ya resuelto para el rol. */
  protected readonly query = computed<AuditQuery>(() => {
    const parsed = parseAuditQuery(this.params());
    return { ...parsed, scope: resolveScope(this.role(), parsed.scope) };
  });

  protected readonly filters = computed<AuditFilters>(() => {
    const { kind, person, range, from, to, onlyChanges, entityId } = this.query();
    // En «Mi actividad» todos los eventos son de la misma persona: un filtro de persona de la dirección no pinta nada
    return { kind, person: this.query().scope === 'mia' ? null : person, range, from, to, onlyChanges, entityId };
  });

  protected readonly state = new AuditViewState(this.store, this.filters);

  protected readonly scopes = computed(() => scopesFor(this.role()));
  protected readonly scope = computed(() => this.query().scope ?? this.scopes()[0].id);
  protected readonly title = computed(() => (this.role() === 'agent' ? 'Mi actividad' : 'Auditoría'));
  protected readonly isAllTenants = computed(() => this.scope() === 'todas');
  protected readonly showPeople = computed(() => this.scope() !== 'mia');
  protected readonly intro = computed(() =>
    this.scope() === 'mia'
      ? 'Aquí ves lo que has hecho en la aplicación y cuándo. Pulsa el ojo de un evento para ver todo su detalle.'
      : 'Aquí se registra lo que ocurre en la cuenta: qué se hizo, quién lo hizo y cuándo. Usa los filtros para encontrar algo y pulsa el ojo de un evento para ver todo su detalle.',
  );

  /** Lo que se escribe en el campo de búsqueda de la tabla, que se pasa a la dirección con un pequeño retraso. */
  protected readonly searchText = signal(parseAuditQuery(this.route.snapshot.queryParamMap).text);
  protected readonly tenantDraft = signal(parseAuditQuery(this.route.snapshot.queryParamMap).tenant);
  protected readonly technical = signal(readPref(TECH_KEY, ['on', 'off'], 'off', this.browser) === 'on');

  /**
   * La tabla ya recibió sus entradas. Antes de eso su `filtered()` falla (la consulta de vista la encuentra al crearse, pero el
   * `state` se enlaza después), así que hasta entonces —y en el servidor— se usan los eventos que dejan los filtros propios.
   */
  private readonly tableReady = signal(false);

  /** Lo que dejan la búsqueda y el chip de la tabla además de los filtros: de aquí salen el resumen y la exportación. */
  protected readonly visibleRows = computed(() => (this.tableReady() ? this.table()?.filtered() : undefined) ?? this.state.rows());

  protected readonly people = computed(() =>
    [...new Set(this.store.events().map((log) => log.actorEmail?.trim()).filter((email): email is string => !!email))].sort((a, b) => a.localeCompare(b)),
  );
  protected readonly hasUnidentified = computed(() => this.store.events().some((log) => !log.actorEmail?.trim()));
  protected readonly entityFilterLabel = computed(() => {
    const id = this.query().entityId;
    const match = id ? this.store.events().find((log) => log.entityId === id) : undefined;
    return match ? auditEntityLabel(match.entityType) : null;
  });

  protected readonly subtitle = computed(() => {
    if (this.state.status() !== 'ready') {
      return null;
    }
    const all = this.store.events().length;
    const shown = this.visibleRows().length;
    const count = shown === all ? plural(all) : `${formatNumber(shown)} de ${plural(all)}`;
    const updated = this.store.updatedAt();
    return updated ? `${count} · actualizado a las ${formatClock(updated)}` : count;
  });

  /** Lo que anuncia un lector de pantalla cuando cambian los filtros: cuántos eventos quedan. */
  protected readonly liveCount = computed(() => {
    if (this.state.status() !== 'ready') {
      return '';
    }
    const all = this.store.events().length;
    const shown = this.visibleRows().length;
    return shown === all ? plural(all) : `${formatNumber(shown)} de ${plural(all)}`;
  });

  protected readonly truncatedNotice = computed(() => {
    if (!this.store.source.truncated()) {
      return null;
    }
    return `Se muestran los ${formatNumber(this.store.source.rows().length)} eventos más recientes de ${formatNumber(this.store.source.total())}`;
  });

  protected readonly forbidden = computed(() => this.state.status() === 'error' && this.store.errorStatus() === 403 && this.scope() !== 'mia');

  protected readonly facet = computed<DataFacet<AuditLog>>(() => {
    const types = [...new Set(this.store.events().map((log) => log.entityType))].sort((a, b) => auditEntityLabel(a).localeCompare(auditEntityLabel(b)));
    return { label: 'Tipo de entidad', of: (log) => log.entityType, options: types.map((key) => ({ key, label: auditEntityLabel(key) })) };
  });

  protected readonly columns = computed<DataColumn<AuditLog>[]>(() => {
    // Solo lo esencial: qué se hizo, quién y cuándo. Todo lo demás (a qué afectó, qué cambió, claves e identificadores) está en la modal
    return [
      { id: 'action', header: 'Acción', cell: (log) => auditActionLabel(log.action), tone: (log) => auditKindTone(auditKind(log.action)), primary: true },
      { id: 'actor', header: 'Quién', cell: (log) => this.actorText(log) },
      { id: 'when', header: 'Cuándo', cell: (log) => formatDateTime(log.createdAt), kind: 'muted' },
      ...(this.technical() ? [{ id: 'key', header: 'Clave', cell: (log: AuditLog) => log.action, kind: 'id' as const }] : []),
    ];
  });

  /** El nombre accesible del ojo de una fila: qué evento abre. */
  protected eyeLabel(log: AuditLog): string {
    return `Ver el detalle de «${auditActionLabel(log.action)}» de ${auditActor(log).person}`;
  }

  constructor() {
    effect(() => {
      const { scope, tenant } = this.query();
      untracked(() => this.store.open(scope ?? this.scopes()[0].id, tenant));
    });
    // La búsqueda de la dirección manda cuando cambia por otra vía (atrás, un enlace); mientras se escribe, manda lo escrito
    effect(() => {
      const text = this.query().text;
      untracked(() => {
        if (!this.searchPending && text !== this.searchText().trim()) {
          this.searchText.set(text);
        }
      });
    });
    effect(() => {
      const tenant = this.query().tenant;
      untracked(() => this.tenantDraft.set(tenant));
    });
    // La modal sigue a la dirección (`?evento=`): se abre con el ojo, con un enlace o con «adelante», y se cierra con «atrás»
    effect(() => {
      const id = this.query().event;
      const status = this.state.status();
      untracked(() => this.syncDetail(id, status));
    });
    afterNextRender(() => this.tableReady.set(true));
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.searchTimer);
      this.detail?.close();
    });
  }

  protected actorText(log: AuditLog): string {
    const actor = auditActor(log);
    return actor.role ? `${actor.person} · ${actor.role}` : actor.person;
  }

  // ---------- Escribir en la dirección ----------

  /** Cambia partes de la vista y las deja en la dirección; lo que vale su valor por defecto no se escribe. */
  protected patch(change: Partial<AuditQuery>, replaceUrl = false): void {
    const next = { ...this.query(), ...change };
    if (next.scope === resolveScope(this.role(), null)) {
      next.scope = null;
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams: toQueryParams(next), queryParamsHandling: 'merge', replaceUrl });
  }

  protected changeFilters(change: Partial<AuditFilters>): void {
    this.patch(change);
  }

  protected clearAll(): void {
    this.patch({ ...EMPTY_QUERY, scope: this.query().scope, tenant: this.query().tenant });
    this.searchText.set('');
    this.table()?.filter.set('');
    this.table()?.facetKey.set(null);
  }

  protected chooseScope(change: MatButtonToggleChange): void {
    this.patch({ scope: change.value as AuditScopeId });
  }

  protected setTenantDraft(event: Event): void {
    this.tenantDraft.set((event.target as HTMLInputElement).value);
  }

  protected submitTenant(event: Event): void {
    event.preventDefault();
    this.patch({ tenant: this.tenantDraft().trim() });
  }

  protected setEntity(key: string | null): void {
    if (key !== this.query().entity) {
      this.patch({ entity: key });
    }
  }

  /** La búsqueda de la tabla: se reescribe la dirección al dejar de teclear, sin llenar el historial de una entrada por letra. */
  protected setText(value: string): void {
    this.searchText.set(value);
    this.searchPending = true;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchPending = false;
      if (value.trim() !== this.query().text) {
        this.patch({ text: value.trim() }, true);
      }
    }, SEARCH_DELAY_MS);
  }

  protected setTechnical(on: boolean): void {
    this.technical.set(on);
    writePref(TECH_KEY, on ? 'on' : 'off', this.browser);
  }

  protected pickDay(days: PickedDays): void {
    this.patch({ range: 'personalizado', from: days.from, to: days.to });
  }

  protected pickKind(kind: AuditKind): void {
    this.patch({ kind: this.query().kind === kind ? null : kind });
  }

  protected showMine(): void {
    this.patch({ scope: 'mia' });
  }

  // ---------- Detalle y exportación ----------

  /** El ojo de una fila (o la tarjeta): pone el evento en la dirección y la modal se abre con ella. */
  protected open(log: AuditLog): void {
    this.pushedForDetail = true;
    this.patch({ event: log.id });
  }

  /**
   * Abre o cierra la modal según lo que diga la dirección. Espera a que el listado deje de cargar para usar el evento que ya tiene;
   * si el evento no está entre los traídos (un enlace antiguo, uno de más allá del tope) la modal lo pide por su identificador.
   */
  private syncDetail(id: string | null, status: string): void {
    if (id === null) {
      this.detail?.close();
      return;
    }
    if (this.detailId === id || status === 'loading') {
      return;
    }
    this.detail?.close();
    this.detailId = id;
    void this.openDetail(id);
  }

  /** La modal se descarga la primera vez que se abre un evento: el listado no la necesita hasta entonces. */
  private async openDetail(id: string): Promise<void> {
    const { AuditDetailDialogComponent: Dialog } = await import('./audit-detail-dialog.component');
    if (this.detailId !== id || this.query().event !== id) {
      return; // la dirección cambió mientras se descargaba
    }
    const log = this.store.events().find((event) => event.id === id) ?? null;
    const ref = this.dialog.open<AuditDetailDialogComponent, AuditDetailData, AuditDetailResult>(Dialog, {
      // Para la línea de tiempo «Más de esta entidad»: los eventos que ya se trajeron de la misma entidad
      data: { id, log, related: (current) => this.store.events().filter((event) => event.entityId === current.entityId && event.id !== current.id) },
      width: '760px',
      maxWidth: 'calc(100vw - 16px)',
      maxHeight: 'calc(100dvh - 16px)',
      autoFocus: 'dialog',
      // La modal sigue a la dirección: si Material la cerrara por su cuenta al volver atrás, el cierre pediría otro «atrás»
      closeOnNavigation: false,
    });
    this.detail = ref;
    ref.afterClosed().subscribe((result) => this.detailClosed(ref, id, result));
  }

  private detailClosed(ref: MatDialogRef<AuditDetailDialogComponent, AuditDetailResult>, id: string, result: AuditDetailResult | undefined): void {
    if (this.detail === ref) {
      this.detail = null;
      this.detailId = null;
    }
    const pushed = this.pushedForDetail;
    this.pushedForDetail = false;
    if (result?.entityId) {
      this.patch({ event: null, entityId: result.entityId });
    } else if (result?.eventId) {
      // Otro evento de la línea de tiempo: se cambia el de la dirección sin añadir historial y «atrás» sigue cerrando la modal
      this.pushedForDetail = pushed;
      this.patch({ event: result.eventId }, true);
    } else if (this.query().event === id) {
      // Cerrada con el botón o con Escape y la dirección aún la lleva: se quita (volviendo atrás si la empujamos al abrirla)
      if (pushed) {
        this.location.back();
      } else {
        this.patch({ event: null }, true);
      }
    }
  }

  protected exportCsv(rows: readonly AuditLog[] = this.visibleRows()): void {
    if (rows.length === 0) {
      return;
    }
    if (downloadCsv(auditCsvFileName(), auditToCsv(rows), this.platformId)) {
      void notify(this.injector, `Se exportaron ${rows.length === 1 ? '1 evento' : `${formatNumber(rows.length)} eventos`}`);
    }
  }
}

const plural = (count: number): string => `${formatNumber(count)} ${count === 1 ? 'evento' : 'eventos'}`;
