'use client';

import { RiShieldLine } from '@remixicon/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useT } from '@/lib/i18n/client';
import { mfaApi, type MfaStatus } from '@/lib/mfa-client';

const PROFILE = '/profile';

/** Hay algo que activar: la persona no tiene ningún método y la empresa permite y el servidor ofrece al menos uno. */
export function needsMfaActivation(status: MfaStatus): boolean {
  return status.activeCount === 0 && Object.values(status.methods).some((method) => method.allowed && method.available);
}

/**
 * Aviso bajo la barra del área privada (el `app-mfa-reminder` de Angular): si la persona no tiene ningún método de segundo factor
 * activo (cuando la empresa lo exige ya se pidió al iniciar sesión), la invita a activar uno en el perfil. «Más tarde» lo oculta
 * hasta el próximo inicio de sesión. Con el módulo apagado (503) o sin métodos disponibles no aparece; en el propio perfil tampoco
 * (ahí se activa), y al salir de él se vuelve a comprobar por si ya activó uno.
 */
export function MfaReminder() {
  const t = useT();
  const api = useMemo(() => mfaApi(t), [t]);
  const onProfile = usePathname().split(/[?#]/)[0] === PROFILE;
  const [needed, setNeeded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (onProfile) return;
    let current = true;
    api.status().then(
      (status) => current && setNeeded(needsMfaActivation(status)),
      // 503 con el módulo apagado, o cualquier fallo: sin aviso, nunca se estorba
      () => current && setNeeded(false)
    );
    return () => {
      current = false;
    };
  }, [api, onProfile]);

  if (!needed || dismissed || onProfile) return null;
  return (
    <div
      role="status"
      className="sticky top-14 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-outline-variant bg-warning-container px-4 py-2.5 text-on-warning-container sm:top-17"
    >
      <Icon icon={RiShieldLine} size={24} />
      <p className="m-0 grid flex-[1_1_280px] gap-0.5 text-sm">
        <strong className="font-medium">{t('Protege tu cuenta con la verificación en dos pasos')}</strong>
        <span>{t('Aún no tienes ningún método activo: elige correo, SMS o una aplicación autenticadora.')}</span>
      </p>
      <span className="flex flex-wrap gap-2">
        <Link href={PROFILE} className={buttonVariants({ variant: 'primary' })}>
          {t('Activar ahora')}
        </Link>
        <Button variant="text" onClick={() => setDismissed(true)}>
          {t('Más tarde')}
        </Button>
      </span>
    </div>
  );
}
