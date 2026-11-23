---
trigger: always_on
---

# Seguridad operativa
- Credenciales, tokens y la `X-Api-Key` solo viven en `.env` (ignorado por git) o en el gestor de secretos. No leas ni muestres `.env` salvo para comprobar que una variable existe; nunca copies sus valores a código, evidencia, Issues o PR.
- En el navegador: access token solo en memoria; refresh token en `localStorage` (ADR-0004). Nada de `client_id`/`client_secret`.
- Datos del backend se pintan como texto; prohibido `ng-bind-html`/`$sce.trustAsHtml` con datos del servidor. Redirecciones tras login solo a estados internos.
- Exportaciones CSV/XLSX: anteponer `'` a celdas que empiecen por `= + - @`.
- Prohibido: borrar datos ajenos al tenant de pruebas, pruebas de carga contra el backend compartido, `git push --force`, `git reset --hard` sobre trabajo ajeno. TLS: nunca desactivar la verificación de certificados; usar `NODE_EXTRA_CA_CERTS`.
