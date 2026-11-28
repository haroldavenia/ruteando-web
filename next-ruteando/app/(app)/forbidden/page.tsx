import { RiLockLine } from '@remixicon/react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { getT } from '@/lib/i18n/server';

export default async function Forbidden() {
  const t = await getT();
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <Icon icon={RiLockLine} size={40} className="text-on-surface-variant" />
      <h2 className="font-brand text-xl font-bold">{t('Sin permiso')}</h2>
      <p className="text-on-surface-variant">{t('No tienes permiso para ver esta página.')}</p>
      <Link href="/" className={buttonVariants({ variant: 'outlined' })}>
        {t('Ir al inicio')}
      </Link>
    </Card>
  );
}
