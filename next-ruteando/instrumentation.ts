import { validateConfig } from './lib/config';

/** Se ejecuta al arrancar el servidor: en producción, una configuración insegura impide que arranque (mejor que fallar en silencio). */
export function register() {
  const problems = validateConfig(process.env);
  if (!problems.length) return;
  const message = `Configuración no válida:\n- ${problems.join('\n- ')}`;
  // Next registra el error pero deja el proceso vivo sin servir nada: se sale con código 1 para que el contenedor se reinicie y avise.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.error(message);
    process.exit(1);
    return;
  }
  throw new Error(message);
}
