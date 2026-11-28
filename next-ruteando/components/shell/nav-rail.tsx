'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Brand } from '@/components/ui/brand';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';
import { isActivePath, isGroupActive, type NavItem } from '@/lib/nav-items';

const entry =
  'relative flex h-16 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium text-on-surface-variant transition-colors duration-120 ease-out hover:bg-on-surface/8';
// El hilo de la marca en el borde del riel marca la entrada activa (además del fondo y de `aria-current`: no solo el color)
const active =
  'bg-primary-container/75 font-bold text-on-primary-container before:absolute before:inset-y-3 before:-left-2 before:w-1 before:rounded-r-full before:bg-brand-gradient';

/**
 * Riel de iconos de las pantallas anchas (desde 960px): la marca arriba y una entrada por área, con su icono sobre su nombre. Una sección
 * con varias entradas (Flota) es un botón que abre un menú con ellas. Un nombre corto (`short`) solo cambia lo que se ve: el nombre
 * accesible sigue siendo el largo.
 */
export function NavRail({ items }: { items: readonly NavItem[] }) {
  const t = useT();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('Navegación principal')}
      className="sticky top-0 hidden h-dvh w-24 shrink-0 flex-col items-center gap-3 border-r border-outline-variant bg-surface-container-low py-4 lg:flex"
    >
      <Link href="/" className="rounded-2xl p-1">
        <Brand size="mark" />
      </Link>
      {/* La lista se desplaza si no caben todas las entradas (ventanas bajas), pero sin barra visible: la barra de los navegadores ocupa ancho y recortaba el hilo de la marca de la entrada activa. `px-2` da a la lista el ancho del riel para que ese hilo (a 8px del borde) quede dentro. */}
      <ul className="flex w-full scrollbar-none flex-col items-center gap-1 overflow-y-auto px-2 [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const label = t(item.label);
          const visible = item.short ? t(item.short) : label;
          const content = (
            <>
              <Icon icon={item.icon} />
              <span className="max-w-full truncate px-1">{visible}</span>
            </>
          );
          return (
            <li key={item.label}>
              {item.children ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={item.short ? label : undefined}
                    className={cn(entry, isGroupActive(pathname, item) && active)}
                  >
                    {content}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    {item.children.map((child) => (
                      <DropdownMenuItem key={child.link} asChild>
                        <Link href={child.link!} aria-current={isActivePath(pathname, child) ? 'page' : undefined}>
                          <Icon icon={child.icon} size={20} />
                          {t(child.label)}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  href={item.link!}
                  aria-label={item.short ? label : undefined}
                  aria-current={isActivePath(pathname, item) ? 'page' : undefined}
                  className={cn(entry, isActivePath(pathname, item) && active)}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
