import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import RecoverPage from '@/app/access/recover/page';
import RegisterPage from '@/app/access/register/page';
import ResetPage from '@/app/access/reset/page';
import VerifyPage from '@/app/access/verify-email/page';
import { LoginForm } from '@/components/access/login-form';
import { RecoverForm } from '@/components/access/recover-form';
import { RegisterForm } from '@/components/access/register-form';
import { ResetForm } from '@/components/access/reset-form';
import { VerifyEmail } from '@/components/access/verify-email';
import { ToastProvider, useNotify } from '@/components/ui/toast';
import type * as NavigationClient from '@/lib/navigation-client';
import { stripQueryParam } from '@/lib/navigation-client';

import { renderWithI18n } from './render';

const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/navigation-client', () => ({ navigateTo: vi.fn(), stripQueryParam: vi.fn() }));

type Reply = { status?: number; body?: unknown };
const routes = new Map<string, Reply>();
const calls: { path: string; body: Record<string, unknown> }[] = [];
const sent = (path: string) => calls.filter((c) => c.path === path);

beforeEach(() => {
  routes.clear();
  calls.length = 0;
  Object.values(router).forEach((fn) => fn.mockClear());
  vi.mocked(stripQueryParam).mockClear();
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const path = String(url);
    calls.push({ path, body: init?.body ? JSON.parse(String(init.body)) : {} });
    const reply = routes.get(path) ?? {};
    return new Response(JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200 });
  });
});

const GOOD = 'Clave-muy-Segura1!';
const withToasts = (ui: React.ReactElement) => renderWithI18n(<ToastProvider>{ui}</ToastProvider>);

describe('ningún formulario se envía por GET', () => {
  // Un envío ANTES de hidratar es nativo: con el método por defecto (GET) la contraseña iría en la dirección
  test.each([
    ['inicio de sesión', () => <LoginForm />],
    ['registro', () => <RegisterForm />],
    ['recuperar', () => <RecoverForm />],
    ['restablecer', () => <ResetForm token="tok" />],
    ['verificar correo (reenvío)', () => <VerifyEmail token={null} />],
  ])('%s: method="post"', (_name, ui) => {
    const { container } = renderWithI18n(ui());
    const forms = container.querySelectorAll('form');
    expect(forms.length).toBeGreaterThan(0);
    for (const form of forms) expect(form.getAttribute('method')).toBe('post');
  });
});

describe('páginas', () => {
  test('las de enlace leen el token en el servidor y lo pasan; sin token pasan null', async () => {
    const reset = await ResetPage({ searchParams: Promise.resolve({ token: 'tok' }) });
    expect(reset.props.token).toBe('tok');
    expect((await ResetPage({ searchParams: Promise.resolve({}) })).props.token).toBeNull();
    // un parámetro repetido (?token=a&token=b) no es un token: se ignora
    expect((await ResetPage({ searchParams: Promise.resolve({ token: ['a', 'b'] }) })).props.token).toBeNull();
    expect((await VerifyPage({ searchParams: Promise.resolve({ token: '' }) })).props.token).toBeNull();
    expect((await VerifyPage({ searchParams: Promise.resolve({ token: 'v' }) })).props.token).toBe('v');
    expect(RegisterPage()).toBeTruthy();
    expect(RecoverPage()).toBeTruthy();
  });
});

describe('Toast', () => {
  function Trigger() {
    const notify = useNotify();
    return <button onClick={() => notify('Hecho')}>avisar</button>;
  }

  test('varios avisos conviven y cada uno se cierra por separado', async () => {
    const user = userEvent.setup();
    withToasts(<Trigger />);
    await user.click(screen.getByRole('button', { name: 'avisar' }));
    await user.click(screen.getByRole('button', { name: 'avisar' }));
    expect(await screen.findAllByText('Hecho')).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: 'Cerrar' })[0]!);
    await waitFor(() => expect(screen.getAllByText('Hecho')).toHaveLength(1));
  });

  test('sin proveedor, avisar no hace nada (un componente se prueba suelto)', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Trigger />);
    await user.click(screen.getByRole('button', { name: 'avisar' }));
    expect(screen.queryByText('Hecho')).toBeNull();
  });
});

