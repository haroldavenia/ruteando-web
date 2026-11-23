'use strict';
/**
 * Karma para AngularJS 1.3.15 (FND-001).
 *   npm run test:unit                      suite unitaria (tests/unit)
 *   npm run test:integration               suite de contrato (tests/integration, fixtures reales)
 *   npm run test:unit -- --spec FND-002    solo pruebas cuyo nombre contiene "[FND-002 "
 *   npm run coverage:unit                  + coverage/unit/lcov.info para tools/diff-coverage.mjs
 * Carga angular/angular-mocks 1.3.15 de npm, un módulo `angle` de prueba (tests/helpers/app-shim.js)
 * y solo el código migrado listado en tests/helpers/sources.json (ADR-0005).
 */
const path = require('path');
const sources = require('./tests/helpers/sources.json').files;

function chromeBin() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  try {
    return require('playwright').chromium.executablePath();
  } catch (e) {
    return undefined;
  }
}
process.env.CHROME_BIN = chromeBin() || '';

function specFilter(argv) {
  const i = argv.indexOf('--spec');
  return i >= 0 && argv[i + 1] ? argv[i + 1] : process.env.SPEC || '';
}

module.exports = function (config) {
  const suite = process.env.SUITE === 'integration' ? 'integration' : 'unit';
  const coverage = process.env.COVERAGE === '1';
  const spec = specFilter(process.argv);

  config.set({
    basePath: __dirname,
    frameworks: ['jasmine'],
    files: [
      'node_modules/angular/angular.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'tests/helpers/app-shim.js',
      ...sources,
      'tests/helpers/fixtures.js',
      'tests/helpers/bootstrap.spec.js',
      `tests/${suite}/**/*.spec.js`,
      { pattern: 'tests/fixtures/api-v1/**/*.json', included: false, served: true, watched: false },
    ],
    preprocessors: coverage ? Object.fromEntries(sources.map((f) => [f, ['coverage']])) : {},
    reporters: ['progress', 'junit'].concat(coverage ? ['coverage'] : []),
    junitReporter: { outputDir: 'reports', outputFile: `junit-${suite}.xml`, useBrowserName: false },
    coverageReporter: {
      dir: path.join('coverage', suite),
      subdir: '.',
      reporters: [{ type: 'lcovonly', file: 'lcov.info' }, { type: 'json-summary', file: 'coverage-summary.json' }, { type: 'text-summary' }],
    },
    client: { args: spec ? ['--grep', `[${spec} `] : [], jasmine: { random: false } },
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: { ChromeHeadlessCI: { base: 'ChromeHeadless', flags: ['--no-sandbox'] } },
    singleRun: true,
    browserNoActivityTimeout: 60000,
  });
};
