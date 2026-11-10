// Canales de envío del segundo factor: correo por SMTP (contra un SMTP de prueba local), códigos de un solo uso y SMS (Twilio simulado y
// proveedor de desarrollo).
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const net = require('node:net');
const { createCrypto } = require('../mfa/crypto');
const { createCodeStore } = require('../mfa/codes');
const { createMailer } = require('../mfa/mailer');
const { createSms, isValidPhone, maskPhone } = require('../mfa/sms');

const codec = createCrypto(crypto.randomBytes(32));

/** SMTP mínimo: acepta un mensaje y lo guarda. Devuelve { port, messages, close }. */
function fakeSmtp() {
  const messages = [];
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    let data = false;
    let body = '';
    let buffer = '';
    socket.write('220 fake ESMTP\r\n');
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let idx;
      while ((idx = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (data) {
          if (line === '.') {
            data = false;
            messages.push(body);
            body = '';
            socket.write('250 queued\r\n');
          } else {
            body += line + '\n';
          }
        } else if (/^(EHLO|HELO)/i.test(line)) socket.write('250 fake\r\n');
        else if (/^(MAIL|RCPT|RSET|NOOP)/i.test(line)) socket.write('250 ok\r\n');
        else if (/^DATA/i.test(line)) {
          data = true;
          socket.write('354 go\r\n');
        } else if (/^QUIT/i.test(line)) {
          socket.write('221 bye\r\n');
          socket.end();
        } else socket.write('502 no\r\n');
      }
    });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({
        port: server.address().port,
        messages,
        close: () => {
          sockets.forEach((s) => s.destroy());
          server.close();
        },
      })
    )
  );
}

const smtps = [];
after(() => smtps.forEach((s) => s.close()));

test('el correo se envía por SMTP y no escribe el contenido en el registro', async () => {
  const smtp = await fakeSmtp();
  smtps.push(smtp);
  const mailer = createMailer({ SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.port) });
  assert.equal(mailer.available, true);
  const logged = [];
  const originals = ['log', 'info', 'warn', 'error'].map((k) => [k, console[k]]);
  originals.forEach(([k]) => (console[k] = (...args) => logged.push(args.join(' '))));
  try {
    await mailer.send({ to: 'ana@example.invalid', subject: 'Tu código', text: 'Código 123456' });
  } finally {
    originals.forEach(([k, fn]) => (console[k] = fn));
  }
  assert.equal(smtp.messages.length, 1);
  assert.match(smtp.messages[0], /Subject: =\?UTF-8\?Q\?Tu_c/); // el asunto con tilde viaja codificado
  assert.match(smtp.messages[0], /123456/);
  assert.ok(!logged.join('\n').includes('123456'), 'el código no aparece en el registro');
});

test('sin SMTP_HOST no hay correo y enviar falla sin intentar nada', async () => {
  const mailer = createMailer({});
  assert.equal(mailer.available, false);
  await assert.rejects(() => mailer.send({ to: 'a@b.invalid', subject: 's', text: 't' }));
});

test('un código de un solo uso se gasta al acertar, no al fallar, y caduca', () => {
  let t = 1_000;
  const store = createCodeStore({ codec, now: () => t });
  const code = store.issue('u1:email');
  assert.match(code, /^\d{6}$/);
  assert.equal(store.check('u1:email', '000000' === code ? '111111' : '000000'), false);
  assert.equal(store.check('u2:email', code), false, 'otra clave no sirve');
  assert.equal(store.check('u1:email', ` ${code.slice(0, 3)} ${code.slice(3)} `), true, 'tolera espacios');
  assert.equal(store.check('u1:email', code), false, 'ya gastado');
  const second = store.issue('u1:email');
  t += 5 * 60 * 1000;
  assert.equal(store.check('u1:email', second), false, 'caducado a los 5 minutos');
  const third = store.issue('u1:email');
  assert.notEqual(store.issue('u1:email'), third, 'emitir otro sustituye al anterior');
  assert.equal(store.check('u1:email', third), false);
});

