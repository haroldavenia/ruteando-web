'use client';

import { RiEyeLine, RiEyeOffLine } from '@remixicon/react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type FieldErrors, type Resolver, useForm } from 'react-hook-form';

import { DataTable } from '@/components/data/data-table';
import { FormHead } from '@/components/page/form-kit';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { IconButton } from '@/components/ui/icon-button';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import { useNotify } from '@/components/ui/toast';
import type { MasterDomain, MasterDomainValue, MasterDomainValueInput } from '@/lib/api/models';
import { getData, requestJson } from '@/lib/api-client';
import { keyError, sortValues, valuesText } from '@/lib/catalogs/values';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { refreshMasterDomains } from '@/lib/hooks/use-master-domain';
import { useT } from '@/lib/i18n/client';
import type { Column } from '@/lib/list/list-logic';
import { localList } from '@/lib/list/local-list';

interface Values {
  key: string;
  label: string;
  description: string;
  sortOrder: string;
}

const EMPTY: Values = { key: '', label: '', description: '', sortOrder: '' };

/**
 * Un catálogo y sus valores: ver, añadir un valor y activarlo o desactivarlo (el gateway no borra valores). El gateway responde con el
 * catálogo completo tras cada cambio; se actualiza también la lectura compartida que llena los selectores.
 */
