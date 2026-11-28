'use client';

import { type RemixiconComponentType, RiArrowLeftLine, RiEditLine } from '@remixicon/react';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import type { RecordState } from '@/lib/hooks/use-record';
import { useT } from '@/lib/i18n/client';

/** Cabecera de un formulario (`app-form-head`): botón de vuelta al listado, del color del texto (es navegación, no una acción), sobre el título. */
export function FormHead({ title, backLabel, backHref }: { title: string; backLabel: string; backHref: string }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <Link
        href={backHref}
        className={buttonVariants({ variant: 'outlined', className: 'text-on-surface hover:bg-on-surface/8' })}
      >
        <Icon icon={RiArrowLeftLine} size={18} className="-ml-1" />
        {backLabel}
      </Link>
      <h1 className="page-title">{title}</h1>
    </div>
  );
}

/**
 * La tarjeta de un formulario (`form.card`): hasta 880px de ancho, relleno 24/28 y los campos en una columna con 8px entre bloques.
 * Dentro van `FormSection`, el resultado del envío y `FormActions`.
 */
export function FormCard({ className, ...props }: ComponentProps<typeof Card>) {
  return <Card className={cn('flex max-w-[880px] flex-col gap-2 px-7 py-6', className)} {...props} />;
}

/**
 * Una sección del formulario (`.form-section`): un título con su icono en un cuadro tonal y los campos, en dos columnas desde 720px (lo
 * que debe ocupar las dos lleva `md:col-span-2`). Una sección tras otra se separa con una línea. El espacio entre filas deja sitio a la
 * pista o el error del campo de arriba: la etiqueta del de abajo asoma media línea sobre su borde.
 */
export function FormSection({
  title,
  icon,
  step,
  children,
  className,
}: {
  title: string;
  icon?: RemixiconComponentType;
  /** Número de paso (1, 2, 3…): ocupa el cuadro tonal en lugar del icono. */
  step?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className="[--field-reserve:22px] [section+&]:mt-4 [section+&]:border-t [section+&]:border-outline-variant [section+&]:pt-6">
      <h2 className={cn('m-0 flex items-center gap-3 font-brand text-base font-bold', step ? 'mb-4' : 'mb-7')}>
        {icon || step ? (
          <span
            aria-hidden
            className={cn(
              'grid flex-none place-items-center bg-primary-container text-on-primary-container',
              step ? 'size-9 rounded-xl' : 'size-6 rounded-full'
            )}
          >
            {step ? (
              <span className="font-brand text-base font-bold">{step}</span>
            ) : (
              <Icon icon={icon!} size={20} className="text-on-surface" />
            )}
          </span>
        ) : null}
        {title}
      </h2>
      <div className={cn('grid gap-x-5 gap-y-3 md:grid-cols-2', className)}>{children}</div>
    </section>
  );
}

/** Una fila de campos que se reparten el ancho (`.row`): tantas columnas de 160px como quepan. */
export function FormRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-4 gap-y-3 md:col-span-2', className)}>
      {children}
    </div>
  );
}

/**
 * Pie de un formulario (`app-form-actions`): al final, separado por una línea; avisa de los cambios sin guardar y, en pantallas
 * estrechas, queda fijo al pie para que «Guardar» esté siempre a mano.
 */
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
    <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant pt-4 max-md:sticky max-md:bottom-0 max-md:z-10 max-md:-mx-7 max-md:-mb-6 max-md:bg-surface-container-low max-md:px-7 max-md:pt-4 max-md:pb-3 max-md:shadow-[0_-10px_12px_-10px_rgb(0_0_0/0.25)]">
      <span role="status" className="mr-auto empty:hidden">
        {dirty ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-container px-3 py-1.5 text-sm font-medium text-on-warning-container">
            <Icon icon={RiEditLine} size={18} />
            {t('Cambios sin guardar')}
          </span>
        ) : null}
      </span>
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
