---
name: angular-ruteando
description: Experto en Angular 21 para el repo ruteando-web (planificación de rutas). Úsalo al crear, modificar o depurar código Angular en ng-ruteando/, al añadir UI con Angular Material, mapas con OpenLayers, PDFs con jsPDF, auth JWT, SSR, o al revisar la subida de versión de Angular.
---

# Angular 21 en ruteando-web

Skill para trabajar en el repo con criterio de versión. **Hay un único proyecto Angular (`ng-ruteando/`); la app AngularJS anterior se eliminó y solo existe en el historial de git (último commit con ella: `19b1cb4`).** Responde y comenta en español; identificadores en inglés.

## 1. Detectar el proyecto y la versión objetivo

| Si el fichero está en... | Proyecto | Angular real hoy | Estilo | Referencia |
|---|---|---|---|---|
| `ng-ruteando/` | Único frontend Angular; `server/server.js` publica su compilación de navegador | **21.2** | Standalone por defecto, builder `application`, strict, SCSS, Material M3, zone.js conservado | `references/angular-21-standalone-ssr.md` |
| API del gateway | Consumo desde `ng-ruteando` | n/a | `core/api`, `core/auth`, `core/geo` | `references/gateway-api.md` |

Antes de escribir código, confirma versión con `grep '"@angular/core"' <proyecto>/package.json`. **No asumas la versión**: `ng-ruteando` está en 21.2. El proyecto Angular 17.0 anterior se eliminó en el change `consolidate-ng-ruteando`.

Escribe código compatible con la versión instalada en el proyecto que edites (21.2 en `ng-ruteando`). Node soportado: `^20.19 || ^22.12 || >=24` (`.nvmrc` = 22).

## 2. Reglas comunes

- Selector con prefijo `app-`; ficheros `nombre.component.ts|html|scss`, `nombre.service.ts`, `nombre.guard.ts`.
- Servicios: `@Injectable({ providedIn: 'root' })` e `inject()` en vez de constructor cuando el fichero sea nuevo. Respeta el estilo del fichero si ya usa constructor.
- Plantillas: usa control flow `@if/@for/@switch` (con `track` obligatorio en `@for`).
- RxJS 7.8: `takeUntilDestroyed()` (de `@angular/core/rxjs-interop`) o `async` pipe; nunca `subscribe` sin limpieza.
- HTTP: `HttpClient` a través de los servicios de `core/api/data` (interceptores ya registrados). La URL base sale de `API_BASE_URL`, nunca literales ni dominios del gateway.
- Estado local con **signals** (`signal`, `computed`) en código nuevo; `toSignal` para observables.
- Tipado estricto (`strict` está activo): sin `any` implícito, interfaces para los modelos de dominio.
- No uses APIs de una versión mayor que la instalada (ver tabla de §5).
- Textos de UI en español.

## 3. Dominio del negocio

Entidades del negocio, todas sobre el gateway y con su pantalla en `features/`: **access, fleet (tipos de vehículo, vehículos y conductores), places, packages, settings, journeys (con detalle de ruta y visitas) y zones**. Quedan sin pantalla `assigned-services` (solo `AssignedServicesApi`; sin ejemplo con datos) y la geocodificación (sin contrato). Los modelos salen de los fixtures reales de `src/testing/fixtures/gateway/`. Estructura de cada feature (lazy):

```
src/app/features/<entidad>/
  <entidad>.routes.ts
  <entidad>-list.component.*
  <entidad>-form.component.*
  <entidad>.service.ts
  <entidad>.model.ts
```

## 4. Autenticación y API (estado real)

