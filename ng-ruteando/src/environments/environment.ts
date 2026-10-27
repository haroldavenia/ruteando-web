// Producción. La API se pide siempre a una ruta del mismo origen: el servidor (server/gateway-proxy.js)
// la reenvía al gateway y añade la clave. Aquí no va ningún dominio ni secreto.
export const environment = {
  production: true,
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
