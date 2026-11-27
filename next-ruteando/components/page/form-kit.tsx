'use client';

import { RiArrowLeftLine } from '@remixicon/react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import type { RecordState } from '@/lib/hooks/use-record';
import { useT } from '@/lib/i18n/client';

/** Cabecera de un formulario: botón de vuelta al listado y título. */
export function FormHead({ title, backLabel, backHref }: { title: string; backLabel: string; backHref: string }) {
  return (
    <div className="mb-4 flex flex-col items-start gap-3">
      <Link href={backHref} className={buttonVariants({ variant: 'outlined' })}>
        <Icon icon={RiArrowLeftLine} size={20} />
        {backLabel}
      </Link>
      <h1 className="font-brand text-2xl font-bold">{title}</h1>
    </div>
  );
}

/** Una sección del formulario: título y rejilla de campos (de dos columnas desde 640px). */
export function FormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-brand text-lg font-bold">{title}</h2>
      <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>
    </section>
  );
}

/** Pie de un formulario: cancelar, guardar y el aviso de cambios sin guardar; queda fijo al pie en pantallas estrechas. */
export function FormActions({
  cancelHref,
  loading,
  dirty,
  saveLabel,
}: {
  cancelHref: string;
  loading: boolean;
  dirty?: boolean;
  saveLabel?: string;
}) {
  const t = useT();
  return (
    <div className="sticky bottom-0 -mx-6 -mb-5 flex flex-wrap items-center justify-end gap-3 border-t border-outline-variant bg-surface-container-low px-6 py-3 max-sm:z-10">
      {dirty ? <span className="mr-auto text-sm text-on-surface-variant">{t('Cambios sin guardar')}</span> : null}
      <Link href={cancelHref} className={buttonVariants({ variant: 'text' })}>
        {t('Cancelar')}
      </Link>
      <Button type="submit" variant="primary" loading={loading}>
        {saveLabel ?? t('Guardar')}
      </Button>
    </div>
  );
}

/**
 * Esqueleto mientras se trae el registro, y el error con la vuelta al listado si no se pudo (o no existe). Con el registro listo (o en
 * un alta) pinta `children`.
 */
export function RecordGate<T>({
  state,
  backHref,
  children,
}: {
  state: RecordState<T>;
  backHref: string;
  children: (record: T | null) => ReactNode;
}) {
  const t = useT();
  if (state.status === 'loading') {
    return (
      <Card>
        <Loading className="grid gap-4">
          {[0, 1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-14" />
          ))}
        </Loading>
      </Card>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-3">
        <FormResult error={state.error} />
        <Link href={backHref} className={buttonVariants({ variant: 'outlined' })}>
          {t('Volver al listado')}
        </Link>
      </div>
    );
  }
  return <>{children(state.status === 'ready' ? state.record : null)}</>;
}
