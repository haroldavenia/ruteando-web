'use client';

import { useState } from 'react';

import { AddressLocator } from '@/components/map/address-locator';
import { LocationFields } from '@/components/map/location-fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/field';
import type { GeocodeResult } from '@/lib/api/models';
import { useT } from '@/lib/i18n/client';
import { fromGeoJsonPoint, type LatLng, toGeoJsonPoint } from '@/lib/map/lat-lng';
import { pointOf } from '@/lib/map/location-input';
import type { ReviewRow } from '@/lib/packages/locating';

const same = (a: LatLng | null, b: LatLng | null) => !!a && !!b && a.lat === b.lat && a.lng === b.lng;

/**
 * Corrige la ubicación de una fila de la importación: se puede cambiar la dirección y volver a ubicarla, o colocar el punto en el mapa
 * (queda como «manual»). `onSave` recibe la fila ya actualizada.
 */
export function LocationFixDialog({
  row,
  onSave,
  onClose,
}: {
  row: ReviewRow;
  onSave: (row: ReviewRow) => void;
  onClose: () => void;
}) {
  const t = useT();
  const initialPoint = fromGeoJsonPoint(row.input.location?.coordinates);
  const [address, setAddress] = useState(row.input.address);
  const [city, setCity] = useState(row.input.city ?? '');
  const [country, setCountry] = useState(row.input.country ?? '');
  const [lat, setLat] = useState(initialPoint ? String(initialPoint.lat) : '');
  const [lng, setLng] = useState(initialPoint ? String(initialPoint.lng) : '');
  /** Lo último que devolvió el geocodificador en este diálogo: decide si el punto guardado es suyo o puesto a mano. */
  const [geocoded, setGeocoded] = useState<GeocodeResult | null>(null);
  const [missing, setMissing] = useState(false);
  const setPoint = (point: LatLng) => {
    setLat(String(point.lat));
    setLng(String(point.lng));
  };

  function save() {
    const point = pointOf(lat, lng);
    const location = point ? toGeoJsonPoint(point) : null;
    if (!point || !location) return setMissing(true);
    const fromGeocoder = geocoded && geocoded.status !== 'unmatch' && same(point, geocoded.location);
    // Si el punto no se movió desde que estaba (ubicado por el geocodificador al importar), conserva su estado
    const untouched = same(point, initialPoint) && row.status !== 'manual' && !geocoded;
    const meta = fromGeocoder
      ? { status: geocoded.status, standardizedAddress: geocoded.standardizedAddress, score: geocoded.score }
      : untouched
        ? { status: row.status, standardizedAddress: row.standardizedAddress, score: row.score }
        : { status: 'manual' as const, standardizedAddress: null, score: null };
    onSave({
      ...row,
      ...meta,
      failed: false,
      input: {
        ...row.input,
        address: address.trim() || row.input.address,
        city: city.trim() || null,
        country: country.trim() || null,
        location,
      },
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={t('Corregir la ubicación de la línea {0}', [row.line])} className="max-w-4xl">
        <div className="grid gap-4">
          <Input
            label={t('Dirección')}
            autoComplete="off"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t('Ciudad')} autoComplete="off" value={city} onChange={(e) => setCity(e.target.value)} />
            <Input label={t('País')} autoComplete="off" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <AddressLocator
            address={address}
            city={city}
            country={country}
            lat={lat}
            lng={lng}
            setAddress={setAddress}
            setCity={setCity}
            setCountry={setCountry}
            setPoint={setPoint}
            onLocated={setGeocoded}
          />
          <LocationFields
            latProps={{ name: 'lat', value: lat, onChange: (e) => setLat(e.target.value) }}
            lngProps={{ name: 'lng', value: lng, onChange: (e) => setLng(e.target.value) }}
            lat={lat}
            lng={lng}
            onPick={setPoint}
          />
          {missing ? (
            <p role="alert" className="text-error">
              {t('Elige un punto en el mapa o escribe la latitud y la longitud')}
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="text" onClick={onClose}>
            {t('Cancelar')}
          </Button>
          <Button variant="primary" onClick={save}>
            {t('Guardar')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
