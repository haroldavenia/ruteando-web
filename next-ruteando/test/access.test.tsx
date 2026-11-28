import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import Access from '@/app/access/page';
import ErrorPage from '@/app/error';
import GlobalError from '@/app/global-error';
import NotFound from '@/app/not-found';
import { LoginForm } from '@/components/access/login-form';
import { MfaVerifyStep } from '@/components/access/mfa-verify-step';
import { SsoButtons } from '@/components/access/sso-buttons';
import { SsoReturn } from '@/components/access/sso-return';
import { FormResult } from '@/components/ui/form-result';
import { LinkButton } from '@/components/ui/link-button';
import { PasswordField } from '@/components/ui/password-field';
import type { MfaChallenge } from '@/lib/auth-client';
import { navigateTo } from '@/lib/navigation-client';

import { clearJar, jar } from './cookie-jar';
import { renderWithI18n } from './render';

const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('next/headers', async () => ({ cookies: async () => (await import('./cookie-jar')).jar }));
vi.mock('@/lib/navigation-client', () => ({ navigateTo: vi.fn() }));

// ---------- BFF simulado: una respuesta por ruta, y registro de lo que se envió ----------
type Reply = { status?: number; body?: unknown };
const routes = new Map<string, (body: Record<string, unknown>) => Reply>();
const calls: { path: string; body: Record<string, unknown> }[] = [];
const respond = (path: string, fn: Reply | ((body: Record<string, unknown>) => Reply)) =>
  routes.set(path, typeof fn === 'function' ? fn : () => fn);
const sent = (path: string) => calls.filter((c) => c.path === path);

beforeEach(() => {
  routes.clear();
  calls.length = 0;
  Object.values(router).forEach((fn) => fn.mockClear());
  vi.mocked(navigateTo).mockClear();
  clearJar();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const path = String(url);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    calls.push({ path, body });
    const reply =
      routes.get(path)?.(body) ?? (path === '/middleware/sso/providers' ? { body: { providers: [] } } : { body: {} });
    return new Response(JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200 });
  });
});

const challenge = (methods: MfaChallenge['methods']): MfaChallenge => ({
  mfaRequired: true,
  challengeId: 'c1',
  methods,
  expiresInSeconds: 300,
});
const EMAIL = { method: 'email', destination: 'a•••@example.invalid' } as const;
const TOTP = { method: 'totp', destination: null } as const;
const SMS = { method: 'sms', destination: '+57•••••4567' } as const;
const RECOVERY = { method: 'recovery', destination: null } as const;

