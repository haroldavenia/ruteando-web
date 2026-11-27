import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { GlobalSearch, plain } from '@/components/shell/global-search';
import { MobileMenu } from '@/components/shell/mobile-menu';
import { NavRail } from '@/components/shell/nav-rail';
import { Shell } from '@/components/shell/shell';
import { UserMenu } from '@/components/shell/user-menu';
import { Brand } from '@/components/ui/brand';
import { navItemsFor, quickActionsFor } from '@/lib/nav-items';
import type { SessionUser } from '@/lib/session-token';

import { renderWithI18n } from './render';

const nav = { pathname: '/', push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push, replace: nav.replace, refresh: nav.refresh }),
}));

const admin: SessionUser = {
  id: 'u1',
  email: 'ada@example.invalid',
  role: 'tenant_admin',
  tenantId: 't1',
  firstName: 'Ada',
  lastName: 'Admin',
};
const agent: SessionUser = { ...admin, role: 'agent' };
const itemsOf = (u: SessionUser) => navItemsFor(u.role);

beforeEach(() => {
  nav.pathname = '/';
  nav.push.mockClear();
  nav.replace.mockClear();
  nav.refresh.mockClear();
  document.cookie = 'rt_theme=; Max-Age=0; Path=/';
});
afterEach(() => vi.restoreAllMocks());

const shell = (user = admin, node: ReactElement = <p>contenido</p>) =>
  renderWithI18n(
    <Shell user={user} theme="system">
      {node}
    </Shell>
  );

