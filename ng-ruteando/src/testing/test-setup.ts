// Se carga antes de las pruebas (`polyfills` del destino `test`). Las pruebas comprueban los textos fuente de la aplicación, que
// están en español y no necesitan diccionario: se fija el español en cada prueba y sin guardarlo en el navegador. Las pruebas de
// idiomas lo cambian dentro de su propio caso y esto lo restablece.
import { useLanguage } from '../app/core/i18n/i18n';

useLanguage('es', false);
beforeEach(() => useLanguage('es', false));
