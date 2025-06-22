# Análisis de Compatibilidad de APIs - Ruteando Web

## Resumen Ejecutivo

Este documento analiza la compatibilidad entre las APIs del sistema legacy (AngularJS) y el nuevo sistema (Angular 17), identificando riesgos potenciales y proponiendo soluciones para garantizar la interoperabilidad.

## 1. Configuración de APIs

### 1.1 APIs Legacy (Master)
**Base URL:** `http://hanoit:9000/hanoit/api/v1`

**Endpoints principales:**
- `/oauth/token` - Autenticación OAuth2
- `/signup` - Registro de usuarios
- `/forgotPassword` - Recuperación de contraseña
- `/typevehicle/:id` - Tipos de vehículos
- `/assignedservice/:id` - Servicios asignados
- `/places/:id` - Lugares
- `/driver/:id` - Conductores
- `/catalogs/:id` - Catálogos
- `/geocoding` - Geocodificación directa
- `/reverse_geocoding` - Geocodificación inversa
- `/optimalRouteOfPointCloud` - Optimización de rutas
- `/optimisationForMessenger` - Optimización para mensajeros
- `/journeys/:id` - Viajes
- `/journey/upload` - Carga de archivos de viaje
- `/routes` - Rutas
- `/settings/:id` - Configuraciones
- `/vehicles/:id` - Vehículos
- `/visits/:id` - Visitas

### 1.2 APIs Swagger (Nuevo)
**Base URL:** `http://hanoit:8000/api`

**Endpoints principales:**
- `/auth/login` - Login
- `/auth/register` - Registro
- `/auth/refresh` - Refresh token
- `/users` - Gestión de usuarios
- `/vehicles` - Gestión de vehículos
- `/vehicle-types` - Tipos de vehículos
- `/drivers` - Gestión de conductores
- `/routes` - Gestión de rutas
- `/journeys` - Gestión de viajes
- `/visits` - Gestión de visitas
- `/places` - Gestión de lugares
- `/settings` - Configuraciones
- `/geocoding` - Geocodificación
- `/reports` - Reportes
- `/files` - Gestión de archivos

## 2. Análisis de Riesgos de Compatibilidad

### 2.1 Riesgo Crítico: Diferencias en Estructura de Respuestas

**Problema:** Las APIs legacy y Swagger tienen estructuras de respuesta diferentes.

**Legacy Response:**
```javascript
{
  data: [...],
  message: "Success",
  success: true
}
```

**Swagger Response:**
```javascript
{
  data: [...],
  total: 100,
  page: 1,
  limit: 20,
  totalPages: 5
}
```

**Solución:** Implementar adaptadores de respuesta en BaseApiService.

### 2.2 Riesgo Alto: Diferencias en Autenticación

**Problema:** 
- Legacy usa OAuth2 con Basic Auth
- Swagger usa JWT Bearer tokens

**Legacy Auth:**
```javascript
headers: {
  'Authorization': 'Basic SEFOT0lULUFQUDoxMjM0NTY='
}
```

**Swagger Auth:**
```javascript
headers: {
  'Authorization': 'Bearer <token>'
}
```

**Solución:** Mantener ambos sistemas de autenticación con interceptores específicos.

### 2.3 Riesgo Medio: Diferencias en Parámetros de Consulta

**Problema:** Los filtros y parámetros de consulta pueden tener nombres diferentes.

**Legacy Filters:**
```javascript
{
  search: "texto",
  page: 1,
  limit: 20
}
```

**Swagger Filters:**
```javascript
{
  q: "texto",
  page: 1,
  per_page: 20
}
```

**Solución:** Implementar mapeo de parámetros en servicios.

### 2.4 Riesgo Medio: Diferencias en Estructuras de Datos

**Problema:** Los modelos de datos pueden tener campos diferentes.

**Legacy Vehicle:**
```javascript
{
  id: 1,
  licensePlate: "ABC123",
  brand: "Toyota",
  model: "Corolla",
  weight: 1000,
  volume: 5
}
```

**Swagger Vehicle:**
```javascript
{
  id: 1,
  licensePlate: "ABC123",
  brand: "Toyota",
  model: "Corolla",
  capacity: 1000,
  fuelType: "gasoline"
}
```

**Solución:** Crear interfaces de transformación de datos.

## 3. Servicios Críticos que Requieren Ajustes

### 3.1 OSRM Service (Optimización de Rutas)

**Problema:** URLs hardcodeadas en legacy.

**Legacy URLs:**
```javascript
'http://app.ruteando.co:9000/hanoit/v2/delivery/optimalRouteOfPointCloud'
'http://app.ruteando.co:9000/hanoit/v2/delivery/optimisationForMessenger'
'http://app.ruteando.co:9000/hanoit/v2/delivery/optimisationForPackages'
```

**Solución:** Configurar URLs dinámicas en environment.

