'use client';

import { RiInformationLine, RiKeyLine } from '@remixicon/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { MfaEnroll, type MfaEnrollment } from '@/components/mfa/mfa-enroll';
import { MfaStepUp, type MfaStepUpResult } from '@/components/mfa/mfa-step-up';
import { RecoveryCodes } from '@/components/mfa/recovery-codes';
import { PageHead } from '@/components/page/page-head';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import { roleLabel } from '@/lib/audit/labels';
import { useT } from '@/lib/i18n/client';
import type { StatusTone } from '@/lib/list/list-logic';
import { mfaApi, type MfaStatus } from '@/lib/mfa-client';
import { MFA_HINT, MFA_ICON, MFA_LABEL, type MfaMethod } from '@/lib/mfa-labels';
import type { SessionUser } from '@/lib/session-token';
import { displayName } from '@/lib/user-display';

import { SsoAccounts } from './sso-accounts';

type Panel = { kind: 'enable'; method: MfaMethod } | { kind: 'disable'; method: MfaMethod } | { kind: 'regenerate' };

/** Orden en que se ofrecen: la aplicación autenticadora primero (no depende de ningún envío). */
const ORDER: readonly MfaMethod[] = ['totp', 'email', 'sms'];

/**
 * Perfil de la persona con sesión: sus datos y su verificación en dos pasos. Cada persona activa o desactiva sus propios métodos (los
 * que su empresa permite), pide códigos de recuperación nuevos y, si la empresa exige el segundo factor, no puede quedarse sin ninguno.
 */
