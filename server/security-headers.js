/**
 * Cabeceras de seguridad de todas las respuestas del servidor (incluidas las del proxy del gateway).
 *
 * Variables de entorno (ver .env.example):
 *   CSP_MODE     report-only (por defecto: no bloquea nada, el navegador solo avisa en la consola),
 *                enforce (bloquea lo que incumpla la política) u off (sin CSP)
 *   CSP_IMG_SRC  orígenes de imagen adicionales, separados por espacios (otro proveedor de teselas)
 */
const DEFAULT_IMG_SRC = ['https://tile.openstreetmap.org'];
const CSP_MODES = ['report-only', 'enforce', 'off'];

/** Política de contenido. `style-src` admite 'unsafe-inline' porque Angular Material y OpenLayers añaden estilos en ejecución. */
function buildCsp(env) {
  const extraImages = (env.CSP_IMG_SRC || '').split(/\s+/).filter(Boolean);
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    ["img-src 'self' data: blob:"].concat(DEFAULT_IMG_SRC, extraImages).join(' '),
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Un valor desconocido cae en el modo seguro para no romper la aplicación: solo informe. */
function cspMode(env) {
  return CSP_MODES.includes(env.CSP_MODE) ? env.CSP_MODE : 'report-only';
}

function securityHeaders(env) {
  const csp = buildCsp(env);
  const mode = cspMode(env);
  const fixed = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
  return function(req, res, next) {
    res.removeHeader('X-Powered-By');
    Object.keys(fixed).forEach(function(name) {
      res.setHeader(name, fixed[name]);
    });
    if (mode === 'enforce') {
      res.setHeader('Content-Security-Policy', csp);
    } else if (mode === 'report-only') {
      res.setHeader('Content-Security-Policy-Report-Only', csp);
    }
    // Solo tiene efecto por HTTPS; por HTTP (desarrollo local) no debe fijar HTTPS para localhost
    if (req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted) {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
    next();
  };
}

module.exports = { buildCsp, cspMode, securityHeaders };
