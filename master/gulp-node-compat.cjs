/**
 * Compatibilidad del build legacy con Node 24 LTS (FND-001, §11 del 2026-11-25).
 * Los plugins de Gulp de 2015 (gulp-minify-css y otros) usan util.isRegExp, util.isObject, …,
 * eliminados en Node 23. Solo los define si faltan y solo en el proceso de Gulp: no cambia la app
 * ni lo que genera el build. Retirar cuando se actualicen o sustituyan esos plugins.
 */
'use strict';
const util = require('util');

const compat = {
  isArray: Array.isArray,
  isBoolean: (v) => typeof v === 'boolean',
  isBuffer: (v) => Buffer.isBuffer(v),
  isDate: (v) => v instanceof Date,
  isError: (v) => v instanceof Error,
  isFunction: (v) => typeof v === 'function',
  isNull: (v) => v === null,
  isNullOrUndefined: (v) => v === null || v === undefined,
  isNumber: (v) => typeof v === 'number',
  isObject: (v) => v !== null && typeof v === 'object',
  isPrimitive: (v) => v === null || (typeof v !== 'object' && typeof v !== 'function'),
  isRegExp: (v) => v instanceof RegExp,
  isString: (v) => typeof v === 'string',
  isSymbol: (v) => typeof v === 'symbol',
  isUndefined: (v) => v === undefined,
};

for (const [name, fn] of Object.entries(compat)) {
  if (typeof util[name] !== 'function') util[name] = fn;
}

module.exports = compat;
