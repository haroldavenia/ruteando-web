// Producción. La API se pide siempre a una ruta del mismo origen: el servidor (server/gateway-proxy.js)
// la reenvía al gateway y añade la clave. Aquí no va ningún dominio ni secreto.
export const environment = {
  production: true,
  apiUrl: '/gateway',
};
