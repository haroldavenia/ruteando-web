import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { AuditLog } from '../../core/api/models';
import { formatDateTime, formatRelativeTime } from '../../shared/format';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';

import { auditActionLabel, auditActor, auditEntityLabel, auditKind, auditKindTone } from './audit-labels';

/**
 * Un evento como tarjeta, para la vista de tarjetas del listado: solo lo esencial —la acción como etiqueta, cuándo fue, quién y
 * sobre qué tipo de cosa—. Toda la tarjeta es un botón (con el ojo como pista) que abre la modal con el detalle completo. Con los
 * datos técnicos añade la clave de la acción.
 */
@Component({
  selector: 'app-audit-event-card',
  imports: [MatIconModule, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './audit-event-card.component.html',
  styleUrl: './audit-event-card.component.scss',
})
export class AuditEventCardComponent {
  readonly log = input.required<AuditLog>();
  readonly technical = input(false);

  /** Se pidió el detalle de este evento. */
  readonly opened = output<AuditLog>();

  protected readonly action = computed(() => auditActionLabel(this.log().action));
  protected readonly tone = computed(() => auditKindTone(auditKind(this.log().action)));
  protected readonly entity = computed(() => auditEntityLabel(this.log().entityType));
  protected readonly actor = computed(() => {
    const actor = auditActor(this.log());
    return actor.role ? `${actor.person} · ${actor.role}` : actor.person;
  });
  protected readonly relative = computed(() => formatRelativeTime(this.log().createdAt));
  protected readonly exact = computed(() => formatDateTime(this.log().createdAt));
  protected readonly label = computed(() => `Ver el detalle de «${this.action()}» de ${auditActorPerson(this.log())}`);
}

const auditActorPerson = (log: AuditLog): string => auditActor(log).person;
