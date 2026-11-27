/**
 * Código por SMS con dos proveedores, elegidos con SMS_PROVIDER:
 *  - `twilio`: Twilio Verify por su API REST (con `fetch`, sin SDK). Twilio genera, envía y comprueba el código y aplica su propio
 *    límite. Hace falta TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_VERIFY_SERVICE_SID; sin ellos el método no se ofrece.
 *  - `dev`: no envía ningún SMS; el texto llega como correo a Mailpit. Nada se escribe en el registro.
 * Sin SMS_PROVIDER válido, o sin las credenciales, `available` es `false` y nunca se llama a ningún proveedor.
 */
import { createCodeStore } from './codes';
import type { Codec } from './crypto';
import { smsDevEmail } from './email-templates';
import type { Mailer } from './mailer';

const PHONE = /^\+[1-9]\d{7,14}$/;

type Env = Record<string, string | undefined>;
type FetchLike = typeof fetch;

export interface Sms {
  available: boolean;
  provider: 'twilio' | 'dev' | null;
  reason?: string;
  sendCode?(phone: string): Promise<void>;
  checkCode?(phone: string, code: unknown): Promise<boolean>;
}

/** Teléfono en formato internacional (E.164): `+573001234567`. */
export const isValidPhone = (phone: unknown) => PHONE.test(String(phone || ''));

/** `+573001234567` -> `+57•••••4567`: lo único que se devuelve al navegador. */
export function maskPhone(phone: unknown): string {
  const p = String(phone || '');
  return p.length > 7 ? `${p.slice(0, 3)}•••••${p.slice(-4)}` : '•••••';
}

function createTwilio(env: Env, fetchImpl: FetchLike) {
  const base = `https://verify.twilio.com/v2/Services/${encodeURIComponent(env.TWILIO_VERIFY_SERVICE_SID!)}`;
  const headers = {
    Authorization: 'Basic ' + Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64'),
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  async function post(path: string, params: Record<string, string>) {
    // El cuerpo de error de Twilio no se propaga: podría citar el número o la cuenta
    const res = await fetchImpl(`${base}/${path}`, {
      method: 'POST',
      headers,
      body: new URLSearchParams(params).toString(),
    });
    if (!res.ok && res.status !== 404) throw new Error(`Twilio respondió ${res.status}`);
    return res.ok ? ((await res.json()) as { status?: string }) : null;
  }
  return {
    async sendCode(phone: string) {
      await post('Verifications', { To: phone, Channel: 'sms' });
    },
    async checkCode(phone: string, code: unknown) {
      const out = await post('VerificationCheck', { To: phone, Code: String(code || '').replace(/\s/g, '') });
      return out?.status === 'approved';
    },
  };
}

function createDev({ mailer, codec, now }: { mailer: Mailer; codec: Codec; now: () => number }) {
  const store = createCodeStore({ codec, now });
  return {
    async sendCode(phone: string) {
      const code = store.issue('sms:' + phone);
      await mailer.send({
        to: `sms+${phone.replace(/\D/g, '')}@sms.ruteando.local`,
        ...smsDevEmail({ code, maskedPhone: maskPhone(phone) }),
      });
    },
    checkCode: async (phone: string, code: unknown) => store.check('sms:' + phone, code),
  };
}

export function createSms({
  env = process.env,
  mailer,
  codec,
  now = Date.now,
  fetchImpl = fetch,
}: {
  env?: Env;
  mailer: Mailer;
  codec: Codec;
  now?: () => number;
  fetchImpl?: FetchLike;
}): Sms {
  const choice = (env.SMS_PROVIDER || '').trim().toLowerCase();
  if (choice === 'twilio') {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SERVICE_SID) {
      return { available: true, provider: 'twilio', ...createTwilio(env, fetchImpl) };
    }
    return { available: false, provider: 'twilio', reason: 'Faltan las credenciales de Twilio' };
  }
  if (choice === 'dev') {
    if (!mailer.available) return { available: false, provider: 'dev', reason: 'El proveedor dev necesita SMTP' };
    return { available: true, provider: 'dev', ...createDev({ mailer, codec, now }) };
  }
  return { available: false, provider: null, reason: 'SMS_PROVIDER no es twilio ni dev' };
}
