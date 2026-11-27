import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { SecondFactor } from '@/components/access/second-factor';
import { MfaEnroll } from '@/components/mfa/mfa-enroll';
import { MfaStepUp } from '@/components/mfa/mfa-step-up';
import { QrCode } from '@/components/mfa/qr-code';
import { RecoveryCodes } from '@/components/mfa/recovery-codes';
import { Profile } from '@/components/profile/profile';
import { Security } from '@/components/security/security';
import { ToastProvider } from '@/components/ui/toast';
import type { SessionUser } from '@/lib/session-token';
import { parseDomains } from '@/lib/sso-client';

import { type Call, mockGateway, page } from './gateway-mock';
import { renderWithI18n } from './render';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/profile',
}));

const withToasts = (ui: React.ReactElement) => renderWithI18n(<ToastProvider>{ui}</ToastProvider>);
const person: SessionUser = {
  id: 'u1',
  email: 'ana@example.invalid',
  role: 'tenant_admin',
  tenantId: 't1',
  firstName: 'Ana',
  lastName: 'Pérez',
};

const method = (over: Record<string, unknown> = {}) => ({
  allowed: true,
  available: true,
  active: false,
  pending: false,
  destination: null,
  ...over,
});
const status = (over: Record<string, unknown> = {}) => ({
  enabled: false,
  methods: { totp: method(), email: method(), sms: method({ available: false }) },
  recoveryCodesLeft: 0,
  required: false,
  activeCount: 0,
  ...over,
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('componentes del segundo factor', () => {
  test('el QR se dibuja como SVG con el texto pedido', async () => {
    const { container } = renderWithI18n(<QrCode text="otpauth://totp/Ruteando:ana?secret=ABC" />);
    await waitFor(() => expect(container.querySelector('svg path')).not.toBeNull());
    expect(screen.getByRole('img', { name: 'Código QR para la aplicación autenticadora' })).toBeInTheDocument();
    expect(container.querySelector('svg path')!.getAttribute('d')).toMatch(/^M\d+ \d+h1v1h-1z/);
  });

  test('los códigos de recuperación se copian y se confirman como guardados', async () => {
    const onSaved = vi.fn();
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write }, configurable: true });
    renderWithI18n(<RecoveryCodes codes={['aaaaa-bbbbb', 'ccccc-ddddd']} onSaved={onSaved} />);
    expect(screen.getByRole('list', { name: 'Códigos de recuperación' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(write).toHaveBeenCalledWith('aaaaa-bbbbb\nccccc-ddddd');
    expect(await screen.findByText('Códigos copiados')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ya los guardé' }));
    expect(onSaved).toHaveBeenCalled();
  });

  test('activar por correo: elige, recibe el código y lo confirma; con reto viaja la cabecera y sin él, no', async () => {
    const onEnrolled = vi.fn();
    const gateway = mockGateway({
      'POST /middleware/mfa/email/setup': { sent: true, destination: 'a•••@example.invalid', expiresInSeconds: 600 },
      'POST /middleware/mfa/email/confirm': (call: Call) =>
        (call.body as { code: string }).code === '123456'
          ? { active: true, recoveryCodes: ['x-1', 'x-2'] }
          : { status: 401, body: { code: 'INVALID_CODE', message: 'Código incorrecto' } },
    });
    renderWithI18n(<MfaEnroll methods={['email', 'totp']} challengeId="reto-1" onEnrolled={onEnrolled} />);
    await userEvent.click(screen.getByRole('button', { name: /Correo electrónico/ }));
    expect(
      await screen.findByText('Te enviamos un código a a•••@example.invalid. Escríbelo para activar este método.')
    ).toBeInTheDocument();
    expect(gateway.sent('POST', '/middleware/mfa/email/setup')[0]!.headers['x-mfa-challenge']).toBe('reto-1');

    await userEvent.click(screen.getByRole('button', { name: 'Activar' }));
    expect(await screen.findByText('Escribe el código de 6 dígitos')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Código'), '000 000');
    await userEvent.click(screen.getByRole('button', { name: 'Activar' }));
    expect(await screen.findByText('Código incorrecto')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Código'));
    await userEvent.type(screen.getByLabelText('Código'), '123 456');
    await userEvent.click(screen.getByRole('button', { name: 'Activar' }));
    await waitFor(() => expect(onEnrolled).toHaveBeenCalledWith({ method: 'email', recoveryCodes: ['x-1', 'x-2'] }));
    expect(gateway.sent('POST', '/middleware/mfa/email/confirm').at(-1)!.body).toEqual({ code: '123456' }); // sin espacios
  });

  test('por SMS pide el teléfono en formato internacional y lo envía sin separadores; con sesión no lleva cabecera', async () => {
    const gateway = mockGateway({
      'POST /middleware/mfa/sms/setup': { sent: true, destination: '+57•••4567', expiresInSeconds: 600 },
    });
    renderWithI18n(<MfaEnroll methods={['sms']} initial="sms" onEnrolled={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Teléfono'), '3001234567');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
    expect(await screen.findByText(/Escribe el teléfono en formato internacional/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Teléfono'));
    await userEvent.type(screen.getByLabelText('Teléfono'), '+57 (300) 123-4567');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
    expect(await screen.findByText(/Te enviamos un código a \+57•••4567/)).toBeInTheDocument();
    const sent = gateway.sent('POST', '/middleware/mfa/sms/setup')[0]!;
    expect(sent.body).toEqual({ phone: '+573001234567' });
    expect(sent.headers['x-mfa-challenge']).toBeUndefined();
  });

  test('la aplicación autenticadora muestra el QR y la clave para escribirla a mano', async () => {
    mockGateway({
      'POST /middleware/mfa/totp/setup': {
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUri: 'otpauth://totp/R:a?secret=JBSWY3DPEHPK3PXP',
      },
    });
    renderWithI18n(<MfaEnroll methods={['totp']} initial="totp" onEnrolled={vi.fn()} />);
    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('img', { name: /Código QR/ })).toBeInTheDocument());
  });

  test('confirmar una acción: la app primero, envía código por correo y manda el código limpio', async () => {
    const onConfirmed = vi.fn();
    const gateway = mockGateway({
      'POST /middleware/mfa/session/send': { sent: true, destination: 'a•••@x.y', expiresInSeconds: 600 },
    });
    renderWithI18n(
      <MfaStepUp methods={['email', 'totp']} hasRecovery onConfirmed={onConfirmed} onCancelled={vi.fn()} />
    );
    expect(screen.getByText('Para confirmar, escribe el código de tu aplicación autenticadora.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Correo electrónico/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
    expect(await screen.findByText('Código enviado a a•••@x.y')).toBeInTheDocument();
    expect(gateway.sent('POST', '/middleware/mfa/session/send')[0]!.body).toEqual({ via: 'email' });
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Escribe el código')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Código'), '123 456');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirmed).toHaveBeenCalledWith({ via: 'email', code: '123456' });
    await userEvent.click(screen.getByRole('button', { name: /Código de recuperación/ }));
    expect(screen.getByText('Para confirmar, escribe uno de tus códigos de recuperación.')).toBeInTheDocument();
  });
});

describe('activación obligatoria en el acceso', () => {
  test('activa un método con el reto, muestra los códigos y solo entonces pide la sesión', async () => {
    const onVerified = vi.fn();
    const gateway = mockGateway({
      'POST /middleware/mfa/totp/setup': { secret: 'SECRET', otpauthUri: 'otpauth://x' },
      'POST /middleware/mfa/totp/confirm': { active: true, recoveryCodes: ['r-1', 'r-2'] },
      'POST /middleware/mfa/login/complete': {},
    });
    renderWithI18n(
      <SecondFactor
        step={{
          kind: 'enroll',
          enroll: { mfaEnrollRequired: true, challengeId: 'reto-9', methods: ['totp'], expiresInSeconds: 300 },
        }}
        onVerified={onVerified}
        onCancelled={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: 'Activa la verificación en dos pasos' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Aplicación autenticadora/ }));
    await screen.findByText('SECRET');
    await userEvent.type(screen.getByLabelText('Código'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Activar' }));
    expect(
      await screen.findByText('Método activado. Guarda tus códigos de recuperación antes de entrar.')
    ).toBeInTheDocument();
    expect(onVerified).not.toHaveBeenCalled();
    expect(gateway.sent('POST', '/middleware/mfa/login/complete')).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Ya los guardé' }));
    await waitFor(() => expect(onVerified).toHaveBeenCalled());
    expect(gateway.sent('POST', '/middleware/mfa/login/complete')[0]!.body).toEqual({ challengeId: 'reto-9' });
    expect(gateway.sent('POST', '/middleware/mfa/totp/confirm')[0]!.headers['x-mfa-challenge']).toBe('reto-9');
  });

  test('si el reto caducó vuelve a la contraseña con el mensaje', async () => {
    const onCancelled = vi.fn();
    mockGateway({
      'POST /middleware/mfa/email/setup': { sent: true, destination: 'a•••', expiresInSeconds: 600 },
      'POST /middleware/mfa/email/confirm': { active: true },
      'POST /middleware/mfa/login/complete': {
        status: 401,
        body: { code: 'CHALLENGE_EXPIRED', message: 'El reto caducó' },
      },
    });
    renderWithI18n(
      <SecondFactor
        step={{
          kind: 'enroll',
          enroll: { mfaEnrollRequired: true, challengeId: 'viejo', methods: ['email'], expiresInSeconds: 1 },
        }}
        onVerified={vi.fn()}
        onCancelled={onCancelled}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Correo electrónico/ }));
    await userEvent.type(await screen.findByLabelText('Código'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Activar' }));
    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith('El reto caducó'));
  });
});

describe('perfil', () => {
  test('muestra los métodos con su estado y deja activar uno', async () => {
    const gateway = mockGateway({
      'GET /middleware/mfa/status': status(),
      'GET /middleware/sso/identities': { status: 503, body: {} },
      'POST /middleware/mfa/email/setup': { sent: true, destination: 'a•••', expiresInSeconds: 600 },
    });
    withToasts(<Profile user={person} />);
    expect(await screen.findByText('Aplicación autenticadora')).toBeInTheDocument();
    expect(screen.getByText('No disponible en el servidor')).toBeInTheDocument(); // SMS
    expect(screen.getAllByText('Sin activar')).toHaveLength(2);
    expect(screen.queryByText('Cuentas vinculadas')).toBeNull(); // el SSO apagado no pinta nada
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Activar' })[1]!);
    expect(await screen.findByText(/Te enviamos un código a a•••/)).toBeInTheDocument();
    expect(gateway.sent('POST', '/middleware/mfa/email/setup')).toHaveLength(1);
  });

  test('si la empresa lo exige y solo queda un método, ese no se puede quitar', async () => {
    mockGateway({
      'GET /middleware/mfa/status': status({
        required: true,
        activeCount: 1,
        methods: { totp: method({ active: true }), email: method(), sms: method({ available: false }) },
        recoveryCodesLeft: 3,
      }),
      'GET /middleware/sso/identities': { identities: [] },
    });
    withToasts(<Profile user={person} />);
    expect(await screen.findByText('Tu empresa exige la verificación en dos pasos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeDisabled();
    expect(screen.getByText('Te quedan 3 códigos sin usar')).toBeInTheDocument();
  });

  test('desactivar un método exige un código; el fallo se ve y el éxito avisa', async () => {
    const gateway = mockGateway({
      'GET /middleware/mfa/status': status({
        activeCount: 2,
        methods: {
          totp: method({ active: true }),
          email: method({ active: true, destination: 'a•••@x.y' }),
          sms: method({ available: false }),
        },
        recoveryCodesLeft: 1,
      }),
      'GET /middleware/sso/identities': { identities: [] },
      'DELETE /middleware/mfa/methods/email': (call: Call) =>
        (call.body as { code: string }).code === '111111'
          ? { active: false }
          : { status: 401, body: { code: 'INVALID_CODE', message: 'Código incorrecto' } },
    });
    withToasts(<Profile user={person} />);
    await screen.findByText('a•••@x.y');
    await userEvent.click(screen.getAllByRole('button', { name: 'Desactivar' })[1]!);
    const group = await screen.findByRole('group', { name: 'Activar o desactivar un método' });
    await userEvent.type(within(group).getByLabelText('Código'), '222222');
    await userEvent.click(within(group).getByRole('button', { name: 'Desactivar' }));
    expect(await screen.findByText('Código incorrecto')).toBeInTheDocument();
    await userEvent.clear(within(group).getByLabelText('Código'));
    await userEvent.type(within(group).getByLabelText('Código'), '111111');
    await userEvent.click(within(group).getByRole('button', { name: 'Desactivar' }));
    expect(await screen.findByText('Método desactivado: Correo electrónico')).toBeInTheDocument();
    expect(gateway.sent('DELETE', '/middleware/mfa/methods/email').at(-1)!.body).toEqual({
      via: 'totp',
      code: '111111',
    });
  });

  test('los códigos nuevos se muestran una sola vez', async () => {
    mockGateway({
      'GET /middleware/mfa/status': status({
        activeCount: 1,
        methods: { totp: method({ active: true }), email: method(), sms: method({ available: false }) },
        recoveryCodesLeft: 0,
      }),
      'GET /middleware/sso/identities': { identities: [] },
      'POST /middleware/mfa/recovery-codes/regenerate': { recoveryCodes: ['n-1', 'n-2'] },
    });
    withToasts(<Profile user={person} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Generar nuevos' }));
    await userEvent.type(await screen.findByLabelText('Código'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Generar códigos' }));
    expect(await screen.findByText('Guarda tus códigos de recuperación')).toBeInTheDocument();
    expect(screen.getByText('n-1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ya los guardé' }));
    expect(screen.queryByText('n-1')).toBeNull();
  });

  test('las cuentas vinculadas se desvinculan con confirmación', async () => {
    const gateway = mockGateway({
      'GET /middleware/mfa/status': status(),
      'GET /middleware/sso/identities': {
        identities: [
          { provider: 'google', label: 'Google', email: 'ana@gmail.invalid', linkedAt: '', lastLoginAt: '' },
        ],
      },
      'DELETE /middleware/sso/identities/google': { unlinked: true },
    });
    withToasts(<Profile user={person} />);
    expect(await screen.findByText('ana@gmail.invalid')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Desvincular' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Desvincular' }));
    await waitFor(() => expect(gateway.sent('DELETE', '/middleware/sso/identities/google')).toHaveLength(1));
    expect(await screen.findByText('Cuenta desvinculada: Google')).toBeInTheDocument();
  });
});

describe('seguridad', () => {
  const policy = (over: Record<string, unknown> = {}) => ({
    tenantId: 't1',
    methods: { totp: true, email: true, sms: false },
    required: 'none',
    roles: [],
    available: { totp: true, email: true, sms: false },
    ...over,
  });
  const routes = (extra: Record<string, unknown> = {}) => ({
    'GET /middleware/mfa/policy': policy(),
    'GET /middleware/data/users?page=0&size=100': page([
      { id: 'u1', email: 'ana@example.invalid', firstName: 'Ana', lastName: 'Pérez', role: 'tenant_admin' },
      { id: 'u2', email: 'luis@example.invalid', firstName: null, lastName: null, role: 'agent' },
    ]),
    'GET /middleware/mfa/users': { userIds: ['u1'] },
    'GET /middleware/sso/policy': { status: 503, body: {} },
    'GET /middleware/sso/enterprise': { status: 503, body: {} },
    ...extra,
  });

  test('exigir por roles obliga a elegir al menos uno y guarda solo cuando cambió algo', async () => {
    const gateway = mockGateway(routes({ 'PUT /middleware/mfa/policy': (call: Call) => policy(call.body as Record<string, unknown>) }));
    withToasts(<Security />);
    expect(await screen.findByText('Métodos permitidos')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Guardar cambios' });
    expect(save).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: 'Solo ciertos roles' }));
    expect(screen.getByText('Elige al menos un rol o cambia la obligatoriedad')).toBeInTheDocument();
    expect(save).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Agente' }));
    expect(save).toBeEnabled();
    await userEvent.click(save);
    expect(await screen.findByText('Cambios guardados')).toBeInTheDocument();
    expect(gateway.sent('PUT', '/middleware/mfa/policy')[0]!.body).toEqual({
      methods: { totp: true, email: true, sms: false },
      required: 'roles',
      roles: ['agent'],
    });
  });

  test('exigir con todos los métodos apagados no se puede; un método que el servidor no ofrece no se activa', async () => {
    mockGateway(routes());
    withToasts(<Security />);
    await screen.findByText('Métodos permitidos');
    expect(screen.getByRole('switch', { name: 'Mensaje de texto (SMS)' })).toBeDisabled();
    expect(screen.getByText('El servidor no lo tiene configurado todavía.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Todas las personas de la empresa' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Aplicación autenticadora' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Correo electrónico' }));
    expect(
      screen.getByText('Para exigir el segundo factor hace falta permitir al menos un método')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  test('restablece el segundo factor de quien lo tiene activo, con confirmación', async () => {
    const gateway = mockGateway(routes({ 'POST /middleware/mfa/users/u1/reset': { reset: true } }));
    withToasts(<Security />);
    expect((await screen.findAllByText('luis@example.invalid')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Restablecer' })).toHaveLength(1); // solo Ana lo tiene activo
    await userEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Ana Pérez perderá sus métodos/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Restablecer' }));
    expect(await screen.findByText('Se restableció la verificación en dos pasos de Ana Pérez')).toBeInTheDocument();
    expect(gateway.sent('POST', '/middleware/mfa/users/u1/reset')).toHaveLength(1);
  });

  test('con el SSO del servidor activo permite o impide entrar con él y guarda el proveedor de la empresa', async () => {
    const gateway = mockGateway(
      routes({
        'GET /middleware/sso/policy': {
          tenantId: 't1',
          enabled: false,
          providers: [
            { id: 'google', label: 'Google' },
            { id: 'enterprise', label: 'SSO' },
          ],
        },
        'GET /middleware/sso/enterprise': {
          available: true,
          configured: false,
          name: '',
          issuer: '',
          clientId: '',
          hasSecret: false,
          domains: [],
          redirectUri: 'https://app.example.invalid/gateway/sso/enterprise/callback',
        },
        'PUT /middleware/sso/policy': { tenantId: 't1', enabled: true },
        'PUT /middleware/sso/enterprise': {
          available: true,
          configured: true,
          name: 'Acme',
          issuer: 'https://login.acme.invalid',
          clientId: 'c',
          hasSecret: true,
          domains: ['acme.com'],
          redirectUri: 'x',
        },
      })
    );
    withToasts(<Security />);
    expect(await screen.findByText('Google, SSO de empresa')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: 'Permitir el inicio de sesión único' }));
    expect(await screen.findByText('Inicio de sesión único permitido')).toBeInTheDocument();
    expect(gateway.sent('PUT', '/middleware/sso/policy')[0]!.body).toEqual({ enabled: true });

    expect(screen.getByText('https://app.example.invalid/gateway/sso/enterprise/callback')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar proveedor' }));
    expect((await screen.findAllByText('Este campo es obligatorio')).length).toBeGreaterThanOrEqual(4);
    await userEvent.type(screen.getByLabelText('Nombre'), 'Acme');
    await userEvent.type(screen.getByLabelText('Emisor (URL https)'), 'http://inseguro.invalid');
    await userEvent.type(screen.getByLabelText('Identificador de cliente'), 'c');
    await userEvent.type(screen.getByLabelText('Secreto de cliente'), 's3cr3t');
    await userEvent.type(screen.getByLabelText('Dominios de correo'), 'ACME.com; acme.com, filial.com');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar proveedor' }));
    expect(await screen.findByText('Escribe una dirección https válida')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Emisor (URL https)'));
    await userEvent.type(screen.getByLabelText('Emisor (URL https)'), 'https://login.acme.invalid');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar proveedor' }));
    expect(await screen.findByText('Proveedor guardado')).toBeInTheDocument();
    expect(gateway.sent('PUT', '/middleware/sso/enterprise')[0]!.body).toMatchObject({
      issuer: 'https://login.acme.invalid',
      clientSecret: 's3cr3t',
      domains: ['acme.com', 'filial.com'],
    });
    expect(screen.getByText('Déjalo vacío para conservar el guardado')).toBeInTheDocument();
  });

  test('los dominios se separan por comas, espacios o punto y coma, en minúsculas y sin repetir', () => {
    expect(parseDomains(' A.com,b.com ;A.COM\nc.com ')).toEqual(['a.com', 'b.com', 'c.com']);
    expect(parseDomains('')).toEqual([]);
  });
});
