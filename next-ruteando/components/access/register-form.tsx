'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { RiMailCheckLine, RiMailLine } from '@remixicon/react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { AccessTitle, Lead } from '@/components/access/step';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { confirmMatches, emailField, newPasswordShape } from '@/lib/account-schemas';
import { ApiError } from '@/lib/api-client';
import { register as registerAccount, resendVerification } from '@/lib/auth-client';
import { useT } from '@/lib/i18n/client';

import { NewPasswordFields } from './new-password-fields';
import { StatePanel } from './state-panel';

const LEGAL = [
  ['privacy', 'Política de privacidad'],
  ['terms', 'Términos y condiciones'],
  ['sms', 'Verificación por SMS'],
] as const;

/**
 * Crea la cuenta y su empresa. No inicia sesión: la cuenta se activa al abrir el enlace del correo. Si el gateway rechaza algo, las
 * contraseñas se vacían (no se conservan tras un fallo) y, cuando es por la política, la primera recibe el foco.
 */
export function RegisterForm() {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z
        .object({
          firstName: z.string().trim().min(1, t('Introduce tu nombre')),
          lastName: z.string().trim().min(1, t('Introduce tus apellidos')),
          tenantName: z.string().trim().min(1, t('Introduce el nombre de tu empresa')),
          email: emailField(t),
          ...newPasswordShape(t),
        })
        .refine((v) => v.password === v.confirm, confirmMatches(t)),
    [t]
  );
  type Values = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    control,
    formState: { errors, isSubmitted },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', tenantName: '', email: '', password: '', confirm: '' },
  });

  const password = useWatch({ control, name: 'password' });

  async function onSubmit(values: Values) {
    setLoading(true);
    setError(null);
    try {
      const { confirm: _confirm, ...input } = values;
      await registerAccount({ ...input, email: input.email.trim() }, t);
      resetField('password', { defaultValue: '' });
      resetField('confirm', { defaultValue: '' });
      setLoading(false);
      setSentTo(input.email.trim());
    } catch (err) {
      setLoading(false);
      resetField('password', { defaultValue: '' });
      resetField('confirm', { defaultValue: '' });
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
      if (err instanceof ApiError && err.code === 'PASSWORD_POLICY_VIOLATION') setFocus('password');
    }
  }

  if (sentTo) return <CheckEmail email={sentTo} />;

  return (
    <>
      <AccessTitle>{t('Crea tu cuenta')}</AccessTitle>
      <Lead>{t('Empieza a planificar tus rutas.')}</Lead>
      <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-7">
        <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
          <Input
            label={t('Nombre||pila')}
            requiredMark
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label={t('Apellidos')}
            requiredMark
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
          <Input
            label={t('Nombre de la empresa')}
            requiredMark
            className="sm:col-span-2"
            autoComplete="organization"
            error={errors.tenantName?.message}
            {...register('tenantName')}
          />
          <Input
            label={t('Correo electrónico')}
            requiredMark
            className="sm:col-span-2"
            type="email"
            autoComplete="username"
            leading={RiMailLine}
            error={errors.email?.message}
            {...register('email')}
          />
        </div>
        <NewPasswordFields
          passwordProps={register('password')}
          confirmProps={register('confirm')}
          value={password}
          submitted={isSubmitted}
          passwordError={errors.password?.message}
          confirmError={errors.confirm?.message}
        />
        <p className="text-xs/4 text-on-surface-variant">
          {t(
            'Al crear tu cuenta aceptas los términos, la política de privacidad y los mensajes SMS de verificación. Léelos aquí:'
          )}{' '}
          {LEGAL.map(([doc, title], index) => (
            <span key={doc}>
              {index > 0 ? <span aria-hidden="true"> · </span> : null}
              <Link
                href={`/legal/${doc}`}
                target="_blank"
                rel="noopener"
                className="text-primary underline underline-offset-3"
              >
                {t(title)}
              </Link>
            </span>
          ))}
        </p>
        <FormResult error={error} />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          aria-label={loading ? t('Creando la cuenta') : undefined}
        >
          {t('Crear cuenta')}
        </Button>
      </Form>
      <p className="mt-6 text-center">
        {t('¿Ya tienes cuenta?')}{' '}
        <Link href="/access" className="text-primary underline underline-offset-3">
          {t('Iniciar sesión')}
        </Link>
      </p>
    </>
  );
}

/** «Revisa tu correo» tras registrarse, con la posibilidad de reenviar el enlace. */
function CheckEmail({ email }: { email: string }) {
  const t = useT();
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setResending(true);
    setDone(false);
    setError(null);
    try {
      await resendVerification(email, t);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    } finally {
      setResending(false);
    }
  }

  return (
    <StatePanel icon={RiMailCheckLine} title={t('Revisa tu correo')}>
      <p>
        {t('Hemos enviado un enlace de verificación a')} <strong>{email}</strong>
        {t('. Ábrelo para activar tu cuenta.')}
      </p>
      {/* Mismo texto que el gateway no revela si el correo existe: es fijo, no depende de la respuesta */}
      <FormResult
        error={error}
        success={done ? t('Si el correo existe, recibirás instrucciones de verificación') : null}
      />
      <div className="flex flex-wrap gap-3">
        <Button variant="outlined" loading={resending} onClick={resend}>
          {t('Reenviar correo')}
        </Button>
        <Link href="/access" className={buttonVariants({ variant: 'text' })}>
          {t('Ir a iniciar sesión')}
        </Link>
      </div>
    </StatePanel>
  );
}