### 3.2 Geocoding Service

**Problema:** Diferentes endpoints para geocodificación.

**Legacy:**
- `/geocoding` (POST)
- `/reverse_geocoding` (POST)

**Swagger:**
- `/geocoding` (GET)
- `/geocoding/reverse` (GET)

**Solución:** Implementar adaptadores de método HTTP.

### 3.3 File Upload Service

**Problema:** Diferentes mecanismos de carga.

**Legacy:**
```javascript
'/journey/upload' (POST con FormData)
```

**Swagger:**
```javascript
'/files' (POST con multipart/form-data)
```

**Solución:** Unificar interfaz de carga de archivos.

## 4. Plan de Mitigación de Riesgos

### 4.1 Implementar Adaptadores de API

```typescript
// api-adapter.service.ts
@Injectable()
export class ApiAdapterService {
  adaptLegacyResponse<T>(response: any): ApiResponse<T> {
    return {
      data: response.data || response,
      message: response.message || 'Success',
      success: response.success !== false,
      errors: response.errors || []
    };
  }

  adaptSwaggerResponse<T>(response: any): PaginatedResponse<T> {
    return {
      data: response.data || response,
      total: response.total || 0,
      page: response.page || 1,
      limit: response.limit || 20,
      totalPages: response.totalPages || 1
    };
  }
}
```

### 4.2 Implementar Interceptores de Compatibilidad

```typescript
// api-compatibility.interceptor.ts
@Injectable()
export class ApiCompatibilityInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Adaptar headers según el tipo de API
    if (req.url.includes('/hanoit/api/v1')) {
      // Legacy API - usar Basic Auth
      req = req.clone({
        setHeaders: {
          'Authorization': 'Basic SEFOT0lULUFQUDoxMjM0NTY='
        }
      });
    } else if (req.url.includes('/api')) {
      // Swagger API - usar Bearer token
      const token = this.authService.getAuthToken();
      if (token) {
        req = req.clone({
          setHeaders: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    }
    
    return next.handle(req);
  }
}
```

### 4.3 Implementar Transformadores de Datos

```typescript
// data-transformer.service.ts
@Injectable()
export class DataTransformerService {
  transformLegacyVehicle(vehicle: any): Vehicle {
    return {
      id: vehicle.id,
      licensePlate: vehicle.licensePlate,
      brand: vehicle.brand,
      model: vehicle.model,
      capacity: vehicle.weight || vehicle.capacity,
      fuelType: vehicle.fuelType || 'unknown',
      vehicleTypeId: vehicle.vehicleTypeId,
      isActive: vehicle.isActive !== false
    };
  }

  transformSwaggerVehicle(vehicle: any): Vehicle {
    return {
      id: vehicle.id,
      licensePlate: vehicle.licensePlate,
      brand: vehicle.brand,
      model: vehicle.model,
      capacity: vehicle.capacity,
      fuelType: vehicle.fuelType,
      vehicleTypeId: vehicle.vehicleTypeId,
      isActive: vehicle.isActive
    };
  }
}
```

## 5. Configuración de Environment Mejorada

```typescript
// environment.ts
export const environment = {
  production: false,
  // Legacy API
  api: {
    protocol: 'http://',
    host: 'hanoit',
    port: '9000',
    path: '/hanoit/api',
    version: '/v1'
  },
  // Swagger API
  swaggerApi: {
    protocol: 'http://',
    host: 'hanoit',
    port: '8000',
    path: '/api'
  },
  // OSRM API
  osrmApi: {
    protocol: 'http://',
    host: 'app.ruteando.co',
    port: '9000',
    path: '/hanoit/v2/delivery'
  },
  // MapBox
  mapBox: {
    mapId: 'direct.cif4495oq30swsum3eems1dkf',
    accessToken: 'pk.eyJ1IjoiZGlyZWN0IiwiYSI6ImNpZjQ0OTcyZTMxZnJ0aW01dzU5bW9xd2sifQ.aYjmmG1QKi4VYM6ya0kL4Q'
  }
};
```

## 6. Servicios de Compatibilidad

### 6.1 Service Factory para APIs

```typescript
// api-factory.service.ts
@Injectable()
export class ApiFactoryService {
  constructor(
    private http: HttpClient,
    private config: AppConfig,
    private authService: AuthService,
    private adapter: ApiAdapterService,
    private transformer: DataTransformerService
  ) {}

  createLegacyService<T>(endpoint: string): LegacyApiService<T> {
    return new LegacyApiService<T>(
      this.http,
      this.config,
      this.authService,
      this.adapter,
      endpoint
    );
  }

  createSwaggerService<T>(endpoint: string): SwaggerApiService<T> {
    return new SwaggerApiService<T>(
      this.http,
      this.config,
      this.authService,
      this.adapter,
      endpoint
    );
  }
}
```

