'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { type FieldErrors, type Resolver, useForm, useWatch } from 'react-hook-form';

import { FormActions, FormCard, FormHead, FormSection } from '@/components/page/form-kit';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { FormSelect } from '@/components/ui/form-select';
import { Loading } from '@/components/ui/skeleton';
import type { Settings, SettingsInput } from '@/lib/api/models';
import { useCrud } from '@/lib/hooks/use-crud';
import { useUnsavedWarning } from '@/lib/hooks/use-unsaved-warning';
import { useT } from '@/lib/i18n/client';
import { planJourney } from '@/lib/journeys/journey-api';
import { planErrorMessage } from '@/lib/journeys/plan-errors';

import { PackagePicker } from './package-picker';

/** Cuántas configuraciones se cargan en el selector; si hay más, el formulario avisa. */
export const SELECT_LIMIT = 200;

interface Values {
  name: string;
  settingsId: string;
}

/**
 * Planificar una jornada: nombre, configuración y paquetes. La planificación la hace el servidor y puede tardar: mientras tanto se
 * muestra el progreso y se bloquea el envío. Los errores del gateway (identificadores, tiempo agotado) se explican con su mensaje.
 */
export function JourneyForm() {
  const t = useT();
  const router = useRouter();
  const settingsApi = useCrud<Settings, SettingsInput>('settings');
  const [settings, setSettings] = useState<{ rows: readonly Settings[]; loaded: boolean; truncated: boolean }>({
    rows: [],
    loaded: false,
    truncated: false,
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionTouched, setSelectionTouched] = useState(false);
  const [noPackages, setNoPackages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let current = true;
    settingsApi.list(0, SELECT_LIMIT).then(
      (page) =>
        current &&
        setSettings({ rows: page.content, loaded: true, truncated: page.totalElements > page.content.length }),
      () => current && setSettings((s) => ({ ...s, loaded: true }))
    );
    return () => {
      current = false;
    };
  }, [settingsApi]);

  const resolver = useMemo<Resolver<Values>>(
    () => async (values) => {
      const errors: FieldErrors<Values> = {};
      const required = t('Este campo es obligatorio');
      if (!values.name.trim()) errors.name = { type: 'required', message: required };
      if (!values.settingsId) errors.settingsId = { type: 'required', message: required };
      return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
    },
    [t]
  );
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver, defaultValues: { name: '', settingsId: '' } });
  useUnsavedWarning((isDirty || selectedIds.length > 0) && !loading);
  const value = useWatch({ control });
  const selectionError = selectionTouched && selectedIds.length === 0 ? t('Elige al menos un paquete') : '';

  /** Lo que se va a planificar, para el resumen «Revisa»: solo da formato a lo que hay en el formulario. */
  const review = {
    name: value.name?.trim() || null,
    settings: settings.rows.find((item) => item.id === value.settingsId)?.description ?? null,
    packages:
      selectedIds.length === 0
        ? null
        : selectedIds.length === 1
          ? t('1 paquete')
          : t('{0} paquetes', [selectedIds.length]),
  };

  async function plan(values: Values) {
    setLoading(true);
    setError(null);
    try {
      const journey = await planJourney(
        { name: values.name.trim(), settingsId: values.settingsId, packageIds: selectedIds },
        t
      );
      router.push(`/journeys/${encodeURIComponent(journey.id)}`);
    } catch (err) {
      setError(
        planErrorMessage(err, t) ?? (err instanceof Error ? err.message : t('No se pudo completar la solicitud'))
      );
      setLoading(false);
    }
  }

  return (
    <>
      <FormHead title={t('Planificar jornada')} backLabel={t('Jornadas')} backHref="/journeys" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <FormCard>
          <Form
            onSubmit={(event) => {
              setSelectionTouched(true);
              return handleSubmit((values) => (selectedIds.length === 0 ? undefined : plan(values)))(event);
            }}
            className="flex flex-col gap-2"
          >
            <FormSection title={t('Configuración')} step={1}>
              <Input
                label={t('Nombre de la jornada')}
                requiredMark
                autoComplete="off"
                error={errors.name?.message}
                {...register('name')}
              />
              <FormSelect
                control={control}
                name="settingsId"
                label={t('Configuración')}
                requiredMark
                error={errors.settingsId?.message}
              >
                <option value="" />
                {settings.rows.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.description}
                  </option>
                ))}
              </FormSelect>
              {settings.loaded && settings.rows.length === 0 ? (
                <p className="m-0 text-sm text-on-surface-variant md:col-span-2">
                  {t('Todavía no hay configuraciones. Primero')}{' '}
                  <Link href="/settings/new" className="text-primary underline">
                    {t('crea una configuración')}
                  </Link>
                  .
                </p>
              ) : null}
              {settings.truncated ? (
                <p role="status" className="m-0 text-sm text-on-surface-variant md:col-span-2">
                  {t('Se muestran solo las primeras {0} configuraciones.', [SELECT_LIMIT])}
                </p>
              ) : null}
            </FormSection>

            <FormSection title={t('Paquetes')} step={2}>
              <div className="flex flex-col gap-3 md:col-span-2">
                {noPackages ? (
                  <p className="m-0 text-sm text-on-surface-variant">
                    {t('Todavía no hay paquetes. Primero')}{' '}
                    <Link href="/packages/new" className="text-primary underline">
                      {t('crea un paquete')}
                    </Link>
                    .
                  </p>
                ) : null}
                <PackagePicker selectedIds={selectedIds} onChange={setSelectedIds} onEmpty={setNoPackages} />
                {selectionError ? (
                  <p role="alert" className="m-0 text-error">
                    {selectionError}
                  </p>
                ) : null}
              </div>
            </FormSection>

            {loading ? (
              <Loading label={t('Planificando la jornada')} className="flex flex-col gap-2">
                <progress aria-label={t('Planificando la jornada')} className="h-2 w-full accent-primary" />
                <p>{t('Planificando la jornada… puede tardar un poco.')}</p>
              </Loading>
            ) : null}
            <FormResult error={error} />
            <FormActions
              cancelHref="/journeys"
              loading={loading}
              dirty={isDirty || selectedIds.length > 0}
              saveLabel={t('Planificar')}
            />
          </Form>
        </FormCard>

        <aside aria-labelledby="review-title">
          <Card className="xl:sticky xl:top-6">
            <CardTitle id="review-title" className="mb-3 flex items-center gap-3">
              <span
                aria-hidden
                className="grid size-9 flex-none place-items-center rounded-xl bg-primary-container font-brand text-base font-bold text-on-primary-container"
              >
                3
              </span>
              {t('Revisa')}
            </CardTitle>
            <dl className="m-0 flex flex-col gap-3">
              {(
                [
                  [t('Nombre'), review.name, t('Sin escribir')],
                  [t('Configuración'), review.settings, t('Sin elegir')],
                  [t('Paquetes'), review.packages, t('Ninguno elegido')],
                ] as const
              ).map(([label, text, empty]) => (
                <div key={label}>
                  <dt className="text-sm text-on-surface-variant">{label}</dt>
                  <dd className={text ? 'font-medium' : 'text-on-surface-variant italic'}>{text ?? empty}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}
