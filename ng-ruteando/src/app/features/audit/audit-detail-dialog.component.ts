import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, PLATFORM_ID, ViewEncapsulation, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { ApiError } from '../../core/api/api-error';
import { AuditLogsApi } from '../../core/api/data/audit-logs.api';
import { AuditLog } from '../../core/api/models';
import { CurrentUser } from '../../core/auth/current-user';
import { readPref } from '../../shared/data/list-prefs';
import { RecordLoader } from '../../shared/data/record-loader';
import { formatRelativeTime } from '../../shared/format';

import { AuditChangesComponent } from './audit-changes.component';
import { AuditDetailHeadComponent } from './audit-detail-head.component';
import { copyToClipboard } from './audit-clipboard';
import { diffChanges } from './audit-diff';
import { AuditFactsComponent } from './audit-facts.component';
import { auditActionLabel, auditKind, auditKindIcon, auditKindLabel, auditKindTone, auditSummary, humanizeIds } from './audit-labels';
import { entityTarget, entityWasDeleted } from './audit-links';
import { AuditRelatedComponent } from './audit-related.component';
import { AuditTechComponent } from './audit-tech.component';

const TECH_KEY = 'ruteando-audit-tech';
/** Cuántos eventos de la misma entidad se ofrecen en la línea de tiempo. */
const RELATED_LIMIT = 5;

export const DIRECT_FORBIDDEN = 'No tienes permiso para abrir este evento directamente. Ábrelo desde la lista de tu actividad.';
export const EVENT_GONE = 'Este evento ya no existe o no está disponible.';

/** Qué se abre: el evento (ya a mano si el listado lo tiene) o solo su identificador, que se pide al gateway. */
export interface AuditDetailData {
  id: string;
  log: AuditLog | null;
  /** Otros eventos de la misma entidad que el listado ya tiene, del más reciente al más antiguo. */
  related?: (log: AuditLog) => readonly AuditLog[];
}

/**
 * Con qué se cierra la modal: `entityId` si se pidió ver todos los eventos de la entidad, `eventId` si se eligió otro evento de la
 * línea de tiempo; sin valor, solo se cerró.
 */
export interface AuditDetailResult {
  entityId?: string;
  eventId?: string;
}

/**
 * Modal con el detalle completo de un evento de auditoría. La cabecera lleva el color y el glifo de su tipo de acción; debajo, la
 * frase del evento, quién, cuándo y sobre qué (`AuditFactsComponent`), qué cambió (`AuditChangesComponent`), otros eventos de la
 * misma entidad (`AuditRelatedComponent`) y lo técnico, plegado (`AuditTechComponent`). Si el listado ya tiene el evento aparece de
 * inmediato; si no (enlace directo) se pide al gateway por su identificador.
 */
@Component({
  selector: 'app-audit-detail-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    AuditDetailHeadComponent,
    AuditFactsComponent,
    AuditChangesComponent,
    AuditRelatedComponent,
    AuditTechComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  // El tono (color) de la cabecera y de la frase sale del tipo de acción; mientras no hay evento es neutro
  host: { '[attr.data-tone]': 'tone()' },
  templateUrl: './audit-detail-dialog.component.html',
  styleUrl: './audit-detail-dialog.component.scss',
})
export class AuditDetailDialogComponent {
  private readonly api = inject(AuditLogsApi);
  private readonly dialogRef = inject<MatDialogRef<AuditDetailDialogComponent, AuditDetailResult>>(MatDialogRef);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly role = inject(CurrentUser).role;
  protected readonly data = inject<AuditDetailData>(MAT_DIALOG_DATA);

  protected readonly loader = new RecordLoader<AuditLog>(this.data.id, (id) =>
    this.api.get(id).pipe(
      catchError((error: unknown) =>
        throwError(() => (error instanceof ApiError && error.status === 403 ? new ApiError({ status: 403, message: DIRECT_FORBIDDEN }) : error)),
      ),
    ),
  );

  protected readonly log = this.loader.record;
  protected readonly technicalOpen = readPref(TECH_KEY, ['on', 'off'], 'off', this.browser) === 'on';

  protected readonly kind = computed(() => (this.log() ? auditKind(this.log()!.action) : 'otras'));
  protected readonly kindTone = computed(() => auditKindTone(this.kind()));
  protected readonly tone = computed(() => (this.loader.status() === 'ready' ? this.kindTone() : 'neutral'));
  protected readonly kindIcon = computed(() => auditKindIcon(this.kind()));
  protected readonly kindLabel = computed(() => auditKindLabel(this.kind()));
  protected readonly title = computed(() => (this.log() ? auditActionLabel(this.log()!.action) : 'Evento de auditoría'));
  protected readonly summary = computed(() => (this.log() ? humanizeIds(auditSummary(this.log()!)) : ''));
  /** La frase de la acción y la descripción dicen lo mismo: no se repite. */
  protected readonly showSummary = computed(() => this.summary() !== this.title());
  protected readonly relative = computed(() => formatRelativeTime(this.log()?.createdAt));
  protected readonly target = computed(() => (this.log() ? entityTarget(this.log()!, this.role()) : null));
  protected readonly deleted = computed(() => (this.log() ? entityWasDeleted(this.log()!) : false));
  protected readonly rows = computed(() => diffChanges(this.log()?.changes, this.log()?.entityType));
  protected readonly related = computed(() => {
    const log = this.log();
    return log && this.data.related ? this.data.related(log).slice(0, RELATED_LIMIT) : [];
  });

  protected readonly heading = computed(() => {
    switch (this.loader.status()) {
      case 'ready':
        return this.title();
      case 'loading':
        return 'Evento de auditoría';
      default:
        return 'No se pudo abrir el evento';
    }
  });
  protected readonly problem = computed(() => (this.loader.status() === 'missing' ? EVENT_GONE : this.loader.error()));

  constructor() {
    if (this.data.log) {
      this.loader.record.set(this.data.log);
      this.loader.status.set('ready');
    } else {
      this.loader.load(() => undefined);
    }
  }

  protected close(): void {
    this.dialogRef.close();
  }

  /** Cierra la modal y pide al listado que filtre por la entidad de este evento. */
  protected showEntityEvents(): void {
    const entityId = this.log()?.entityId;
    this.dialogRef.close(entityId ? { entityId } : undefined);
  }

  /** Cierra la modal y pide al listado que abra otro evento (el de la línea de tiempo que se eligió). */
  protected openRelated(log: AuditLog): void {
    this.dialogRef.close({ eventId: log.id });
  }

  /** La dirección de la página (lleva `?evento=`), para copiarla o compartirla. */
  protected link(): string {
    return this.document.defaultView?.location.href ?? '';
  }

  protected copy(text: string, what: string): Promise<void> {
    return copyToClipboard(this.document, this.injector, text, what);
  }
}
