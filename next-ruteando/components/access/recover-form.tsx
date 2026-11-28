'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { RiMailLine, RiMailUnreadLine } from '@remixicon/react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AccessTitle, Lead } from '@/components/access/step';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { emailField } from '@/lib/account-schemas';
import { forgotPassword } from '@/lib/auth-client';
import { useT } from '@/lib/i18n/client';

import { StatePanel } from './state-panel';

/**
 * Pide el enlace para elegir otra contraseña. La confirmación es un texto fijo: no depende de la respuesta del gateway para no revelar
 * si la cuenta existe.
 */
export function RecoverForm() {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const schema = useMemo(() => z.object({ email: emailField(t) }), [t]);
  type Values = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  async function onSubmit(values: Values) {
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(values.email.trim(), t);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {sent ? (
        <StatePanel icon={RiMailUnreadLine} title={t('Revisa tu correo')}>
          <FormResult success={t('Si el correo existe, recibirás instrucciones para restablecer tu contraseña')} />
        </StatePanel>
      ) : (
        <>
          <AccessTitle>{t('Recuperar contraseña')}</AccessTitle>
          <Lead>{t('Escribe tu correo y te enviaremos un enlace para elegir una contraseña nueva.')}</Lead>
          <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-7">
            <Input
              label={t('Correo electrónico')}
              requiredMark
              type="email"
              autoComplete="username"
              leading={RiMailLine}
              error={errors.email?.message}
              {...register('email')}
            />
            <FormResult error={error} />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              aria-label={loading ? t('Enviando la solicitud') : undefined}
            >
              {t('Enviar enlace')}
            </Button>
          </Form>
        </>
      )}
      <p className="mt-6 text-center">
        <Link href="/access" className="text-primary underline underline-offset-3">
          {t('Volver a iniciar sesión')}
        </Link>
      </p>
    </>
  );
}
