import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';

import { DiffRow } from './audit-diff';

/**
 * «Qué cambió»: cada campo con su valor de antes y su valor de después a los lados de una flecha, el de antes tachado y en tono de
 * error y el de después en negrita y en tono de éxito (el color nunca es la única señal: cada lado lleva su rótulo «Antes» o
 * «Después» y los campos cambiados una etiqueta «Cambió»). Los campos que no cambiaron quedan en gris, con un signo igual.
 */
@Component({
  selector: 'app-audit-changes',
  imports: [MatIconModule, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './audit-changes.component.html',
  styleUrl: './audit-changes.component.scss',
})
export class AuditChangesComponent {
  readonly rows = input.required<readonly DiffRow[]>();

  protected readonly hasChanges = computed(() => this.rows().some((row) => row.changed));
}