### 6.2 Servicios Específicos de Compatibilidad

```typescript
// compatible-vehicle.service.ts
@Injectable()
export class CompatibleVehicleService {
  private legacyService: LegacyApiService<Vehicle>;
  private swaggerService: SwaggerApiService<Vehicle>;

  constructor(private apiFactory: ApiFactoryService) {
    this.legacyService = this.apiFactory.createLegacyService<Vehicle>('/vehicles/:id');
    this.swaggerService = this.apiFactory.createSwaggerService<Vehicle>('/vehicles');
  }

  getVehicles(useLegacy: boolean = false): Observable<Vehicle[]> {
    if (useLegacy) {
      return this.legacyService.getList();
    } else {
      return this.swaggerService.getList();
    }
  }
}
```

## 7. Testing de Compatibilidad

### 7.1 Tests Unitarios

```typescript
// api-compatibility.spec.ts
describe('API Compatibility', () => {
  it('should adapt legacy response correctly', () => {
    const legacyResponse = {
      data: [{ id: 1, name: 'Test' }],
      message: 'Success',
      success: true
    };
    
    const adapted = adapter.adaptLegacyResponse(legacyResponse);
    expect(adapted.data).toEqual(legacyResponse.data);
    expect(adapted.success).toBe(true);
  });

  it('should adapt swagger response correctly', () => {
    const swaggerResponse = {
      data: [{ id: 1, name: 'Test' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1
    };
    
    const adapted = adapter.adaptSwaggerResponse(swaggerResponse);
    expect(adapted.data).toEqual(swaggerResponse.data);
    expect(adapted.total).toBe(1);
  });
});
```

### 7.2 Tests de Integración

```typescript
// integration.spec.ts
describe('API Integration', () => {
  it('should work with legacy API', (done) => {
    const service = new CompatibleVehicleService(apiFactory);
    service.getVehicles(true).subscribe(
      vehicles => {
        expect(vehicles.length).toBeGreaterThan(0);
        done();
      },
      error => done.fail(error)
    );
  });

  it('should work with swagger API', (done) => {
    const service = new CompatibleVehicleService(apiFactory);
    service.getVehicles(false).subscribe(
      vehicles => {
        expect(vehicles.length).toBeGreaterThan(0);
        done();
      },
      error => done.fail(error)
    );
  });
});
```

## 8. Monitoreo y Logging

### 8.1 Logger de Compatibilidad

```typescript
// compatibility-logger.service.ts
@Injectable()
export class CompatibilityLoggerService {
  logApiCall(apiType: 'legacy' | 'swagger', endpoint: string, method: string, success: boolean) {
    console.log(`[API-${apiType.toUpperCase()}] ${method} ${endpoint} - ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  logDataTransformation(from: any, to: any, transformationType: string) {
    console.log(`[TRANSFORM] ${transformationType}:`, { from, to });
  }

  logCompatibilityError(error: any, context: string) {
    console.error(`[COMPATIBILITY-ERROR] ${context}:`, error);
  }
}
```

## 9. Recomendaciones de Implementación

### 9.1 Fase 1: Preparación (Semana 1)
- [ ] Implementar adaptadores de API
- [ ] Crear interceptores de compatibilidad
- [ ] Configurar environment mejorado
- [ ] Implementar transformadores de datos

### 9.2 Fase 2: Migración Gradual (Semanas 2-4)
- [ ] Migrar servicios críticos uno por uno
- [ ] Implementar fallback a APIs legacy
- [ ] Testing exhaustivo de cada servicio
- [ ] Monitoreo de errores y performance

### 9.3 Fase 3: Optimización (Semana 5)
- [ ] Optimizar transformaciones de datos
- [ ] Implementar cache de respuestas
- [ ] Mejorar manejo de errores
- [ ] Documentación final

### 9.4 Fase 4: Despliegue (Semana 6)
- [ ] Despliegue en staging
- [ ] Testing de integración completa
- [ ] Despliegue en producción
- [ ] Monitoreo post-despliegue

## 10. Métricas de Éxito

- **Tasa de éxito de APIs:** > 99%
- **Tiempo de respuesta:** < 2 segundos
- **Errores de compatibilidad:** < 1%
- **Cobertura de tests:** > 90%

## 11. Rollback Plan

En caso de problemas críticos:

1. **Rollback inmediato:** Volver a usar solo APIs legacy
2. **Rollback gradual:** Deshabilitar servicios problemáticos uno por uno
3. **Hotfix:** Correcciones rápidas sin afectar funcionalidad existente

## Conclusión

La migración de APIs requiere un enfoque cuidadoso y gradual. Con los adaptadores, interceptores y transformadores implementados, el sistema puede mantener compatibilidad con ambas APIs mientras se completa la migración. El monitoreo continuo y los tests exhaustivos son esenciales para garantizar la estabilidad del sistema. 