describe('Brand', () => {
  test('el nombre es texto real y siempre se ve en la marca grande; en la compacta se oculta en pantallas muy estrechas; el emblema es decorativo', () => {
    const { container, rerender } = render(<Brand />);
    expect(screen.getByText('Ruteando')).not.toHaveClass('sr-only');
    rerender(<Brand size="compact" />);
    expect(screen.getByText('Ruteando')).toHaveClass('sr-only', 'xs:not-sr-only');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  test('mark es solo el emblema (el nombre queda para los lectores) y compact mide 32px', () => {
    const { container, rerender } = render(<Brand size="mark" />);
    expect(screen.getByText('Ruteando')).toHaveClass('sr-only');
    expect(screen.getByText('Ruteando')).not.toHaveClass('xs:not-sr-only');
    rerender(<Brand size="compact" />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '32');
  });

  test('dos marcas en la página no comparten ids (el emblema no usa <use>)', () => {
    const { container } = render(
      <>
        <Brand />
        <Brand size="compact" />
      </>
    );
    expect(container.querySelectorAll('[id]')).toHaveLength(0);
    expect(container.querySelectorAll('use')).toHaveLength(0);
  });
});

describe('NavRail', () => {
  test('una entrada por área del rol; la activa lleva aria-current y el nombre accesible es el largo', () => {
    nav.pathname = '/assigned-services/new';
    renderWithI18n(<NavRail items={itemsOf(admin)} />, 'es');
    const rail = screen.getByRole('navigation', { name: 'Navegación principal' });
    const active = within(rail).getByRole('link', { name: 'Servicios asignados' });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active).toHaveTextContent('Asignados'); // lo que se ve es el nombre corto
    expect(within(rail).getByRole('link', { name: 'Jornadas' })).not.toHaveAttribute('aria-current');
  });

  test('Inicio solo está activa en la raíz', () => {
    nav.pathname = '/packages';
    renderWithI18n(<NavRail items={itemsOf(admin)} />, 'es');
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current');
  });

  test('el agente no ve áreas de administración', () => {
    renderWithI18n(<NavRail items={itemsOf(agent)} />, 'es');
    expect(screen.queryByRole('link', { name: 'Lugares' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Flota/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Paquetes' })).toBeInTheDocument();
  });

  test('Flota es un botón que abre un menú con sus entradas, y la sección se marca activa por una hija', async () => {
    nav.pathname = '/fleet/drivers/4';
    const user = userEvent.setup();
    renderWithI18n(<NavRail items={itemsOf(admin)} />, 'es');
    const group = screen.getByRole('button', { name: /Flota/ });
    expect(group.className).toContain('bg-primary-container'); // sección activa
    group.focus();
    await user.keyboard('{Enter}');
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Conductores' })).toHaveAttribute('href', '/fleet/drivers');
    expect(
      within(menu).getByRole('menuitem', { name: 'Conductores' }).querySelector('[aria-current]') ??
        within(menu).getByRole('menuitem', { name: 'Conductores' })
    ).toHaveAttribute('aria-current', 'page');
    expect(within(menu).getByRole('menuitem', { name: 'Vehículos' })).not.toHaveAttribute('aria-current');
  });

  test('los nombres siguen el idioma', () => {
    renderWithI18n(<NavRail items={itemsOf(admin)} />, 'en');
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Journeys' })).toBeInTheDocument();
  });
});

describe('MobileMenu', () => {
  test('abre un panel con todas las entradas (las secciones con su título) y se cierra al elegir una', async () => {
    const user = userEvent.setup();
    renderWithI18n(<MobileMenu items={itemsOf(admin)} />, 'es');
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }));
    const panel = await screen.findByRole('dialog', { name: 'Menú principal' });
    expect(within(panel).getByRole('heading', { name: 'Flota' })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Vehículos' })).toHaveAttribute('href', '/fleet/vehicles');
    // el idioma no cabe en la barra bajo 640px: el menú lo ofrece
    expect(within(panel).getByRole('radiogroup', { name: 'Idioma' })).toBeInTheDocument();
    await user.click(within(panel).getByRole('link', { name: 'Jornadas' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('el botón de abrir solo se ve en pantallas estrechas y marca la entrada actual', async () => {
    nav.pathname = '/places';
    const user = userEvent.setup();
    renderWithI18n(<MobileMenu items={itemsOf(admin)} />, 'es');
    expect(screen.getByRole('button', { name: 'Abrir menú de navegación' })).toHaveClass('lg:hidden');
    await user.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }));
    expect(await screen.findByRole('link', { name: 'Lugares' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('GlobalSearch', () => {
  const search = (user = admin, lang: 'es' | 'en' = 'es') =>
    renderWithI18n(<GlobalSearch items={itemsOf(user)} actions={quickActionsFor(user.role)} />, lang);
  const box = () => screen.getByRole('combobox', { name: 'Buscar o ir a una pantalla' });

  test('plain quita tildes y mayúsculas', () => {
    expect(plain('  Vehículos ')).toBe('vehiculos');
    expect(plain('ÁÉÍÓÚ ñ')).toBe('aeiou n');
  });

  test('es un combobox con atajo anunciado, y la lista se abre al enfocar con las pantallas y las acciones agrupadas', async () => {
    const user = userEvent.setup();
    search();
    expect(box()).toHaveAttribute('aria-keyshortcuts', 'Control+K');
    expect(box()).toHaveAttribute('aria-expanded', 'false');
    await user.click(box());
    const list = screen.getByRole('listbox');
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(within(list).getByRole('group', { name: 'Ir a' })).toBeInTheDocument();
    expect(within(list).getByRole('group', { name: 'Acciones' })).toBeInTheDocument();
    expect(within(list).getByRole('option', { name: 'Vehículos' })).toBeInTheDocument();
    expect(within(list).getByRole('option', { name: 'Planificar jornada' })).toBeInTheDocument();
  });

  test('busca sin acentos ni mayúsculas, y un grupo sin coincidencias no aparece', async () => {
    const user = userEvent.setup();
    search();
    await user.type(box(), 'VEHICULO');
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Vehículos', 'Tipos de vehículo']);
    expect(screen.queryByRole('group', { name: 'Acciones' })).toBeNull();
  });

  test('sin coincidencias: «Sin resultados»', async () => {
    const user = userEvent.setup();
    search();
    await user.type(box(), 'zzzz');
    expect(screen.getByRole('option', { name: 'Sin resultados' })).toHaveAttribute('aria-disabled', 'true');
  });

  test('flechas e Intro: navega al destino elegido y deja el campo vacío', async () => {
    const user = userEvent.setup();
    search();
    await user.type(box(), 'jorn'); // Jornadas (pantalla) y Planificar jornada (acción)
    expect(box()).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0].id);
    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(nav.push).toHaveBeenCalledWith('/journeys/new');
    expect(box()).toHaveValue('');
  });

  test('el clic en una opción también navega (mousedown, antes de que el campo pierda el foco)', async () => {
    const user = userEvent.setup();
    search();
    await user.type(box(), 'paquetes');
    await user.click(screen.getByRole('option', { name: 'Paquetes' }));
    expect(nav.push).toHaveBeenCalledWith('/packages');
  });

  test('las flechas dan la vuelta, y Escape cierra la lista', async () => {
    const user = userEvent.setup();
    search();
    await user.click(box());
    const total = screen.getAllByRole('option').length;
    await user.keyboard('{ArrowUp}');
    expect(screen.getAllByRole('option')[total - 1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(box()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Ctrl K y Cmd K llevan el foco al campo desde cualquier sitio', async () => {
    const user = userEvent.setup();
    search();
    expect(box()).not.toHaveFocus();
    await user.keyboard('{Control>}k{/Control}');
    expect(box()).toHaveFocus();
    (box() as HTMLInputElement).blur();
    await user.keyboard('{Meta>}k{/Meta}');
    expect(box()).toHaveFocus();
  });

  test('solo ofrece lo que el rol puede abrir', async () => {
    const user = userEvent.setup();
    search(agent);
    await user.click(box());
    expect(screen.queryByRole('option', { name: 'Zonas' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Vehículos' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Paquetes' })).toBeInTheDocument();
  });

  test('sigue el idioma activo (los textos y la búsqueda)', async () => {
    const user = userEvent.setup();
    search(admin, 'en');
    await user.type(screen.getByRole('combobox', { name: 'Search or go to a screen' }), 'journ');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Journeys', 'Plan journey']);
  });
});

describe('UserMenu', () => {
  test('muestra quién tiene la sesión, el perfil y la salida, con las iniciales en el avatar', async () => {
    const user = userEvent.setup();
    renderWithI18n(<UserMenu user={admin} />, 'es');
    const trigger = screen.getByRole('button', { name: 'Menú de usuario' });
    expect(trigger).toHaveAttribute('title', 'Menú de usuario');
    expect(trigger).toHaveTextContent('AA');
    trigger.focus();
    await user.keyboard('{Enter}');
    const info = await screen.findByRole('group', { name: 'Sesión iniciada' });
    expect(info).toHaveTextContent('Ada Admin');
    expect(info).toHaveTextContent('ada@example.invalid');
    expect(screen.getByRole('menuitem', { name: 'Perfil' })).toHaveAttribute('href', '/profile');
  });

  test('cerrar sesión pide confirmación; al confirmar avisa al servidor y lleva a /access', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    const user = userEvent.setup();
    renderWithI18n(<UserMenu user={admin} />, 'es');
    screen.getByRole('button', { name: 'Menú de usuario' }).focus();
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }));
    const dialog = await screen.findByRole('dialog', { name: 'Cerrar sesión' });
    expect(dialog).toHaveAccessibleDescription('¿Quieres cerrar la sesión?');
    expect(fetchMock).not.toHaveBeenCalled(); // todavía no: falta confirmar
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/access'));
    expect(fetchMock).toHaveBeenCalledWith('/middleware/auth/logout', { method: 'POST' });
    expect(nav.refresh).toHaveBeenCalled();
  });

  test('cancelar no cierra la sesión y el foco vuelve al botón de la cuenta', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    const user = userEvent.setup();
    renderWithI18n(<UserMenu user={admin} />, 'es');
    const trigger = screen.getByRole('button', { name: 'Menú de usuario' });
    trigger.focus();
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  test('si el servidor no responde la persona sale igual', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('sin red'));
    const user = userEvent.setup();
    renderWithI18n(<UserMenu user={admin} />, 'es');
    screen.getByRole('button', { name: 'Menú de usuario' }).focus();
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/access'));
  });
});

describe('Shell', () => {
  test('marco: enlace para saltar al contenido, riel, barra con título, selectores y contenido', () => {
    nav.pathname = '/journeys';
    shell();
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute('href', '#contenido');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido');
    expect(screen.getByRole('main')).toHaveTextContent('contenido');
    expect(screen.getByRole('heading', { level: 1, name: 'Jornadas' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Tema de color' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Idioma' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menú de usuario' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Buscar o ir a una pantalla' })).toBeInTheDocument();
  });

  test('el menú depende del rol de la sesión', () => {
    shell(agent);
    expect(screen.queryByRole('link', { name: 'Zonas' })).toBeNull();
    expect(screen.getAllByRole('link', { name: 'Paquetes' }).length).toBeGreaterThan(0);
  });

  test('en inglés los textos del marco se traducen', () => {
    nav.pathname = '/audit';
    renderWithI18n(
      <Shell user={admin} theme="light">
        <p>x</p>
      </Shell>,
      'en'
    );
    expect(screen.getByRole('link', { name: 'Skip to content' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Audit' })).toBeInTheDocument();
  });
});
