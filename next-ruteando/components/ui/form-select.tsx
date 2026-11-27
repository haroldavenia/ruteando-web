'use client';

import type { ComponentProps } from 'react';
import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form';

import { Select } from './field';

/**
 * `Select` ligado a React Hook Form como campo CONTROLADO. Un `select` sin controlar pierde su valor cuando las opciones llegan después
 * (los tipos, lugares o catálogos se piden al montar el formulario): RHF le pone el valor al registrarlo, antes de que existan las opciones.
 * Controlado, React lo vuelve a aplicar cada vez que cambian las opciones.
 */
export function FormSelect<T extends FieldValues>({
  control,
  name,
  ...props
}: { control: Control<T>; name: FieldPath<T> } & Omit<
  ComponentProps<typeof Select>,
  'name' | 'value' | 'onChange' | 'onBlur'
>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          {...props}
          name={field.name}
          ref={field.ref}
          value={(field.value as string | null | undefined) ?? ''}
          onChange={(event) => field.onChange(event.target.value)}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}
