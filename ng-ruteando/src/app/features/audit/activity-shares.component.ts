import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { AuditLog } from '../../core/api/models';
import { formatPercent } from '../../shared/format';
import { StatusTone } from '../../shared/ui/status-tone';

import { formatNumber } from './audit-format';
import { AuditKind, auditKindIcon, auditKindLabel, auditKindTone } from './audit-labels';
import { KindShare, kindShares } from './audit-stats';

/**
 * Cómo se reparten los eventos entre los seis tipos de acción: una barra apilada y, debajo, cada tipo con su glifo, su nombre, su
 * recuento y su porcentaje (el color nunca es la única señal). Cada tipo es un botón que filtra el listado.
 */
@Component({
  selector: 'app-activity-shares',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './activity-shares.component.html',
  styleUrl: './activity-shares.component.scss',
})
export class ActivitySharesComponent {
  readonly rows = input.required<readonly AuditLog[]>();
  /** El tipo que está filtrando el listado, si hay uno. */
  readonly kind = input<AuditKind | null>(null);

  readonly kindPicked = output<AuditKind>();

  protected readonly shares = computed(() => kindShares(this.rows()));
  protected readonly summary = computed(() =>
    this.shares()
      .map((share) => `${auditKindLabel(share.kind)}: ${formatNumber(share.count)} ${share.count === 1 ? 'evento' : 'eventos'} (${formatPercent(share.percent)})`)
      .join('; '),
  );

  protected readonly label = auditKindLabel;
  protected readonly icon = auditKindIcon;
  protected readonly percent = formatPercent;

  protected tone(kind: AuditKind): StatusTone {
    return auditKindTone(kind);
  }

  protected isPicked(share: KindShare): boolean {
    return this.kind() === share.kind;
  }
}
