export const environment = {
  production: true,
  clientId: 'HANOIT-APP',
  clientSecret: '123456',
  facebookAppId: '760244197414824',
  googleClientId: '299346955747-0q7jel6iaok2g36a1hginqta56i7fm08.apps.googleusercontent.com',
  
  // API URL for services compatibility - Production URLs
  apiUrl: 'https://api.ruteando.co/hanoit/api/v1',
  
  // Legacy API Configuration - Production
  api: {
    protocol: 'https://',
    host: 'api.ruteando.co',
    port: '443',
    path: '/hanoit/api',
    version: '/v1'
  },
  
  // Swagger API Configuration - Production
  swaggerApi: {
    protocol: 'https://',
    host: 'api.ruteando.co',
    port: '443',
    path: '/api'
  },
  
  // OSRM API Configuration - Production
  osrmApi: {
    protocol: 'https://',
    host: 'app.ruteando.co',
    port: '443',
    path: '/hanoit/v2/delivery'
  },
  
  // MapBox Configuration
  mapBox: {
    mapId: 'direct.cif4495oq30swsum3eems1dkf',
    accessToken: 'pk.eyJ1IjoiZGlyZWN0IiwiYSI6ImNpZjQ0OTcyZTMxZnJ0aW01dzU5bW9xd2sifQ.aYjmmG1QKi4VYM6ya0kL4Q'
  },
  
  // Compatibility Configuration - Production optimized
  compatibility: {
    // Habilitar/deshabilitar APIs específicas
    enableLegacyApi: true,
    enableSwaggerApi: true,
    enableOsrmApi: true,
    
    // Configuración de fallback
    fallbackToLegacy: true,
    fallbackToSwagger: false,
    
    // Configuración de logging - Reduced for production
    enableApiLogging: false,
    enableTransformationLogging: false,
    enableErrorLogging: true,
    
    // Configuración de timeouts
    legacyTimeout: 30000, // 30 segundos
    swaggerTimeout: 15000, // 15 segundos
    osrmTimeout: 60000, // 60 segundos
    
    // Configuración de reintentos
    maxRetries: 3,
    retryDelay: 1000, // 1 segundo
    
    // Configuración de cache - Enhanced for production
    enableCache: true,
    cacheTimeout: 600000 // 10 minutos
  }
}; 