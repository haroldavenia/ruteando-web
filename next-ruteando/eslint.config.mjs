// ESLint 9 (flat config) de `next-ruteando/`. Se ejecuta desde esta carpeta (`pnpm lint`); el ESLint de la raíz es el del frontend
// Angular y lo ignora. Reglas de Next (rendimiento y accesibilidad), TypeScript, orden de imports y las de Tailwind v4.
// Convención heredada del resto del repositorio: un `eslint-disable` lleva siempre su motivo (`-- por qué`).
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import tailwind from 'eslint-plugin-better-tailwindcss';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default defineConfig([
  globalIgnores(['.next/**', 'coverage/**', 'data/**', 'next-env.d.ts']),
  js.configs.recommended,
  ...nextVitals,
  ...nextTs,
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'no-eval': 'error',
      // El servidor registra solo errores y avisos (nunca datos de personas: ver lib/mfa/service.ts)
      'no-console': ['error', { allow: ['error', 'warn'] }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Clases de Tailwind v4 (la hoja de tokens es la fuente de verdad: una clase que no exista en ella es un error)
    files: ['**/*.{ts,tsx}'],
    ...tailwind.configs['recommended-error'],
    settings: { 'better-tailwindcss': { entryPoint: 'app/globals.css' } },
    rules: {
      ...tailwind.configs['recommended-error'].rules,
      // El orden y el ajuste de línea los pone prettier-plugin-tailwindcss y Prettier: dos autoridades se pelearían
      'better-tailwindcss/enforce-consistent-class-order': 'off',
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
    },
  },
  {
    // Las pruebas ensayan entradas hostiles y simulan módulos: `any` y `console` son normales ahí
    files: ['test/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off', 'no-console': 'off' },
  },
  prettier,
]);
