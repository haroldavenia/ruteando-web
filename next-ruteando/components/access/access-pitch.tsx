import { RiCheckboxCircleLine, RiRouteLine, RiTruckLine } from '@remixicon/react';

import { Icon } from '@/components/ui/icon';
import { getT } from '@/lib/i18n/server';

/**
 * Presentación del producto que acompaña a la pantalla de acceso en el diseño ancho (desde 1024px; en pantallas estrechas no se
 * muestra). La palabra «rutas» lleva el hilo de la marca (con `forced-colors` vuelve al color del texto).
 */
export async function AccessPitch() {
  const t = await getT();
  const items = [
    { icon: RiRouteLine, text: t('Rutas y paradas en un solo mapa') },
    { icon: RiCheckboxCircleLine, text: t('Seguimiento de cada visita') },
    { icon: RiTruckLine, text: t('Flota, lugares y zonas a mano') },
  ];
  return (
    <div className="relative hidden w-full max-w-110 rounded-3xl border border-outline-variant bg-surface p-7 shadow-[0_8px_32px_rgb(0_0_0/0.1)] access:block">
      <p className="font-brand text-[32px]/10 font-medium tracking-[-0.01em]">
        {t('Planifica y sigue tus')}{' '}
        <span className="bg-brand-gradient bg-clip-text text-transparent forced-colors:bg-none forced-colors:text-inherit">
          {t('rutas')}
        </span>
        .
      </p>
      <ul className="mt-5 grid gap-3">
        {items.map(({ icon, text }) => (
          <li key={text} className="flex items-center gap-3">
            <span className="grid size-9 flex-none place-items-center rounded-control bg-primary-container text-on-primary-container">
              <Icon icon={icon} size={20} />
            </span>
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
