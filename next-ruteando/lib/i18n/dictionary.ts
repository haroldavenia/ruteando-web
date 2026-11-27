import { type Dictionary, type Language } from './core';
import { EN } from './dictionaries/en';
import { PT } from './dictionaries/pt';

/** Diccionario de un idioma (solo servidor: el cliente recibe el del idioma activo como propiedad del proveedor). */
export const dictionaryOf = (lang: Language): Dictionary => (lang === 'en' ? EN : lang === 'pt' ? PT : {});
