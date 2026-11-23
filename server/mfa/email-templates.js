/**
 * Plantillas HTML de los correos del segundo factor. Siguen la marca de la app: franja con el degradado violeta -> rosa del tema
 * (`--app-brand-gradient`, tonos 40 de las paletas violet y rose de Material 3), el emblema, tarjeta de esquinas redondeadas y modo
 * oscuro. Son tablas con estilos en línea porque los clientes de correo no entienden flex, grid ni variables CSS; el degradado,
 * las esquinas y el modo oscuro son mejoras: sin ellos (Outlook) queda el color sólido y el mismo contenido.
 *
 * Cada plantilla devuelve `{ subject, text, html, attachments }`: `text` es la versión de texto plano (la que leen los clientes sin
 * HTML y las pruebas) y el emblema va como imagen embebida (`cid`) porque Gmail no admite SVG. Los textos están en español y no se
 * traducen (ver CLAUDE.md, «Segundo factor»). Todo valor variable se escapa.
 */
const path = require('node:path');

const LOGO = { filename: 'ruteando.png', path: path.join(__dirname, 'email-logo.png'), cid: 'ruteando-logo' };
const FONT = "Roboto, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

const escapeHtml = (v) =>
  String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const STYLE = `
  body { margin: 0; padding: 0; }
  @media (max-width: 520px) { .wrap { width: 100% !important; } .pad { padding-left: 20px !important; padding-right: 20px !important; } .code { font-size: 30px !important; letter-spacing: 6px !important; } }
  @media (prefers-color-scheme: dark) {
    .bg-page { background: #141218 !important; }
    .bg-card { background: #1d1b20 !important; }
    .t-main { color: #e6e0e9 !important; }
    .t-muted { color: #cac4d0 !important; }
    .line { border-color: #49454f !important; }
    .code-box { background: #2b2930 !important; border-color: #4a4458 !important; }
    .code { color: #d5baff !important; }
    .chip-warn { background: #402d00 !important; color: #f6c964 !important; }
    .chip-info { background: #0c3157 !important; color: #8ac8ff !important; }
    .bubble { background: #2b2930 !important; border-color: #4a4458 !important; }
  }`;

/** Marco común: franja de marca, tarjeta con `body` y pie. `preheader` es el resumen que muestra la bandeja de entrada. */
function layout({ preheader, title, body, footer }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(title)}</title><style>${STYLE}</style></head>
<body style="margin:0;padding:0;background:#f5eff4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" style="background:#f5eff4;">
<tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" class="wrap" style="width:560px;max-width:100%;">
    <tr><td bgcolor="#7d00fa" style="background-color:#7d00fa;background-image:linear-gradient(100deg,#7d00fa,#ba005c);border-radius:20px 20px 0 0;padding:26px 32px;" class="pad">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle;padding-right:14px;"><img src="cid:ruteando-logo" width="44" height="44" alt="" style="display:block;border:0;border-radius:12px;"></td>
        <td style="vertical-align:middle;font:500 22px/1 ${FONT};letter-spacing:0.14em;text-transform:uppercase;color:#ffffff;">Ruteando</td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="#fffbff" class="bg-card pad" style="background:#fffbff;padding:36px 32px 32px;border-radius:0 0 20px 20px;font-family:${FONT};color:#1d1b1e;">
      ${body}
    </td></tr>
    <tr><td class="pad t-muted" style="padding:20px 32px 0;font:400 12px/1.6 ${FONT};color:#605d61;text-align:center;">${footer}</td></tr>
  </table>
