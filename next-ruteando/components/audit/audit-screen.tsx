'use client';

import {
  RiDownloadLine,
  RiEyeLine,
  RiFilterLine,
  RiInformationLine,
  RiLockLine,
  RiRefreshLine,
  RiShapesLine,
  RiUserLine,
} from '@remixicon/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DataTable } from '@/components/data/data-table';
import { PageHead } from '@/components/page/page-head';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { useNotify } from '@/components/ui/toast';
import type { AuditLog } from '@/lib/api/models';
import { ApiError, getData } from '@/lib/api-client';
import { auditCsvFileName, auditToCsv } from '@/lib/audit/export';
import {
  applyAuditFilters,
  type AuditFilters,
  type AuditQuery,
  EMPTY_QUERY,
  parseAuditQuery,
  toQueryParams,
} from '@/lib/audit/filters';
import { makeAuditFormat } from '@/lib/audit/format';
import {
  auditActionLabel,
  auditActor,
  auditEntityLabel,
  type AuditKind,
  auditKind,
  auditKindTone,
} from '@/lib/audit/labels';
import { type AuditScopeId, auditScopeLabel, resolveScope, scopesFor } from '@/lib/audit/scopes';
import { cn } from '@/lib/cn';
import { downloadCsv } from '@/lib/csv';
import { useFormat } from '@/lib/hooks/use-format';
import { useUrlParams } from '@/lib/hooks/use-url-params';
import { useLang, useT } from '@/lib/i18n/client';
import { FULL_LIST_LIMIT, type Page } from '@/lib/list/fetch-all';
import type { Column, Facet } from '@/lib/list/list-logic';
import { type FullList, useFullList } from '@/lib/list/use-full-list';
import type { UserRole } from '@/lib/session-token';
import { useStoredPref } from '@/lib/stored-pref';

import { ActivityPanel, type PickedDays } from './activity-panel';
import { AuditDetail } from './audit-detail';
import { AuditFiltersBar } from './audit-filters-bar';

const TECH_KEY = 'ruteando-audit-tech';
const TECH = ['on', 'off'] as const;

/** La página de auditoría del gateway: la página se llama `number` (en el resto de recursos, `page`). */
interface AuditPage {
  content: AuditLog[];
  totalElements: number;
}

const newestFirst = (a: AuditLog, b: AuditLog) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);

/**
 * Auditoría: qué se hizo, quién y cuándo. Los eventos del ámbito (empresa, propia actividad o todas las empresas) se traen enteros y se
 * filtran aquí; la dirección de la página es la única fuente de verdad de los filtros, de modo que una vista se comparte con un enlace.
 * La tabla pone la búsqueda y el chip de entidad, esta pantalla el resto.
 */
