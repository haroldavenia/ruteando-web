// Aplica la elección de tema antes del primer pintado, para que no haya un destello del tema contrario.
// Es un fichero propio y no un script en línea porque la CSP solo admite scripts del mismo origen.
// Usa la misma clave y los mismos valores que `core/theme/theme.service.ts`.
try {
  var theme = localStorage.getItem('ruteando-theme');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }
} catch (e) {
  // Sin almacenamiento disponible (modo privado o bloqueado): se sigue al sistema
}
