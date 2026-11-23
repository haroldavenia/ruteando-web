## 1. Fase 0: decisiones

- [x] 1.1 La persona elige métodos (Google, GitHub, Apple y SSO empresarial), política (permitido con interruptor por empresa), relación con el 2FA (se sigue pidiendo) y cómo se obtiene la sesión (intercambio en el gateway)
- [x] 1.2 Documentar el contrato de `POST /auth/sso/exchange` en `design.md`
- [ ] 1.3 Pedir el endpoint de intercambio al equipo del gateway real (HanoIT). Texto redactado en la sesión del 2026-11-12; a esa fecha el gateway real NO tiene el endpoint (confirmado por la persona)

## 2. Servidor

- [x] 2.1 Extraer `afterLogin(session)` de `server/mfa/index.js` (login y SSO comparten el segundo paso); las 27 pruebas del 2FA siguen en verde
- [x] 2.2 `server/sso/jwt.js` (firma RS256 y ES256 con `node:crypto`, rechazo de `none` y HS*), `http.js` (tiempo, tamaño, sin redirecciones), `oidc.js` (descubrimiento, PKCE, validación del `id_token`) y `github.js`
- [x] 2.3 `server/sso/store.js` (identidades, política, proveedor y dominios de empresa, eventos) con migraciones
- [x] 2.4 `server/sso/index.js`: inicio, regreso (GET y `form_post`), ticket, canje, identidades, política y proveedor de empresa; montado antes del proxy en `server.js` y en `proxy.conf.js`
- [x] 2.5 `POST /auth/sso/exchange` en `scripts/mock-gateway.mjs` y `scripts/mock-oidc-provider.cjs` (proveedor simulado)
- [x] 2.6 Pruebas en `server/test/sso-flow.test.js` (flujo, cookie, `state`, correo sin verificar, sin cuenta, `id_token` inválido, identidad cambiada, política, segundo factor, empresa, SSRF, Apple, GitHub)

## 3. Frontend

- [x] 3.1 `SsoApi`, modelos y mensajes; `AuthService.completeSso`
- [x] 3.2 Botones «Continuar con …» en el acceso y pantalla de regreso `/access/sso` (con el segundo paso)
- [x] 3.3 Cuentas vinculadas en `/profile` y política y proveedor de empresa en `/security`
- [x] 3.4 Textos en inglés y portugués, pruebas de los componentes

## 4. Documentación y entrega

- [x] 4.1 `.env.example`, `README.md` (sección «Inicio de sesión único») y `CLAUDE.md`
- [x] 4.2 Verificar con el simulado en el navegador (`scripts/mock-oidc-provider.cjs`) y con CI en verde
- [ ] 4.3 Verificar con un proveedor real (Google primero) y con el gateway real cuando ofrezca el intercambio (bloqueada: sin el endpoint no se puede probar contra el gateway real)
- [ ] 4.4 Archivar el change tras fusionar y verificar
