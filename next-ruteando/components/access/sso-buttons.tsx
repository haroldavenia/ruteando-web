'use client';

import { RiProfileLine } from '@remixicon/react';
import { useEffect, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { listSsoProviders, type SsoProvider, ssoStartUrl } from '@/lib/auth-client';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';
import { navigateTo } from '@/lib/navigation-client';
import { rememberSsoReturn } from '@/lib/sso-return';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Botones «Continuar con …» de la pantalla de acceso: solo los proveedores que el servidor ofrece (sin ninguno no se pinta nada y el
 * acceso con contraseña sigue igual). Entrar es una navegación del navegador al servidor (`/gateway/sso/<proveedor>/start`), que lo
 * lleva al proveedor; el destino al volver se guarda antes y pasa por `safeReturnUrl` al terminar. El SSO de empresa pide antes el
 * correo: su dominio decide a qué proveedor se va.
 */
export function SsoButtons({ returnUrl }: { returnUrl?: string | null }) {
  const t = useT();
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [asking, setAsking] = useState(false);
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listSsoProviders().then((list) => {
      if (!cancelled) setProviders(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (providers.length === 0) return null;

  const invalid = touched && !EMAIL.test(email.trim());

  function enterprise(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!EMAIL.test(email.trim())) return;
    rememberSsoReturn(returnUrl);
    navigateTo(ssoStartUrl('enterprise', email.trim()));
  }

  return (
    <div role="group" aria-label={t('Otras formas de entrar')} className="mt-5 flex flex-col gap-3">
      <p className="text-center text-xs text-on-surface-variant">{t('o continúa con')}</p>
      {providers.map((p) =>
        p.id === 'enterprise' ? (
          asking ? (
            <form key={p.id} onSubmit={enterprise} noValidate className="flex flex-col gap-2">
              <Input
                label={t('Correo de tu empresa')}
                type="email"
                autoComplete="username"
                leading={RiProfileLine}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setTouched(true)}
                error={invalid ? t('Introduce un correo válido') : undefined}
              />
              <Button type="submit" variant="outlined">
                {t('Continuar')}
              </Button>
            </form>
          ) : (
            <Button key={p.id} variant="outlined" onClick={() => setAsking(true)}>
              <Icon icon={RiProfileLine} size={20} />
              {t('Continuar con el SSO de mi empresa')}
            </Button>
          )
        ) : (
          <a
            key={p.id}
            href={ssoStartUrl(p.id)}
            onClick={() => rememberSsoReturn(returnUrl)}
            className={cn(buttonVariants({ variant: 'outlined' }))}
          >
            {t('Continuar con {0}', [p.label])}
          </a>
        )
      )}
    </div>
  );
}
