# ADR-0004: `ApiClient` único, servicios por entidad y sesión JWT

- Estado: Propuesto (FND-002 implementa la capa API; ACC-001 la sesión)
- Fecha: 2026-11-17 (actualizado 2026-11-20)

## Decisión
1. `ApiClient` (`master/js/modules/services/api_client.js`) sobre `$http`, base `apiConfig.baseUrl = '/api/v1'`: resuelve con el cuerpo (201/202/204 sin cuerpo → `null`) y rechaza con `ApiError {status, code, message, details, path, retryAfter}`. `page()` normaliza `{content,totalElements,totalPages,page|number,size}` → `{items,total,page,size,totalPages}` y valida `sort` contra la lista blanca del contrato antes de enviar. `listAll()` con tope y `truncated`; `runBulk()` con concurrencia 4 e informe de éxitos/fallos (sustituye los `DELETE ?ids=`).
2. `ErrorMessages` traduce por override de pantalla → código del backend → estado HTTP, con parámetros (`Retry-After`, `lockedUntil`, `attemptsRemaining`…), en `master/i18n/{es,en,es_AR}.json`.
3. Un servicio `<Entidad>Api` por recurso (`<entidad>.api.js`) con `toDomain`/`toRequest` probados contra fixtures reales; ningún controlador construye URL.
4. Sesión (ACC-001): access token en memoria, refresh en `localStorage`; ante 401 `UNAUTHORIZED` una sola renovación en vuelo compartida (el refresh rota) y un reintento; si falla, cierre de sesión y `access.login` con `returnTo`; sincronización entre pestañas. Se elimina `resincTknRefresh` y `app.home/:tknrefresh`.
5. Convivencia: las peticiones de `ApiClient` llevan `config.apiV1 = true` y el `authResponseInterceptor` legacy las deja pasar sin tocarlas hasta que ACC-001 lo sustituya.

## Alternativas descartadas
- Mantener `$resource`: no soporta bien páginas, errores tipados ni reintento tras refresh.
- Migrar de framework: fuera del alcance (la reescritura en Angular 21 es otra línea, ADR-0001).
