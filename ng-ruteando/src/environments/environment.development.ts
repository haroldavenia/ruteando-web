// Desarrollo (`ng serve` y `ng build --configuration development`). `/gateway` lo reenvía el proxy
// de desarrollo (`proxy.conf.js`) al gateway con la clave del entorno; el navegador no la ve.
export const environment = {
  production: false,
  apiUrl: '/gateway',
};