El frontend consume el **HanoIT Gateway** a través del proxy `/gateway` (la clave `X-Api-Key` es un secreto que solo vive en el servidor). Hay `AuthService` (login, refresh, logout, restauración al arrancar y renovación programada), `CurrentUser` (signal con rol y `tenantId`), guards (`authGuard`, `roleGuard`, `guestGuard`), interceptores funcionales (token, renovación en 401 con una sola petición compartida, errores en español personalizables) y `TokenStorageService` (acceso en memoria; refresco y caducidad en `localStorage`, mismas claves que AngularJS, seguro en SSR). Los servicios de datos están en `core/api/data/*.api.ts`. **Lee `references/gateway-api.md`** antes de tocar la capa HTTP, la sesión, las coordenadas o añadir un servicio de datos. Las pantallas de acceso (login, registro, verificación de correo, recuperación y restablecimiento) están en `features/access/` y la flota (tipos de vehículo, vehículos y conductores) en `features/fleet/`, con el patrón reutilizable de listado, borrado y envío en `shared/data/`, los lugares en `features/places/` el mapa reutilizable (OpenLayers solo en el navegador) en `shared/map/` los paquetes en `features/packages/` las configuraciones de planificación en `features/settings/` las jornadas, con el mapa de sus rutas, en `features/journeys/` y las zonas, con el editor de polígonos (`shared/map/polygon-*.ts`), en `features/zones/`: ver «Pantallas de acceso» en esa referencia (rutas, layouts, `safeReturnUrl`, tokens de un solo uso).

## 5. Matriz de APIs por versión

| Característica | 17.0 (referencia histórica) | 21.2 (`ng-ruteando`, verificado) |
|---|---|---|
| Standalone | Opt-in (`standalone: true`) | **Por defecto** (no se escribe) |
| Control flow `@if/@for` | Estable en 17 | Estable; se usa en el shell |
| Signals | Dev preview | `signal`, `computed`, `input()`, `output()` estables |
| Builder | `browser` | `application` (esbuild) |
| Zoneless | No | Por defecto en proyectos nuevos; aquí se **conserva zone.js** con `provideZoneChangeDetection()` |
| SSR | `@angular/ssr` + `CommonEngine` | `CommonEngine` de `@angular/ssr/node` con `allowedHosts` obligatorio (variable `NG_ALLOWED_HOSTS`) |
| Tema Material | M2 | M3 con `mat.theme(...)` |
| TypeScript | 5.2.x | ~5.9 |
| Node | 18.13+ | `^20.19 \|\| ^22.12 \|\| >=24` (`.nvmrc` = 22) |
| `ng test` | Karma + Jasmine | Karma + Jasmine (`npm run test:ci`, Chrome sin interfaz) |

Para APIs de las versiones intermedias (`@let`, `@defer`, `httpResource`, `linkedSignal`) verifica en `npx ng version` y en la documentación oficial antes de usarlas: estas cifras envejecen.

## 6. UI

Ver `references/ui-material-openlayers.md`. Resumen: UI con **Angular Material + CDK** alineado con la versión de Angular (`ng-ruteando`: Material 21.2 con tema M3, ya aplicado). No uses Bootstrap ni ng-bootstrap ni los mezcles. `ng-ruteando` tiene un shell Material (barra y menú), sin pantallas de negocio todavía. Legacy usa Bootstrap 3 + tema Angle + Google Maps; **no copies esos estilos**, solo su funcionalidad. Mapas nuevos con OpenLayers (`ol` ^10.5, teselas OSM, sin tokens Mapbox: el commit `1b42631` los eliminó). PDFs con `jspdf` ^2.5.1.

## 7. Trampas conocidas (lee `references/gotchas.md`)

Resumen: bootstrap/ng-bootstrap ya se retiraron; el SSR exige `allowedHosts`; `npm install` desde cero puede requerir npm 11; los puertos son 3000 (servidor), 4000 (SSR) y 4200 (`ng serve`).

## 8. Flujo de trabajo recomendado

1. Detectar proyecto/versión (§1).
2. Leer la referencia de la feature y los fixtures del gateway (`src/testing/fixtures/gateway/`).
3. Implementar siguiendo la referencia de la versión.
4. Compilar: `cd ng-ruteando && npm run build` (o `npm run build:web` desde la raíz).
5. Tests: `cd ng-ruteando && npm run test:ci` (Karma, Chrome sin interfaz); servidor: `npm run test:server` en la raíz.
6. Nunca propagues secretos; usa variables de entorno / `environment`.
