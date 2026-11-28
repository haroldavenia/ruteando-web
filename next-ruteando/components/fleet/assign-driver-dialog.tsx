'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select } from '@/components/ui/field';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/api/models';
import { getData } from '@/lib/api-client';
import { driverName } from '@/lib/fleet/labels';
import { useT } from '@/lib/i18n/client';

/** Elige entre los conductores de la empresa; `onPick` recibe el id elegido. Se cierra con `onClose`. */
export function AssignDriverDialog({
  vehicle,
  currentDriverId,
  onPick,
  onClose,
}: {
  vehicle: string;
  currentDriverId: string | null;
  onPick: (driverId: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [drivers, setDrivers] = useState<readonly User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState(currentDriverId ?? '');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    let current = true;
    getData<User[]>('users/drivers', t).then(
      (list) => current && setDrivers(list),
      (err: unknown) => current && setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'))
    );
    return () => {
      current = false;
    };
  }, [t]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={t('Asignar conductor a {0}', [vehicle])}>
        {error ? (
          <p role="alert">{error}</p>
        ) : drivers === null ? (
          <Loading label={t('Cargando conductores…')}>
            <Skeleton className="h-14" />
          </Loading>
        ) : drivers.length === 0 ? (
          <p>
            {t('No hay conductores creados.')}{' '}
            <Link href="/fleet/drivers" className="text-primary underline">
              {t('Crear un conductor')}
            </Link>
          </p>
        ) : (
          <Select
            label={t('Conductor')}
            value={chosen}
            error={touched && !chosen ? t('Elige un conductor') : undefined}
            onChange={(event) => setChosen(event.target.value)}
          >
            <option value="" />
            {drivers.map((user) => (
              <option key={user.id} value={user.id}>
                {driverName(user)} ({user.email})
              </option>
            ))}
          </Select>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="text" onClick={onClose}>
            {t('Cancelar')}
          </Button>
          <Button
            variant="primary"
            disabled={!drivers?.length}
            onClick={() => {
              if (!chosen) setTouched(true);
              else onPick(chosen);
            }}
          >
            {t('Asignar')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