describe('RegisterForm', () => {
  const fillAll = async (user: ReturnType<typeof userEvent.setup>, over: Record<string, string> = {}) => {
    const values = {
      'Nombre': 'Ada',
      'Apellidos': 'Lovelace',
      'Nombre de la empresa': 'Analytical SA',
      'Correo electrónico': 'ada@example.invalid',
      'Contraseña': GOOD,
      'Confirmar contraseña': GOOD,
      ...over,
    };
    for (const [label, value] of Object.entries(values)) {
      if (value) await user.type(screen.getByLabelText(label, { exact: true }), value);
    }
  };
  const submit = (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

  test('un envío vacío pide cada dato, no llama al servidor y enfoca el primero', async () => {
    const user = userEvent.setup();
    renderWithI18n(<RegisterForm />);
    await submit(user);
    expect(await screen.findByText('Introduce tu nombre')).toBeInTheDocument();
    for (const text of [
      'Introduce tus apellidos',
      'Introduce el nombre de tu empresa',
      'Introduce tu correo',
      'Introduce una contraseña',
      'Confirma tu contraseña',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(calls).toHaveLength(0);
    expect(screen.getByLabelText('Nombre', { exact: true })).toHaveFocus();
  });

  test('una contraseña débil o una confirmación distinta no se envían', async () => {
    const user = userEvent.setup();
    renderWithI18n(<RegisterForm />);
    await fillAll(user, { 'Contraseña': 'corta', 'Confirmar contraseña': 'corta' });
    await submit(user);
    expect(await screen.findByText('La contraseña no cumple los requisitos')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Contraseña', { exact: true }));
    await user.type(screen.getByLabelText('Contraseña', { exact: true }), GOOD);
    await user.clear(screen.getByLabelText('Confirmar contraseña'));
    await user.type(screen.getByLabelText('Confirmar contraseña'), GOOD + 'x');
    await submit(user);
    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  test('los requisitos salen al enfocar la contraseña, con su estado también como texto', async () => {
    const user = userEvent.setup();
    renderWithI18n(<RegisterForm />);
    expect(screen.queryByRole('list', { name: 'Requisitos de la contraseña' })).toBeNull();
    await user.click(screen.getByLabelText('Contraseña', { exact: true }));
    const list = screen.getByRole('list', { name: 'Requisitos de la contraseña' });
    expect(list).toHaveTextContent('Al menos 16 caracteres');
    expect(list).toHaveTextContent('pendiente');
    await user.type(screen.getByLabelText('Contraseña', { exact: true }), 'Aa1');
    expect(list).toHaveTextContent('cumplido'); // mayúscula, minúscula y número
    expect(screen.getByLabelText('Contraseña', { exact: true })).toHaveAttribute('aria-describedby', list.id);
    await user.tab(); // sale del campo: lo que falta pasa a «no cumplido» y la lista sigue
    expect(screen.getByRole('list', { name: 'Requisitos de la contraseña' })).toHaveTextContent('no cumplido');
  });

  test('crea la cuenta sin enviar la confirmación y pide revisar el correo; las contraseñas se vacían', async () => {
    const user = userEvent.setup();
    renderWithI18n(<RegisterForm />);
    await fillAll(user);
    await submit(user);
    expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeInTheDocument();
    expect(sent('/middleware/auth/register')[0]!.body).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      tenantName: 'Analytical SA',
      email: 'ada@example.invalid',
      password: GOOD,
    });
    expect(screen.getByText('ada@example.invalid')).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled(); // no inicia sesión
  });

  test('reenviar el correo da siempre el mismo texto, y un límite lo dice', async () => {
    const user = userEvent.setup();
    renderWithI18n(<RegisterForm />);
    await fillAll(user);
    await submit(user);
    await user.click(await screen.findByRole('button', { name: 'Reenviar correo' }));
    expect(await screen.findByText('Si el correo existe, recibirás instrucciones de verificación')).toBeInTheDocument();
    expect(sent('/middleware/auth/resend-verification')[0]!.body).toEqual({ email: 'ada@example.invalid' });
    routes.set('/middleware/auth/resend-verification', { status: 429, body: {} });
    await user.click(screen.getByRole('button', { name: 'Reenviar correo' }));
    expect(await screen.findByText(/Demasiados intentos/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a iniciar sesión' })).toHaveAttribute('href', '/access');
  });

  test('un correo ya registrado se dice; los campos de contraseña quedan vacíos y el correo se conserva', async () => {
    routes.set('/middleware/auth/register', { status: 409, body: { error: 'CONFLICT' } });
    const user = userEvent.setup();
    renderWithI18n(<RegisterForm />);
    await fillAll(user);
    await submit(user);
    expect(await screen.findByText('Ya existe una cuenta con ese correo')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña', { exact: true })).toHaveValue('');
    expect(screen.getByLabelText('Confirmar contraseña')).toHaveValue('');
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('ada@example.invalid');
  });

  test('si el gateway rechaza la contraseña dice la regla y enfoca la primera', async () => {
    routes.set('/middleware/auth/register', { status: 400, body: { error: 'PASSWORD_POLICY_VIOLATION' } });
    const user = userEvent.setup();
    renderWithI18n(<RegisterForm />);
    await fillAll(user);
    await submit(user);
    expect(await screen.findByText(/La contraseña no cumple la política\. Mínimo 16 caracteres/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Contraseña', { exact: true })).toHaveFocus());
  });

  test('enlaza los tres documentos legales en otra pestaña', () => {
    renderWithI18n(<RegisterForm />);
    for (const [name, href] of [
      ['Política de privacidad', '/legal/privacy'],
      ['Términos y condiciones', '/legal/terms'],
      ['Verificación por SMS', '/legal/sms'],
    ] as const) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    }
  });
});

describe('RecoverForm', () => {
  test('valida el correo y no llama al servidor si es inválido', async () => {
    const user = userEvent.setup();
    renderWithI18n(<RecoverForm />);
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }));
    expect(await screen.findByText('Introduce tu correo')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Correo electrónico'), 'no-es-un-correo');
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }));
    expect(await screen.findByText('Introduce un correo válido')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  test('confirma con un texto fijo (no revela si la cuenta existe), también si el gateway dice 404', async () => {
    routes.set('/middleware/auth/forgot-password', { status: 200, body: { message: 'no existe' } });
    const user = userEvent.setup();
    renderWithI18n(<RecoverForm />);
    await user.type(screen.getByLabelText('Correo electrónico'), ' ada@example.invalid ');
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }));
    expect(
      await screen.findByText('Si el correo existe, recibirás instrucciones para restablecer tu contraseña')
    ).toBeInTheDocument();
    expect(screen.queryByText('no existe')).toBeNull();
    expect(sent('/middleware/auth/forgot-password')[0]!.body).toEqual({ email: 'ada@example.invalid' });
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute('href', '/access');
  });

  test('un límite de intentos se dice y se puede reintentar', async () => {
    routes.set('/middleware/auth/forgot-password', { status: 429, body: {} });
    const user = userEvent.setup();
    renderWithI18n(<RecoverForm />);
    await user.type(screen.getByLabelText('Correo electrónico'), 'ada@example.invalid');
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }));
    expect(await screen.findByText(/Demasiados intentos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeEnabled();
  });
});

describe('ResetForm', () => {
  const choose = async (user: ReturnType<typeof userEvent.setup>, password = GOOD, confirm = password) => {
    await user.type(screen.getByLabelText('Contraseña nueva'), password);
    await user.type(screen.getByLabelText('Confirmar contraseña'), confirm);
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
  };

  test('sin token el enlace no es válido y ofrece pedir otro', () => {
    renderWithI18n(<ResetForm token={null} />);
    expect(screen.getByText('El enlace no es válido o ha caducado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar un enlace nuevo' })).toHaveAttribute('href', '/access/recover');
  });

  test('retira el token de la barra de direcciones al cargar', () => {
    renderWithI18n(<ResetForm token="tok" />);
    expect(stripQueryParam).toHaveBeenCalledWith('token');
  });

  test('cambia la contraseña con el token, avisa y vuelve al acceso', async () => {
    const user = userEvent.setup();
    withToasts(<ResetForm token="tok" />);
    await choose(user);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/access'));
    expect(sent('/middleware/auth/reset-password')[0]!.body).toEqual({ token: 'tok', newPassword: GOOD });
    expect((await screen.findAllByText('Contraseña actualizada, ya puedes iniciar sesión')).length).toBeGreaterThan(0);
  });

  test('una contraseña débil o distinta no se envía', async () => {
    const user = userEvent.setup();
    renderWithI18n(<ResetForm token="tok" />);
    await choose(user, 'corta');
    expect(await screen.findByText('La contraseña no cumple los requisitos')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  test('si el servidor culpa a la contraseña, el token sigue valiendo: se queda el formulario y se vacía', async () => {
    routes.set('/middleware/auth/reset-password', { status: 400, body: { error: 'PASSWORD_POLICY_VIOLATION' } });
    const user = userEvent.setup();
    renderWithI18n(<ResetForm token="tok" />);
    await choose(user);
    expect(await screen.findByText(/La contraseña no cumple la política/)).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña nueva')).toHaveValue('');
    await waitFor(() => expect(screen.getByLabelText('Contraseña nueva')).toHaveFocus());
    expect(screen.queryByText('El enlace no es válido o ha caducado')).toBeNull();
  });

  test.each([400, 401, 404, 410])(
    'con un %i sin código culpa al enlace: cambia a «enlace no válido»',
    async (status) => {
      routes.set('/middleware/auth/reset-password', { status, body: {} });
      const user = userEvent.setup();
      renderWithI18n(<ResetForm token="tok" />);
      await choose(user);
      expect(await screen.findByText('El enlace no es válido o ha caducado')).toBeInTheDocument();
      expect(screen.queryByLabelText('Contraseña nueva')).toBeNull();
    }
  );

  test('un fallo del servicio se dice sin gastar el enlace', async () => {
    routes.set('/middleware/auth/reset-password', { status: 503, body: {} });
    const user = userEvent.setup();
    renderWithI18n(<ResetForm token="tok" />);
    await choose(user);
    expect(await screen.findByText('El servicio no está disponible, inténtalo más tarde')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña nueva')).toBeInTheDocument();
  });
});

describe('VerifyEmail', () => {
  test('sin token: enlace no válido y formulario para pedir otro', async () => {
    const user = userEvent.setup();
    renderWithI18n(<VerifyEmail token={null} />);
    expect(screen.getByText('El enlace no es válido o ha caducado')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    await user.type(screen.getByLabelText('Correo electrónico'), 'ada@example.invalid');
    await user.click(screen.getByRole('button', { name: 'Reenviar verificación' }));
    expect(await screen.findByText('Si el correo existe, recibirás instrucciones de verificación')).toBeInTheDocument();
    expect(sent('/middleware/auth/resend-verification')[0]!.body).toEqual({ email: 'ada@example.invalid' });
  });

  test('los mensajes salen en el idioma elegido (sin token y con enlace rechazado)', async () => {
    const { unmount } = renderWithI18n(<VerifyEmail token={null} />, 'en');
    expect(screen.getByText('The link is not valid or has expired')).toBeInTheDocument();
    unmount();
    routes.set('/middleware/auth/verify-email', { status: 410, body: {} });
    renderWithI18n(<VerifyEmail token="viejo" />, 'en');
    expect(await screen.findByText('The link is not valid or has expired')).toBeInTheDocument();
  });

  test('canjea el token UNA sola vez (también con el modo estricto), lo retira de la barra y entra a Inicio', async () => {
    routes.set('/middleware/auth/verify-email', { body: { user: { id: 'u1' } } });
    withToasts(
      <StrictMode>
        <VerifyEmail token="tok" />
      </StrictMode>
    );
    expect(screen.getByRole('status')).toHaveTextContent('Verificando tu correo…');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(sent('/middleware/auth/verify-email')).toHaveLength(1);
    expect(sent('/middleware/auth/verify-email')[0]!.body).toEqual({ token: 'tok' });
    expect(stripQueryParam).toHaveBeenCalledWith('token');
    expect(router.refresh).toHaveBeenCalled();
    expect((await screen.findAllByText('Correo verificado')).length).toBeGreaterThan(0);
  });

  test('si el segundo factor está activo no entra: pide el código (el correo verificado no lo sustituye)', async () => {
    routes.set('/middleware/auth/verify-email', {
      body: {
        mfaRequired: true,
        challengeId: 'c1',
        methods: [{ method: 'totp', destination: null }],
        expiresInSeconds: 300,
      },
    });
    renderWithI18n(<VerifyEmail token="tok" />);
    expect(await screen.findByLabelText(/código/i)).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test('un token rechazado muestra el motivo y deja pedir otro enlace', async () => {
    routes.set('/middleware/auth/verify-email', { status: 410, body: {} });
    renderWithI18n(<VerifyEmail token="viejo" />);
    expect(await screen.findByText('El enlace no es válido o ha caducado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reenviar verificación' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a iniciar sesión' })).toHaveAttribute('href', '/access');
  });

  test('un fallo del servicio no se hace pasar por enlace caducado', async () => {
    routes.set('/middleware/auth/verify-email', { status: 503, body: {} });
    renderWithI18n(<VerifyEmail token="tok" />);
    expect(await screen.findByText('El servicio no está disponible, inténtalo más tarde')).toBeInTheDocument();
  });
});

describe('stripQueryParam (real)', () => {
  test('quita solo ese parámetro, conserva los demás y no añade historia', async () => {
    const real = await vi.importActual<Pick<typeof NavigationClient, 'stripQueryParam'>>('@/lib/navigation-client');
    window.history.replaceState({ k: 1 }, '', '/access/reset?token=abc&otro=1#x');
    const before = window.history.length;
    real.stripQueryParam('token');
    expect(window.location.search).toBe('?otro=1');
    expect(window.location.hash).toBe('#x');
    expect(window.history.length).toBe(before);
    expect(window.history.state).toEqual({ k: 1 });
    real.stripQueryParam('token'); // sin el parámetro no toca nada
    expect(window.location.search).toBe('?otro=1');
    render(<span />);
  });
});
