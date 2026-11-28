'use client';

import { RiLogoutBoxRLine, RiMoreLine, RiUserLine } from '@remixicon/react';

import { useT } from '@/lib/i18n/client';

import { Button } from './button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from './dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Icon } from './icon';
import { IconButton } from './icon-button';

// Solo para el muestrario de /design: los componentes con Radix necesitan un componente de cliente que los monte.
export function DemoDialog() {
  const t = useT();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outlined">Abrir diálogo</Button>
      </DialogTrigger>
      <DialogContent title="Eliminar vehículo" description="Esta acción no se puede deshacer.">
        <div className="flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="text">{t('Cancelar')}</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="danger">Eliminar</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DemoMenu() {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={t('Menú de usuario')} icon={RiMoreLine} variant="tonal" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>ada@example.invalid</DropdownMenuLabel>
        <DropdownMenuItem>
          <Icon icon={RiUserLine} size={20} />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Icon icon={RiLogoutBoxRLine} size={20} />
          {t('Cerrar sesión')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
