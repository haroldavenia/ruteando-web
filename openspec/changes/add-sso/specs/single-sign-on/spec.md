## Purpose

Define el inicio de sesión único: Google, GitHub, Apple y el proveedor OpenID Connect de cada empresa, cómo se valida la identidad, cómo se vincula a una persona del gateway y cómo se entrega la sesión.

## ADDED Requirements

### Requirement: El SSO es opcional y apagado por defecto
El servidor SHALL ofrecer solo los proveedores listados en `SSO_ENABLED_PROVIDERS` que tengan sus credenciales, y SHALL quedar apagado si falta `SSO_REDIRECT_BASE_URL` o `MFA_SECRET_KEY`.

#### Scenario: Sin configuración
- **WHEN** no hay proveedores configurados
- **THEN** `GET /gateway/sso/providers` responde una lista vacía, el resto de `/gateway/sso/**` responde `503` y el acceso con contraseña no cambia

#### Scenario: Proveedor sin credenciales
- **WHEN** se pide un proveedor pero faltan sus credenciales
- **THEN** ese proveedor no aparece en la lista

### Requirement: El flujo se liga al navegador y al proveedor
El servidor SHALL usar código de autorización con PKCE (S256), `state` y `nonce` aleatorios de un solo uso y una cookie `HttpOnly` que ligue el regreso al navegador que empezó.

#### Scenario: Regreso sin la cookie
- **WHEN** el regreso llega sin la cookie, con otra, con un `state` ya usado o desconocido, o en otro proveedor
- **THEN** se rechaza con `STATE_INVALID` y no se pide nada al gateway

### Requirement: La identidad se valida
El servidor SHALL validar el `id_token` (firma RS256 o ES256 contra el JWKS, `iss`, `aud`, `exp` y `nonce`) y SHALL exigir un correo verificado por el proveedor.

#### Scenario: `id_token` inválido
- **WHEN** la firma, el emisor, la audiencia, el `nonce` o la caducidad no son válidos
- **THEN** se rechaza con `INVALID_TOKEN` y no se crea sesión

#### Scenario: Correo sin verificar
- **WHEN** el proveedor no confirma que el correo está verificado (o no lo entrega)
- **THEN** se rechaza (`EMAIL_NOT_VERIFIED` o `EMAIL_MISSING`) y no se vincula nada

### Requirement: La sesión del gateway se obtiene por intercambio y no se crean cuentas
El servidor SHALL pedir la sesión con `POST /auth/sso/exchange` y SHALL NOT crear cuentas ni vincular a una persona que el gateway no conoce.

#### Scenario: Persona conocida
- **WHEN** el gateway responde la sesión
- **THEN** el servidor la retiene y entrega un ticket de un solo uso que caduca a los 5 minutos

#### Scenario: Sin cuenta o cuenta inactiva
- **WHEN** el gateway responde `404` o `403`
- **THEN** se explica (`NO_ACCOUNT` o `ACCOUNT_DISABLED`) y no se crea ninguna cuenta

### Requirement: La identidad enlazada no cambia de persona
El servidor SHALL enlazar `(proveedor, sub)` a la persona la primera vez y SHALL rechazar el acceso si esa identidad llega después con el correo de otra persona.

#### Scenario: Correo reasignado en el proveedor
- **WHEN** una identidad ya enlazada a una persona llega con el correo de otra
- **THEN** se rechaza con `IDENTITY_MISMATCH`

#### Scenario: Desvincular
- **WHEN** la persona, con sesión, desvincula un proveedor
- **THEN** sus identidades de ese proveedor se borran y puede volver a vincularlo entrando de nuevo

### Requirement: El SSO no sustituye al segundo factor
Canjear el ticket SHALL dar lo mismo que un inicio de sesión con contraseña: la sesión, el reto de segundo factor o la activación obligatoria, y ningún token antes de superarlo.

#### Scenario: Empresa con segundo factor obligatorio
- **WHEN** se canjea un ticket de una persona sujeta al segundo factor
- **THEN** la respuesta es `mfaRequired` o `mfaEnrollRequired` y no trae tokens

#### Scenario: Ticket usado o caducado
- **WHEN** se canjea un ticket ya usado, desconocido o vencido
- **THEN** la respuesta es `401 TICKET_EXPIRED`

### Requirement: Política por empresa
El SSO SHALL estar permitido por defecto y el administrador SHALL poder apagarlo por empresa; solo `tenant_admin` y `super_admin` administran la política y solo la de su empresa (`super_admin` puede indicar otra).

#### Scenario: Empresa que lo apaga
- **WHEN** la empresa de la persona tiene el SSO apagado
- **THEN** se rechaza con `SSO_DISABLED`

### Requirement: Proveedor OIDC propio de cada empresa
Cada empresa SHALL poder registrar un proveedor OpenID Connect (nombre, emisor https público, cliente, secreto y dominios de correo). El secreto SHALL guardarse cifrado y nunca volver al navegador, y los dominios SHALL ser únicos entre empresas.

#### Scenario: Entrar con el proveedor de la empresa
- **WHEN** la persona escribe un correo cuyo dominio pertenece a una empresa con proveedor y vuelve de él
- **THEN** solo entra si el correo está en los dominios de esa empresa y la persona del gateway es de la misma empresa (`WRONG_DOMAIN`, `WRONG_TENANT` en caso contrario)

#### Scenario: Dominio ajeno o emisor no permitido
- **WHEN** se registra un dominio que ya usa otra empresa, o un emisor que no es una dirección https pública
- **THEN** se rechaza (`409 DOMAIN_TAKEN` o `400 INVALID_PROVIDER`)

#### Scenario: Dominio desconocido
- **WHEN** el correo no pertenece a ninguna empresa con proveedor, o su empresa apagó el SSO
- **THEN** el error es el mismo (`NO_PROVIDER`): no se revela qué empresas lo tienen
