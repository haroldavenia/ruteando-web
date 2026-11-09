import { EN } from './dictionaries/en';
import { PT } from './dictionaries/pt';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  language,
  locale,
  setDictionary,
  t,
  useLanguage,
} from './i18n';

const markers = (text: string): string =>
  [...text.matchAll(/\{\d+\}/g)]
    .map((m) => m[0])
    .sort()
    .join('');

describe('i18n', () => {
  afterEach(() => {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    document.documentElement.lang = 'en';
  });

  describe('idiomas', () => {
    it('el inglés es el idioma por defecto y hay tres idiomas', () => {
      expect(DEFAULT_LANGUAGE).toBe('en');
      expect(LANGUAGES).toEqual(['en', 'es', 'pt']);
    });

    it('las pruebas fijan el español, que es el texto fuente y no necesita diccionario', () => {
      expect(language()).toBe('es');
      expect(locale()).toBe('es');
      expect(t('Guardar')).toBe('Guardar');
    });

    it('useLanguage cambia el idioma y solo lo guarda si se pide', () => {
      useLanguage('pt', false);
      expect(language()).toBe('pt');
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();

      useLanguage('en');
      expect(language()).toBe('en');
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    });

    it('al volver al español se vacía el diccionario', () => {
      setDictionary({ Guardar: 'Save' });
      useLanguage('es', false);
      expect(t('Guardar')).toBe('Guardar');
    });
  });

  describe('t()', () => {
    it('traduce con el diccionario y devuelve el propio texto si falta (nunca deja un hueco)', () => {
      setDictionary({ Guardar: 'Save' });
      expect(t('Guardar')).toBe('Save');
      expect(t('Cancelar')).toBe('Cancelar');
    });

    it('sustituye los marcadores {0}, {1}… también en el idioma fuente', () => {
      expect(t('{0} de {1}', [3, 10])).toBe('3 de 10');
      setDictionary({ '{0} de {1}': '{0} of {1}' });
      expect(t('{0} de {1}', [3, 10])).toBe('3 of 10');
    });

    it('un texto con contexto («Inicio||hora») se traduce aparte de su homónimo y en español se ve sin el contexto', () => {
      expect(t('Inicio||hora')).toBe('Inicio');
      setDictionary({ Inicio: 'Home', 'Inicio||hora': 'Start' });
      expect(t('Inicio')).toBe('Home');
      expect(t('Inicio||hora')).toBe('Start');
      expect(t('Fin||hora')).toBe('Fin'); // sin traducción: el propio texto, sin el contexto
    });

    it('un marcador sin valor se deja tal cual y el orden puede cambiar entre idiomas', () => {
      setDictionary({ 'Ver {0} de {1}': 'In {1}, view {0}' });
      expect(t('Ver {0} de {1}', ['a', 'b'])).toBe('In b, view a');
      expect(t('Hola {0} y {1}', ['Ana'])).toBe('Hola Ana y {1}');
    });
  });

  describe('diccionario por idioma', () => {
    it('en inglés usa el diccionario inglés y fija <html lang>', () => {
      useLanguage('en', false);
      expect(t('Guardar')).toBe('Save');
      expect(document.documentElement.lang).toBe('en');
    });

    it('en portugués usa el diccionario portugués', () => {
      useLanguage('pt', false);
      expect(t('Guardar')).toBe('Salvar');
      expect(document.documentElement.lang).toBe('pt');
    });

    it('en español no hay diccionario: los textos salen como están escritos', () => {
      useLanguage('es', false);
      expect(t('Guardar')).toBe('Guardar');
      expect(document.documentElement.lang).toBe('es');
    });
  });

  describe('diccionarios', () => {
    const entries: readonly (readonly [string, Readonly<Record<string, string>>])[] = [
      ['inglés', EN],
      ['portugués', PT],
    ];

    for (const [name, dictionary] of entries) {
      it(`el diccionario ${name} no tiene traducciones vacías`, () => {
        const empty = Object.entries(dictionary).filter(([, value]) => value.trim() === '');
        expect(empty).toEqual([]);
      });

      it(`el diccionario ${name} conserva los marcadores {0}, {1}… de cada texto`, () => {
        const broken = Object.entries(dictionary).filter(([key, value]) => markers(key) !== markers(value));
        expect(broken).toEqual([]);
      });

      it(`el diccionario ${name} conserva los espacios del principio y del final (se usan al componer frases)`, () => {
        const broken = Object.entries(dictionary).filter(
          ([key, value]) => /^\s/.test(key) !== /^\s/.test(value) || /\s$/.test(key) !== /\s$/.test(value)
        );
        expect(broken).toEqual([]);
      });
    }

    it('ambos diccionarios tienen exactamente las mismas claves', () => {
      expect(Object.keys(PT).sort()).toEqual(Object.keys(EN).sort());
    });

    it('los textos de uso diario están traducidos (muestra: acciones, mensajes, filtros y alertas)', () => {
      expect(EN['Guardar']).toBe('Save');
      expect(EN['Cancelar']).toBe('Cancel');
      expect(EN['Correo o contraseña incorrectos']).toBe('Incorrect email or password');
      expect(EN['Este campo es obligatorio']).toBe('This field is required');
      expect(EN['Todos los estados']).toBe('All statuses');
      expect(EN['¿Descartar los cambios?']).toBe('Discard the changes?');
      expect(PT['Guardar']).toBe('Salvar');
      expect(PT['Correo o contraseña incorrectos']).toBe('E-mail ou senha incorretos');
      expect(PT['Todos los estados']).toBe('Todos os status');
      expect(PT['¿Descartar los cambios?']).toBe('Descartar as alterações?');
    });
  });
});