describe('componentes de formulario', () => {
  test('PasswordField muestra y oculta la contraseña, con aria-pressed y nombre que cambia', async () => {
    const user = userEvent.setup();
    renderWithI18n(<PasswordField label="Contraseña" autoComplete="current-password" />);
    const field = screen.getByLabelText('Contraseña');
    expect(field).toHaveAttribute('type', 'password');
    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveAttribute('title', 'Mostrar contraseña');
    await user.click(toggle);
    expect(field).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute('aria-pressed', 'true');
    expect(field).toHaveAttribute('autocomplete', 'current-password');
  });

  test('FormResult: las dos regiones existen siempre; el error es alert y la confirmación status', () => {
    const { rerender } = render(<FormResult />);
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    rerender(<FormResult error="Falló" success="Hecho" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falló');
    expect(screen.getByRole('status')).toHaveTextContent('Hecho');
  });

  test('LinkButton no envía formularios por defecto', () => {
    render(<LinkButton>Volver</LinkButton>);
    expect(screen.getByRole('button', { name: 'Volver' })).toHaveAttribute('type', 'button');
  });
});

describe('LoginForm', () => {
  const fill = async (email = 'ada@example.invalid', password = 'clave') => {
    const user = userEvent.setup();
    if (email) await user.type(screen.getByLabelText('Correo electrónico'), email);
    if (password) await user.type(screen.getByLabelText('Contraseña'), password);
    return user;
  };
  const submit = (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

  test('pantalla de bienvenida con los enlaces de recuperar y crear cuenta', () => {
    renderWithI18n(<LoginForm />);
    expect(screen.getByRole('heading', { level: 1, name: 'Bienvenido de nuevo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute('href', '/access/recover');
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/access/register');
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('autocomplete', 'username');
  });

  test('vacío: pide los dos datos y el foco va al primer campo inválido, sin llamar al servidor', async () => {
    renderWithI18n(<LoginForm />);
    await submit(userEvent.setup());
    expect(await screen.findByText('Introduce tu correo')).toBeInTheDocument();
    expect(screen.getByText('Introduce tu contraseña')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Correo electrónico')).toHaveFocus());
    expect(sent('/middleware/auth/login')).toHaveLength(0);
  });

  test('un correo sin formato no se envía', async () => {
    renderWithI18n(<LoginForm />);
    await submit(await fill('no-es-un-correo'));
    expect(await screen.findByText('Introduce un correo válido')).toBeInTheDocument();
    expect(sent('/middleware/auth/login')).toHaveLength(0);
  });

  test('envía el correo sin espacios y, con sesión, va al destino y refresca', async () => {
    respond('/middleware/auth/login', { body: { user: { id: 'u1' } } });
    renderWithI18n(<LoginForm returnUrl="/journeys/3" />);
    await submit(await fill('  ada@example.invalid ', 'Mi-clave'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/journeys/3'));
    expect(router.refresh).toHaveBeenCalled();
    expect(sent('/middleware/auth/login')[0].body).toEqual({ email: 'ada@example.invalid', password: 'Mi-clave' });
  });

  test.each([
    ['sin destino', undefined, '/'],
    ['otro sitio', 'https://evil.test', '/'],
    ['protocolo relativo', '//evil.test', '/'],
    ['barra invertida', '/\\evil.test', '/'],
    ['vuelve al acceso', '/access/recover', '/'],
  ])('el destino pasa siempre por safeReturnUrl (%s)', async (_n, returnUrl, expected) => {
    respond('/middleware/auth/login', { body: { user: { id: 'u1' } } });
    renderWithI18n(<LoginForm returnUrl={returnUrl} />);
    await submit(await fill());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(expected));
  });

  test('credenciales rechazadas: mensaje propio, contraseña vacía con el foco y el correo conservado', async () => {
    respond('/middleware/auth/login', { status: 401, body: { error: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    renderWithI18n(<LoginForm />);
    await submit(await fill('ada@example.invalid', 'mala'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
    await waitFor(() => expect(screen.getByLabelText('Contraseña')).toHaveFocus());
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('ada@example.invalid');
    expect(router.replace).not.toHaveBeenCalled();
  });

  test.each([
    [423, 'La cuenta está bloqueada temporalmente. Inténtalo más tarde'],
    [429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo'],
    [502, 'El servicio no está disponible, inténtalo más tarde'],
    [503, 'El servicio no está disponible, inténtalo más tarde'],
  ])('un %i da su mensaje, sin tocar la contraseña', async (status, text) => {
    respond('/middleware/auth/login', { status, body: { message: 'interno' } });
    renderWithI18n(<LoginForm />);
    await submit(await fill('ada@example.invalid', 'clave'));
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(screen.getByLabelText('Contraseña')).toHaveValue('clave');
  });

  test('sin red: «No hay conexión con el servidor»', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    renderWithI18n(<LoginForm />);
    await submit(await fill());
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión con el servidor');
  });

  test('mientras envía, el botón queda ocupado y no se envía dos veces', async () => {
    let release!: () => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => (release = () => resolve(new Response('{"user":{}}')))) as Promise<Response>
    );
    renderWithI18n(<LoginForm />);
    const user = await fill();
    await submit(user);
    const button = await screen.findByRole('button', { name: 'Iniciando sesión' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await user.click(button);
    release();
    await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1));
  });

  test('con segundo factor pasa al segundo paso y la contraseña ya no se conserva', async () => {
    respond('/middleware/auth/login', { body: challenge([TOTP, RECOVERY]) });
    renderWithI18n(<LoginForm />);
    await submit(await fill('ada@example.invalid', 'clave'));
    expect(await screen.findByRole('heading', { name: 'Verificación en dos pasos' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña')).toBeNull();
    expect(router.replace).not.toHaveBeenCalled(); // la sesión no se abre hasta superar el reto
    // «Volver» regresa a las credenciales, sin mensaje y con la contraseña vacía
    await userEvent.setup().click(screen.getByRole('button', { name: 'Volver' }));
    expect(await screen.findByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
  });

  test('si la empresa exige el segundo factor y no hay ninguno, lo explica y deja volver', async () => {
    respond('/middleware/auth/login', {
      body: { mfaEnrollRequired: true, challengeId: 'c9', methods: ['totp'], expiresInSeconds: 300 },
    });
    renderWithI18n(<LoginForm />);
    await submit(await fill());
    expect(await screen.findByRole('heading', { name: 'Activa la verificación en dos pasos' })).toBeInTheDocument();
    expect(screen.getByText('Tu empresa exige un segundo factor. Activa uno para poder entrar.')).toBeInTheDocument();
  });

  test('textos en inglés', () => {
    renderWithI18n(<LoginForm />, 'en');
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  test('los botones del SSO salen solo si el servidor ofrece proveedores', async () => {
    respond('/middleware/sso/providers', { body: { providers: [{ id: 'google', label: 'Google' }] } });
    renderWithI18n(<LoginForm returnUrl="/places" />);
    const link = await screen.findByRole('link', { name: 'Continuar con Google' });
    expect(link).toHaveAttribute('href', '/gateway/sso/google/start');
    await userEvent.setup().click(link);
    expect(sessionStorage.getItem('ruteando-sso-return')).toBe('/places'); // el destino se guarda antes de salir
  });
});

describe('MfaVerifyStep', () => {
  const step = (c: MfaChallenge, lang: 'es' | 'en' = 'es') => {
    const onVerified = vi.fn();
    const onCancelled = vi.fn();
    renderWithI18n(<MfaVerifyStep challenge={c} onVerified={onVerified} onCancelled={onCancelled} />, lang);
    return { onVerified, onCancelled, user: userEvent.setup() };
  };
  const codeField = (name = 'Código') => screen.getByLabelText(name);

  test('con un solo método de correo envía el código al llegar (una vez) y lo avisa', async () => {
    respond('/middleware/mfa/login/send', { body: { sent: true, destination: 'a•••@example.invalid' } });
    step(challenge([EMAIL]));
    expect(
      screen.getByText('Te enviamos un código a a•••@example.invalid. Escríbelo para continuar.')
    ).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent('Código enviado a a•••@example.invalid');
    expect(sent('/middleware/mfa/login/send')).toEqual([
      { path: '/middleware/mfa/login/send', body: { challengeId: 'c1', method: 'email' } },
    ]);
  });

  test('verifica con el código limpio (sin espacios ni guiones) y avisa de que la sesión está abierta', async () => {
    respond('/middleware/mfa/login/send', { body: { destination: 'x' } });
    respond('/middleware/mfa/login/verify', { body: { user: {}, mfa: { method: 'email' } } });
    const { onVerified, user } = step(challenge([EMAIL]));
    await waitFor(() => expect(codeField()).toHaveFocus());
    await user.type(codeField(), '123 456-7');
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    await waitFor(() => expect(onVerified).toHaveBeenCalled());
    expect(sent('/middleware/mfa/login/verify')[0].body).toEqual({
      challengeId: 'c1',
      method: 'email',
      code: '1234567',
    });
  });

  test('con la aplicación autenticadora no envía nada y pide el código de 6 dígitos', () => {
    step(challenge([TOTP]));
    expect(screen.getByText('Escribe el código de 6 dígitos de tu aplicación autenticadora.')).toBeInTheDocument();
    expect(codeField()).toHaveAttribute('inputmode', 'numeric');
    expect(codeField()).toHaveAttribute('autocomplete', 'one-time-code');
    expect(sent('/middleware/mfa/login/send')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Reenviar código' })).toBeNull(); // un código de aplicación no se reenvía
  });

  test('vacío: pide el código y no llama al servidor', async () => {
    const { user } = step(challenge([TOTP]));
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(await screen.findByText('Escribe el código')).toBeInTheDocument();
    expect(sent('/middleware/mfa/login/verify')).toHaveLength(0);
  });

  test('con varios métodos pregunta cuál usar antes de enviar nada; elegir uno lo envía solo si es correo o SMS', async () => {
    respond('/middleware/mfa/login/send', { body: { destination: '+57•••••4567' } });
    const { user } = step(challenge([EMAIL, SMS, TOTP, RECOVERY]));
    expect(screen.getByRole('heading', { name: 'Verificación en dos pasos' })).toBeInTheDocument();
    expect(screen.getByText('Elige cómo quieres verificar tu identidad.')).toBeInTheDocument();
    expect(sent('/middleware/mfa/login/send')).toHaveLength(0);
    const options = screen.getAllByRole('button').map((b) => b.textContent);
    expect(options.join('|')).toContain('Aplicación autenticadora');
    await user.click(screen.getByRole('button', { name: /Aplicación autenticadora/ }));
    expect(sent('/middleware/mfa/login/send')).toHaveLength(0); // TOTP no se envía
    await user.click(screen.getByRole('button', { name: 'Elegir otro método' }));
    await user.click(screen.getByRole('button', { name: /Mensaje de texto/ }));
    await waitFor(() => expect(sent('/middleware/mfa/login/send')).toHaveLength(1));
    expect(sent('/middleware/mfa/login/send')[0].body.method).toBe('sms');
  });

  test('el código de recuperación se ofrece aparte y pide uno de los códigos guardados', async () => {
    const { user } = step(challenge([EMAIL, TOTP, RECOVERY]));
    await user.click(screen.getByRole('button', { name: '¿No puedes usar ninguno? Usa un código de recuperación' }));
    expect(
      screen.getByText('Escribe uno de tus códigos de recuperación. Cada uno sirve una sola vez.')
    ).toBeInTheDocument();
    expect(codeField('Código de recuperación')).toHaveAttribute('inputmode', 'text');
    expect(screen.queryByRole('button', { name: 'Reenviar código' })).toBeNull();
  });

  test('con un solo método y recuperación, ofrece el otro método en línea', async () => {
    respond('/middleware/mfa/login/send', { body: { destination: 'x' } });
    const { user } = step(challenge([EMAIL, RECOVERY]));
    expect(screen.getByText('Usar otro método:')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Código de recuperación' }));
    expect(screen.getByLabelText('Código de recuperación')).toBeInTheDocument();
  });

  test('un código erróneo muestra el mensaje del servidor (no «sesión caducada»), vacía el campo y le devuelve el foco', async () => {
    respond('/middleware/mfa/login/verify', {
      status: 401,
      body: { code: 'INVALID_CODE', message: 'El código no es válido.', attemptsLeft: 3 },
    });
    const { user, onCancelled } = step(challenge([TOTP]));
    await user.type(codeField(), '000000');
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El código no es válido.');
    expect(codeField()).toHaveValue('');
    await waitFor(() => expect(codeField()).toHaveFocus());
    expect(onCancelled).not.toHaveBeenCalled();
  });

  test.each(['CHALLENGE_EXPIRED', 'TOO_MANY_ATTEMPTS', 'TOO_MANY_FAILURES'])(
    '%s: el reto ya no sirve y se vuelve a las credenciales con el motivo',
    async (code) => {
      respond('/middleware/mfa/login/verify', {
        status: code === 'CHALLENGE_EXPIRED' ? 401 : 429,
        body: { code, message: 'Inicia sesión de nuevo.' },
      });
      const { user, onCancelled } = step(challenge([TOTP]));
      await user.type(codeField(), '000000');
      await user.click(screen.getByRole('button', { name: 'Verificar' }));
      await waitFor(() => expect(onCancelled).toHaveBeenCalledWith('Inicia sesión de nuevo.'));
    }
  );

  test('«Reenviar código» envía otro; «Volver» cancela sin motivo', async () => {
    respond('/middleware/mfa/login/send', { body: { destination: 'x' } });
    const { user, onCancelled } = step(challenge([EMAIL]));
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: 'Reenviar código' }));
    await waitFor(() => expect(sent('/middleware/mfa/login/send')).toHaveLength(2));
    await user.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onCancelled).toHaveBeenCalledWith('');
  });

  test('si el envío está limitado (429) lo dice, sin cancelar el reto', async () => {
    respond('/middleware/mfa/login/send', {
      status: 429,
      body: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados envíos. Espera unos minutos.' },
    });
    const { onCancelled } = step(challenge([EMAIL]));
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados envíos. Espera unos minutos.');
    expect(onCancelled).not.toHaveBeenCalled();
  });

  test('en inglés', () => {
    step(challenge([TOTP]), 'en');
    expect(screen.getByRole('heading', { name: 'Two-step verification' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument();
  });
});

describe('SsoButtons', () => {
  test('sin proveedores no pinta nada', async () => {
    const { container } = renderWithI18n(<SsoButtons />);
    await waitFor(() => expect(sent('/middleware/sso/providers')).toHaveLength(1));
    expect(container).toBeEmptyDOMElement();
  });

  test('un botón por proveedor, en un grupo con nombre', async () => {
    respond('/middleware/sso/providers', {
      body: {
        providers: [
          { id: 'google', label: 'Google' },
          { id: 'github', label: 'GitHub' },
        ],
      },
    });
    renderWithI18n(<SsoButtons />);
    const group = await screen.findByRole('group', { name: 'Otras formas de entrar' });
    expect(within(group).getByRole('link', { name: 'Continuar con GitHub' })).toHaveAttribute(
      'href',
      '/gateway/sso/github/start'
    );
    expect(within(group).getByText('o continúa con')).toBeInTheDocument();
  });

  test('el SSO de empresa pide antes el correo; uno inválido no navega y uno válido va con el correo escapado', async () => {
    respond('/middleware/sso/providers', { body: { providers: [{ id: 'enterprise', label: 'SSO' }] } });
    const user = userEvent.setup();
    renderWithI18n(<SsoButtons returnUrl="/zones" />);
    await user.click(await screen.findByRole('button', { name: 'Continuar con el SSO de mi empresa' }));
    await user.type(screen.getByLabelText('Correo de tu empresa'), 'sin-arroba');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Introduce un correo válido')).toBeInTheDocument();
    expect(navigateTo).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('Correo de tu empresa'));
    await user.type(screen.getByLabelText('Correo de tu empresa'), 'ada+x@acme.test');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(navigateTo).toHaveBeenCalledWith('/gateway/sso/enterprise/start?email=ada%2Bx%40acme.test');
    expect(sessionStorage.getItem('ruteando-sso-return')).toBe('/zones');
  });
});

describe('SsoReturn', () => {
  const arrive = (hash: string) => window.history.replaceState(null, '', `/access/sso${hash}`);

  test('con ticket: lo canjea UNA vez, lo quita de la barra de direcciones y entra al destino guardado', async () => {
    respond('/middleware/sso/complete', { body: { user: { id: 'u1' } } });
    sessionStorage.setItem('ruteando-sso-return', '/packages');
    arrive('#ticket=TK123');
    renderWithI18n(<SsoReturn />);
    expect(screen.getByRole('heading', { name: 'Iniciando sesión' })).toBeInTheDocument();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/packages'));
    expect(sent('/middleware/sso/complete')).toEqual([{ path: '/middleware/sso/complete', body: { ticket: 'TK123' } }]);
    expect(window.location.hash).toBe(''); // el ticket no se queda en el historial
  });

  test('con segundo factor sigue en el segundo paso (el SSO no lo sustituye)', async () => {
    respond('/middleware/sso/complete', { body: challenge([TOTP]) });
    arrive('#ticket=TK');
    renderWithI18n(<SsoReturn />);
    expect(await screen.findByRole('heading', { name: 'Verificación en dos pasos' })).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test.each([
    ['#error=DENIED', 'Cancelaste el inicio de sesión en el proveedor'],
    ['#error=NO_ACCOUNT', 'No hay una cuenta con ese correo. Pide a tu administrador que te invite'],
    ['#error=STATE_INVALID', 'El inicio de sesión caducó o se abrió en otro navegador. Inténtalo de nuevo'],
    ['#error=ALGO_RARO', 'No se pudo iniciar sesión con el proveedor'],
    ['', 'No se pudo iniciar sesión con el proveedor'],
  ])('el error del proveedor (%s) se explica y se puede volver', async (hash, message) => {
    arrive(hash);
    renderWithI18n(<SsoReturn />);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('link', { name: 'Volver al inicio de sesión' })).toHaveAttribute('href', '/access');
    expect(sent('/middleware/sso/complete')).toHaveLength(0);
  });

  test('un ticket caducado se explica en el idioma activo', async () => {
    respond('/middleware/sso/complete', {
      status: 401,
      body: { code: 'TICKET_EXPIRED', message: 'El inicio de sesión caducó. Inténtalo de nuevo.' },
    });
    arrive('#ticket=TK');
    renderWithI18n(<SsoReturn />, 'en');
    expect(await screen.findByRole('alert')).toHaveTextContent('The sign-in expired. Try again');
  });
});

describe('páginas', () => {
  beforeEach(() => jar.set('rt_lang', 'es'));

  test('la página de acceso pasa el destino al formulario', async () => {
    respond('/middleware/auth/login', { body: { user: {} } });
    renderWithI18n(await Access({ searchParams: Promise.resolve({ returnUrl: '/audit' }) }));
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Correo electrónico'), 'ada@example.invalid');
    await user.type(screen.getByLabelText('Contraseña'), 'x');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/audit'));
  });

  test('un returnUrl repetido o ausente no rompe la página (se ignora)', async () => {
    renderWithI18n(await Access({ searchParams: Promise.resolve({ returnUrl: ['/a', '/b'] }) }));
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
  });

  test('404 con el diseño de la aplicación y salida al inicio', async () => {
    render(await NotFound());
    expect(screen.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });

  test('error inesperado: no enseña el mensaje y permite reintentar', async () => {
    const reset = vi.fn();
    renderWithI18n(<ErrorPage error={new Error('secreto interno: contraseña de la base')} reset={reset} />);
    expect(screen.getByRole('heading', { name: 'Algo salió mal' })).toBeInTheDocument();
    expect(screen.queryByText(/secreto interno/)).toBeNull();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });

  test('último recurso: texto mínimo en los dos idiomas', async () => {
    const reset = vi.fn();
    // El <html> propio del componente no cabe dentro del <div> de la prueba: se pinta su contenido
    const { container } = render(<GlobalError error={new Error('x')} reset={reset} />, {
      container: document.documentElement,
    });
    expect(container).toHaveTextContent('Algo salió mal · Something went wrong');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar · Retry' }));
    expect(reset).toHaveBeenCalled();
  });
});
