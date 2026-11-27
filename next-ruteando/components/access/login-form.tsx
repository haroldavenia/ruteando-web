'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { RiLockLine, RiMailLine } from '@remixicon/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AccessTitle, Lead } from '@/components/access/step';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { PasswordField } from '@/components/ui/password-field';
import { ApiError } from '@/lib/api-client';
import { login, type MfaChallenge, type MfaEnrollChallenge } from '@/lib/auth-client';
import { useT } from '@/lib/i18n/client';
import { safeReturnUrl } from '@/lib/return-url';

import { SecondFactor } from './second-factor';
import { SsoButtons } from './sso-buttons';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step =
  | { kind: 'credentials' }
  | { kind: 'verify'; challenge: MfaChallenge }
  | { kind: 'enroll'; enroll: MfaEnrollChallenge };

/**
 * Pantalla de acceso: correo y contraseña y, si el servidor lo pide, el segundo paso (verificar o activar el 2FA). Las cookies de
 * sesión las escribe el servidor: aquí nunca hay un token. Tras una credencial rechazada la contraseña se vacía y recibe el foco (el
 * correo se conserva); con el segundo factor la contraseña tampoco se conserva.
 */
export function LoginForm({ returnUrl }: { returnUrl?: string | null }) {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: 'credentials' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .trim()
          .min(1, t('Introduce tu correo'))
          .refine((value) => EMAIL.test(value), t('Introduce un correo válido')),
        password: z.string().min(1, t('Introduce tu contraseña')),
      }),
    [t]
  );
  type Values = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  /** Sesión abierta (con o sin segundo factor): al destino de siempre, que pasa siempre por `safeReturnUrl`. */
  function finish() {
    router.replace(safeReturnUrl(returnUrl));
    router.refresh();
  }

  /** El reto ya no sirve (caducó, se agotaron los intentos) o la persona volvió: otra vez las credenciales. */
  function restart(message: string) {
    setStep({ kind: 'credentials' });
    setLoading(false);
    setError(message || null);
  }

  async function onSubmit(values: Values) {
    setLoading(true);
    setError(null);
    try {
      const result = await login(values.email.trim(), values.password, t);
      if (result.kind === 'session') {
        finish();
        return;
      }
      // Segundo factor: la contraseña ya no hace falta y no se conserva; la sesión llegará al superar el reto
      resetField('password', { defaultValue: '' });
      setLoading(false);
      setStep(
        result.kind === 'challenge'
          ? { kind: 'verify', challenge: result.challenge }
          : { kind: 'enroll', enroll: result.enroll }
      );
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
      if (err instanceof ApiError && err.status === 401) {
        resetField('password', { defaultValue: '' });
        setFocus('password');
      }
    }
  }

  if (step.kind !== 'credentials') {
    return <SecondFactor step={step} onVerified={finish} onCancelled={restart} />;
  }

  return (
    <>
      <AccessTitle>{t('Bienvenido de nuevo')}</AccessTitle>
      <Lead>{t('Inicia sesión para seguir tus rutas.')}</Lead>
      <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label={t('Correo electrónico')}
          type="email"
          autoComplete="username"
          leading={RiMailLine}
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label={t('Contraseña')}
          autoComplete="current-password"
          leading={RiLockLine}
          error={errors.password?.message}
          {...register('password')}
        />
        <p className="-mt-2 text-end text-sm">
          <Link href="/access/recover" className="text-primary underline underline-offset-3">
            {t('¿Olvidaste tu contraseña?')}
          </Link>
        </p>
        <FormResult error={error} />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          aria-label={loading ? t('Iniciando sesión') : undefined}
        >
          {t('Iniciar sesión')}
        </Button>
      </Form>
      <SsoButtons returnUrl={returnUrl} />
      <p className="text-center text-sm">
        {t('¿No tienes cuenta?')}{' '}
        <Link href="/access/register" className="text-primary underline underline-offset-3">
          {t('Crear cuenta')}
        </Link>
      </p>
    </>
  );
}
