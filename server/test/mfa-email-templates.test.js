const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { codeEmail, smsDevEmail } = require('../mfa/email-templates');

test('el correo del código conserva el texto plano y pone el código en el HTML', () => {
  const m = codeEmail({ code: '482913', to: 'ana@example.invalid' });
  assert.equal(m.subject, 'Tu código de verificación');
  assert.match(m.text, /es (\d{6})\. Caduca en 5 minutos/);
  assert.ok(m.html.includes('>482913<'));
  assert.ok(m.html.includes('ana@example.invalid'));
  assert.ok(m.html.includes('cid:ruteando-logo'));
  assert.ok(!/<div style="display:none[^>]*>[^<]*482913/.test(m.html), 'el código no va en el resumen de la bandeja');
});

test('los valores variables se escapan y no se cuela HTML', () => {
  const m = codeEmail({ code: '1', to: '"><script>alert(1)</script>@x.invalid', issuer: '<b>X</b>' });
  assert.ok(!m.html.includes('<script>'));
  assert.ok(!m.html.includes('<b>X</b>'));
  const s = smsDevEmail({ code: '2', maskedPhone: '<i>+57</i>' });
  assert.ok(!s.html.includes('<i>+57</i>'));
});

test('el SMS de desarrollo se marca como simulación y el logo adjunto existe', () => {
  const s = smsDevEmail({ code: '654321', maskedPhone: '+57•••••4567' });
  assert.equal(s.subject, 'SMS para +57•••••4567');
  assert.match(s.text, /654321/);
  assert.match(s.html, /Simulación de desarrollo/);
  for (const a of s.attachments) assert.ok(fs.existsSync(a.path), a.path);
});