export function Profile({ user }: { user: SessionUser }) {
  const t = useT();
  const api = useMemo(() => mfaApi(t), [t]);
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Códigos de recuperación recién generados: se muestran una sola vez. */
  const [codes, setCodes] = useState<string[] | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let current = true;
    api.status().then(
      (found) => {
        if (!current) return;
        setStatus(found);
        setLoading(false);
      },
      (err: unknown) => {
        if (!current) return;
        setLoading(false);
        setLoadError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
      }
    );
    return () => {
      current = false;
    };
  }, [api, version, t]);

  const lockedHint = t('Tu empresa exige el segundo factor: no puedes quitar el último método');
  const rows = status
    ? ORDER.map((method) => {
        const m = status.methods[method];
        const badge: { label: string; tone: StatusTone } = m.active
          ? { label: t('Activo'), tone: 'success' }
          : !m.allowed
            ? { label: t('No permitido por tu empresa'), tone: 'warning' }
            : !m.available
              ? { label: t('No disponible en el servidor'), tone: 'neutral' }
              : { label: t('Sin activar'), tone: 'neutral' };
        return { method, destination: m.destination, active: m.active, canEnable: m.allowed && m.available, badge };
      })
    : [];
  const activeMethods = rows.filter((r) => r.active).map((r) => r.method);
  /** La empresa lo exige y solo queda un método: ese no se puede quitar. */
  const lastLocked = !!status && status.required && status.activeCount <= 1;

  function open(next: Panel) {
    setNotice(null);
    setActionError(null);
    setPanel(next);
  }

  function enrolled(result: MfaEnrollment) {
    setPanel(null);
    setNotice(t('Método activado: {0}', [t(MFA_LABEL[result.method])]));
    if (result.recoveryCodes?.length) setCodes(result.recoveryCodes);
    reload();
  }

  async function run<T>(request: Promise<T>, done: (out: T) => void) {
    setBusy(true);
    setActionError(null);
    try {
      const out = await request;
      setPanel(null);
      done(out);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    } finally {
      setBusy(false);
    }
  }

  const disable = (method: MfaMethod, step: MfaStepUpResult) =>
    void run(api.disable(method, step.via, step.code), () =>
      setNotice(t('Método desactivado: {0}', [t(MFA_LABEL[method])]))
    );
  const regenerate = (step: MfaStepUpResult) =>
    void run(api.regenerateRecoveryCodes(step.via, step.code), (out) => {
      setCodes(out.recoveryCodes);
      setNotice(t('Códigos de recuperación nuevos generados'));
    });

  return (
    <div className="flex flex-col gap-4">
      <PageHead title={t('Perfil')} subtitle={user.email} />

      <Card aria-labelledby="account-title">
        <CardTitle id="account-title" className="mb-3">
          {t('Tu cuenta')}
        </CardTitle>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-on-surface-variant">{t('Nombre')}</dt>
            <dd className="font-medium">
              {[user.firstName, user.lastName].filter(Boolean).join(' ') || displayName(user)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-on-surface-variant">{t('Correo electrónico')}</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-on-surface-variant">{t('Rol')}</dt>
            <dd className="font-medium">{roleLabel(user.role, t)}</dd>
          </div>
        </dl>
      </Card>

      <Card aria-labelledby="mfa-title" className="flex flex-col gap-3">
        <CardTitle id="mfa-title">{t('Verificación en dos pasos')}</CardTitle>
        <p className="text-on-surface-variant">
          {t('Añade un segundo paso al iniciar sesión: un código además de tu contraseña.')}
        </p>
        <FormResult error={loadError} success={notice} />

        {loading ? (
          <Loading className="grid gap-2">
            {[0, 1, 2].map((n) => (
              <Skeleton key={n} className="h-16" />
            ))}
          </Loading>
        ) : status ? (
          <>
            {status.required ? (
              <p
                role="note"
                className="flex gap-2.5 rounded-control bg-info-container px-4 py-3 text-on-info-container"
              >
                <Icon icon={RiInformationLine} />
                <span>{t('Tu empresa exige la verificación en dos pasos.')}</span>
              </p>
            ) : null}
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {rows.map((row) => (
                <li
                  key={row.method}
                  className="flex flex-wrap items-center gap-3 rounded-control border border-outline-variant px-4 py-3"
                >
                  <Icon icon={MFA_ICON[row.method]} />
                  <div className="flex min-w-56 flex-1 flex-col gap-0.5">
                    <strong>{t(MFA_LABEL[row.method])}</strong>
                    <span className="text-on-surface-variant">
                      {row.active && row.destination ? row.destination : t(MFA_HINT[row.method])}
                    </span>
                  </div>
                  <StatusBadge tone={row.badge.tone}>{row.badge.label}</StatusBadge>
                  {row.active ? (
                    <Button
                      variant="text"
                      disabled={lastLocked}
                      title={lastLocked ? lockedHint : undefined}
                      onClick={() => open({ kind: 'disable', method: row.method })}
                    >
                      {t('Desactivar')}
                    </Button>
                  ) : row.canEnable ? (
                    <Button variant="outlined" onClick={() => open({ kind: 'enable', method: row.method })}>
                      {t('Activar')}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
            {lastLocked ? <p className="text-on-surface-variant">{lockedHint}</p> : null}

            {panel ? (
              <div
                role="group"
                aria-label={t('Activar o desactivar un método')}
                className="rounded-control bg-surface-container p-4"
              >
                {panel.kind === 'enable' ? (
                  <>
                    <h3 className="mb-3 font-medium">{t('Activar {0}', [t(MFA_LABEL[panel.method])])}</h3>
                    <MfaEnroll
                      methods={[panel.method]}
                      initial={panel.method}
                      onEnrolled={enrolled}
                      onCancelled={() => setPanel(null)}
                    />
                  </>
                ) : panel.kind === 'disable' ? (
                  <>
                    <h3 className="mb-3 font-medium">{t('Desactivar {0}', [t(MFA_LABEL[panel.method])])}</h3>
                    <MfaStepUp
                      methods={activeMethods}
                      hasRecovery={status.recoveryCodesLeft > 0}
                      confirmLabel={t('Desactivar')}
                      busy={busy}
                      error={actionError}
                      onConfirmed={(step) => disable(panel.method, step)}
                      onCancelled={() => {
                        setPanel(null);
                        setActionError(null);
                      }}
                    />
                  </>
                ) : (
                  <>
                    <h3 className="mb-3 font-medium">{t('Códigos de recuperación nuevos')}</h3>
                    <MfaStepUp
                      methods={activeMethods}
                      hasRecovery={status.recoveryCodesLeft > 0}
                      confirmLabel={t('Generar códigos')}
                      busy={busy}
                      error={actionError}
                      onConfirmed={regenerate}
                      onCancelled={() => {
                        setPanel(null);
                        setActionError(null);
                      }}
                    />
                  </>
                )}
              </div>
            ) : null}

            {status.activeCount > 0 ? (
              <div className="flex flex-wrap items-center gap-3 rounded-control border border-outline-variant px-4 py-3">
                <Icon icon={RiKeyLine} />
                <div className="flex min-w-56 flex-1 flex-col gap-0.5">
                  <strong>{t('Códigos de recuperación')}</strong>
                  <span className="text-on-surface-variant">
                    {status.recoveryCodesLeft === 1
                      ? t('Te queda 1 código sin usar')
                      : t('Te quedan {0} códigos sin usar', [status.recoveryCodesLeft])}
                  </span>
                </div>
                <Button variant="outlined" onClick={() => open({ kind: 'regenerate' })}>
                  {t('Generar nuevos')}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </Card>

      <SsoAccounts />

      {codes ? (
        <Card aria-labelledby="codes-title">
          <CardTitle id="codes-title" className="mb-3">
            {t('Guarda tus códigos de recuperación')}
          </CardTitle>
          <RecoveryCodes codes={codes} onSaved={() => setCodes(null)} />
        </Card>
      ) : null}
    </div>
  );
}
