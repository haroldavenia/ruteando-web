'use client';

import { RiErrorWarningLine } from '@remixicon/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { PageHead } from '@/components/page/page-head';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import type { User } from '@/lib/api/models';
import { getData } from '@/lib/api-client';
import { roleLabel } from '@/lib/audit/labels';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { useT } from '@/lib/i18n/client';
import type { Page } from '@/lib/list/fetch-all';
import { mfaApi, type MfaPolicy, type MfaRequired } from '@/lib/mfa-client';
import { MFA_HINT, MFA_ICON, MFA_LABEL, type MfaMethod } from '@/lib/mfa-labels';
import type { UserRole } from '@/lib/session-token';

import { SsoSettings } from './sso-settings';

const METHODS: readonly MfaMethod[] = ['totp', 'email', 'sms'];
const ROLES: readonly UserRole[] = ['super_admin', 'tenant_admin', 'agent', 'driver'];

const fullName = (user: User) => [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

/**
 * Seguridad de la empresa (solo `tenant_admin` y `super_admin`): qué métodos de segundo factor se permiten, si es obligatorio (para todas
 * las personas o para ciertos roles) y quién ya lo tiene activo, con la opción de restablecérselo a quien perdió su método. Lo que cada
 * persona activa lo hace en su Perfil.
 */
export function Security() {
  const t = useT();
  const api = useMemo(() => mfaApi(t), [t]);
  const { ask, dialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Lo guardado en el servidor, y lo que se está editando. */
  const [policy, setPolicy] = useState<MfaPolicy | null>(null);
  const [allowed, setAllowed] = useState<Record<MfaMethod, boolean>>({ email: true, sms: true, totp: true });
  const [required, setRequired] = useState<MfaRequired>('none');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const available = policy?.available ?? { email: true, sms: true, totp: true };

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [withMfa, setWithMfa] = useState<ReadonlySet<string>>(new Set());
  const [usersFailed, setUsersFailed] = useState(false);

  const apply = useCallback((saved: MfaPolicy) => {
    setPolicy(saved);
    setAllowed({ ...saved.methods });
    setRequired(saved.required);
    setSelectedRoles([...saved.roles]);
  }, []);
  const loadWithMfa = useCallback(() => {
    api.usersWithMfa().then(
      (out) => setWithMfa(new Set(out.userIds)),
      () => undefined
    );
  }, [api]);

  useEffect(() => {
    let current = true;
    api.policy().then(
      (saved) => {
        if (!current) return;
        apply(saved);
        setLoading(false);
        getData<Page<User>>('users?page=0&size=100', t).then(
          (page) => {
            if (!current) return;
            setUsers(page.content);
            setTotal(page.totalElements);
          },
          () => {
            if (!current) return;
            setUsers([]);
            setUsersFailed(true);
          }
        );
        loadWithMfa();
      },
      (err: unknown) => {
        if (!current) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
      }
    );
    return () => {
      current = false;
    };
  }, [api, apply, loadWithMfa, t]);

  const problem =
    required === 'none'
      ? null
      : !METHODS.some((m) => allowed[m])
        ? t('Para exigir el segundo factor hace falta permitir al menos un método')
        : required === 'roles' && selectedRoles.length === 0
          ? t('Elige al menos un rol o cambia la obligatoriedad')
          : null;
  const dirty =
    !!policy &&
    (METHODS.some((m) => allowed[m] !== policy.methods[m]) ||
      required !== policy.required ||
      JSON.stringify(required === 'roles' ? [...selectedRoles].sort() : []) !==
        JSON.stringify([...policy.roles].sort()));

  async function save() {
    if (problem || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      apply(await api.savePolicy({ methods: allowed, required, roles: required === 'roles' ? selectedRoles : [] }));
      setNotice(t('Cambios guardados'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmReset(user: User) {
    const ok = await ask({
      title: t('Restablecer la verificación en dos pasos'),
      message: t(
        '{0} perderá sus métodos y sus códigos de recuperación. En su próximo inicio de sesión se aplicará la política de la empresa.',
        [fullName(user)]
      ),
      confirmLabel: t('Restablecer'),
      danger: true,
    });
    if (!ok) return;
    setError(null);
    setNotice(null);
    try {
      await api.resetUser(user.id);
      setNotice(t('Se restableció la verificación en dos pasos de {0}', [fullName(user)]));
      loadWithMfa();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHead title={t('Seguridad')} subtitle={t('Verificación en dos pasos de tu empresa')} />
      <FormResult error={error} success={notice} />

      {loading ? (
        <Loading className="grid gap-2">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-16" />
          ))}
        </Loading>
      ) : policy ? (
        <>
          <Card aria-labelledby="methods-title" className="flex flex-col gap-3">
            <CardTitle id="methods-title">{t('Métodos permitidos')}</CardTitle>
            <p className="text-on-surface-variant">
              {t('Las personas solo pueden activar los métodos que permitas aquí.')}
            </p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {METHODS.map((m) => (
                <li key={m} className="flex items-center gap-3 rounded-control border border-outline-variant px-4 py-3">
                  <Icon icon={MFA_ICON[m]} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <strong>{t(MFA_LABEL[m])}</strong>
                    <span className="text-on-surface-variant">
                      {available[m] ? t(MFA_HINT[m]) : t('El servidor no lo tiene configurado todavía.')}
                    </span>
                  </div>
                  <Switch
                    checked={allowed[m]}
                    disabled={!available[m] && !allowed[m]}
                    label={t(MFA_LABEL[m])}
                    onChange={(checked) => setAllowed((current) => ({ ...current, [m]: checked }))}
                  />
                </li>
              ))}
            </ul>
          </Card>

          <Card aria-labelledby="required-title" className="flex flex-col gap-3">
            <CardTitle id="required-title">{t('Exigir la verificación en dos pasos')}</CardTitle>
            <div role="radiogroup" aria-label={t('Quién debe usarla')} className="flex flex-col">
              {(
                [
                  ['none', t('Nadie: cada persona decide')],
                  ['all', t('Todas las personas de la empresa')],
                  ['roles', t('Solo ciertos roles')],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="mfa-required"
                    checked={required === value}
                    onChange={() => setRequired(value)}
                    className="size-5 accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
            {required === 'roles' ? (
              <div role="group" aria-label={t('Roles obligados')} className="flex flex-col pl-8">
                {ROLES.map((r) => (
                  <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(r)}
                      onChange={(event) =>
                        setSelectedRoles((current) =>
                          event.target.checked ? [...current, r] : current.filter((x) => x !== r)
                        )
                      }
                      className="size-5 accent-primary"
                    />
                    {roleLabel(r, t)}
                  </label>
                ))}
              </div>
            ) : null}
            {problem ? (
              <p role="alert" className="flex gap-2 text-error">
                <Icon icon={RiErrorWarningLine} />
                {problem}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button variant="primary" loading={saving} disabled={!dirty || !!problem} onClick={() => void save()}>
                {t('Guardar cambios')}
              </Button>
            </div>
          </Card>

          <Card aria-labelledby="people-title" className="flex flex-col gap-3">
            <CardTitle id="people-title">{t('Personas')}</CardTitle>
            {users.length === 0 ? (
              <p className="text-on-surface-variant">
                {usersFailed ? t('No se pudo cargar la lista de personas.') : t('Todavía no hay personas.')}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-control border border-outline-variant">
                  <table className="w-full border-collapse text-start">
                    <caption className="sr-only">
                      {t('Personas de la empresa y si tienen activa la verificación en dos pasos')}
                    </caption>
                    <thead>
                      <tr className="border-b border-outline-variant font-mono text-xs tracking-wide text-on-surface-variant uppercase">
                        <th scope="col" className="px-3 py-2 text-start font-medium">
                          {t('Nombre')}
                        </th>
                        <th scope="col" className="px-3 py-2 text-start font-medium">
                          {t('Rol')}
                        </th>
                        <th scope="col" className="px-3 py-2 text-start font-medium">
                          {t('Verificación en dos pasos')}
                        </th>
                        <th scope="col" className="px-3 py-2">
                          <span className="sr-only">{t('Acciones')}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-outline-variant last:border-b-0">
                          <td className="px-3 py-2">
                            <strong>{fullName(u)}</strong>
                            <br />
                            <span className="text-on-surface-variant">{u.email}</span>
                          </td>
                          <td className="px-3 py-2">{roleLabel(u.role, t)}</td>
                          <td className="px-3 py-2">
                            <StatusBadge tone={withMfa.has(u.id) ? 'success' : 'neutral'}>
                              {withMfa.has(u.id) ? t('Activa') : t('Sin activar')}
                            </StatusBadge>
                          </td>
                          <td className="px-3 py-2 text-end">
                            {withMfa.has(u.id) ? (
                              <Button variant="text" onClick={() => void confirmReset(u)}>
                                {t('Restablecer')}
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {total > users.length ? (
                  <p className="text-on-surface-variant">{t('Mostrando {0} de {1}', [users.length, total])}</p>
                ) : null}
              </>
            )}
          </Card>
        </>
      ) : null}
      <SsoSettings />
      {dialog}
    </div>
  );
}
