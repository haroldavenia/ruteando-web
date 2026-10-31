import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { AuditLog } from '../../core/api/models';
import { formatRelativeTime } from '../../shared/format';

import { formatLongDateTime } from './audit-format';
import { actorInitials, auditActor, auditEntityLabel, shortId } from './audit-labels';

/**
 * Las cuatro cosas que dice un evento, cada una en su tarjeta: quién (con avatar de iniciales y su rol), cuándo (hace cuánto y la
 * fecha exacta), sobre qué (el tipo y la cola de su identificador) y, si el ámbito la entrega, desde qué dirección IP.
 */
@Component({
  selector: 'app-audit-facts',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './audit-facts.component.html',
  styleUrl: './audit-facts.component.scss',
})
export class AuditFactsComponent {
  readonly log = input.required<AuditLog>();

  protected readonly actor = computed(() => auditActor(this.log()));
  /** Sin correo no hay iniciales que mostrar: el avatar lleva un icono. */
  protected readonly initials = computed(() => (this.actor().identified ? actorInitials(this.actor().person) : ''));
  protected readonly entity = computed(() => auditEntityLabel(this.log().entityType));
  protected readonly entityTail = computed(() => shortId(this.log().entityId));
  protected readonly relative = computed(() => formatRelativeTime(this.log().createdAt));
  protected readonly when = computed(() => formatLongDateTime(this.log().createdAt));
}
