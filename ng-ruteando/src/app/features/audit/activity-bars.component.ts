import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { AuditLog } from '../../core/api/models';

import { formatDayKey, formatLongDayKey, formatNumber } from './audit-format';
import { AuditFilters } from './audit-filters';
import { ActivityBucket, activityByDay } from './audit-stats';

import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
/** Los días elegidos: el de una barra, o la semana que agrupa. */
export interface PickedDays {
  from: string;
  to: string;
}

const eventCount = (count: number): string => (count === 1 ? t('1 evento') : t('{0} eventos', [formatNumber(count)]));

/**
 * Eventos por día (o por semana si el rango es largo) como barras. Cada barra es un botón que filtra el listado a ese día; el
 * gráfico trae su resumen en texto y una tabla con los mismos datos, para quien no lo ve y para quien prefiere leer los números.
 */
@Component({
  selector: 'app-activity-bars',
  imports: [MatButtonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './activity-bars.component.html',
  styleUrl: './activity-bars.component.scss',
})
export class ActivityBarsComponent {
  readonly rows = input.required<readonly AuditLog[]>();
  readonly filters = input.required<Pick<AuditFilters, 'range' | 'from' | 'to'>>();

  readonly dayPicked = output<PickedDays>();

  protected readonly buckets = computed(() => activityByDay(this.rows(), this.filters()));
  protected readonly peak = computed(() => Math.max(0, ...this.buckets().map((bucket) => bucket.count)));
  protected readonly weekly = computed(() => this.buckets().some((bucket) => bucket.weekly));
  /** Con pocas barras cabe el número de eventos sobre cada una; con muchas queda en el título de la barra. */
  protected readonly showValues = computed(() => this.buckets().length <= 14);

  /** El resumen en una frase, para quien no ve las barras. */
  protected readonly summary = computed(() => {
    const buckets = this.buckets();
    const total = this.rows().length;
    if (buckets.length === 0 || total === 0) {
      return t('No hay eventos en este rango.');
    }
    const weekly = this.weekly();
    const top = buckets.reduce((best, bucket) => (bucket.count > best.count ? bucket : best), buckets[0]);
    const events = eventCount(total);
    const day = formatLongDayKey(top.from);
    const peak = formatNumber(top.count);
    return weekly
      ? t('{0} en {1}; la semana con más actividad fue la semana del {2}, con {3}.', [
          events,
          buckets.length === 1 ? t('1 semana') : t('{0} semanas', [buckets.length]),
          day,
          peak,
        ])
      : t('{0} en {1}; el día con más actividad fue el {2}, con {3}.', [
          events,
          buckets.length === 1 ? t('1 día') : t('{0} días', [buckets.length]),
          day,
          peak,
        ]);
  });

  protected height(bucket: ActivityBucket): number {
    return bucket.count === 0 ? 0 : Math.max(6, Math.round((bucket.count / this.peak()) * 100));
  }

  protected label(bucket: ActivityBucket): string {
    return bucket.weekly
      ? t('Semana del {0} al {1}', [formatDayKey(bucket.from), formatDayKey(bucket.to)])
      : formatLongDayKey(bucket.from);
  }

  protected title(bucket: ActivityBucket): string {
    const partial = bucket.partial ? t(' (hoy, el día no ha terminado)') : '';
    return `${this.label(bucket)}: ${eventCount(bucket.count)}${partial}`;
  }

  protected tick(bucket: ActivityBucket): string {
    return formatDayKey(bucket.from);
  }

  /** Con muchas barras solo se rotulan unas cuantas, para que las etiquetas no se amontonen. */
  protected showTick(index: number): boolean {
    const total = this.buckets().length;
    return total <= 8 || index % Math.ceil(total / 6) === 0 || index === total - 1;
  }

  protected isPicked(bucket: ActivityBucket): boolean {
    const filters = this.filters();
    return filters.range === 'personalizado' && filters.from === bucket.from && filters.to === bucket.to;
  }
}
