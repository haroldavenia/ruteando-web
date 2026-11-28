'use client';

import { RiArrowLeftLine } from '@remixicon/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useT } from '@/lib/i18n/client';

/** Vuelve a donde estaba la persona (el acceso o la aplicación); si abrió el enlace directo no hay a dónde: va al inicio. */
export function BackButton() {
  const t = useT();
  const router = useRouter();
  return (
    <Button
      variant="outlined"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push('/');
      }}
    >
      <Icon icon={RiArrowLeftLine} size={18} />
      {t('Volver')}
    </Button>
  );
}
