/** Compatibilidad util.is* del build legacy con Node 24 (FND-001, CA-5/CA-10; §11 2026-11-25). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const util = require('node:util');

// [valor que da true, valor que da false] por predicado, con la semántica de Node <= 22.
const CASES = {
  isArray: [[], {}],
  isBoolean: [false, 0],
  isBuffer: [Buffer.from('x'), 'x'],
  isDate: [new Date(), '2026-01-01'],
  isError: [new Error('x'), { message: 'x' }],
  isFunction: [() => {}, {}],
  isNull: [null, undefined],
  isNullOrUndefined: [undefined, 0],
  isNumber: [1, '1'],
  isObject: [{}, null],
  isPrimitive: ['s', {}],
  isRegExp: [/a/, 'a'],
  isString: ['s', 1],
  isSymbol: [Symbol('s'), 's'],
  isUndefined: [undefined, null],
};

test('[FND-001 CA-10] gulp-node-compat define util.is* con la semántica de Node ≤ 22', () => {
  const compat = require('../../master/gulp-node-compat.cjs');
  assert.deepEqual(Object.keys(compat).sort(), Object.keys(CASES).sort());
  for (const [name, [yes, no]] of Object.entries(CASES)) {
    assert.equal(compat[name](yes), true, `${name}(true)`);
    assert.equal(compat[name](no), false, `${name}(false)`);
  }
  assert.equal(compat.isPrimitive(() => {}), false);
  // Los plugins de Gulp llaman a util.isRegExp / util.isObject: deben existir tras cargar la compat.
  assert.equal(typeof util.isRegExp, 'function');
  assert.equal(util.isRegExp(/a/), true);
  assert.equal(typeof util.isObject, 'function');
  assert.equal(util.isObject(null), false);
});
