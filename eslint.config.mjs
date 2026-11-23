// ESLint (flat config) sin plugins: reglas núcleo, para no añadir dependencias.
// En CI se aplica solo a las líneas cambiadas del PR (tools/lint-diff.mjs, docs/engineering/calidad-y-ci.md).
const g = (names) => Object.fromEntries(names.map((n) => [n, 'readonly']));

const nodeGlobals = g(['require', 'module', 'exports', '__dirname', '__filename', 'process', 'console', 'Buffer',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'URL', 'global', 'globalThis',
  'fetch', 'FormData', 'Blob', 'AbortSignal', 'structuredClone']);

const browserGlobals = g(['window', 'document', 'navigator', 'console', 'setTimeout', 'clearTimeout', 'setInterval',
  'clearInterval', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'location', 'JSON', 'Infinity', 'URL', 'Blob']);

// AngularJS 1.3: el módulo vive en el global `App` (master/js/app.init.js) y se concatena con Gulp.
const angularGlobals = { ...g(['angular', '$', 'jQuery', 'ol', 'moment', '_']), App: 'readonly' };
const jasmineGlobals = g(['describe', 'it', 'expect', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'jasmine',
  'spyOn', 'module', 'inject', 'fixture', 'fixtureBody', 'fail', 'pending']);

const core = {
  'no-undef': 'error',
  'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' }],
  'no-redeclare': 'error',
  'no-dupe-keys': 'error',
  'no-unreachable': 'error',
  'no-constant-condition': 'error',
  'no-empty': 'error',
  'no-fallthrough': 'error',
  'no-self-compare': 'error',
  eqeqeq: ['error', 'always', { null: 'ignore' }],
};

export default [
  { ignores: ['**/node_modules/**', '**/bower_components/**', 'app/**', 'vendor/**', 'coverage/**', 'reports/**', 'test-results/**', 'docs/ui/maquetas/**'] },
  // Código AngularJS (ES5, scripts concatenados)
  {
    files: ['master/js/**/*.js', 'tests/helpers/**/*.js'],
    languageOptions: { ecmaVersion: 5, sourceType: 'script', globals: { ...browserGlobals, ...angularGlobals } },
    rules: { ...core, strict: 'off', 'no-var': 'off' },
  },
  // Pruebas Karma
  {
    files: ['tests/unit/**/*.js', 'tests/integration/**/*.js', 'tests/helpers/**/*.spec.js'],
    languageOptions: { ecmaVersion: 5, sourceType: 'script', globals: { ...browserGlobals, ...angularGlobals, ...jasmineGlobals } },
    rules: { ...core, 'no-var': 'off' },
  },
  // Node (servidor, herramientas, E2E, mock-api)
  {
    files: ['server/**/*.js', '*.cjs', 'tools/**/*.mjs', 'tests/**/*.mjs', '*.mjs', 'karma.conf.cjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'commonjs', globals: nodeGlobals },
    rules: { ...core, 'no-var': 'error', 'prefer-const': 'error' },
  },
  { files: ['**/*.mjs'], languageOptions: { sourceType: 'module' } },
  // El módulo de prueba declara el global App (master/js/app.init.js en la app real)
  { files: ['tests/helpers/app-shim.js'], rules: { 'no-redeclare': 'off' } },
  // Código heredado del servidor: se retira en CIE-001
  { files: ['server/legacy-satellizer.js', 'server/config.js'], rules: { 'no-var': 'off', 'prefer-const': 'off', eqeqeq: 'off', 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }] } },
];
