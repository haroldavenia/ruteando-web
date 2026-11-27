// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

import { describe, expect, test } from 'vitest';

import { cn } from '@/lib/cn';
import { DEFAULT_LANGUAGE, isLanguage, LANGUAGES, makeT, translate } from '@/lib/i18n/core';
import { EN } from '@/lib/i18n/dictionaries/en';
import { PT } from '@/lib/i18n/dictionaries/pt';
import { dictionaryOf } from '@/lib/i18n/dictionary';
import { isTheme, themeAttribute, THEMES } from '@/lib/theme';

describe('translate', () => {
  const dict = { Guardar: 'Save', 'Inicio||hora': 'Start', Inicio: 'Home', '{0} de {1}': '{0} of {1}' };

  test('traduce, y sin traducción devuelve el propio texto (nunca falla ni deja huecos)', () => {
    expect(translate(dict, 'Guardar')).toBe('Save');
    expect(translate(dict, 'Texto sin traducir')).toBe('Texto sin traducir');
    expect(translate({}, 'Guardar')).toBe('Guardar'); // español: sin diccionario
  });

  test('el contexto separa sentidos distintos del mismo texto español', () => {
    expect(translate(dict, 'Inicio||hora')).toBe('Start');
    expect(translate(dict, 'Inicio')).toBe('Home');
    expect(translate({}, 'Inicio||hora')).toBe('Inicio'); // en español se ve sin el contexto
  });

  test('marcadores {0}, {1}: se sustituyen, y uno sin valor se deja a la vista', () => {
    expect(translate(dict, '{0} de {1}', ['a', 3])).toBe('a of 3');
    expect(translate(dict, '{0} de {1}', ['a'])).toBe('a of {1}');
    expect(translate({}, '{0} eventos', [5])).toBe('5 eventos');
  });

  test('un valor no se interpreta como marcador (no hay inyección de plantillas)', () => {
    expect(translate(dict, '{0} de {1}', ['{1}', 'x'])).toBe('{1} of x');
  });

  test('makeT ata el diccionario', () => {
    expect(makeT(dict)('Guardar')).toBe('Save');
  });
});

describe('idiomas', () => {
  test('inglés por defecto; tres idiomas; validación de la cookie', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
    expect(LANGUAGES).toEqual(['en', 'es', 'pt']);
    expect(isLanguage('pt')).toBe(true);
    for (const bad of ['fr', 'EN', '', undefined, null, 5]) expect(isLanguage(bad)).toBe(false);
  });

  test('dictionaryOf: el español no tiene diccionario', () => {
    expect(dictionaryOf('en')).toBe(EN);
    expect(dictionaryOf('pt')).toBe(PT);
    expect(dictionaryOf('es')).toEqual({});
  });
});

describe('diccionarios', () => {
  const markers = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort().join(',');

  test('inglés y portugués tienen exactamente las mismas claves', () => {
    const en = Object.keys(EN);
    const pt = Object.keys(PT);
    expect(en.filter((k) => !(k in PT))).toEqual([]);
    expect(pt.filter((k) => !(k in EN))).toEqual([]);
  });

  test('cada traducción conserva los marcadores del texto fuente', () => {
    const wrong = (dict: Record<string, string>) =>
      Object.entries(dict)
        .filter(([key, value]) => markers(key) !== markers(value))
        .map(([key]) => key);
    expect(wrong(EN)).toEqual([]);
    expect(wrong(PT)).toEqual([]);
  });

  test('ninguna traducción está vacía', () => {
    expect(Object.entries(EN).filter(([, v]) => !v.trim())).toEqual([]);
    expect(Object.entries(PT).filter(([, v]) => !v.trim())).toEqual([]);
  });
});

describe('textos del código', () => {
  const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  // Los diccionarios y el propio núcleo mencionan `t('…')` en comentarios; las pruebas usan textos de ejemplo
  const files = ['app', 'components', 'lib']
    .flatMap((d) => walk(join(root, d)))
    .filter((f) => /\.tsx?$/.test(f) && !f.includes(`${sep}i18n${sep}`));

  test("cada texto que pasa por t('…') tiene traducción al inglés y al portugués", () => {
    const missing: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/(?<![\w.$])t\(\s*'((?:[^'\\\n]|\\.)*)'/g)) {
        const key = m[1].replace(/\\(['\\])/g, '$1');
        if (!(key in EN) || !(key in PT)) missing.push(`${file.slice(root.length)}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test('los textos de los componentes que se pasan como variable también están traducidos', () => {
    // `t(label)` no se puede leer del código: se listan aquí (theme-toggle.tsx y language-toggle.tsx)
    for (const key of [
      'Tema claro',
      'Tema del sistema',
      'Tema oscuro',
      'Tema de color',
      'Idioma',
      'Cerrar',
      'Cargando…',
    ]) {
      expect(EN[key], key).toBeTruthy();
      expect(PT[key], key).toBeTruthy();
    }
  });
});

describe('tema y cn', () => {
  test('tema: tres valores, «sistema» no pone atributo', () => {
    expect(THEMES).toEqual(['light', 'system', 'dark']);
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('auto')).toBe(false);
    expect(themeAttribute('dark')).toBe('dark');
    expect(themeAttribute('light')).toBe('light');
    expect(themeAttribute('system')).toBeUndefined();
  });

  test('cn resuelve conflictos, también con los valores propios de @theme', () => {
    expect(cn('px-4', false, 'px-6')).toBe('px-6');
    expect(cn('rounded-lg', 'rounded-control')).toBe('rounded-control');
    expect(cn('text-primary', 'text-on-surface')).toBe('text-on-surface');
    expect(cn('shadow-md', 'shadow-card')).toBe('shadow-card');
    expect(cn('font-sans', 'font-brand')).toBe('font-brand');
    expect(cn('p-2', { hidden: true, flex: false })).toBe('p-2 hidden');
  });
});