</td></tr></table></body></html>`;
}

const h1 = (t) =>
  `<h1 class="t-main" style="margin:0 0 12px;font:500 26px/1.25 ${FONT};color:#1d1b1e;">${escapeHtml(t)}</h1>`;
const p = (html, extra = '') =>
  `<p class="t-main" style="margin:0 0 18px;font:400 16px/1.6 ${FONT};color:#1d1b1e;${extra}">${html}</p>`;
const chip = (cls, bg, fg, text) =>
  `<span class="${cls}" style="display:inline-block;background:${bg};color:${fg};border-radius:999px;padding:6px 14px;font:500 13px/1 ${FONT};">${escapeHtml(text)}</span>`;
const divider = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="line" style="border-top:1px solid #e6e1e6;font-size:0;line-height:0;padding-top:22px;">&nbsp;</td></tr></table>`;

/** Correo con el código de verificación (inicio de sesión y activación del método «correo»). */
function codeEmail({ code, to, issuer = 'Ruteando', minutes = 5 }) {
  const body = `
      ${h1('Tu código de verificación')}
      ${p(`Usa este código para continuar en ${escapeHtml(issuer)}. Es de un solo uso.`)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px;"><tr>
        <td align="center" class="code-box" style="background:#f7edff;border:1px solid #ecdcff;border-radius:16px;padding:22px 12px;">
          <span class="code" style="display:block;font:700 38px/1 ${MONO};letter-spacing:10px;text-indent:10px;color:#5f00c0;-webkit-user-select:all;user-select:all;">${escapeHtml(code)}</span>
        </td></tr></table>
      <p style="margin:0 0 26px;text-align:center;">${chip('chip-warn', '#ffebc2', '#7a4b00', `Caduca en ${minutes} minutos`)}</p>
      ${divider}
      ${p('<strong style="font-weight:500;">¿No fuiste tú?</strong> Ignora este mensaje: sin el código nadie puede entrar a tu cuenta. Si te llegan códigos que no pediste, cambia tu contraseña.', 'font-size:14px;margin-bottom:10px;')}
      ${p(`Nunca compartas este código. El equipo de ${escapeHtml(issuer)} no te lo pedirá por ningún medio.`, 'font-size:14px;margin:0;')}`;
  return {
    subject: 'Tu código de verificación',
    text: `Tu código de verificación de ${issuer} es ${code}. Caduca en ${minutes} minutos. Si no lo pediste, ignora este mensaje.`,
    html: layout({
      preheader: `Usa tu código para continuar. Caduca en ${minutes} minutos.`,
      title: 'Tu código de verificación',
      body,
      footer: `Mensaje automático enviado${to ? ` a ${escapeHtml(to)}` : ''}. Por favor, no respondas a este correo.`,
    }),
    attachments: [LOGO],
  };
}

/** Solo desarrollo (`SMS_PROVIDER=dev`): el «SMS» llega por correo; se dibuja como un mensaje para que se vea qué recibiría la persona. */
function smsDevEmail({ code, maskedPhone, issuer = 'Ruteando', minutes = 5 }) {
  const sms = `${issuer}: tu código de verificación es ${code}. Caduca en ${minutes} minutos.`;
  const body = `
      <p style="margin:0 0 14px;">${chip('chip-info', '#dcebfa', '#0a5496', 'Simulación de desarrollo')}</p>
      ${h1(`SMS para ${maskedPhone}`)}
      ${p('Con un proveedor real, este texto llegaría como mensaje de texto al teléfono.')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="bubble t-main" style="background:#f7edff;border:1px solid #ecdcff;border-radius:18px 18px 18px 4px;padding:16px 18px;font:400 16px/1.55 ${FONT};color:#1d1b1e;">${escapeHtml(sms)}</td>
      </tr></table>`;
  return {
    subject: `SMS para ${maskedPhone}`,
    text: sms,
    html: layout({
      preheader: `Simulación de SMS para ${maskedPhone}.`,
      title: `SMS para ${maskedPhone}`,
      body,
      footer: 'Este correo solo existe en desarrollo (SMS_PROVIDER=dev). En producción no se envía.',
    }),
    attachments: [LOGO],
  };
}

module.exports = { codeEmail, smsDevEmail };
