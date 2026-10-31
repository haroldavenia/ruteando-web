import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuditLog } from '../../core/api/models';
import { ActionTitleDirective } from '../../shared/ui/action-title.directive';

import { copyToClipboard } from './audit-clipboard';
import { formatUtc } from './audit-format';

/**
 * Lo que necesita quien cruza un evento con otros sistemas: la clave de la acción y del tipo de entidad, los identificadores (con
 * botón para copiarlos), el instante en UTC, el rol tal como lo manda el gateway, la descripción original y los cambios en JSON.
 * Va plegado salvo que la persona haya elegido ver los datos técnicos.
 */
@Component({
  selector: 'app-audit-tech',
  imports: [MatButtonModule, MatIconModule, ActionTitleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './audit-tech.component.html',
  styleUrl: './audit-tech.component.scss',
})
export class AuditTechComponent {
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  readonly log = input.required<AuditLog>();
  readonly open = input(false);

  protected readonly utc = computed(() => formatUtc(this.log().createdAt));
  protected readonly changesJson = computed(() => (this.log().changes ? JSON.stringify(this.log().changes, null, 2) : ''));

  protected copy(text: string, what: string): Promise<void> {
    return copyToClipboard(this.document, this.injector, text, what);
  }
}
