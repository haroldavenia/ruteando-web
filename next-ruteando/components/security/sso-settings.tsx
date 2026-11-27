'use client';

import { RiLinksLine } from '@remixicon/react';
import { useEffect, useMemo, useState } from 'react';
import { type FieldErrors, type Resolver, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/lib/i18n/client';
import { parseDomains, ssoApi, type SsoEnterprise, type SsoPolicy } from '@/lib/sso-client';

interface Values {
  name: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  domains: string;
}

/**
 * Inicio de sesión único de la empresa (solo administradores): si se permite entrar con SSO y, si el servidor lo ofrece, el proveedor
 * OpenID Connect propio de la empresa (emisor, cliente, secreto y dominios de correo). El secreto se guarda cifrado y nunca vuelve al
 * navegador. No pinta nada si el servidor no tiene el SSO activado.
 */
export function SsoSettings() {
  const t = useT();
  const api = useMemo(() => ssoApi(t), [t]);
  const [policy, setPolicy] = useState<SsoPolicy | null>(null);
  const [enterprise, setEnterprise] = useState<SsoEnterprise | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    // Sin SSO en el servidor las dos peticiones fallan y la sección no aparece
    api.policy().then(
      (found) => current && setPolicy(found),
      () => current && setPolicy(null)
    );
    api.enterprise().then(
      (found) => current && setEnterprise(found),
      () => current && setEnterprise(null)
    );
    return () => {
      current = false;
    };
  }, [api]);

  async function run<T>(request: Promise<T>, done: (out: T) => void) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      done(await request);
    } catch (err) {
      // Si el servidor corrigió o rechazó algo, el formulario se queda como está para que se pueda reparar
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    } finally {
      setBusy(false);
    }
  }

  if (!policy) return null;
  const names = policy.providers.map((p) => (p.id === 'enterprise' ? t('SSO de empresa') : p.label)).join(', ');
  return (
    <Card aria-labelledby="sso-title" className="flex flex-col gap-3">
      <CardTitle id="sso-title">{t('Inicio de sesión único')}</CardTitle>
      <p className="text-on-surface-variant">
        {t('Permite que las personas de tu empresa entren con su cuenta de un proveedor, en lugar de la contraseña.')}
      </p>
      <FormResult error={error} success={notice} />
      <div className="flex flex-wrap items-center gap-3 rounded-control border border-outline-variant px-4 py-3">
        <Icon icon={RiLinksLine} />
        <div className="flex min-w-56 flex-1 flex-col gap-0.5">
          <strong>{t('Permitir el inicio de sesión único')}</strong>
          <span className="text-on-surface-variant">{names}</span>
        </div>
        <Switch
          checked={policy.enabled}
          disabled={busy}
          label={t('Permitir el inicio de sesión único')}
          onChange={(enabled) =>
            void run(api.setPolicy(enabled), () => {
              setPolicy({ ...policy, enabled });
              setNotice(enabled ? t('Inicio de sesión único permitido') : t('Inicio de sesión único desactivado'));
            })
          }
        />
      </div>
      {enterprise?.available ? (
        <EnterpriseForm
          key={`${enterprise.name}|${enterprise.issuer}|${enterprise.hasSecret}`}
          enterprise={enterprise}
          busy={busy}
          onSave={(input) =>
            void run(api.saveEnterprise(input), (saved) => {
              setEnterprise(saved);
              setNotice(t('Proveedor guardado'));
            })
          }
          onRemove={() =>
            void run(api.deleteEnterprise(), (saved) => {
              setEnterprise(saved);
              setNotice(t('Proveedor quitado'));
            })
          }
        />
      ) : null}
    </Card>
  );
}

function EnterpriseForm({
  enterprise,
  busy,
  onSave,
  onRemove,
}: {
  enterprise: SsoEnterprise;
  busy: boolean;
  onSave: (input: { name: string; issuer: string; clientId: string; clientSecret: string; domains: string[] }) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const resolver = useMemo<Resolver<Values>>(
    () => async (values) => {
      const errors: FieldErrors<Values> = {};
      const required = t('Este campo es obligatorio');
      if (!values.name.trim()) errors.name = { type: 'required', message: required };
      if (!values.issuer.trim()) errors.issuer = { type: 'required', message: required };
      else if (!/^https:\/\/\S+$/.test(values.issuer.trim())) {
        errors.issuer = { type: 'pattern', message: t('Escribe una dirección https válida') };
      }
      if (!values.clientId.trim()) errors.clientId = { type: 'required', message: required };
      // Sin secreto guardado hace falta uno; con él, vacío significa «conservar»
      if (!enterprise.hasSecret && !values.clientSecret) errors.clientSecret = { type: 'required', message: required };
      if (parseDomains(values.domains).length === 0) errors.domains = { type: 'required', message: required };
      return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
    },
    [t, enterprise.hasSecret]
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver,
    defaultValues: {
      name: enterprise.name,
      issuer: enterprise.issuer,
      clientId: enterprise.clientId,
      clientSecret: '',
      domains: enterprise.domains.join(', '),
    },
  });

  return (
    <>
      <h3 className="mt-4 font-medium">{t('Proveedor de tu empresa (OpenID Connect)')}</h3>
      <p className="text-on-surface-variant">
        {t('Registra esta dirección de regreso en tu proveedor y copia aquí sus datos.')}
        <code className="mt-1 block break-all">{enterprise.redirectUri}</code>
      </p>
      <Form
        onSubmit={handleSubmit((v) =>
          onSave({
            name: v.name.trim(),
            issuer: v.issuer.trim(),
            clientId: v.clientId.trim(),
            clientSecret: v.clientSecret,
            domains: parseDomains(v.domains),
          })
        )}
        className="grid max-w-xl gap-3"
      >
        <Input label={t('Nombre')} maxLength={80} error={errors.name?.message} {...register('name')} />
        <Input label={t('Emisor (URL https)')} type="url" error={errors.issuer?.message} {...register('issuer')} />
        <Input
          label={t('Identificador de cliente')}
          autoComplete="off"
          error={errors.clientId?.message}
          {...register('clientId')}
        />
        <Input
          label={t('Secreto de cliente')}
          type="password"
          autoComplete="new-password"
          hint={enterprise.hasSecret ? t('Déjalo vacío para conservar el guardado') : undefined}
          error={errors.clientSecret?.message}
          {...register('clientSecret')}
        />
        <Input
          label={t('Dominios de correo')}
          hint={t('Separados por comas')}
          error={errors.domains?.message}
          {...register('domains')}
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" disabled={busy}>
            {t('Guardar proveedor')}
          </Button>
          {enterprise.configured ? (
            <Button variant="text" disabled={busy} onClick={onRemove}>
              {t('Quitar proveedor')}
            </Button>
          ) : null}
        </div>
      </Form>
    </>
  );
}
