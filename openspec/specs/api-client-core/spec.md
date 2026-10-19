# api-client-core Specification

## Purpose
Define la capa común con la que el frontend consume el gateway: URL base, autenticación por token, refresco de sesión, errores con mensajes genéricos personalizables, respuestas sin cuerpo, paginación y datos de prueba saneados.

## Requirements

### Requirement: URL base única
Toda petición al gateway SHALL dirigirse a la URL base de la API definida en el entorno, que es la ruta del proxy, y el código de la aplicación SHALL NOT contener el dominio del gateway.

#### Scenario: Petición a un recurso
- **WHEN** un servicio de datos pide la lista de lugares
- **THEN** la petición sale hacia `/gateway/places` en el origen de la aplicación

#### Scenario: Sin dominio del gateway en el código
- **WHEN** se busca el dominio del gateway en `ng-ruteando/src`
- **THEN** solo aparece, si acaso, en documentación o en ficheros de prueba

### Requirement: Token de acceso en las peticiones autenticadas
La aplicación SHALL enviar `Authorization: Bearer <token>` en las peticiones al gateway, excepto en las rutas públicas.

#### Scenario: Petición autenticada
- **WHEN** hay un token de acceso en memoria y se pide `GET /gateway/journeys`
- **THEN** la petición lleva `Authorization: Bearer` con ese token

#### Scenario: Ruta pública
- **WHEN** se llama a `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/auth/resend-verification` o `/invitations/accept/*`
- **THEN** la petición no lleva cabecera `Authorization`

#### Scenario: Sin token
- **WHEN** no hay token de acceso y se pide una ruta no pública
- **THEN** la petición no lleva `Authorization` y no se envía el texto `Bearer ` vacío

#### Scenario: Otros orígenes
- **WHEN** la aplicación hace una petición a una URL que no es la base de la API
- **THEN** no se le añade `Authorization`

### Requirement: Refresco de sesión ante 401
Ante un 401 en una petición autenticada, la aplicación SHALL renovar la sesión con una única petición de refresco compartida y SHALL reintentar cada petición afectada una sola vez.

#### Scenario: Refresco correcto
- **WHEN** una petición autenticada recibe 401 y existe un token de refresco válido
- **THEN** se llama a `POST /auth/refresh`, se guardan los tokens nuevos y la petición original se repite con el token nuevo

#### Scenario: Peticiones concurrentes
- **WHEN** tres peticiones autenticadas reciben 401 a la vez
- **THEN** se realiza una sola llamada a `POST /auth/refresh` y las tres se reintentan con el token nuevo

#### Scenario: Refresco fallido
- **WHEN** `POST /auth/refresh` falla o no hay token de refresco
- **THEN** se borra la sesión, no se reintenta ninguna petición y se redirige a `/acceso` con la ruta de origen en `returnUrl`

#### Scenario: Un solo reintento
- **WHEN** la petición reintentada con el token nuevo vuelve a recibir 401
- **THEN** no se vuelve a refrescar y se trata como sesión caducada

#### Scenario: Rutas de autenticación
- **WHEN** una petición a `/auth/login` o `/auth/refresh` recibe 401
- **THEN** no se intenta refrescar la sesión

### Requirement: Refresco anticipado
La aplicación SHALL renovar el token de acceso antes de enviar una petición cuando le queden menos de 30 segundos de vida.

#### Scenario: Token a punto de caducar
- **WHEN** el token de acceso caduca en 10 segundos y se envía una petición autenticada
- **THEN** primero se realiza el refresco y la petición se envía con el token nuevo, sin pasar por un 401

### Requirement: Errores con mensaje genérico en español
La aplicación SHALL convertir los fallos HTTP en un error con estado, código, detalles y un mensaje legible en español, y SHALL usar mensajes genéricos por estado cuando no haya uno personalizado.

#### Scenario: Mensajes por defecto
- **WHEN** una petición falla con 400, 401, 403, 404, un 5xx o sin conexión (estado 0)
- **THEN** el mensaje es, respectivamente: "La solicitud no es válida", "Tu sesión no es válida o ha caducado", "No tienes permiso para realizar esta acción", "No se encontró el recurso solicitado", "El servicio no está disponible, inténtalo más tarde" y "No hay conexión con el servidor"

#### Scenario: Cuerpo del servidor conservado, no mostrado
- **WHEN** el gateway responde un error con un cuerpo que incluye un texto de mensaje
- **THEN** ese texto queda disponible en los detalles del error, pero el mensaje que se muestra al usuario sigue siendo el genérico

#### Scenario: Cuerpo no interpretable
- **WHEN** la respuesta de error tiene un cuerpo vacío, no JSON o con una forma desconocida
- **THEN** se genera igualmente un error con el mensaje genérico del estado y sin lanzar excepciones

#### Scenario: Sin diálogos del navegador
- **WHEN** ocurre cualquier error de red o de servidor
- **THEN** la aplicación no abre `alert` ni otros diálogos modales del navegador

### Requirement: Mensajes de error personalizables
La aplicación SHALL permitir sustituir el mensaje genérico, sin modificar la capa común, por petición, por código de error del backend o por estado.

#### Scenario: Mensaje por petición
- **WHEN** una petición declara un mensaje propio para el estado 404
- **THEN** el error de esa petición usa ese mensaje y las demás peticiones siguen usando el genérico

#### Scenario: Mensaje por código del backend
- **WHEN** se registra un mensaje para el código `PACKAGE_NOT_FOUND` y el gateway responde un error con ese código
- **THEN** el error usa el mensaje registrado

#### Scenario: Prioridad
- **WHEN** coinciden un mensaje por petición, uno por código y el genérico
- **THEN** se usa el de la petición, después el del código y por último el genérico

### Requirement: Respuestas sin cuerpo
La aplicación SHALL tratar como éxito las respuestas 202 y 204, con o sin cuerpo.

#### Scenario: Lista vacía con 202
- **WHEN** `GET /gateway/positions` responde 202 con `[]`
- **THEN** el servicio entrega una lista vacía

#### Scenario: Borrado
- **WHEN** `DELETE /gateway/places/{id}` responde 204 sin cuerpo
- **THEN** la operación se completa sin error

### Requirement: Paginación tipada
La aplicación SHALL representar las listas paginadas del gateway como páginas con índice de página desde 0.

#### Scenario: Página de resultados
- **WHEN** el gateway responde `{content, page, size, totalElements, totalPages}`
- **THEN** el servicio entrega esa estructura tipada con `content` como lista de entidades

#### Scenario: Parámetros de página
- **WHEN** se pide la segunda página de 20 elementos
- **THEN** la petición lleva `page=1&size=20`

#### Scenario: Listas sin paginar
- **WHEN** el gateway responde directamente un arreglo (por ejemplo `GET /master-domains`)
- **THEN** el servicio entrega un arreglo tipado

### Requirement: Datos de prueba saneados
Los datos de ejemplo del gateway usados en las pruebas SHALL NOT contener tokens, claves de API ni credenciales reales.

#### Scenario: Búsqueda de secretos en los datos de prueba
- **WHEN** se buscan en `ng-ruteando/src/testing/fixtures/gateway` las cadenas `accessToken` con valor no vacío, `refreshToken` con valor no vacío, `X-Api-Key`, `gateway_api_key` y la contraseña de la cuenta de pruebas
- **THEN** no aparece ningún valor real

#### Scenario: Contrato verificado
- **WHEN** se ejecutan las pruebas de los servicios de datos
- **THEN** cada servicio comprueba método, URL, cuerpo y la forma de la respuesta contra su dato de ejemplo
