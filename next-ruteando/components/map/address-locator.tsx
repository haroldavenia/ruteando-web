'use client';

import { RiMapPinLine, RiSearchLine } from '@remixicon/react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import type { GeocodeResult } from '@/lib/api/models';
import { geocode, reverseGeocode } from '@/lib/geocoding';
import { useT } from '@/lib/i18n/client';
import type { LatLng } from '@/lib/map/lat-lng';
import { pointOf } from '@/lib/map/location-input';

type Tone = 'info' | 'warning' | 'error';

const TONE: Record<Tone, string> = {
  info: 'text-on-surface-variant',
  warning: 'text-on-warning-container',
  error: 'text-error',
};

/**
 * Ubica la dirección escrita y, al revés, toma la dirección del punto elegido. Escribe en el formulario por los callbacks (`setPoint`,
 * `setAddress`, `setCity`, `setCountry`) y deja a quien lo usa marcar los campos como modificados. Sin la búsqueda se puede seguir
 * colocando el punto a mano. Una búsqueda nueva descarta el resultado de la anterior.
 */
export function AddressLocator({
  address,
  lat,
  lng,
  city,
  country,
  setPoint,
  setAddress,
  setCity,
  setCountry,
  onLocated,
}: {
  address: string;
  lat: string | undefined;
  lng: string | undefined;
  city?: string;
  country?: string;
  setPoint: (point: LatLng) => void;
  setAddress: (value: string) => void;
  setCity?: (value: string) => void;
  setCountry?: (value: string) => void;
  /** El resultado de cada búsqueda de la dirección (para guardar la dirección estandarizada o el puntaje). */
  onLocated?: (result: GeocodeResult) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; tone: Tone }>({ text: '', tone: 'info' });
  const run = useRef(0);
  useEffect(
    () => () => {
      run.current++; // al desmontar, ninguna respuesta pendiente escribe en el formulario
    },
    []
  );

  const say = (text: string, tone: Tone = 'info') => setNote({ text, tone });
  const failure = (error: unknown) =>
    say(error instanceof Error ? error.message : t('No se pudo completar la solicitud'), 'error');

  async function locate() {
    const text = address.trim();
    if (!text) return say(t('Escribe primero la dirección'), 'warning');
    const mine = ++run.current;
    setBusy(true);
    say('');
    try {
      const result = await geocode({ address: text, city, country }, t);
      if (mine !== run.current) return;
      onLocated?.(result);
      if (result.status === 'unmatch' || !result.location) {
        return say(t('No se encontró la dirección. Colócala en el mapa o escribe las coordenadas.'), 'warning');
      }
      setPoint(result.location);
      if (result.status === 'mean') {
        return say(t('Ubicación aproximada: revisa el punto y muévelo si hace falta.'), 'warning');
      }
      say(
        result.standardizedAddress
          ? t('Dirección ubicada como «{0}». Revisa el punto en el mapa.', [result.standardizedAddress])
          : t('Dirección ubicada. Revisa el punto en el mapa.')
      );
    } catch (error) {
      if (mine === run.current) failure(error);
    } finally {
      if (mine === run.current) setBusy(false);
    }
  }

  async function takeFromPoint() {
    const point = pointOf(lat, lng);
    if (!point) return say(t('Elige primero un punto en el mapa o escribe la latitud y la longitud'), 'warning');
    const mine = ++run.current;
    setBusy(true);
    say('');
    try {
      const result = await reverseGeocode(point, t);
      if (mine !== run.current) return;
      if (!result.address) return say(t('No hay una dirección conocida para ese punto.'), 'warning');
      setAddress(result.address);
      if (result.city) setCity?.(result.city);
      if (result.country) setCountry?.(result.country);
      say(t('Dirección tomada del punto elegido.'));
    } catch (error) {
      if (mine === run.current) failure(error);
    } finally {
      if (mine === run.current) setBusy(false);
    }
  }

  return (
    <div className="sm:col-span-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outlined" disabled={busy} onClick={() => void locate()}>
          <Icon icon={RiSearchLine} size={20} />
          {t('Ubicar la dirección en el mapa')}
        </Button>
        <Button variant="outlined" disabled={busy} onClick={() => void takeFromPoint()}>
          <Icon icon={RiMapPinLine} size={20} />
          {t('Tomar la dirección del punto')}
        </Button>
      </div>
      <p role="status" className={`mt-2 min-h-6 text-sm ${TONE[note.tone]}`}>
        {note.text}
      </p>
    </div>
  );
}
