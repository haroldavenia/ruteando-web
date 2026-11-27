'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { RiLinkUnlinkM, RiMailLine, RiRouteLine } from '@remixicon/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import { useNotify } from '@/components/ui/toast';
import { emailField } from '@/lib/account-schemas';
import { INVALID_LINK, resendVerification, verifyEmail } from '@/lib/auth-client';
import { useT } from '@/lib/i18n/client';
import { stripQueryParam } from '@/lib/navigation-client';

import { SecondFactor, type SecondFactorStep } from './second-factor';
import { StatePanel } from './state-panel';

type State =
  { kind: 'loading' } | { kind: 'failed'; message: string } | { kind: 'second-factor'; step: SecondFactorStep };

/**
 * Verifica el correo con el token del enlace. El token es de un solo uso: se canjea una sola vez (aunque el modo estricto de React monte dos
 * veces el efecto) y solo en el navegador, y se retira de la barra de direcciones antes de cualquier otra cosa. El gateway puede entregar
 * una sesión: pasa por el segundo factor igual que un inicio de sesión, y sin él entra a Inicio.
 */
export function VerifyEmail({ token }: { token: string | null }) {
  const t = useT();
  const router = useRouter();
  const notify = useNotify();
  const started = useRef(false);
  const [state, setState] = useState<State>(() =>
    token ? { kind: 'loading' } : { kind: 'failed', message: t(INVALID_LINK) }
  );

  useEffect(() => {
    stripQueryParam('token');
    if (!token || started.current) return;
    started.current = true;
    verifyEmail(token, t).then(
      (result) => {
        if (result.kind === 'session') {
          router.replace('/');
          router.refresh();
          notify(t('Correo verificado'));
        } else {
          setState({
            kind: 'second-factor',
            step:
              result.kind === 'challenge'
                ? { kind: 'verify', challenge: result.challenge }
                : { kind: 'enroll', enroll: result.enroll },
          });
        }
      },
      (err: unknown) =>
        setState({
          kind: 'failed',
          message: err instanceof Error ? err.message : t('No se pudo completar la solicitud'),
        })
    );
  }, [token, t, router, notify]);

  if (state.kind === 'second-factor') {
    return (
      <SecondFactor
        step={state.step}
        onVerified={() => {
          router.replace('/');
          router.refresh();
        }}
        onCancelled={(message) => setState({ kind: 'failed', message })}
      />
    );
  }

  if (state.kind === 'loading') {
    return (
      <StatePanel icon={RiRouteLine} title={t('Verificar correo')}>
        <Loading label={t('Verificando tu correo…')} className="grid gap-3">
          <p aria-hidden="true">{t('Verificando tu correo…')}</p>
          <Skeleton className="h-2 w-full rounded-full" />
        </Loading>
      </StatePanel>
    );
  }

  return (
    <StatePanel icon={RiLinkUnlinkM} tone="error" title={t('Verificar correo')}>
      <ResendForm message={state.message} />
      <p className="text-sm">
        <Link href="/access" className="text-primary underline underline-offset-3">
          {t('Ir a iniciar sesión')}
        </Link>
      </p>
    </StatePanel>
  );
}

/** Pedir otro enlace de verificación; la respuesta es un texto fijo para no revelar si el correo existe. */
function ResendForm({ message }: { message: string }) {
  const t = useT();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const schema = useMemo(() => z.object({ email: emailField(t) }), [t]);
  type Values = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  async function onSubmit(values: Values) {
    setLoading(true);
    setDone(false);
    setError(null);
    try {
      await resendVerification(values.email.trim(), t);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <FormResult
        error={error ?? message}
        success={done ? t('Si el correo existe, recibirás instrucciones de verificación') : null}
      />
      <p className="text-on-surface-variant">{t('Puedes pedir que te enviemos un enlace nuevo.')}</p>
      <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label={t('Correo electrónico')}
          type="email"
          autoComplete="username"
          leading={RiMailLine}
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" variant="outlined" loading={loading}>
          {t('Reenviar verificación')}
        </Button>
      </Form>
    </>
  );
}
