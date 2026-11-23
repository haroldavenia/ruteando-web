// Guarda el aviso de instalación del navegador (beforeinstallprompt) desde el primer momento: puede llegar antes de que cargue el
// menú que lo ofrece. `core/pwa/install.service.ts` lo recoge de `window.__installPrompt`. Es un fichero propio por la CSP (script-src 'self').
window.addEventListener('beforeinstallprompt', function (event) {
  event.preventDefault();
  window.__installPrompt = event;
});
