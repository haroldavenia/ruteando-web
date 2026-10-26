# gateway-proxy Specification

## Purpose
Define cómo el servidor del repositorio y el servidor de desarrollo reenvían las peticiones del frontend al HanoIT Gateway, aportando la clave de API desde el servidor para que el navegador nunca la conozca.

## Requirements

### Requirement: Reenvío de peticiones
El servidor SHALL reenviar toda petición a `/gateway/**` hacia `<GATEWAY_URL>/api/v1/**` conservando método, parámetros de consulta, cuerpo, código de estado y cuerpo de la respuesta.

#### Scenario: Consulta con parámetros
- **WHEN** el navegador pide `GET /gateway/places?page=0&size=20`
- **THEN** el gateway recibe `GET /api/v1/places?page=0&size=20` y la respuesta llega al navegador con el mismo estado y cuerpo

#### Scenario: Cuerpo JSON
- **WHEN** el navegador envía `POST /gateway/auth/login` con un cuerpo JSON
- **THEN** el gateway recibe el mismo cuerpo y tipo de contenido

#### Scenario: Respuesta sin cuerpo
- **WHEN** el gateway responde 204 o 202
- **THEN** el navegador recibe ese mismo estado

### Requirement: La clave de API solo vive en el servidor
El servidor SHALL añadir la cabecera `X-Api-Key` a cada petición reenviada con el valor de la variable de entorno `GATEWAY_API_KEY` y SHALL NOT exponer ese valor al navegador.

#### Scenario: Inyección de la clave
- **WHEN** el navegador envía una petición a `/gateway/**` sin `X-Api-Key`
- **THEN** el gateway la recibe con `X-Api-Key` igual a `GATEWAY_API_KEY`

#### Scenario: Clave enviada por el cliente
- **WHEN** el navegador envía su propia cabecera `X-Api-Key`
- **THEN** el gateway recibe únicamente el valor de `GATEWAY_API_KEY`

#### Scenario: Clave ausente de las respuestas y del bundle
- **WHEN** se inspeccionan las cabeceras de respuesta del proxy y los ficheros de `ng-ruteando/dist`
- **THEN** el valor de `GATEWAY_API_KEY` no aparece en ninguno

### Requirement: Petición de servidor a servidor
El servidor SHALL NOT reenviar al gateway la cabecera `Origin` del navegador, para que la llamada se trate como de servidor a servidor.

#### Scenario: Petición con Origin
- **WHEN** el navegador envía una petición a `/gateway/**` con la cabecera `Origin`
- **THEN** el gateway la recibe sin cabecera `Origin` y con `X-Api-Key`

#### Scenario: Inicio de sesión desde el navegador
- **WHEN** la aplicación abierta en el navegador inicia sesión mediante `/gateway/auth/login`
- **THEN** el gateway responde 200 y no 403

### Requirement: Autorización reenviada sin custodia
El servidor SHALL reenviar la cabecera `Authorization` sin modificarla y SHALL NOT almacenar ni registrar tokens.

#### Scenario: Token de acceso
- **WHEN** el navegador envía `Authorization: Bearer <token>`
- **THEN** el gateway recibe esa misma cabecera

#### Scenario: Registro sin credenciales
- **WHEN** se revisan los registros del servidor tras varias peticiones autenticadas
- **THEN** no contienen tokens ni la clave de API

### Requirement: Subidas multipart en streaming
El servidor SHALL reenviar las peticiones `multipart/form-data` sin analizar ni almacenar el cuerpo en memoria.

#### Scenario: Fichero adjunto
- **WHEN** el navegador envía `POST /gateway/packages/upload` con un fichero
- **THEN** el gateway recibe el cuerpo íntegro con su tipo de contenido y `boundary` originales

### Requirement: Fallos del gateway
El servidor SHALL responder con un error JSON de forma estable cuando el gateway no esté disponible.

#### Scenario: Gateway inaccesible
- **WHEN** el gateway no acepta la conexión
- **THEN** la respuesta es 502 con un cuerpo JSON que incluye un mensaje genérico y no incluye la dirección ni la clave

#### Scenario: Gateway lento
- **WHEN** el gateway no responde dentro del tiempo de espera configurado
- **THEN** la respuesta es 504 con un cuerpo JSON de mensaje genérico

#### Scenario: Clave no configurada
- **WHEN** el servidor arranca sin `GATEWAY_API_KEY`
- **THEN** arranca, escribe un aviso en el registro y responde 503 con un mensaje claro a las peticiones a `/gateway/**`

### Requirement: Proxy de desarrollo equivalente
El servidor de desarrollo de `ng-ruteando` SHALL aplicar el mismo reenvío, reescritura de ruta e inyección de clave con las mismas variables de entorno.

#### Scenario: Petición con `ng serve`
- **WHEN** el navegador abierto en `ng serve` pide `GET /gateway/places`
- **THEN** el gateway recibe `GET /api/v1/places` con `X-Api-Key` y la respuesta llega sin error de CORS

#### Scenario: Variables ausentes en desarrollo
- **WHEN** se ejecuta `ng serve` sin `GATEWAY_API_KEY`
- **THEN** el arranque muestra un aviso con el nombre de la variable que falta

### Requirement: Ruta única del proxy
La ruta `/gateway/**` SHALL ser atendida por el proxy antes que por los analizadores de cuerpo, el contenido estático y la página de la aplicación, y SHALL ser la única ruta de API que atiende el servidor.

#### Scenario: Recurso inexistente del gateway
- **WHEN** el gateway responde 404 a `GET /gateway/recurso-que-no-existe`
- **THEN** el navegador recibe ese 404 y no el HTML de la aplicación

#### Scenario: Rutas propias retiradas
- **WHEN** se piden `GET /api/me` o `POST /auth/login`
- **THEN** el servidor responde 404 en JSON y no las reenvía al gateway
