import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, ViewEncapsulation, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuditLog } from '../../core/api/models';
import { readPref, writePref } from '../../shared/data/list-prefs';
import { formatRelativeTime } from '../../shared/format';

import { ActivityBarsComponent, PickedDays } from './activity-bars.component';
import { ActivitySharesComponent } from './activity-shares.component';
import { formatNumber } from './audit-format';
import { AuditFilters } from './audit-filters';
import { AuditKind, auditEntityLabel } from './audit-labels';
import { summarize } from './audit-stats';

export type { PickedDays };

const PANEL_KEY = 'ruteando-audit-panel';

/**
 * Resumen de la actividad de los eventos que se ven: cuatro cifras, las barras de eventos por día y el reparto por tipo de
 * acción (cada gráfico es su propio componente). Las barras y los tipos filtran el listado (avisan; la pantalla escribe el
 * filtro). Se puede plegar y se recuerda.
 */
@Component({
  selector: 'app-activity-panel',
  imports: [MatButtonModule, MatIconModule, ActivityBarsComponent, ActivitySharesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './activity-panel.component.html',
  styleUrl: './activity-panel.component.scss',
})
export class ActivityPanelComponent {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Los eventos sobre los que se resume: los que dejan la búsqueda y los filtros. */
  readonly rows = input.required<readonly AuditLog[]>();
  readonly filters = input.required<Pick<AuditFilters, 'range' | 'from' | 'to' | 'kind'>>();
  /** La cifra de personas activas no dice nada si todos los eventos son de la misma persona («Mi actividad»). */
  readonly showPeople = input(true);

  readonly dayPicked = output<PickedDays>();
  readonly kindPicked = output<AuditKind>();

  protected readonly open = signal(readPref(PANEL_KEY, ['open', 'closed'], 'open', this.browser) === 'open');

  protected readonly summary = computed(() => summarize(this.rows()));
  protected readonly topEntity = computed(() => {
    const top = this.summary().topEntity;
    return top ? `${auditEntityLabel(top.type)} · ${formatNumber(top.count)}` : '—';
  });
  protected readonly lastEvent = computed(() => (this.summary().last ? formatRelativeTime(this.summary().last) : '—'));

  protected toggle(): void {
    this.open.update((value) => !value);
    writePref(PANEL_KEY, this.open() ? 'open' : 'closed', this.browser);
  }
}
