// Desarrollo (`ng serve` y `ng build --configuration development`). `/hanoit` lo reenvía
// el proxy de desarrollo (`proxy.conf.json`), así el navegador no hace peticiones de otro origen.
export const environment = {
  production: false,
  apiUrl: '/hanoit/api/v1',
};
