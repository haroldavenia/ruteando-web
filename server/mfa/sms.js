/**
 * Código por SMS con dos proveedores, elegidos con SMS_PROVIDER:
 *  - `twilio`: Twilio Verify por su API REST (con `fetch`, sin SDK). Twilio genera, envía y comprueba el código y aplica su propio
 *    límite. Hace falta TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_VERIFY_SERVICE_SID; sin ellos el método no se ofrece.
 *  - `dev`: no envía ningún SMS; el texto llega como correo a Mailpit. Nada se escribe en el registro.
 * Sin SMS_PROVIDER válido, o sin las credenciales, `available` es `false` y nunca se llama a ningún proveedor.
 */
const { createCodeStore } = require('./codes');
const { smsDevEmail } = require('./email-templates');

const PHONE = /^\+[1-9]\d{7,14}$/;

/** Teléfono en formato internacional (E.164): `+573001234567`. */
function isValidPhone(phone) {
  return PHONE.test(String(phone || ''));
}

/** `+573001234567` -> `+57•••••4567`: lo único que se devuelve al navegador. */
function maskPhone(phone) {
  const p = String(phone || '');
  return p.length > 7 ? `${p.slice(0, 3)}•••••${p.slice(-4)}` : '•••••';
}

function createTwilio(env, fetchImpl) {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const service = env.TWILIO_VERIFY_SERVICE_SID;
  const base = `https://verify.twilio.com/v2/Services/${encodeURIComponent(service)}`;
  const headers = {
    Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  async function post(path, params) {
    // El cuerpo de error de Twilio no se propaga: podría citar el número o la cuenta
    const res = await fetchImpl(`${base}/${path}`, {
      method: 'POST',
      headers,
      body: new URLSearchParams(params).toString(),
    });
    if (!res.ok && res.status !== 404) throw new Error(`Twilio respondió ${res.status}`);
    return res.ok ? res.json() : null;
  }
  return {
    name: 'twilio',
    async sendCode(phone) {
      await post('Verifications', { To: phone, Channel: 'sms' });
    },
    async checkCode(phone, code) {
      const out = await post('VerificationCheck', { To: phone, Code: String(code || '').replace(/\s/g, '') });
      return out?.status === 'approved';
    },
  };
}

function createDev({ mailer, codec, now }) {
  const store = createCodeStore({ codec, now });
  return {
    name: 'dev',
    async sendCode(phone) {
      const code = store.issue('sms:' + phone);
      const digits = phone.replace(/\D/g, '');
      await mailer.send({
        to: `sms+${digits}@sms.ruteando.local`,
        ...smsDevEmail({ code, maskedPhone: maskPhone(phone) }),
      });
    },
    async checkCode(phone, code) {
      return store.check('sms:' + phone, code);
    },
  };
}

/** Devuelve `{ available, provider, sendCode, checkCode }`; los dos últimos solo existen si `available`. */
function createSms({ env = process.env, mailer, codec, now = Date.now, fetchImpl = fetch } = {}) {
  const choice = (env.SMS_PROVIDER || '').trim().toLowerCase();
  if (choice === 'twilio') {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SERVICE_SID) {
      return { available: true, provider: 'twilio', ...createTwilio(env, fetchImpl) };
    }
    return { available: false, provider: 'twilio', reason: 'Faltan las credenciales de Twilio' };
  }
  if (choice === 'dev') {
    if (!mailer?.available) return { available: false, provider: 'dev', reason: 'El proveedor dev necesita SMTP' };
    return { available: true, provider: 'dev', ...createDev({ mailer, codec, now }) };
  }
  return { available: false, provider: null, reason: 'SMS_PROVIDER no es twilio ni dev' };
}

module.exports = { createSms, isValidPhone, maskPhone };
