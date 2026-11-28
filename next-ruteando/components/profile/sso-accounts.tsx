'use client';

import { RiLinksLine } from '@remixicon/react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { useT } from '@/lib/i18n/client';
import { ssoApi, type SsoIdentity } from '@/lib/sso-client';

/**
 * Cuentas del proveedor (Google, GitHub, Apple, SSO de empresa) con las que la persona ya entró: se vinculan solas la primera vez que
 * entra con un correo verificado, y desde aquí se desvinculan. No pinta nada si no hay ninguna (o el servidor no tiene SSO).
 */
export function SsoAccounts() {
  const t = useT();
  const api = useMemo(() => ssoApi(t), [t]);
  const { ask, dialog } = useConfirm();
  const [identities, setIdentities] = useState<SsoIdentity[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let current = true;
    // Si falla (SSO apagado, sin conexión) no se muestra nada: el resto del Perfil no depende de esto
    api.identities().then(
      (out) => current && setIdentities(out.identities),
      () => current && setIdentities([])
    );
    return () => {
      current = false;
    };
  }, [api, version]);

  async function unlink(item: SsoIdentity) {
    const ok = await ask({
      title: t('Desvincular {0}', [item.label]),
      message: t('Ya no podrás entrar con esta cuenta. Podrás vincularla de nuevo al volver a entrar con ella.'),
      confirmLabel: t('Desvincular'),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.unlink(item.provider);
      setNotice(t('Cuenta desvinculada: {0}', [item.label]));
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    } finally {
      setBusy(false);
    }
  }

  if (identities.length === 0 && !notice) return null;
  return (
    <>
      <Card aria-labelledby="sso-accounts-title" className="flex flex-col gap-3">
        <CardTitle id="sso-accounts-title" compact>
          {t('Cuentas vinculadas')}
        </CardTitle>
        <p className="m-0 text-sm text-on-surface-variant">
          {t('Cuentas de otros proveedores con las que entras sin contraseña.')}
        </p>
        <FormResult error={error} success={notice} />
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {identities.map((item) => (
            <li
              key={item.provider}
              className="flex flex-wrap items-center gap-3 rounded-control border border-outline-variant px-4 py-3"
            >
              <Icon icon={RiLinksLine} />
              <div className="flex min-w-56 flex-1 flex-col gap-0.5">
                <strong>{item.label}</strong>
                <span className="m-0 text-sm text-on-surface-variant">{item.email}</span>
              </div>
              <Button variant="text" disabled={busy} onClick={() => void unlink(item)}>
                {t('Desvincular')}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      {dialog}
    </>
  );
}
