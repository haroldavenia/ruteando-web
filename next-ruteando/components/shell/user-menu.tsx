'use client';

import { RiAccountCircleLine, RiLogoutBoxRLine } from '@remixicon/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { logout } from '@/lib/auth-client';
import { useT } from '@/lib/i18n/client';
import type { SessionUser } from '@/lib/session-token';
import { displayName, initials } from '@/lib/user-display';

/**
 * Menú de la persona con sesión: quién es, su perfil y «Cerrar sesión», que pide confirmación (y si se cancela, el foco vuelve al botón
 * de la cuenta). Al salir se lleva a /access y se pide `router.refresh()` para que ninguna pantalla conserve datos de la sesión anterior.
 */
export function UserMenu({ user }: { user: SessionUser }) {
  const t = useT();
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function leave() {
    setLeaving(true);
    await logout();
    router.replace('/access');
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          ref={trigger}
          title={t('Menú de usuario')}
          aria-label={t('Menú de usuario')}
          className="inline-grid size-11 cursor-pointer place-items-center rounded-full"
        >
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-full bg-primary bg-brand-gradient text-sm font-medium text-on-primary"
          >
            {initials(user)}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div role="group" aria-label={t('Sesión iniciada')} className="flex flex-col px-3 py-2">
            <span className="text-sm font-medium">{displayName(user)}</span>
            <span className="text-xs text-on-surface-variant">{user.email}</span>
          </div>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <Icon icon={RiAccountCircleLine} size={20} />
              {t('Perfil')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirming(true)}>
            <Icon icon={RiLogoutBoxRLine} size={20} />
            {t('Cerrar sesión')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          title={t('Cerrar sesión')}
          description={t('¿Quieres cerrar la sesión?')}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <div className="flex justify-end gap-3">
            <DialogClose asChild>
              <Button variant="text">{t('Cancelar')}</Button>
            </DialogClose>
            <Button variant="primary" loading={leaving} onClick={leave}>
              {t('Cerrar sesión')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
