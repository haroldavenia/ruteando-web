// Se carga antes de las pruebas (`polyfills` del destino `test`), antes de que se evalúe cualquier módulo de la aplicación. Las
// pruebas comprueban los textos fuente de la aplicación, que están en español y no necesitan diccionario: se fija el español
// sin guardarlo en el navegador. El restablecimiento entre pruebas está en `language.setup.spec.ts`.
import { useLanguage } from '../app/core/i18n/i18n';

useLanguage('es', false);