test('los teléfonos se validan en formato internacional y se enmascaran', () => {
  assert.equal(isValidPhone('+573001234567'), true);
  for (const bad of ['3001234567', '+0123456789', '+57 300 123', '+5730012345678901', '', null]) {
    assert.equal(isValidPhone(bad), false, String(bad));
  }
  assert.equal(maskPhone('+573001234567'), '+57•••••4567');
  assert.ok(!maskPhone('+573001234567').includes('300123'));
});

test('sin proveedor, o sin credenciales de Twilio, SMS no está disponible y no se llama a nadie', () => {
  let calls = 0;
  const fetchImpl = async () => void calls++;
  assert.equal(createSms({ env: {}, codec, fetchImpl }).available, false);
  assert.equal(createSms({ env: { SMS_PROVIDER: 'otro' }, codec, fetchImpl }).available, false);
  const incomplete = createSms({ env: { SMS_PROVIDER: 'twilio', TWILIO_ACCOUNT_SID: 'AC1' }, codec, fetchImpl });
  assert.equal(incomplete.available, false);
  assert.equal(incomplete.sendCode, undefined);
  assert.equal(
    createSms({ env: { SMS_PROVIDER: 'dev' }, codec, mailer: { available: false }, fetchImpl }).available,
    false
  );
  assert.equal(calls, 0);
});

test('Twilio Verify: envía y comprueba con autenticación básica y sin filtrar el cuerpo de error', async () => {
  const requests = [];
  const answers = [
    { ok: true, status: 201, json: async () => ({ status: 'pending' }) },
    { ok: true, status: 200, json: async () => ({ status: 'approved' }) },
    { ok: true, status: 200, json: async () => ({ status: 'pending' }) },
    { ok: false, status: 429, json: async () => ({ message: 'detalle con +573001234567' }) },
  ];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    return answers.shift();
  };
  const sms = createSms({
    env: {
      SMS_PROVIDER: 'twilio',
      TWILIO_ACCOUNT_SID: 'ACxxx',
      TWILIO_AUTH_TOKEN: 'tok',
      TWILIO_VERIFY_SERVICE_SID: 'VAyyy',
    },
    codec,
    fetchImpl,
  });
  assert.equal(sms.available, true);
  await sms.sendCode('+573001234567');
  assert.equal(requests[0].url, 'https://verify.twilio.com/v2/Services/VAyyy/Verifications');
  assert.equal(requests[0].init.headers.Authorization, 'Basic ' + Buffer.from('ACxxx:tok').toString('base64'));
  assert.equal(requests[0].init.body, 'To=%2B573001234567&Channel=sms');
  assert.equal(await sms.checkCode('+573001234567', '123 456'), true);
  assert.equal(requests[1].url, 'https://verify.twilio.com/v2/Services/VAyyy/VerificationCheck');
  assert.equal(requests[1].init.body, 'To=%2B573001234567&Code=123456');
  assert.equal(await sms.checkCode('+573001234567', '000000'), false, 'pendiente no es aprobado');
  await assert.rejects(
    () => sms.sendCode('+573001234567'),
    (err) => err.message === 'Twilio respondió 429' && !err.message.includes('+57')
  );
});

test('proveedor dev: el código llega como correo a Mailpit y nunca al registro', async () => {
  const smtp = await fakeSmtp();
  smtps.push(smtp);
  const mailer = createMailer({ SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.port) });
  const sms = createSms({ env: { SMS_PROVIDER: 'dev' }, codec, mailer });
  assert.equal(sms.available, true);
  assert.equal(sms.provider, 'dev');
  const logged = [];
  const original = console.log;
  console.log = (...args) => logged.push(args.join(' '));
  try {
    await sms.sendCode('+573001234567');
  } finally {
    console.log = original;
  }
  assert.equal(smtp.messages.length, 1);
  const code = smtp.messages[0].match(/es (\d{6})\./)[1];
  assert.equal(await sms.checkCode('+573001234567', '999999' === code ? '111111' : '999999'), false);
  assert.equal(await sms.checkCode('+573001234567', code), true);
  assert.equal(await sms.checkCode('+573001234567', code), false, 'de un solo uso');
  assert.ok(!logged.join('\n').includes(code));
});
