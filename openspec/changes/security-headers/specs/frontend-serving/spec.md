## ADDED Requirements

### Requirement: Cabeceras de seguridad
El servidor SHALL añadir cabeceras de seguridad a todas sus respuestas, incluidas las del proxy del gateway y las del contenido estático.

#### Scenario: Cabeceras básicas
- **WHEN** se pide cualquier ruta del servidor
- **THEN** la respuesta lleva `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy: same-origin` y una `Permissions-Policy` que no concede cámara, micrófono ni geolocalización, y no lleva `X-Powered-By`

#### Scenario: HSTS solo con HTTPS
- **WHEN** la petición llega con `X-Forwarded-Proto: https`
- **THEN** la respuesta lleva `Strict-Transport-Security`
- **AND** una petición sin esa cabecera sobre HTTP no la lleva

### Requirement: Política de seguridad de contenido
El servidor SHALL enviar una `Content-Security-Policy` que solo permita ejecutar scripts del propio origen, prohíba los objetos incrustados y la incrustación en otros sitios, y admita únicamente los orígenes externos que la aplicación necesita.

#### Scenario: Modo por defecto
- **WHEN** `CSP_MODE` no está definida
- **THEN** la política se envía en `Content-Security-Policy-Report-Only` y no en `Content-Security-Policy`

#### Scenario: Modo de bloqueo
- **WHEN** `CSP_MODE=enforce`
- **THEN** la política se envía en `Content-Security-Policy`

#### Scenario: Desactivada
- **WHEN** `CSP_MODE=off`
- **THEN** la respuesta no lleva ninguna de las dos cabeceras de CSP y conserva las demás cabeceras de seguridad

#### Scenario: Contenido de la política
- **WHEN** se lee la política enviada
- **THEN** `script-src` es `'self'` sin `'unsafe-inline'` ni `'unsafe-eval'`, `object-src` es `'none'`, `frame-ancestors` es `'none'`, `base-uri` y `form-action` son `'self'`, y `img-src` incluye `https://tile.openstreetmap.org`

#### Scenario: Orígenes de imagen adicionales
- **WHEN** `CSP_IMG_SRC` contiene `https://tiles.example.invalid`
- **THEN** `img-src` incluye ese origen además de los de serie

#### Scenario: Sin violaciones en la aplicación
- **WHEN** se recorren en un navegador real, servidos por este servidor, el acceso, el inicio, un listado, el mapa de lugares y el editor de zonas
- **THEN** la consola no registra ninguna violación de la política
