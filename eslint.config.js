// @ts-check
// ESLint 9 (flat config) para el frontend Angular (`ng-ruteando/`). Guía: openspec/changes/add-lint-format/.
// `server/` y `scripts/` (JavaScript de Node) no tienen reglas propias; solo los cubre Prettier.
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const importPlugin = require('eslint-plugin-import');

module.exports = tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.angular/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/out-tsc/**',
      'ng-ruteando/src/testing/fixtures/**',
      'qa-visual/**',
      '.claude/**',
      'openspec/**',
    ],
  },

  // ---------- TypeScript ----------
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
      prettier,
    ],
    processor: angular.processInlineTemplates,
    plugins: {
      'simple-import-sort': simpleImportSort,
      import: importPlugin,
    },
    rules: {
      // Selectores de Angular (prefijo `app`)
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],

      // Orden de imports
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // efectos secundarios (polyfills, zone, etc.)
            ['^\\u0000'],
            // Angular primero, luego el resto de paquetes externos
            ['^@angular', '^rxjs', '^@?\\w'],
            // alias internos del tsconfig
            ['^@/', '^@app', '^@env', '^@shared', '^@core'],
            // relativos
            ['^\\.\\./', '^\\./'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',

      // Buenas prácticas
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'prefer-promise-reject-errors': 'error',
      'no-return-await': 'error',
      'no-console': ['warn', { allow: ['info', 'error', 'warn'] }],

      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // ---------- Plantillas HTML ----------
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility, prettier],
    rules: {},
  },

  // ---------- Pruebas ----------
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
);
