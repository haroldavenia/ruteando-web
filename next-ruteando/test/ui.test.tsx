import { RiSearchLine } from '@remixicon/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { Alert } from '@/components/ui/alert';
import { StatusBadge, TONES } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input, Select, Textarea } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ui/theme-toggle';

import { renderWithI18n } from './render';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

beforeEach(() => {
  refresh.mockClear();
  document.cookie.split(';').forEach((c) => (document.cookie = `${c.split('=')[0].trim()}=; Max-Age=0; Path=/`));
  delete document.documentElement.dataset.theme;
  document.documentElement.lang = 'en';
});
afterEach(() => vi.restoreAllMocks());

describe('Button', () => {
  test('es un botón que no envía formularios salvo que se pida', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('type', 'button');
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveAttribute('type', 'submit');
  });

  test('las variantes y los tamaños de la guía: 44px, 48px y 12px de esquina', () => {
    render(
      <>
        <Button variant="primary">P</Button>
        <Button size="lg">L</Button>
        <Button variant="outlined">O</Button>
      </>
    );
    expect(screen.getByText('P')).toHaveClass('bg-brand-gradient', 'min-h-11', 'rounded-control');
    expect(screen.getByText('L')).toHaveClass('min-h-12');
    expect(screen.getByText('O')).toHaveClass('border-outline');
  });

  test('className del llamador gana a la variante (tailwind-merge)', () => {
    render(<Button className="px-2">X</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-2');
    expect(screen.getByRole('button')).not.toHaveClass('px-6');
  });

  test('loading: bloquea, avisa con aria-busy y no deja pulsar', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Guardar
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.setup().click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  test('asChild pinta el aspecto sobre un enlace', () => {
    render(
      <Button asChild variant="primary">
        <a href="/jornadas">Ir</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Ir' });
    expect(link).toHaveAttribute('href', '/jornadas');
    expect(link).toHaveClass('bg-brand-gradient');
  });

  test('buttonVariants da aspecto de botón a cualquier elemento', () => {
    render(
      <a href="/x" className={buttonVariants({ variant: 'outlined' })}>
        Enlace
      </a>
    );
    expect(screen.getByRole('link')).toHaveClass('rounded-control', 'border-outline');
  });
});

describe('IconButton e Icon', () => {
  test('el nombre accesible y el tooltip salen de `label` (regla: todo botón de solo icono lleva title)', () => {
    render(<IconButton label="Buscar" icon={RiSearchLine} />);
    const button = screen.getByRole('button', { name: 'Buscar' });
    expect(button).toHaveAttribute('title', 'Buscar');
    expect(button).toHaveAttribute('aria-label', 'Buscar');
    expect(button).toHaveAttribute('type', 'button');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  test('el icono es decorativo y mide 24px por defecto', () => {
    const { container } = render(<Icon icon={RiSearchLine} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '24');
    const { container: small } = render(<Icon icon={RiSearchLine} size={16} className="text-primary" />);
    expect(small.querySelector('svg')).toHaveAttribute('width', '16');
    expect(small.querySelector('svg')).toHaveClass('text-primary', 'shrink-0');
  });
});

describe('Card', () => {
  test('tarjeta de 20px con borde y fondo de superficie, y título de tarjeta', () => {
    render(
      <Card data-testid="card">
        <CardTitle>Vehículos</CardTitle>
      </Card>
    );
    expect(screen.getByTestId('card')).toHaveClass(
      'rounded-card',
      'border-outline-variant',
      'bg-surface-container-low'
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Vehículos' })).toHaveClass('font-brand');
  });
});

describe('campos', () => {
  test('la etiqueta está asociada al campo', () => {
    render(<Input label="Correo" type="email" />);
    expect(screen.getByLabelText('Correo')).toHaveAttribute('type', 'email');
  });

  test('la pista se enlaza con aria-describedby y no es una alerta', () => {
    render(<Input label="Correo" hint="El de tu cuenta" />);
    const input = screen.getByLabelText('Correo');
    expect(input).toHaveAccessibleDescription('El de tu cuenta');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('el error marca el campo, se anuncia como alerta y sustituye a la pista', () => {
    render(<Input label="Nombre" hint="Pista" error="Escribe un nombre" />);
    const input = screen.getByLabelText('Nombre');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Escribe un nombre');
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un nombre');
    expect(screen.queryByText('Pista')).toBeNull();
  });

  test('cada campo tiene su propio id (dos campos no se pisan) y se puede fijar uno', () => {
    render(
      <>
        <Input label="Uno" />
        <Input label="Dos" />
        <Input label="Tres" id="fijo" />
      </>
    );
    expect(screen.getByLabelText('Uno').id).not.toBe(screen.getByLabelText('Dos').id);
    expect(screen.getByLabelText('Tres').id).toBe('fijo');
  });

  test('el campo lleva placeholder de un espacio (activa la etiqueta flotante) y el resto de atributos pasan', () => {
    render(<Input label="Contraseña" type="password" autoComplete="current-password" required />);
    const input = screen.getByLabelText('Contraseña');
    expect(input).toHaveAttribute('placeholder', ' ');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
    expect(input).toBeRequired();
  });

  test('textarea y selector nativo con su etiqueta, error y opciones', async () => {
    render(
      <>
        <Textarea label="Notas" error="Demasiado corto" />
        <Select label="Tipo" defaultValue="b">
          <option value="a">A</option>
          <option value="b">B</option>
        </Select>
      </>
    );
    expect(screen.getByLabelText('Notas')).toHaveAttribute('aria-invalid', 'true');
    const select = screen.getByLabelText('Tipo') as HTMLSelectElement;
    expect(select.value).toBe('b');
    await userEvent.setup().selectOptions(select, 'a');
    expect(select.value).toBe('a');
  });
});

describe('estados y avisos', () => {
  test('cada tono pinta su etiqueta con glifo (el color no es la única señal)', () => {
    render(
      <>
        {TONES.map((tone) => (
          <StatusBadge key={tone} tone={tone}>
            {tone}
          </StatusBadge>
        ))}
      </>
    );
    for (const tone of TONES) {
      const badge = screen.getByText(tone);
      expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
    expect(screen.getByText('success')).toHaveClass('bg-success-container');
    expect(screen.getByText('danger')).toHaveClass('bg-error-container');
    expect(screen.getByText('neutral')).toHaveClass('bg-surface-container-highest');
  });

  test('los avisos graves interrumpen (alert) y los informativos no (status)', () => {
    render(
      <>
        <Alert tone="danger">Peligro</Alert>
        <Alert tone="warning">Aviso</Alert>
        <Alert tone="info" title="Dato">
          Info
        </Alert>
        <Alert tone="success">Hecho</Alert>
      </>
    );
    expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual(['Peligro', 'Aviso']);
    expect(screen.getAllByRole('status').map((a) => a.textContent)).toEqual(['DatoInfo', 'Hecho']);
  });
});

describe('carga', () => {
  test('una sola región anuncia «Cargando…» en el idioma activo y los bloques son decorativos', () => {
    renderWithI18n(
      <Loading>
        <Skeleton data-x />
        <Skeleton />
      </Loading>,
      'en'
    );
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveTextContent('Loading…');
    expect(region.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  test('admite un texto propio', () => {
    renderWithI18n(<Loading label="Cargando la jornada…">x</Loading>);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando la jornada…');
  });
});

describe('Dialog', () => {
  const dialog = (description?: string) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Abrir</Button>
      </DialogTrigger>
      <DialogContent title="Eliminar vehículo" description={description}>
        <DialogClose asChild>
          <Button>Cancelar</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );

  test('se abre con nombre y descripción accesibles, y se cierra con el botón, con Escape o desde dentro', async () => {
    const user = userEvent.setup();
    renderWithI18n(dialog('No se puede deshacer'));
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    const open = await screen.findByRole('dialog', { name: 'Eliminar vehículo' });
    expect(open).toHaveAccessibleDescription('No se puede deshacer');

    await user.click(screen.getByRole('button', { name: 'Cerrar' })); // botón con title y aria-label
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('el botón de cerrar sigue el idioma activo', async () => {
    const user = userEvent.setup();
    renderWithI18n(dialog('x'), 'en');
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await screen.findByRole('button', { name: 'Close' })).toHaveAttribute('title', 'Close');
  });

  test('sin descripción no hay aviso de Radix en consola', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderWithI18n(dialog());
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await screen.findByRole('dialog')).not.toHaveAttribute('aria-describedby');
    expect([...warn.mock.calls, ...error.mock.calls].flat().join(' ')).not.toMatch(/Description|aria-describedby/);
  });
});

describe('DropdownMenu', () => {
  test('se abre, navega con el teclado, ejecuta la entrada y se cierra', async () => {
    const onProfile = vi.fn();
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Menú</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>ada@example.invalid</DropdownMenuLabel>
          <DropdownMenuItem onSelect={onProfile}>Perfil</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Bloqueada</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(screen.queryByRole('menu')).toBeNull();
    const trigger = screen.getByRole('button', { name: 'Menú' });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Bloqueada' })).toHaveAttribute('data-disabled');
    expect(screen.getByRole('menuitem', { name: 'Perfil' })).toHaveClass('min-h-11'); // objetivo táctil de 44px
    await user.click(screen.getByRole('menuitem', { name: 'Perfil' }));
    expect(onProfile).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });
});

describe('ThemeToggle', () => {
  test('muestra el tema del servidor como activo y es un grupo de radios accesible', () => {
    renderWithI18n(<ThemeToggle initial="system" />);
    expect(screen.getByRole('radiogroup', { name: 'Tema de color' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Tema del sistema' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Tema oscuro' })).not.toBeChecked();
    // botones de solo icono: nombre y title
    expect(screen.getByRole('radio', { name: 'Tema oscuro' })).toHaveAttribute('title', 'Tema oscuro');
  });

  test('elegir guarda la cookie y aplica el tema al momento; «sistema» quita el atributo', async () => {
    const user = userEvent.setup();
    renderWithI18n(<ThemeToggle initial="system" />);
    await user.click(screen.getByRole('radio', { name: 'Tema oscuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.cookie).toContain('rt_theme=dark');
    expect(screen.getByRole('radio', { name: 'Tema oscuro' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Tema claro' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    await user.click(screen.getByRole('radio', { name: 'Tema del sistema' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(document.cookie).toContain('rt_theme=system');
  });

  test('sus nombres siguen el idioma', () => {
    renderWithI18n(<ThemeToggle initial="light" />, 'en');
    expect(screen.getByRole('radio', { name: 'Light theme' })).toBeChecked();
  });
});

describe('LanguageToggle', () => {
  test('marca el idioma activo y usa los nombres propios de cada idioma', () => {
    renderWithI18n(<LanguageToggle />, 'pt');
    expect(screen.getByRole('radiogroup', { name: 'Idioma' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Português' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Español' })).toHaveAttribute('lang', 'es');
  });

  test('elegir otro guarda la cookie, cambia lang y pide al servidor pintar el otro diccionario (sin recargar)', async () => {
    const user = userEvent.setup();
    renderWithI18n(<LanguageToggle />, 'en');
    await user.click(screen.getByRole('radio', { name: 'Português' }));
    expect(document.cookie).toContain('rt_lang=pt');
    expect(document.documentElement.lang).toBe('pt');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('elegir el idioma que ya está activo no hace nada', async () => {
    const user = userEvent.setup();
    renderWithI18n(<LanguageToggle />, 'es');
    await user.click(screen.getByRole('radio', { name: 'Español' }));
    expect(refresh).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('rt_lang');
  });
});
