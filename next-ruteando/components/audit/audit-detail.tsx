'use client';

import {
  RiCalendarEventLine,
  RiClipboardLine,
  RiCodeLine,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiGlobalLine,
  RiHistoryLine,
  RiLinkM,
  RiSearchEyeLine,
  RiShapesLine,
  RiUserLine,
} from '@remixicon/react';
import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';

import { KIND_ICONS } from '@/components/audit/activity-panel';
import { StatusBadge, toneClasses } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { useNotify } from '@/components/ui/toast';
import type { AuditLog } from '@/lib/api/models';
import { getData } from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import { diffChanges } from '@/lib/audit/diff';
import { makeAuditFormat } from '@/lib/audit/format';
import {
  actorInitials,
  auditActionLabel,
  auditActor,
  auditEntityLabel,
  auditKind,
  auditKindLabel,
  auditKindTone,
  auditSummary,
  breakableParts,
  humanizeIds,
  shortId,
} from '@/lib/audit/labels';
import { entityTarget, entityWasDeleted } from '@/lib/audit/links';
import { cn } from '@/lib/cn';
import { useFormat } from '@/lib/hooks/use-format';
import { useLang, useT } from '@/lib/i18n/client';
import type { UserRole } from '@/lib/session-token';
import { useStoredPref } from '@/lib/stored-pref';

const TILE = 'flex flex-col rounded-2xl border border-outline-variant bg-surface-container-low p-4';
const TILE_ICON =
  'grid size-10 flex-none place-items-center rounded-xl bg-primary-container/60 p-2 text-on-primary-container';
const TECH_KEY = 'ruteando-audit-tech';
const TECH = ['on', 'off'] as const;
/** Cuántos eventos de la misma entidad se ofrecen en la línea de tiempo. */
const RELATED_LIMIT = 5;

/**
 * Modal con el detalle completo de un evento de auditoría. La cabecera lleva el color y el glifo de su tipo de acción; debajo, la frase
 * del evento, quién, cuándo y sobre qué, qué cambió, otros eventos de la misma entidad y lo técnico, plegado. Si el listado ya tiene el
 * evento aparece de inmediato; si no (enlace directo) se pide al gateway por su identificador.
 */
