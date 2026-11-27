'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { RiLinkUnlinkM } from '@remixicon/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { AccessTitle } from '@/components/access/step';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { useNotify } from '@/components/ui/toast';
import { confirmMatches, newPasswordShape } from '@/lib/account-schemas';
import { ApiError } from '@/lib/api-client';
import { FORM_ERROR_CODES, INVALID_LINK, LINK_STATUSES, resetPassword } from '@/lib/auth-client';
import { useT } from '@/lib/i18n/client';
import { stripQueryParam } from '@/lib/navigation-client';

import { NewPasswordFields } from './new-password-fields';
import { StatePanel } from './state-panel';

/**
 * Elegir la contraseña nueva con el token del correo. El token llega como propiedad (lo lee el servidor) y se guarda solo en memoria hasta
 * el envío: en cuanto carga la pantalla se retira de la barra de direcciones y del historial. Un error que culpa al enlace (caducó, ya se
 * usó) cambia a «enlace no válido»; uno que culpa a la contraseña deja el formulario para escribir otra.
 */
export function ResetForm({ token }: { token: string | null }) {
  const t = useT();
  const router = useRouter();
  const notify = useNotify();
  const [linkInvalid, setLinkInvalid] = useState(!token);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => stripQueryParam('token'), []);

  const schema = useMemo(
    () => z.object(newPasswordShape(t)).refine((v) => v.password === v.confirm, confirmMatches(t)),
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
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } });

  const password = useWatch({ control, name: 'password' });

  async function onSubmit(values: Values) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await resetPassword(token, values.password, t);
      router.push('/access');
      notify(t('Contraseña actualizada, ya puedes iniciar sesión'));
    } catch (err) {
      setLoading(false);
      resetField('password', { defaultValue: '' });
      resetField('confirm', { defaultValue: '' });
      const blamesForm = err instanceof ApiError && err.code !== undefined && FORM_ERROR_CODES.includes(err.code);
      if (err instanceof ApiError && LINK_STATUSES.includes(err.status) && !blamesForm) {
        setLinkInvalid(true);
        return;
      }
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
      setFocus('password');
    }
  }

  if (linkInvalid) {
    return (
      <StatePanel icon={RiLinkUnlinkM} tone="error" title={t('Restablecer contraseña')}>
        <FormResult error={t(INVALID_LINK)} />
        <p className="text-sm">
          <Link href="/access/recover" className="text-primary underline underline-offset-3">
            {t('Solicitar un enlace nuevo')}
          </Link>
        </p>
      </StatePanel>
    );
  }

  return (
    <>
      <AccessTitle>{t('Restablecer contraseña')}</AccessTitle>
      <Form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <NewPasswordFields
          passwordProps={register('password')}
          confirmProps={register('confirm')}
          value={password}
          submitted={isSubmitted}
          passwordError={errors.password?.message}
          confirmError={errors.confirm?.message}
          passwordLabel={t('Contraseña nueva')}
        />
        <FormResult error={error} />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          aria-label={loading ? t('Cambiando la contraseña') : undefined}
        >
          {t('Cambiar contraseña')}
        </Button>
      </Form>
    </>
  );
}
