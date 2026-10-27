// Desarrollo (`ng serve` y `ng build --configuration development`). `/gateway` lo reenvía el proxy
// de desarrollo (`proxy.conf.js`) al gateway con la clave del entorno; el navegador no la ve.
export const environment = {
  production: false,
  apiUrl: '/gateway',
  // Mapa base de OpenStreetMap: sin clave, uso ligero y atribución obligatoria. Para otro proveedor
  // basta cambiar `tilesUrl` y `attribution`; las claves de cliente no se guardan en este fichero.
  map: {
    tilesUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
    center: { lat: 4.6097, lng: -74.0817 },
    zoom: 11,
  },
};
