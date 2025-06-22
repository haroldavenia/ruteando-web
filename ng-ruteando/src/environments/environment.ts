export const environment = {
  production: false,
  clientId: 'HANOIT-APP',
  clientSecret: '123456',
  facebookAppId: '760244197414824',
  googleClientId: '299346955747-0q7jel6iaok2g36a1hginqta56i7fm08.apps.googleusercontent.com',
  
  // Legacy API Configuration
  api: {
    protocol: 'http://',
    host: 'hanoit',
    port: '9000',
    path: '/hanoit/api',
    version: '/v1'
  },
  
  // Swagger API Configuration
  swaggerApi: {
    protocol: 'http://',
    host: 'hanoit',
    port: '8000',
    path: '/api'
  },
  
  // OSRM API Configuration
  osrmApi: {
    protocol: 'http://',
    host: 'app.ruteando.co',
    port: '9000',
    path: '/hanoit/v2/delivery'
  },
  
  // MapBox Configuration
  mapBox: {
    mapId: 'direct.cif4495oq30swsum3eems1dkf',
    accessToken: 'pk.eyJ1IjoiZGlyZWN0IiwiYSI6ImNpZjQ0OTcyZTMxZnJ0aW01dzU5bW9xd2sifQ.aYjmmG1QKi4VYM6ya0kL4Q'
  },
  
  // Compatibility Configuration
  compatibility: {
    // Habilitar/deshabilitar APIs específicas
    enableLegacyApi: true,
    enableSwaggerApi: true,
    enableOsrmApi: true,
    
    // Configuración de fallback
    fallbackToLegacy: true,
    fallbackToSwagger: false,
    
    // Configuración de logging
    enableApiLogging: true,
    enableTransformationLogging: true,
    enableErrorLogging: true,
    
    // Configuración de timeouts
    legacyTimeout: 30000, // 30 segundos
    swaggerTimeout: 15000, // 15 segundos
    osrmTimeout: 60000, // 60 segundos
    
    // Configuración de reintentos
    maxRetries: 3,
    retryDelay: 1000, // 1 segundo
    
    // Configuración de cache
    enableCache: true,
    cacheTimeout: 300000 // 5 minutos
  }
};