export function AuditDetail({
  id,
  log: given,
  role,
  related,
  onClose,
  onEntity,
  onEvent,
}: {
  id: string;
  /** El evento si el listado ya lo tiene. */
  log: AuditLog | null;
  role: UserRole | null;
  /** Otros eventos de la misma entidad que el listado ya tiene, del más reciente al más antiguo. */
  related: (log: AuditLog) => readonly AuditLog[];
  onClose: () => void;
  /** Se pidió ver todos los eventos de la entidad. */
  onEntity: (entityId: string) => void;
  /** Se eligió otro evento de la línea de tiempo. */
  onEvent: (eventId: string) => void;
}) {
  const t = useT();
  const lang = useLang();
  const format = useFormat();
  const audit = useMemo(() => makeAuditFormat(lang), [lang]);
  const notify = useNotify();
  const [fetched, setFetched] = useState<AuditLog | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [technical] = useStoredPref(TECH_KEY, TECH, 'off');
  const log = given ?? fetched;

  useEffect(() => {
    if (given) return;
    let current = true;
    getData<AuditLog>(`audit-logs/${encodeURIComponent(id)}`, t).then(
      (found) => current && setFetched(found),
      (error: unknown) => {
        if (!current) return;
        const status = error instanceof ApiError ? error.status : 0;
        setProblem(
          status === 403
            ? t('No tienes permiso para abrir este evento directamente. Ábrelo desde la lista de tu actividad.')
            : status === 404
              ? t('Este evento ya no existe o no está disponible.')
              : error instanceof Error
                ? error.message
                : t('No se pudo completar la solicitud')
        );
      }
    );
    return () => {
      current = false;
    };
  }, [given, id, t]);

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify(t('{0} copiado', [what]));
    } catch {
      notify(t('No se pudo copiar automáticamente. Cópialo a mano: {0}', [text]));
    }
  }

  const kind = log ? auditKind(log.action) : 'otras';
  const tone = log ? auditKindTone(kind) : 'neutral';
  const title = log
    ? auditActionLabel(log.action, t)
    : problem
      ? t('No se pudo abrir el evento')
      : t('Evento de auditoría');
  const summary = log ? humanizeIds(auditSummary(log, t)) : '';
  const rows = log ? diffChanges(log.changes, t, log.entityType) : [];
  const hasChanges = rows.some((r) => r.changed);
  const events = log ? related(log).slice(0, RELATED_LIMIT) : [];
  const target = log ? entityTarget(log, role, t) : null;
  const actor = log ? auditActor(log, t) : null;
  const changesJson = log?.changes ? JSON.stringify(log.changes, null, 2) : '';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={title}
        description={log ? format.relativeTime(log.createdAt) : undefined}
        className="max-w-3xl"
        banner={
          log
            ? { icon: <Icon icon={KIND_ICONS[kind]} size={28} />, kicker: auditKindLabel(kind, t).toUpperCase(), tone }
            : undefined
        }
      >
        {!log && !problem ? (
          <div aria-busy="true">
            <p role="status">{t('Cargando el evento…')}</p>
          </div>
        ) : null}
        {problem ? (
          <div role="alert" className="flex items-start gap-2 text-error">
            <Icon icon={RiErrorWarningLine} />
            <p>{problem}</p>
          </div>
        ) : null}
        {log && actor ? (
          <div className="flex flex-col gap-5">
            {summary !== title ? (
              <blockquote
                data-tone={tone}
                className="m-0 rounded-2xl border-l-4 border-(--tone) bg-[color-mix(in_srgb,var(--tone)_10%,var(--color-surface))] p-4 font-medium"
              >
                {summary}
              </blockquote>
            ) : null}

            <dl className="m-0 grid gap-3 sm:grid-cols-3">
              <div className={TILE}>
                <dt className="text-xs text-on-surface-variant">{t('Quién')}</dt>
                <dd className="m-0 mt-2 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-10 flex-none place-items-center rounded-full bg-primary-container text-on-primary-container"
                  >
                    {actorInitials(actor.person) || <Icon icon={RiUserLine} />}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <b>
                      {breakableParts(actor.person).map((part, index) => (
                        <Fragment key={index}>
                          {part}
                          <wbr />
                        </Fragment>
                      ))}
                    </b>
                    {actor.role ? <small className="text-on-surface-variant">{actor.role}</small> : null}
                  </span>
                </dd>
              </div>
              <div className={TILE}>
                <dt className="text-xs text-on-surface-variant">{t('Cuándo')}</dt>
                <dd className="m-0 mt-2 flex items-center gap-3">
                  <Icon icon={RiCalendarEventLine} className={TILE_ICON} size={24} />
                  <span className="flex flex-col">
                    <b>{format.relativeTime(log.createdAt)}</b>
                    <small className="text-on-surface-variant">
                      <time dateTime={log.createdAt}>{audit.longDateTime(log.createdAt)}</time>
                    </small>
                  </span>
                </dd>
              </div>
              <div className={TILE}>
                <dt className="text-xs text-on-surface-variant">{t('Sobre')}</dt>
                <dd className="m-0 mt-2 flex items-center gap-3">
                  <Icon icon={RiShapesLine} className={TILE_ICON} size={24} />
                  <span className="flex flex-col">
                    <b>{auditEntityLabel(log.entityType, t)}</b>
                    <small>
                      <code>{shortId(log.entityId)}</code>
                    </small>
                  </span>
                </dd>
              </div>
              {log.ipAddress ? (
                <div className={TILE}>
                  <dt className="text-xs text-on-surface-variant">{t('Desde la IP')}</dt>
                  <dd className="m-0 mt-2 flex items-center gap-3">
                    <Icon icon={RiGlobalLine} className={TILE_ICON} size={24} />
                    <b>
                      <code className="text-xs">{log.ipAddress}</code>
                    </b>
                  </dd>
                </div>
              ) : null}
            </dl>

            <section aria-labelledby="audit-diff-title">
              <h3 id="audit-diff-title" className="m-0 mb-3 text-base font-bold">
                {t('Qué cambió')}
              </h3>
              {rows.length === 0 ? (
                <p className="text-on-surface-variant">{t('Este evento no registra valores.')}</p>
              ) : (
                <>
                  {!hasChanges ? (
                    <p className="mb-2 text-on-surface-variant">
                      {t('El evento no registra cambios de valores. Estos son los valores que guardó:')}
                    </p>
                  ) : null}
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {rows.map((row) => (
                      <li
                        key={row.field}
                        className={cn(
                          'rounded-2xl border p-3',
                          row.changed ? 'border-on-info-container/30 bg-info-container/30' : 'border-outline-variant'
                        )}
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <b>{row.label}</b>
                          {row.changed ? <StatusBadge tone="info">{t('Cambió')}</StatusBadge> : null}
                          {row.label !== row.field ? (
                            <code className="text-on-surface-variant">{row.field}</code>
                          ) : null}
                        </span>
                        <span className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                          <span
                            className={cn(
                              'flex flex-col rounded-xl px-3 py-2',
                              row.changed && 'bg-error-container/60',
                              row.beforeEmpty && 'text-on-surface-variant italic'
                            )}
                          >
                            <small>{t('Antes')}</small>
                            <span className={row.changed && !row.beforeEmpty ? 'line-through' : undefined}>
                              {row.before}
                            </span>
                          </span>
                          <span aria-hidden="true" className="text-on-surface-variant">
                            {row.changed ? '→' : '='}
                          </span>
                          <span
                            className={cn(
                              'flex flex-col rounded-xl px-3 py-2',
                              row.changed && 'bg-success-container/80',
                              row.afterEmpty && 'text-on-surface-variant italic'
                            )}
                          >
                            <small>{t('Después')}</small>
                            <span className={row.changed && !row.afterEmpty ? 'font-medium' : undefined}>
                              {row.after}
                            </span>
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {events.length > 0 ? (
              <section aria-labelledby="audit-related-title">
                <h3 id="audit-related-title" className="mb-2 font-medium">
                  {t('Más de esta entidad')}
                </h3>
                <ol className="m-0 flex list-none flex-col gap-1 p-0">
                  {events.map((event) => {
                    const who = auditActor(event, t).person;
                    const action = auditActionLabel(event.action, t);
                    const relative = format.relativeTime(event.createdAt);
                    return (
                      <li key={event.id}>
                        <button
                          type="button"
                          aria-label={`${t('Abrir: ')}${action}, ${who}, ${relative}`}
                          onClick={() => onEvent(event.id)}
                          className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-control px-2 text-start hover:bg-on-surface/8"
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              'grid size-8 place-items-center rounded-full',
                              toneClasses(auditKindTone(auditKind(event.action)))
                            )}
                          >
                            <Icon icon={RiHistoryLine} size={16} />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <b>{action}</b>
                            <small className="text-on-surface-variant">
                              {who} ·{' '}
                              <time dateTime={event.createdAt} title={audit.longDateTime(event.createdAt)}>
                                {relative}
                              </time>
                            </small>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}

            <details open={technical === 'on'} className="rounded-2xl border border-outline-variant px-4 py-3">
              <summary className="flex cursor-pointer items-center gap-2 font-medium">
                <Icon icon={RiCodeLine} size={20} />
                {t('Datos técnicos')}
              </summary>
              <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-[auto_1fr]">
                <dt className="text-on-surface-variant">{t('Acción (clave)')}</dt>
                <dd>
                  <code>{log.action}</code>
                </dd>
                <dt className="text-on-surface-variant">{t('Tipo de entidad (clave)')}</dt>
                <dd>
                  <code>{log.entityType}</code>
                </dd>
                <dt className="text-on-surface-variant">{t('Identificador del evento')}</dt>
                <dd className="flex items-center gap-1">
                  <code>{log.id}</code>
                  <IconButton
                    icon={RiClipboardLine}
                    label={t('Copiar el identificador del evento')}
                    onClick={() => void copy(log.id, t('Identificador'))}
                  />
                </dd>
                <dt className="text-on-surface-variant">{t('Identificador de la entidad')}</dt>
                <dd className="flex items-center gap-1">
                  <code>{log.entityId}</code>
                  <IconButton
                    icon={RiClipboardLine}
                    label={t('Copiar el identificador de la entidad')}
                    onClick={() => void copy(log.entityId, t('Identificador'))}
                  />
                </dd>
                <dt className="text-on-surface-variant">{t('Instante (UTC)')}</dt>
                <dd>
                  <code>{audit.utc(log.createdAt)}</code>
                </dd>
                <dt className="text-on-surface-variant">{t('Rol (tal como lo envía el gateway)')}</dt>
                <dd>
                  <code>{log.actorRole ?? '—'}</code>
                </dd>
                <dt className="text-on-surface-variant">{t('Descripción original')}</dt>
                <dd>{log.description || '—'}</dd>
                {changesJson ? (
                  <>
                    <dt className="text-on-surface-variant">{t('Cambios (JSON)')}</dt>
                    <dd>
                      <pre className="overflow-auto rounded-control bg-surface-container p-2 text-sm">
                        <code>{changesJson}</code>
                      </pre>
                    </dd>
                  </>
                ) : null}
              </dl>
            </details>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {target ? (
                <Link href={target.href} onClick={onClose} className={buttonVariants({ variant: 'primary' })}>
                  <Icon icon={RiExternalLinkLine} size={20} />
                  {target.label}
                </Link>
              ) : entityWasDeleted(log) ? (
                <p className="flex items-center gap-1 text-on-surface-variant">{t('Esta entidad fue eliminada')}</p>
              ) : null}
              <Button variant="outlined" onClick={() => onEntity(log.entityId)}>
                <Icon icon={RiSearchEyeLine} size={20} />
                {t('Ver eventos de esta entidad')}
              </Button>
              <Button variant="outlined" onClick={() => void copy(window.location.href, t('Enlace'))}>
                <Icon icon={RiLinkM} size={20} />
                {t('Copiar enlace')}
              </Button>
              <DialogClose asChild>
                <Button variant="text">{t('Cerrar')}</Button>
              </DialogClose>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