export function CatalogDetail({ code }: { code: string }) {
  const t = useT();
  const notify = useNotify();
  const { ask, dialog } = useConfirm();
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; domain: MasterDomain }
  >({ status: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let current = true;
    getData<MasterDomain>(`master-domains/${encodeURIComponent(code)}`, t).then(
      (domain) => current && setState({ status: 'ready', domain }),
      (err: unknown) =>
        current &&
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : t('No se pudo completar la solicitud'),
        })
    );
    return () => {
      current = false;
    };
  }, [code, t]);

  /** Tras un cambio: pinta el catálogo que respondió el gateway y avisa a los selectores de que sus opciones cambiaron. */
  const changed = useCallback(
    (domain: MasterDomain) => {
      setState({ status: 'ready', domain });
      void refreshMasterDomains(t).catch(() => undefined);
    },
    [t]
  );

  const resolver = useMemo<Resolver<Values>>(
    () => async (values) => {
      const errors: FieldErrors<Values> = {};
      const required = t('Este campo es obligatorio');
      const key = keyError(values.key);
      if (key)
        errors.key = { type: key, message: key === 'required' ? required : t('La clave no puede llevar espacios') };
      if (!values.label.trim()) errors.label = { type: 'required', message: required };
      if (!/^\d*$/.test(values.sortOrder)) {
        errors.sortOrder = { type: 'pattern', message: t('Escribe un número entero de 0 en adelante') };
      }
      return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
    },
    [t]
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver, defaultValues: EMPTY });

  const domain = state.status === 'ready' ? state.domain : null;
  const values = useMemo(() => (domain ? sortValues(domain.values) : []), [domain]);
  const list = useMemo(() => localList(values), [values]);
  const columns = useMemo<Column<MasterDomainValue>[]>(
    () => [
      { id: 'key', header: t('Clave'), cell: (v) => v.key, kind: 'id', primary: true },
      { id: 'label', header: t('Nombre'), cell: (v) => v.label, kind: 'strong' },
      { id: 'description', header: t('Descripción'), cell: (v) => v.description ?? '', kind: 'muted' },
      { id: 'order', header: t('Orden'), cell: (v) => (v.sortOrder === null ? '' : String(v.sortOrder)) },
      {
        id: 'state',
        header: t('Estado'),
        cell: (v) => (v.active ? t('Activo') : t('Inactivo')),
        tone: (v) => (v.active ? 'success' : 'neutral'),
      },
    ],
    [t]
  );

  async function toggle(value: MasterDomainValue) {
    if (busyKey !== null) return;
    setError(null);
    // Activar es directo; apagarlo (los selectores dejan de ofrecerlo) pide confirmación
    if (value.active) {
      const ok = await ask({
        title: t('Desactivar valor'),
        message: t('«{0}» dejará de ofrecerse en los selectores del sistema. Puedes volver a activarlo después.', [
          value.label,
        ]),
        confirmLabel: t('Desactivar'),
      });
      if (!ok) return;
    }
    setBusyKey(value.key);
    try {
      const updated = await requestJson<MasterDomain>(
        'PATCH',
        `/middleware/data/master-domains/${encodeURIComponent(code)}/values/${encodeURIComponent(value.key)}/toggle`,
        undefined,
        t
      );
      changed(updated);
      notify(value.active ? t('Se desactivó el valor «{0}»', [value.key]) : t('Se activó el valor «{0}»', [value.key]));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    } finally {
      setBusyKey(null);
    }
  }

  async function add(form: Values) {
    setAdding(true);
    setSubmitError(null);
    const value: MasterDomainValueInput = {
      key: form.key.trim(),
      label: form.label.trim(),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(form.sortOrder !== '' ? { sortOrder: Number(form.sortOrder) } : {}),
    };
    try {
      const updated = await requestJson<MasterDomain>(
        'POST',
        `/middleware/data/master-domains/${encodeURIComponent(code)}/values`,
        value,
        t,
        { 409: t('Ya existe un valor con esa clave en este catálogo') }
      );
      reset(EMPTY);
      changed(updated);
      notify(t('Se añadió el valor «{0}»', [value.key]));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    } finally {
      setAdding(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <>
        <h1 className="font-brand text-2xl font-bold">{t('Catálogo')}</h1>
        <Card>
          <Loading label={t('Cargando…')} className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((n) => (
              <Skeleton key={n} className="h-14" />
            ))}
          </Loading>
        </Card>
      </>
    );
  }
  if (state.status === 'error' || !domain) {
    return (
      <>
        <h1 className="font-brand text-2xl font-bold">{t('Catálogo')}</h1>
        <FormResult error={state.status === 'error' ? state.message : null} />
        <Link href="/catalogs" className={buttonVariants({ variant: 'outlined' })}>
          {t('Volver al listado')}
        </Link>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FormHead title={domain.code} backLabel={t('Catálogos')} backHref="/catalogs" />

      <Card aria-labelledby="summary-title">
        <CardTitle id="summary-title" className="mb-3">
          {t('Resumen')}
        </CardTitle>
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(9rem,100%),1fr))] gap-x-6 gap-y-4">
          <div>
            <dt className="text-xs text-on-surface-variant">{t('Descripción')}</dt>
            <dd className="m-0 font-medium">{domain.description}</dd>
          </div>
          <div>
            <dt className="text-xs text-on-surface-variant">{t('Tipo')}</dt>
            <dd className="m-0 font-medium">{domain.system ? t('Del sistema') : t('Propio')}</dd>
          </div>
          <div>
            <dt className="text-xs text-on-surface-variant">{t('Valores activos')}</dt>
            <dd className="m-0 font-medium">{valuesText(domain, (a, b) => t('{0} de {1}', [a, b]))}</dd>
          </div>
        </dl>
      </Card>

      <Card aria-labelledby="values-title" className="flex flex-col gap-3">
        <CardTitle id="values-title">{t('Valores')}</CardTitle>
        <FormResult error={error} />
        <DataTable<MasterDomainValue>
          list={list}
          columns={columns}
          rowKey={(v) => v.key}
          entityPlural={t('valores')}
          emptyMessage={t('Este catálogo todavía no tiene valores')}
          searchPlaceholder={t('Buscar por clave o nombre')}
          rowActions={(row) => (
            <IconButton
              icon={row.active ? RiEyeOffLine : RiEyeLine}
              label={(row.active ? t('Desactivar valor ') : t('Activar valor ')) + row.key}
              disabled={busyKey !== null}
              onClick={() => void toggle(row)}
            />
          )}
        />
      </Card>

      <Card>
        <Form onSubmit={handleSubmit(add)} className="flex flex-col gap-4">
          <h2 className="font-brand text-lg font-bold">{t('Añadir un valor')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('Clave')}
              hint={t('Se usa tal cual en el sistema; sin espacios')}
              autoComplete="off"
              error={errors.key?.message}
              {...register('key')}
            />
            <Input label={t('Nombre')} autoComplete="off" error={errors.label?.message} {...register('label')} />
            <Input label={t('Descripción (opcional)')} autoComplete="off" {...register('description')} />
            <Input
              label={t('Orden (opcional)')}
              inputMode="numeric"
              autoComplete="off"
              error={errors.sortOrder?.message}
              {...register('sortOrder')}
            />
          </div>
          <FormResult error={submitError} />
          <div>
            <Button type="submit" variant="primary" loading={adding}>
              {t('Añadir valor')}
            </Button>
          </div>
        </Form>
      </Card>
      {dialog}
    </div>
  );
}
