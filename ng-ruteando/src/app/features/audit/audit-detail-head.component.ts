import { ChangeDetectionStrategy, Component, ViewEncapsulation, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ActionTitleDirective } from '../../shared/ui/action-title.directive';

/**
 * Cabecera de la modal de detalle: un glifo grande, el tipo de acción en versalitas, el título de la modal (el que la nombra para los
 * lectores de pantalla), hace cuánto y el botón de cerrar. Su color (`--tone-bg` y `--tone-fg`) lo pone la modal según el tipo de
 * acción.
 */
@Component({
  selector: 'app-audit-detail-head',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, ActionTitleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './audit-detail-head.component.html',
  styleUrl: './audit-detail-head.component.scss',
})
export class AuditDetailHeadComponent {
  readonly icon = input.required<string>();
  /** El tipo de la acción («Cambio de estado»). */
  readonly kicker = input.required<string>();
  readonly title = input.required<string>();
  /** Hace cuánto fue; vacío mientras no se conoce el evento. */
  readonly when = input<string | null>(null);

  readonly closed = output<void>();
}
