// Almacén SQLite del segundo factor: esquema, política por defecto, factores, códigos de recuperación y reinicio.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openStore } = require('../mfa/store');

test('crea el esquema, lo reabre sin perder datos y no lo migra dos veces', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mfa-store-'));
  const file = path.join(dir, 'sub', 'mfa.sqlite');
  try {
    const a = openStore(file);
    assert.equal(a.schemaVersion(), 1);
    a.putFactor({ userId: 'u1', tenantId: 't1', type: 'totp', secretEnc: 'xx', verified: true });
    a.close();
    const b = openStore(file);
    assert.equal(b.schemaVersion(), 1);
    assert.equal(b.getFactor('u1', 'totp').verified, true);
    b.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('sin política guardada, todo está permitido y nada es obligatorio', () => {
  const s = openStore(':memory:');
  assert.deepEqual(s.getPolicy('t1'), {
    tenantId: 't1',
    methods: { email: true, sms: true, totp: true },
    required: 'none',
    roles: [],
  });
});

test('guarda y actualiza la política por empresa sin mezclar empresas', () => {
  const s = openStore(':memory:');
  s.setPolicy({
    tenantId: 't1',
    methods: { email: true, sms: false, totp: true },
    required: 'roles',
    roles: ['agent'],
  });
  s.setPolicy({ tenantId: 't1', methods: { email: false, sms: false, totp: true }, required: 'all', roles: [] });
  assert.deepEqual(s.getPolicy('t1').methods, { email: false, sms: false, totp: true });
  assert.equal(s.getPolicy('t1').required, 'all');
  assert.equal(s.getPolicy('t2').required, 'none');
});

test('un factor se crea, se actualiza, guarda el último paso y se borra', () => {
  const s = openStore(':memory:');
  s.putFactor({ userId: 'u1', tenantId: 't1', type: 'sms', destination: '+573001234567', verified: false });
  assert.equal(s.getFactor('u1', 'sms').verified, false);
  s.putFactor({ userId: 'u1', tenantId: 't1', type: 'sms', destination: '+573001234567', verified: true });
  s.putFactor({ userId: 'u1', tenantId: 't1', type: 'totp', secretEnc: 'cifrado', verified: true });
  s.setLastStep('u1', 'totp', 42);
  assert.equal(s.getFactors('u1').length, 2);
  assert.equal(s.getFactor('u1', 'totp').lastStep, 42);
  assert.deepEqual(s.usersWithFactors('t1'), ['u1']);
  s.deleteFactor('u1', 'sms');
  assert.equal(s.getFactor('u1', 'sms'), null);
  assert.equal(s.getFactors('u2').length, 0);
});

test('los códigos de recuperación se sustituyen, se gastan una vez y se cuentan', () => {
  const s = openStore(':memory:');
  s.replaceRecoveryCodes('u1', ['h1', 'h2', 'h3']);
  assert.equal(s.recoveryCodesLeft('u1'), 3);
  assert.equal(s.consumeRecoveryCode('u1', 'h1'), true);
  assert.equal(s.consumeRecoveryCode('u1', 'h1'), false, 'no se reutiliza');
  assert.equal(s.consumeRecoveryCode('u1', 'nope'), false);
  assert.equal(s.consumeRecoveryCode('u2', 'h2'), false, 'no vale de otra persona');
  assert.equal(s.recoveryCodesLeft('u1'), 2);
  s.replaceRecoveryCodes('u1', ['n1']);
  assert.equal(s.consumeRecoveryCode('u1', 'h2'), false, 'los anteriores dejan de valer');
  assert.equal(s.recoveryCodesLeft('u1'), 1);
});

test('restablecer a una persona borra sus factores y códigos y deja a las demás', () => {
  const s = openStore(':memory:');
  for (const u of ['u1', 'u2']) {
    s.putFactor({ userId: u, tenantId: 't1', type: 'totp', secretEnc: 'x', verified: true });
    s.replaceRecoveryCodes(u, ['a', 'b']);
  }
  s.resetUser('u1');
  assert.equal(s.getFactors('u1').length, 0);
  assert.equal(s.recoveryCodesLeft('u1'), 0);
  assert.equal(s.getFactors('u2').length, 1);
  assert.equal(s.recoveryCodesLeft('u2'), 2);
});

test('los eventos se registran con persona, empresa y tipo', () => {
  const s = openStore(':memory:', { now: () => new Date('2026-11-09T12:00:00Z') });
  s.addEvent({ userId: 'u1', tenantId: 't1', kind: 'totp_enabled' });
  s.addEvent({ userId: 'u1', tenantId: 't1', kind: 'login_failed', detail: 'totp' });
  const events = s.events('u1');
  assert.deepEqual(
    events.map((e) => e.kind),
    ['login_failed', 'totp_enabled']
  );
  assert.equal(events[0].at, '2026-11-09T12:00:00.000Z');
});
