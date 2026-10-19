// Producción. La API se pide siempre a una ruta del mismo origen; el despliegue (proxy inverso)
// decide a dónde va. Cambiar `apiUrl` solo si la API se publica en otra ruta.
export const environment = {
  production: true,
  apiUrl: '/hanoit/api/v1',
};