export function AuditScreen({ role }: { role: UserRole }) {
  const t = useT();
  const lang = useLang();
  const format = useFormat();
  const notify = useNotify();
  const audit = useMemo(() => makeAuditFormat(lang), [lang]);
  const { params, patch: patchUrl } = useUrlParams();
  const [technical, setTechnicalPref] = useStoredPref(TECH_KEY, TECH, 'off');
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  /** La dirección se empujó al abrir la modal (cerrarla es volver atrás) en lugar de abrirse con un enlace. */
  const pushedForDetail = useRef(false);

  /** Lo que dice la dirección, con el ámbito ya resuelto para el rol. */
  const search = params.toString(); // la clave estable: una lectura nueva con la misma dirección no cambia la vista
  const query = useMemo(() => {
    const parsed = parseAuditQuery(new URLSearchParams(search));
    return { ...parsed, scope: resolveScope(role, parsed.scope) };
  }, [search, role]);
  const scope = query.scope as AuditScopeId;
  const scopes = scopesFor(role);
  const filters = useMemo<AuditFilters>(
    () => ({
      kind: query.kind,
      // En «Mi actividad» todos los eventos son de la misma persona: un filtro de persona de la dirección no pinta nada
      person: scope === 'mia' ? null : query.person,
      range: query.range,
      from: query.from,
      to: query.to,
      onlyChanges: query.onlyChanges,
      entityId: query.entityId,
    }),
    [query, scope]
  );

  const fetchPage = useCallback(
    async (page: number, size: number): Promise<Page<AuditLog>> => {
      setErrorStatus(null);
      const base = scope === 'empresa' ? 'audit-logs' : scope === 'todas' ? 'audit-logs/admin' : 'audit-logs/me';
      const tenant = scope === 'todas' && query.tenant ? `&tenantId=${encodeURIComponent(query.tenant)}` : '';
      try {
        const result = await getData<AuditPage>(`${base}?page=${page}&size=${size}${tenant}`, t);
        setUpdatedAt(Date.now());
        return result;
      } catch (error) {
        setErrorStatus(error instanceof ApiError ? error.status : null);
        throw error;
      }
    },
    [scope, query.tenant, t]
  );
  const list = useFullList(fetchPage);
  const events = useMemo(() => [...list.rows].sort(newestFirst), [list.rows]);

  /** Lo que ven la tabla y las cifras: los eventos que dejan los filtros (la búsqueda y el chip los pone la tabla). */
  const view = useMemo(() => applyAuditFilters(events, filters, updatedAt ?? 0), [events, filters, updatedAt]);
  const viewList = useMemo<FullList<AuditLog>>(
    () => ({
      ...list,
      rows: view,
      // Con eventos pero sin ninguno tras los filtros sigue `ready`: la tabla dice «No hay resultados» y no «Todavía no hay eventos»
      total: list.status === 'ready' ? view.length : list.total,
    }),
    [list, view]
  );
  const [visible, setVisible] = useState<readonly AuditLog[]>([]);
  const visibleRows = list.status === 'ready' ? visible : view;

  const people = useMemo(
    () =>
      [...new Set(events.map((log) => log.actorEmail?.trim()).filter((email): email is string => !!email))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [events]
  );
  const hasUnidentified = events.some((log) => !log.actorEmail?.trim());
  const entityFilterLabel = (() => {
    const match = query.entityId ? events.find((log) => log.entityId === query.entityId) : undefined;
    return match ? auditEntityLabel(match.entityType, t) : null;
  })();
  const forbidden = list.status === 'error' && errorStatus === 403 && scope !== 'mia';
  const truncated = list.status === 'ready' && list.total > list.rows.length && list.rows.length >= FULL_LIST_LIMIT;
  const plural = (count: number) => (count === 1 ? t('1 evento') : t('{0} eventos', [audit.number(count)]));
  const countText = (() => {
    if (list.status !== 'ready') return '';
    return visibleRows.length === events.length
      ? plural(events.length)
      : t('{0} de {1}', [audit.number(visibleRows.length), plural(events.length)]);
  })();
  const subtitle =
    list.status === 'ready' && updatedAt
      ? t('{0} · actualizado a las {1}', [countText, audit.clock(updatedAt)])
      : undefined;
  const title = role === 'agent' ? t('Mi actividad') : t('Auditoría');
  const intro =
    scope === 'mia'
      ? t('Aquí ves lo que has hecho en la aplicación y cuándo. Pulsa el ojo de un evento para ver todo su detalle.')
      : t(
          'Aquí se registra lo que ocurre en la cuenta: qué se hizo, quién lo hizo y cuándo. Usa los filtros para encontrar algo y pulsa el ojo de un evento para ver todo su detalle.'
        );

  const facet = useMemo<Facet<AuditLog>>(() => {
    const types = [...new Set(events.map((log) => log.entityType))].sort((a, b) =>
      auditEntityLabel(a, t).localeCompare(auditEntityLabel(b, t))
    );
    return {
      label: t('Tipo de entidad'),
      of: (log) => log.entityType,
      options: types.map((key) => ({ key, label: auditEntityLabel(key, t) })),
    };
  }, [events, t]);

  const actorText = useCallback(
    (log: AuditLog) => {
      const actor = auditActor(log, t);
      return actor.role ? `${actor.person} · ${actor.role}` : actor.person;
    },
    [t]
  );
  const columns = useMemo<Column<AuditLog>[]>(
    () => [
      // Solo lo esencial: qué se hizo, quién y cuándo. Todo lo demás (a qué afectó, qué cambió, claves e identificadores) está en la modal
      {
        id: 'action',
        header: t('Acción'),
        cell: (log) => auditActionLabel(log.action, t),
        tone: (log) => auditKindTone(auditKind(log.action)),
        primary: true,
      },
      { id: 'actor', header: t('Quién'), cell: actorText },
      { id: 'when', header: t('Cuándo'), cell: (log) => format.dateTime(log.createdAt), kind: 'muted' },
      ...(technical === 'on'
        ? [{ id: 'key', header: t('Clave'), cell: (log: AuditLog) => log.action, kind: 'id' as const }]
        : []),
    ],
    [t, format, technical, actorText]
  );
  const eyeLabel = (log: AuditLog) =>
    t('Ver el detalle de «{0}» de {1}', [auditActionLabel(log.action, t), auditActor(log, t).person]);

  // ---------- Escribir en la dirección ----------

  /** Cambia partes de la vista y las deja en la dirección; lo que vale su valor por defecto no se escribe. */
  function patch(change: Partial<AuditQuery>, mode: 'push' | 'replace' = 'push') {
    const next: AuditQuery = { ...query, ...change };
    if (next.scope === resolveScope(role, null)) next.scope = null;
    patchUrl(toQueryParams(next), mode);
  }
  const changeFilters = (change: Partial<AuditFilters>) => patch(change);
  function clearAll() {
    patch({ ...EMPTY_QUERY, scope: query.scope, tenant: query.tenant });
  }
  const pickDay = (days: PickedDays) => patch({ range: 'personalizado', from: days.from, to: days.to });
  const pickKind = (kind: AuditKind) => patch({ kind: query.kind === kind ? null : kind });

  const [tenantDraft, setTenantDraft] = useState(query.tenant);
  const [seenTenant, setSeenTenant] = useState(query.tenant);
  if (query.tenant !== seenTenant) {
    setSeenTenant(query.tenant);
    setTenantDraft(query.tenant);
  }

  // ---------- Detalle y exportación ----------

  const openDetail = (log: AuditLog) => {
    pushedForDetail.current = true;
    patch({ event: log.id });
  };
  const detailId = query.event;
  const detailLog = detailId ? (events.find((event) => event.id === detailId) ?? null) : null;
  // Espera a que el listado deje de cargar para usar el evento que ya tiene; si no está entre los traídos la modal lo pide por su identificador
  const showDetail = detailId !== null && list.status !== 'loading';

  function closeDetail() {
    if (pushedForDetail.current) {
      pushedForDetail.current = false;
      window.history.back();
    } else {
      patch({ event: null }, 'replace');
    }
  }

  function exportCsv(rows: readonly AuditLog[]) {
    if (rows.length === 0) return;
    downloadCsv(auditCsvFileName(), auditToCsv(rows, t));
    notify(t('Se exportaron {0}', [plural(rows.length)]));
  }

  // Si la página se abre con un evento en la dirección, no hay nada que «deshacer» con atrás
  useEffect(() => {
    if (!query.event) pushedForDetail.current = false;
  }, [query.event]);

  return (
    <>
      <PageHead title={title} subtitle={subtitle}>
        <Button variant="outlined" disabled={list.status === 'loading'} onClick={list.reload}>
          <Icon icon={RiRefreshLine} size={20} />
          {t('Actualizar')}
        </Button>
        <Button variant="outlined" disabled={visibleRows.length === 0} onClick={() => exportCsv(visibleRows)}>
          <Icon icon={RiDownloadLine} size={20} />
          {t('Exportar CSV')}
        </Button>
      </PageHead>

      <p className="m-0 max-w-[70ch] text-base text-on-surface-variant">{intro}</p>
      <p className="sr-only" role="status" aria-live="polite">
        {countText}
      </p>

      {scopes.length > 1 ? (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <div
            role="group"
            aria-label={t('Qué eventos ver')}
            className="flex max-w-full overflow-hidden rounded-full bg-surface-container outline -outline-offset-1 outline-outline-variant"
          >
            {scopes.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={scope === item}
                onClick={() => patch({ scope: item })}
                className={cn(
                  'h-11 cursor-pointer rounded-full px-3 text-sm font-medium',
                  scope === item
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-on-surface/8'
                )}
              >
                {auditScopeLabel(item, t)}
              </button>
            ))}
          </div>
          {scope === 'todas' ? (
            <form
              method="post"
              noValidate
              className="flex flex-wrap items-start gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                patch({ tenant: tenantDraft.trim() });
              }}
            >
              <Input
                dense
                type="text"
                label={t('Empresa (opcional)')}
                hint={t('Identificador de la empresa; vacío = todas')}
                autoComplete="off"
                spellCheck={false}
                value={tenantDraft}
                onChange={(event) => setTenantDraft(event.target.value)}
                className="max-w-104 min-w-0 flex-[1_1_16rem]"
              />
              <Button type="submit" variant="outlined">
                <Icon icon={RiFilterLine} size={20} />
                {t('Aplicar')}
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {truncated ? (
        <p role="status" className="m-0 flex items-center gap-2 text-on-surface-variant">
          <Icon icon={RiInformationLine} size={20} />
          {t('Se muestran los {0} eventos más recientes de {1}', [
            audit.number(list.rows.length),
            audit.number(list.total),
          ])}
        </p>
      ) : null}
      {forbidden ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-control bg-warning-container px-4 py-3 text-on-warning-container"
        >
          <Icon icon={RiLockLine} size={20} />
          <span>{t('Tu rol no puede consultar estos eventos. Tu propia actividad sí está disponible.')}</span>
          <Button variant="outlined" onClick={() => patch({ scope: 'mia' })}>
            {t('Ver mi actividad')}
          </Button>
        </div>
      ) : null}

      <AuditFiltersBar
        filters={filters}
        people={people}
        hasUnidentified={hasUnidentified}
        technical={technical === 'on'}
        showPeople={scope !== 'mia'}
        entityLabel={entityFilterLabel}
        onChange={changeFilters}
        onTechnical={(on) => setTechnicalPref(on ? 'on' : 'off')}
        onClear={clearAll}
      />

      {list.status === 'ready' ? (
        <ActivityPanel
          rows={visibleRows}
          filters={filters}
          showPeople={scope !== 'mia'}
          onDayPicked={pickDay}
          onKindPicked={pickKind}
        />
      ) : null}

      <DataTable<AuditLog>
        list={forbidden ? { ...viewList, error: t('No tienes permiso para ver este registro de auditoría') } : viewList}
        columns={columns}
        facet={facet}
        selectable
        filter={query.text}
        onFilterChange={(text) => patch({ text: text.trim() }, 'replace')}
        facetKey={query.entity}
        onFacetChange={(key) => {
          if (key !== query.entity) patch({ entity: key });
        }}
        onFiltered={setVisible}
        entityPlural={t('eventos')}
        emptyMessage={t('Todavía no hay eventos de auditoría')}
        searchPlaceholder={t('Buscar por acción o persona')}
        pageSizeOptions={[10, 20, 50, 100]}
        rowActions={(row) => <IconButton icon={RiEyeLine} label={eyeLabel(row)} onClick={() => openDetail(row)} />}
        selectionActions={(rows) => (
          <Button variant="text" onClick={() => exportCsv(rows)}>
            <Icon icon={RiDownloadLine} size={20} />
            {t('Exportar selección')}
          </Button>
        )}
        cardLayout="list"
        card={({ row }) => (
          <button
            type="button"
            aria-label={eyeLabel(row)}
            onClick={() => openDetail(row)}
            className="flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-outline-variant bg-surface px-4 py-3.5 text-start hover:border-outline hover:bg-surface-container-low"
          >
            <span className="flex items-center justify-between gap-2">
              <StatusBadge tone={auditKindTone(auditKind(row.action))}>{auditActionLabel(row.action, t)}</StatusBadge>
              <time
                dateTime={row.createdAt}
                title={audit.longDateTime(row.createdAt)}
                className="text-xs text-on-surface-variant"
              >
                {format.relativeTime(row.createdAt)}
              </time>
            </span>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-surface-variant">
              <span className="inline-flex min-w-0 items-center gap-1.5 wrap-anywhere">
                <Icon icon={RiUserLine} size={16} className="flex-none" />
                {actorText(row)}
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5 wrap-anywhere">
                <Icon icon={RiShapesLine} size={16} className="flex-none" />
                {auditEntityLabel(row.entityType, t)}
              </span>
              {technical === 'on' ? <code>{row.action}</code> : null}
              <Icon icon={RiEyeLine} size={16} className="ml-auto flex-none text-primary" />
            </span>
          </button>
        )}
      />

      {showDetail ? (
        <AuditDetail
          key={detailId}
          id={detailId}
          log={detailLog}
          role={role}
          related={(current) =>
            events.filter((event) => event.entityId === current.entityId && event.id !== current.id)
          }
          onClose={closeDetail}
          onEntity={(entityId) => {
            pushedForDetail.current = false;
            patch({ event: null, entityId });
          }}
          onEvent={(eventId) => patch({ event: eventId }, 'replace')}
        />
      ) : null}
    </>
  );
}
