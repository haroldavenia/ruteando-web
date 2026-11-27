import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import Home from '@/app/(app)/page';
import { packUser, type SessionUser } from '@/lib/session-token';

import { clearJar, jar } from './cookie-jar';

vi.mock('next/headers', async () => ({ cookies: async () => (await import('./cookie-jar')).jar }));

const person = (role: SessionUser['role']): SessionUser => ({
  id: 'u1',
  email: 'ada@example.invalid',
  role,
  tenantId: 't1',
  firstName: 'Ada',
  lastName: 'Admin',
});
const signIn = (role: SessionUser['role']) => jar.set('rt_user', packUser(person(role)));

beforeEach(() => {
  clearJar();
  jar.set('rt_lang', 'es');
});

describe('Inicio', () => {
  test('saluda por el nombre y ofrece las acciones de quien opera', async () => {
    signIn('agent');
    render(await Home());
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      /^(Buenos días|Buenas tardes|Buenas noches), Ada Admin$/
    );
    expect(screen.getByRole('link', { name: 'Planificar jornada' })).toHaveAttribute('href', '/journeys/new');
    expect(screen.getByRole('link', { name: 'Importar paquetes' })).toHaveAttribute('href', '/packages/import');
  });

  test('NO repite el menú con una tarjeta por área (ya está en el riel y en la búsqueda)', async () => {
    signIn('tenant_admin');
    render(await Home());
    for (const area of ['Vehículos', 'Lugares', 'Zonas', 'Auditoría', 'Seguridad']) {
      expect(screen.queryByRole('link', { name: area })).toBeNull();
    }
  });

  test('un conductor no tiene acciones ni áreas: se lo explica el aviso', async () => {
    signIn('driver');
    render(await Home());
    expect(screen.queryByRole('link', { name: 'Planificar jornada' })).toBeNull();
    expect(screen.getByText('Tu rol no tiene áreas disponibles en la aplicación web.')).toBeInTheDocument();
  });

  test('quien sí tiene áreas no ve el aviso', async () => {
    signIn('agent');
    render(await Home());
    expect(screen.queryByText(/no tiene áreas disponibles/)).toBeNull();
  });

  test('sigue el idioma de la cookie', async () => {
    jar.set('rt_lang', 'en');
    signIn('agent');
    render(await Home());
    expect(screen.getByRole('link', { name: 'Plan journey' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Import packages' })).toBeInTheDocument();
  });
});
