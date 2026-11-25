/** Compatibilidad util.is* del build legacy con Node 24 (FND-001, CA-5/CA-10; §11 2026-11-25). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const util = require('node:util');

test('[FND-001 CA-10] gulp-node-compat define util.is* con la semántica de Node ≤ 22', () => {
  const compat = require('../../master/gulp-node-compat.cjs');
  for (const name of Object.keys(compat)) assert.equal(typeof util[name], 'function', `util.${name}`);
  assert.equal(util.isRegExp(/a/), true);
  assert.equal(util.isRegExp('a'), false);
  assert.equal(util.isObject({}), true);
  assert.equal(util.isObject(null), false);
  assert.equal(util.isArray([]), true);
  assert.equal(compat.isBoolean(false), true);
  assert.equal(compat.isBuffer(Buffer.from('x')), true);
  assert.equal(compat.isDate(new Date()), true);
  assert.equal(compat.isError(new Error('x')), true);
  assert.equal(compat.isFunction(() => {}), true);
  assert.equal(compat.isNull(null), true);
  assert.equal(compat.isNullOrUndefined(undefined), true);
  assert.equal(compat.isNullOrUndefined(0), false);
  assert.equal(compat.isNumber(1), true);
  assert.equal(compat.isPrimitive('s'), true);
  assert.equal(compat.isPrimitive({}), false);
  assert.equal(compat.isPrimitive(() => {}), false);
  assert.equal(compat.isString('s'), true);
  assert.equal(compat.isSymbol(Symbol('s')), true);
  assert.equal(compat.isUndefined(undefined), true);
});
