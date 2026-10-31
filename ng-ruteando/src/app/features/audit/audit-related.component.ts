import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { AuditLog } from '../../core/api/models';
import { formatDateTime, formatRelativeTime } from '../../shared/format';
import { StatusTone } from '../../shared/ui/status-tone';

import { auditActionLabel, auditActor, auditKind, auditKindIcon, auditKindTone } from './audit-labels';

interface RelatedItem {
  log: AuditLog;
  action: string;
  tone: StatusTone;
  icon: string;
  who: string;
  relative: string;
  exact: string;
}

/**
 * Otros eventos de la misma cosa (la entidad del evento abierto) como una línea de tiempo corta: cada punto lleva el color y el
 * glifo de su tipo de acción, qué se hizo, quién y hace cuánto. Cada uno es un botón que abre ese evento en la misma modal.
 */
@Component({
  selector: 'app-audit-related',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './audit-related.component.html',
  styleUrl: './audit-related.component.scss',
})
export class AuditRelatedComponent {
  readonly events = input.required<readonly AuditLog[]>();

  /** Se eligió uno de los eventos de la línea de tiempo. */
  readonly picked = output<AuditLog>();

  protected readonly items = computed<RelatedItem[]>(() =>
    this.events().map((log) => {
      const kind = auditKind(log.action);
      return {
        log,
        action: auditActionLabel(log.action),
        tone: auditKindTone(kind),
        icon: auditKindIcon(kind),
        who: auditActor(log).person,
        relative: formatRelativeTime(log.createdAt),
        exact: formatDateTime(log.createdAt),
      };
    }),
  );
}
