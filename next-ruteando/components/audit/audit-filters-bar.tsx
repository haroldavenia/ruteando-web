'use client';

import { RiCloseLine, RiErrorWarningLine, RiFilterOffLine } from '@remixicon/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { type AuditFilters, type AuditRange, hasActiveFilters, lastSevenDays, NO_PERSON } from '@/lib/audit/filters';
import { AUDIT_KINDS, type AuditKind, auditKindLabel, shortId } from '@/lib/audit/labels';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';

/** Valores de las listas desplegables que significan «sin filtro». */
const ALL = 'todos';

const select =
  'h-11 w-full rounded-control border border-outline bg-transparent px-3 text-base text-on-surface focus-visible:outline-2 focus-visible:outline-primary';

/**
 * Filtros del listado de auditoría que la tabla no tiene: rango de fechas, tipo de acción, persona y «solo con cambios». No guarda estado
 * de filtros: recibe los actuales y avisa de lo que cambia (la pantalla lo escribe en la dirección). También lleva el interruptor de los
 * datos técnicos, que es de presentación y no filtra nada.
 */
export function AuditFiltersBar({
  filters,
  people,
  hasUnidentified,
  technical,
  showPeople,
  entityLabel,
  onChange,
  onTechnical,
  onClear,
}: {
  filters: AuditFilters;
  /** Correos que aparecen en los eventos, para elegir una persona. */
  people: readonly string[];
  /** Hay eventos sin correo: se ofrece «Sin identificar». */
  hasUnidentified: boolean;
  technical: boolean;
  /** «Persona» solo tiene sentido si los eventos pueden ser de varias personas (no en «Mi actividad»). */
  showPeople: boolean;
  /** Nombre del tipo de la entidad filtrada, para la etiqueta que se puede quitar. */
  entityLabel: string | null;
  onChange: (change: Partial<AuditFilters>) => void;
  onTechnical: (on: boolean) => void;
  onClear: () => void;
}) {
  const t = useT();
  /** «Personalizado» elegido sin fechas todavía: abre los campos aunque la dirección aún no lleve el rango. */
  const [customOpen, setCustomOpen] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const showCustom = customOpen || filters.range === 'personalizado';
  const rangeChoice: AuditRange = showCustom ? 'personalizado' : filters.range;
  const ranges: { value: AuditRange; label: string }[] = [
    { value: '24h', label: t('24 horas') },
    { value: '7d', label: t('7 días') },
    { value: '30d', label: t('30 días') },
    { value: 'todo', label: t('Todo') },
    { value: 'personalizado', label: t('Personalizado') },
  ];

  function pickRange(range: AuditRange) {
    setRangeError(null);
    if (range === 'personalizado') {
      setCustomOpen(true);
      if (!filters.from && !filters.to) {
        // Se abre ya aplicado (los últimos siete días) para que se vea cómo funciona y baste con ajustar las fechas
        onChange({ range: 'personalizado', ...lastSevenDays() });
      }
      return;
    }
    setCustomOpen(false);
    onChange({ range, from: null, to: null });
  }

  function setDay(edge: 'from' | 'to', value: string) {
    const from = edge === 'from' ? value || null : filters.from;
    const to = edge === 'to' ? value || null : filters.to;
    if (from && to && from > to) {
      setRangeError(
        edge === 'from' ? t('El inicio no puede ser posterior al fin') : t('El fin no puede ser anterior al inicio')
      );
      return;
    }
    setRangeError(null);
    onChange(from || to ? { range: 'personalizado', from, to } : { range: 'todo', from: null, to: null });
  }

  const chip = (on: boolean) =>
    cn(
      'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm',
      on
        ? 'border-transparent bg-secondary-container text-on-secondary-container'
        : 'border-outline text-on-surface-variant hover:bg-on-surface/8'
    );

  return (
    <section
      aria-labelledby="audit-filters-title"
      className="mb-4 flex flex-col gap-3 rounded-card border border-outline-variant bg-surface-container-low p-4"
    >
      <h2 id="audit-filters-title" className="sr-only">
        {t('Filtros')}
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <span id="audit-range-label" className="text-sm text-on-surface-variant">
            {t('¿Cuándo?')}
          </span>
          <div role="group" aria-labelledby="audit-range-label" className="flex flex-wrap gap-2">
            {ranges.map((range) => (
              <button
                key={range.value}
                type="button"
                aria-pressed={rangeChoice === range.value}
                onClick={() => pickRange(range.value)}
                className={chip(rangeChoice === range.value)}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex min-w-44 flex-col gap-1 text-sm text-on-surface-variant">
          {t('Tipo de acción')}
          <select
            className={select}
            value={filters.kind ?? ALL}
            onChange={(event) =>
              onChange({ kind: event.target.value === ALL ? null : (event.target.value as AuditKind) })
            }
          >
            <option value={ALL}>{t('Todos los tipos')}</option>
            {AUDIT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {auditKindLabel(kind, t)}
              </option>
            ))}
          </select>
        </label>
        {showPeople ? (
          <label className="flex min-w-44 flex-col gap-1 text-sm text-on-surface-variant">
            {t('Persona')}
            <select
              className={select}
              value={filters.person ?? ALL}
              onChange={(event) => onChange({ person: event.target.value === ALL ? null : event.target.value })}
            >
              <option value={ALL}>{t('Todas las personas')}</option>
              {hasUnidentified ? <option value={NO_PERSON}>{t('Sin identificar')}</option> : null}
              {people.map((person) => (
                <option key={person} value={person}>
                  {person}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {showCustom ? (
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
            {t('Desde')}
            <input
              type="date"
              autoComplete="off"
              className={select}
              value={filters.from ?? ''}
              onChange={(event) => setDay('from', event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
            {t('Hasta')}
            <input
              type="date"
              autoComplete="off"
              className={select}
              value={filters.to ?? ''}
              onChange={(event) => setDay('to', event.target.value)}
            />
          </label>
          {rangeError ? (
            <p role="alert" className="flex items-center gap-1 text-error">
              <Icon icon={RiErrorWarningLine} size={20} />
              {rangeError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Switch
          checked={filters.onlyChanges}
          onChange={(on) => onChange({ onlyChanges: on })}
          label={t('Solo con cambios de valores')}
        />
        <Switch checked={technical} onChange={onTechnical} label={t('Mostrar datos técnicos')} />
        {filters.entityId ? (
          <button
            type="button"
            className={chip(true)}
            title={t('Quitar el filtro de entidad')}
            aria-label={t('Quitar el filtro de entidad')}
            onClick={() => onChange({ entityId: null })}
          >
            <span>
              {entityLabel ? `${entityLabel} ` : t('Entidad ')}
              <code>{shortId(filters.entityId)}</code>
            </span>
            <Icon icon={RiCloseLine} size={16} />
          </button>
        ) : null}
        {hasActiveFilters(filters) ? (
          <Button variant="text" onClick={onClear}>
            <Icon icon={RiFilterOffLine} size={20} />
            {t('Limpiar filtros')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
