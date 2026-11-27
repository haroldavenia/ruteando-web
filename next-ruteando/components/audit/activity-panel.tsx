'use client';

import type { RemixiconComponentType } from '@remixicon/react';
import {
  RiAddCircleLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiDeleteBinLine,
  RiEdit2Line,
  RiExchangeLine,
  RiGroupLine,
  RiHistoryLine,
  RiLoopLeftLine,
  RiMoreLine,
  RiShapesLine,
  RiTimeLine,
} from '@remixicon/react';
import { useMemo } from 'react';

import { toneClasses } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import type { AuditLog } from '@/lib/api/models';
import { type AuditFilters } from '@/lib/audit/filters';
import { makeAuditFormat } from '@/lib/audit/format';
import { auditEntityLabel, type AuditKind, auditKindLabel, auditKindTone } from '@/lib/audit/labels';
import { type ActivityBucket, activityByDay, kindShares, summarize } from '@/lib/audit/stats';
import { cn } from '@/lib/cn';
import { useFormat } from '@/lib/hooks/use-format';
import { useLang, useT } from '@/lib/i18n/client';
import { useStoredPref } from '@/lib/stored-pref';

/** Los días elegidos: el de una barra, o la semana que agrupa. */
export interface PickedDays {
  from: string;
  to: string;
}

const PANEL_KEY = 'ruteando-audit-panel';
const PANEL = ['open', 'closed'] as const;

const KIND_ICONS: Record<AuditKind, RemixiconComponentType> = {
  creacion: RiAddCircleLine,
  modificacion: RiEdit2Line,
  eliminacion: RiDeleteBinLine,
  estado: RiLoopLeftLine,
  asignacion: RiExchangeLine,
  otras: RiMoreLine,
};

/**
 * Resumen de la actividad de los eventos que se ven: cuatro cifras, las barras de eventos por día y el reparto por tipo de acción. Las
 * barras y los tipos filtran el listado (avisan; la pantalla escribe el filtro). Se puede plegar y se recuerda.
 */
export function ActivityPanel({
  rows,
  filters,
  showPeople,
  onDayPicked,
  onKindPicked,
}: {
  /** Los eventos sobre los que se resume: los que dejan la búsqueda y los filtros. */
  rows: readonly AuditLog[];
  filters: Pick<AuditFilters, 'range' | 'from' | 'to' | 'kind'>;
  /** La cifra de personas activas no dice nada si todos los eventos son de la misma persona («Mi actividad»). */
  showPeople: boolean;
  onDayPicked: (days: PickedDays) => void;
  onKindPicked: (kind: AuditKind) => void;
}) {
  const t = useT();
  const lang = useLang();
  const format = useFormat();
  const audit = useMemo(() => makeAuditFormat(lang), [lang]);
  const [panel, setPanel] = useStoredPref(PANEL_KEY, PANEL, 'open');
  const open = panel === 'open';
  const summary = useMemo(() => summarize(rows), [rows]);
  const top = summary.topEntity;
  const kpi = (icon: RemixiconComponentType, value: string, label: string, text = false) => (
    <li key={label} className="flex items-center gap-3 rounded-control bg-surface-container p-3">
      <span className="grid size-10 place-items-center rounded-full bg-secondary-container text-on-secondary-container">
        <Icon icon={icon} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={cn('font-brand font-bold', text ? 'truncate text-base' : 'text-2xl')}>{value}</span>
        <span className="text-sm text-on-surface-variant">{label}</span>
      </span>
    </li>
  );

  return (
    <Card aria-labelledby="audit-panel-title" className="mb-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="audit-panel-title" className="font-brand text-lg font-bold">
          {t('Resumen de la actividad')}
        </h2>
        <Button
          variant="text"
          aria-expanded={open}
          aria-controls="audit-panel-body"
          onClick={() => setPanel(open ? 'closed' : 'open')}
        >
          <Icon icon={open ? RiArrowUpSLine : RiArrowDownSLine} size={20} />
          {open ? t('Ocultar resumen') : t('Mostrar resumen')}
        </Button>
      </div>
      <div id="audit-panel-body" hidden={!open} className="mt-3 flex flex-col gap-4">
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
          {kpi(RiHistoryLine, String(summary.total), summary.total === 1 ? t('Evento') : t('Eventos'))}
          {showPeople
            ? kpi(
                RiGroupLine,
                String(summary.people),
                summary.people === 1 ? t('Persona activa') : t('Personas activas')
              )
            : null}
          {kpi(
            RiShapesLine,
            top ? `${auditEntityLabel(top.type, t)} · ${audit.number(top.count)}` : '—',
            t('Lo más modificado'),
            true
          )}
          {kpi(RiTimeLine, summary.last ? format.relativeTime(summary.last) : '—', t('Último evento'), true)}
        </ul>
        {rows.length === 0 ? (
          <p role="status" className="text-on-surface-variant">
            {t('No hay eventos para resumir con estos filtros.')}
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <ActivityBars rows={rows} filters={filters} onPicked={onDayPicked} />
            <ActivityShares rows={rows} kind={filters.kind} onPicked={onKindPicked} />
          </div>
        )}
      </div>
    </Card>
  );
}

