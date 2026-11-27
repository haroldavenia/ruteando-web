'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AccessTitle } from '@/components/access/step';
import { buttonVariants } from '@/components/ui/button';
import { FormResult } from '@/components/ui/form-result';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import { ssoComplete } from '@/lib/auth-client';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';
import { ssoErrorKey } from '@/lib/sso-messages';
import { takeSsoReturn } from '@/lib/sso-return';

import { SecondFactor, type SecondFactorStep } from './second-factor';

type State = { kind: 'working' } | { kind: 'error'; message: string } | SecondFactorStep;

/**
 * Regreso del proveedor (`/access/sso#ticket=…` o `#error=…`). El servidor deja el resultado en el fragmento (no viaja en peticiones ni en
 * `Referer`); aquí se quita de la dirección, se canjea el ticket (de un solo uso) y se sigue como un inicio de sesión normal: sesión, o el
 * segundo paso si la persona o su empresa lo exigen.
 */
export function SsoReturn() {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: 'working' });
  const started = useRef(false);

  function fail(message: string) {
    setState({ kind: 'error', message: message || t(ssoErrorKey(null)) });
  }

  function finish() {
    router.replace(takeSsoReturn());
    router.refresh();
  }

  useEffect(() => {
    // El ticket es de un solo uso: el doble montaje de desarrollo no debe canjearlo dos veces
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    // El ticket no debe quedarse en la barra de direcciones ni en el historial
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    const ticket = params.get('ticket');
    if (!ticket) {
      // Fuera del cuerpo del efecto: cambiar el estado ahí mismo provoca un render en cascada
      const message = t(ssoErrorKey(params.get('error')));
      queueMicrotask(() => setState({ kind: 'error', message }));
      return;
    }
    ssoComplete(ticket, t).then(
      (result) => {
        if (result.kind === 'session') finish();
        else if (result.kind === 'challenge') setState({ kind: 'verify', challenge: result.challenge });
        else setState({ kind: 'enroll', enroll: result.enroll });
      },
      (err: unknown) => fail(err instanceof Error ? err.message : '')
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar: el fragmento se lee una vez
  }, []);

  if (state.kind === 'verify' || state.kind === 'enroll') {
    return <SecondFactor step={state} onVerified={finish} onCancelled={fail} />;
  }
  if (state.kind === 'error') {
    return (
      <>
        <AccessTitle>{t('No se pudo iniciar sesión')}</AccessTitle>
        <FormResult error={state.message} />
        <Link href="/access" className={cn(buttonVariants({ variant: 'primary', size: 'lg' }))}>
          {t('Volver al inicio de sesión')}
        </Link>
      </>
    );
  }
  return (
    <>
      <AccessTitle>{t('Iniciando sesión')}</AccessTitle>
      <Loading label={t('Iniciando sesión')}>
        <Skeleton className="h-2 w-full rounded-full" />
      </Loading>
    </>
  );
}
