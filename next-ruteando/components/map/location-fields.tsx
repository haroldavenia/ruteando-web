'use client';

import { type ComponentProps, useMemo } from 'react';

import { Input } from '@/components/ui/field';
import { useT } from '@/lib/i18n/client';
import type { LatLng } from '@/lib/map/lat-lng';
import { pointOf } from '@/lib/map/location-input';

import { PointMap } from './point-map';

/** Lo que necesita un campo de coordenada: el `register` de React Hook Form lo cumple, y un campo controlado también (`value` y `onChange`). */
export type CoordinateField = Pick<ComponentProps<'input'>, 'name' | 'onChange' | 'onBlur' | 'ref' | 'value'>;

/**
 * Ubicación con campos de latitud y longitud y mapa, sincronizados en ambos sentidos. Los campos van primero y son la vía accesible: el
 * mapa no se puede operar con teclado. Un par incompleto o fuera de rango no mueve el marcador. Los campos son de un formulario de React
 * Hook Form (`latProps` y `lngProps` salen de su `register`) o controlados (`value` y `onChange`); `onPick` recibe el punto elegido en el mapa.
 */
export function LocationFields({
  latProps,
  lngProps,
  lat,
  lng,
  latError,
  lngError,
  onPick,
}: {
  latProps: CoordinateField;
  lngProps: CoordinateField;
  /** Lo escrito ahora en cada campo (`useWatch`). */
  lat: string | undefined;
  lng: string | undefined;
  latError?: string;
  lngError?: string;
  onPick: (point: LatLng) => void;
}) {
  const t = useT();
  const point = useMemo(() => pointOf(lat, lng), [lat, lng]);
  return (
    <div className="grid gap-3 sm:col-span-2 md:grid-cols-[minmax(200px,1fr)_minmax(0,2fr)] md:items-start">
      <div className="grid content-start gap-3">
        <Input
          label={t('Latitud')}
          requiredMark
          type="number"
          step="any"
          inputMode="decimal"
          autoComplete="off"
          error={latError}
          {...latProps}
        />
        <Input
          label={t('Longitud')}
          requiredMark
          type="number"
          step="any"
          inputMode="decimal"
          autoComplete="off"
          error={lngError}
          {...lngProps}
        />
      </div>
      <PointMap
        point={point}
        selectable
        onPointChange={onPick}
        ariaLabel={t('Mapa para elegir la ubicación. También puedes escribir la latitud y la longitud en sus campos.')}
      />
    </div>
  );
}