const eventCount = (count: number, t: ReturnType<typeof useT>, fmt: (n: number) => string) =>
  count === 1 ? t('1 evento') : t('{0} eventos', [fmt(count)]);

/**
 * Eventos por día (o por semana si el rango es largo) como barras. Cada barra es un botón que filtra el listado a ese día; el gráfico
 * trae su resumen en texto y una tabla con los mismos datos, para quien no lo ve y para quien prefiere leer los números.
 */
function ActivityBars({
  rows,
  filters,
  onPicked,
}: {
  rows: readonly AuditLog[];
  filters: Pick<AuditFilters, 'range' | 'from' | 'to'>;
  onPicked: (days: PickedDays) => void;
}) {
  const t = useT();
  const lang = useLang();
  const audit = useMemo(() => makeAuditFormat(lang), [lang]);
  const buckets = useMemo(() => activityByDay(rows, filters), [rows, filters]);
  const peak = Math.max(0, ...buckets.map((b) => b.count));
  const weekly = buckets.some((b) => b.weekly);
  const showValues = buckets.length <= 14;
  const height = (b: ActivityBucket) => (b.count === 0 ? 0 : Math.max(6, Math.round((b.count / peak) * 100)));
  const label = (b: ActivityBucket) =>
    b.weekly ? t('Semana del {0} al {1}', [audit.dayKey(b.from), audit.dayKey(b.to)]) : audit.longDayKey(b.from);
  const title = (b: ActivityBucket) =>
    `${label(b)}: ${eventCount(b.count, t, audit.number)}${b.partial ? t(' (hoy, el día no ha terminado)') : ''}`;
  const isPicked = (b: ActivityBucket) =>
    filters.range === 'personalizado' && filters.from === b.from && filters.to === b.to;
  const showTick = (index: number) =>
    buckets.length <= 8 || index % Math.ceil(buckets.length / 6) === 0 || index === buckets.length - 1;

  /** El resumen en una frase, para quien no ve las barras. */
  const summary = (() => {
    if (buckets.length === 0 || rows.length === 0) return t('No hay eventos en este rango.');
    const best = buckets.reduce((acc, b) => (b.count > acc.count ? b : acc), buckets[0]!);
    const events = eventCount(rows.length, t, audit.number);
    const day = audit.longDayKey(best.from);
    const count = audit.number(best.count);
    return weekly
      ? t('{0} en {1}; la semana con más actividad fue la semana del {2}, con {3}.', [
          events,
          buckets.length === 1 ? t('1 semana') : t('{0} semanas', [buckets.length]),
          day,
          count,
        ])
      : t('{0} en {1}; el día con más actividad fue el {2}, con {3}.', [
          events,
          buckets.length === 1 ? t('1 día') : t('{0} días', [buckets.length]),
          day,
          count,
        ]);
  })();

  return (
    <figure aria-labelledby="audit-bars-title" className="m-0 flex flex-col gap-2">
      <figcaption id="audit-bars-title" className="flex flex-col">
        <b>{weekly ? t('Eventos por semana') : t('Eventos por día')}</b>
        <span className="text-sm text-on-surface-variant">
          {weekly ? t('Elige una semana para ver solo esos eventos') : t('Elige una barra para ver solo esos eventos')}
        </span>
      </figcaption>
      <div
        role="group"
        aria-labelledby="audit-bars-title"
        aria-describedby="audit-bars-summary"
        className="flex h-44 items-end gap-1"
      >
        {buckets.map((bucket, index) => (
          <button
            key={bucket.from}
            type="button"
            aria-pressed={isPicked(bucket)}
            aria-label={title(bucket)}
            title={title(bucket)}
            onClick={() => onPicked({ from: bucket.from, to: bucket.to })}
            className="group flex h-full min-w-0 flex-1 cursor-pointer flex-col items-stretch gap-1 rounded-sm"
          >
            <span className="flex flex-1 items-end">
              <span
                className={cn(
                  'relative block w-full rounded-t-sm bg-primary group-hover:brightness-110',
                  bucket.partial && 'opacity-70',
                  isPicked(bucket) && 'bg-tertiary',
                  bucket.count === 0 && 'bg-outline-variant'
                )}
                style={{ height: bucket.count === 0 ? '2px' : `${height(bucket)}%` }}
              >
                {showValues && bucket.count > 0 ? (
                  <span aria-hidden="true" className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs">
                    {bucket.count}
                  </span>
                ) : null}
              </span>
            </span>
            <span aria-hidden="true" className="h-4 truncate text-center text-[11px] text-on-surface-variant">
              {showTick(index) ? audit.dayKey(bucket.from) : ''}
            </span>
          </button>
        ))}
      </div>
      <p id="audit-bars-summary" className="text-sm text-on-surface-variant">
        {summary}
      </p>
      <details>
        <summary className="cursor-pointer text-sm">{t('Ver los datos en una tabla')}</summary>
        <table className="mt-2 w-full border-collapse text-start text-sm">
          <caption className="sr-only">{weekly ? t('Eventos por semana') : t('Eventos por día')}</caption>
          <thead>
            <tr className="border-b border-outline-variant">
              <th scope="col" className="py-1 text-start font-medium">
                {weekly ? t('Semana') : t('Día')}
              </th>
              <th scope="col" className="py-1 text-start font-medium">
                {t('Eventos')}
              </th>
              <th scope="col" className="py-1">
                <span className="sr-only">{t('Filtrar')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={bucket.from} className="border-b border-outline-variant last:border-b-0">
                <th scope="row" className="py-1 text-start font-normal">
                  {label(bucket)}
                  {bucket.partial ? ' (hoy)' : ''}
                </th>
                <td className="py-1">{bucket.count}</td>
                <td className="py-1 text-end">
                  <Button
                    variant="text"
                    aria-label={t('Ver solo los eventos de: ') + label(bucket)}
                    onClick={() => onPicked({ from: bucket.from, to: bucket.to })}
                  >
                    {t('Ver solo')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/**
 * Cómo se reparten los eventos entre los seis tipos de acción: una barra apilada y, debajo, cada tipo con su glifo, su nombre, su
 * recuento y su porcentaje (el color nunca es la única señal). Cada tipo es un botón que filtra el listado.
 */
function ActivityShares({
  rows,
  kind,
  onPicked,
}: {
  rows: readonly AuditLog[];
  kind: AuditKind | null;
  onPicked: (kind: AuditKind) => void;
}) {
  const t = useT();
  const lang = useLang();
  const audit = useMemo(() => makeAuditFormat(lang), [lang]);
  const shares = useMemo(() => kindShares(rows), [rows]);
  const percent = (value: number) => `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(value)} %`;
  const summary = shares
    .map((s) => `${auditKindLabel(s.kind, t)}: ${eventCount(s.count, t, audit.number)} (${percent(s.percent)})`)
    .join('; ');

  return (
    <div className="flex flex-col gap-2">
      <b id="audit-shares-title">{t('Por tipo de acción')}</b>
      <div
        role="img"
        aria-label={t('Por tipo de acción. ') + summary}
        className="flex h-3 overflow-hidden rounded-full bg-surface-container-highest"
      >
        {shares.map((share) => (
          <span key={share.kind} className={toneClasses(auditKindTone(share.kind))} style={{ flexGrow: share.count }} />
        ))}
      </div>
      <ul aria-labelledby="audit-shares-title" className="m-0 flex list-none flex-col gap-1 p-0">
        {shares.map((share) => (
          <li key={share.kind}>
            <button
              type="button"
              aria-pressed={kind === share.kind}
              onClick={() => onPicked(share.kind)}
              className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-control px-2 text-start hover:bg-on-surface/8 aria-pressed:bg-secondary-container"
            >
              <span
                className={cn('grid size-7 place-items-center rounded-full', toneClasses(auditKindTone(share.kind)))}
              >
                <Icon icon={KIND_ICONS[share.kind]} size={16} />
              </span>
              <span className="flex-1">{auditKindLabel(share.kind, t)}</span>
              <b>{share.count}</b>
              <span className="text-sm text-on-surface-variant">{percent(share.percent)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
