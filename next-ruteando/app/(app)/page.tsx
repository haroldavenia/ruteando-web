import { RiAddLine } from '@remixicon/react';
import Link from 'next/link';

import { HomeDashboard } from '@/components/home/home-dashboard';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';
import { getT } from '@/lib/i18n/server';
import { areaLinksFor } from '@/lib/nav-items';
import { OPERATIONS_ROLES } from '@/lib/roles';
import { readSession } from '@/lib/session';
import { displayName } from '@/lib/user-display';

/** Saludo según la hora del servidor (la zona horaria de las personas la decidirá la pantalla de Inicio completa, fase 5). */
const greetingKey = (hour: number) => (hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches');

/**
 * Inicio. Como en la aplicación Angular: saludo, las acciones de quien opera (planificar una jornada, importar paquetes) y el aviso de
 * un rol sin áreas. NO repite el menú con tarjetas de cada área (ya está en el riel y en la búsqueda). El anillo de «Paquetes atendidos»,
 * las cifras, el resumen y las últimas jornadas se portan con sus datos en la fase 5.
 */
export default async function Home() {
  const t = await getT();
  const { user } = await readSession();
  const canOperate = !!user && OPERATIONS_ROLES.includes(user.role);
  const noAreas = areaLinksFor(user?.role ?? null).length === 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h2 className="font-brand text-[28px]/9 font-bold">
          {t(greetingKey(new Date().getHours()))}
          {user ? `, ${displayName(user)}` : ''}
        </h2>
        {canOperate ? (
          <div className="flex flex-wrap gap-3">
            <Link href="/journeys/new" className={cn(buttonVariants({ variant: 'primary', size: 'lg' }))}>
              <Icon icon={RiAddLine} size={20} />
              {t('Planificar jornada')}
            </Link>
            <Link href="/packages/import" className={cn(buttonVariants({ variant: 'outlined', size: 'lg' }))}>
              {t('Importar paquetes')}
            </Link>
          </div>
        ) : null}
      </section>
      {canOperate ? <HomeDashboard /> : null}
      {noAreas ? <Card>{t('Tu rol no tiene áreas disponibles en la aplicación web.')}</Card> : null}
    </div>
  );
}
