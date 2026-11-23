# Design

## Context

Estado observado en el código (ver `proposal.md` para la motivación):

- `ng-ruteando` (Angular 21, zone.js, Material M3) ya tiene `AuthService` (`login`, `refresh`, `logout`, `loadProfile`, `restoreSession`, renovación programada), `CurrentUser`, `authGuard`/`roleGuard`/`guestGuard`, interceptores (token, renovación, errores en español personalizables con `withErrorMessage`/`provideApiErrorMessages`) y `TokenStorageService`.
- `AppComponent` renderiza `<app-shell />`, así que **todo** (también `/acceso`) se pinta dentro de la barra y el menú lateral. Las rutas son `''` (inicio, público), `acceso` (título provisional, `guestGuard`), `sin-permiso` y un comodín a `''`.
- `AuthService.logout` hace `POST /auth/logout` con cuerpo `null`; el ejemplo real capturado del gateway lleva `{ "refreshToken": ... }`, y los errores del cierre se ignoran a propósito: el fallo no se ve.
- Bundle inicial en 490,6 kB frente al aviso de 500 kB (margen de ~9 kB); estilos de componente con límite de error de 4 kB. `prerender: true` y SSR con `CommonEngine`; `server.js` publica solo la versión de navegador (`index.csr.html`).
- Contrato del gateway verificado con ejemplos reales y en vivo: `POST /auth/register` (`{email, password, firstName, lastName, tenantName}` → `201 {user, tenant, message}`, sin tokens), `POST /auth/verify-email` (`{token}` → sesión completa), `GET /auth/verify-email?token=` (devuelve una página HTML ya hecha), `POST /auth/resend-verification` y `POST /auth/forgot-password` (`{email}` → 200 con mensaje neutro), `POST /auth/reset-password` (`{token, newPassword}`), `POST /auth/logout` (`{refreshToken}`). Los errores llegan como `{error, message, timestamp, path}`. El login funciona con `emailVerified: false`.
- Legacy (`master/js/custom/access`, `jade/views/pages`): login con credenciales de prueba precargadas, registro con contraseña `^[a-zA-Z0-9]{6,10}$` y casilla de términos, botones de Facebook/Google/LinkedIn (Satellizer), `register_two` (asistente de 3 pasos sin ruta, con país, ciudad e industria), activación y restablecimiento por `:token` en la ruta, recuperación, y cierre de sesión con diálogo de confirmación.

## Goals / Non-Goals

**Goals:**
- Que una persona pueda crear una cuenta, verificarla, entrar, recuperar su contraseña y salir, con la infraestructura de sesión ya hecha.
- Un área privada realmente protegida y pantallas de acceso con layout propio, accesibles y en español.
- Corregir el cuerpo del cierre de sesión.
- No consumir margen del bundle inicial.

**Non-Goals:**
- Acceso social, aceptar invitaciones (`/invitations/accept/*`), cambiar contraseña, editar perfil, el asistente `registerTwo`, "recordarme", términos y condiciones.
- Cambiar la política de contraseñas, la verificación obligatoria de correo o los correos que envía el gateway (son del backend).
- Pantallas de negocio (catálogos, jornadas, rutas).

## Decisions

1. **Estructura de rutas y layouts.** `AppComponent` queda con un `<router-outlet />`. Las rutas pasan a ser:
   ```
   ''           -> ShellComponent (carga diferida) canActivate+canActivateChild [authGuard]
                    ''            -> HomeComponent
                    'sin-permiso' -> ForbiddenComponent
   'acceso'     -> AccessLayoutComponent (carga diferida)
                    ''            -> LoginComponent       [guestGuard]
                    'registro'    -> RegisterComponent    [guestGuard]
                    'recuperar'   -> ForgotPasswordComponent [guestGuard]
                    'verificar-email' -> VerifyEmailComponent  (sin guarda)
                    'restablecer' -> ResetPasswordComponent    (sin guarda)
   '**'         -> redirectTo ''
   ```
   `ShellComponent` ya contiene el `router-outlet` dentro de `mat-sidenav-content`, así que pasa a ser el componente de la ruta padre sin cambiar su plantilla (salvo el menú de usuario). `canActivateChild` vuelve a comprobar la sesión en cada navegación interna; si la sesión caduca durante el uso, `SessionRefreshService.expireSession()` ya redirige. Efecto lateral buscado: Toolbar, Sidenav, List e Icon salen del bundle inicial. Alternativa descartada: mantener el shell en `AppComponent` y ocultarlo con `@if` según la URL (acopla la raíz a las rutas y deja el chunk de Material en el arranque).

2. **Formularios reactivos tipados** (`FormBuilder.nonNullable`, `Validators`), con componentes standalone, `OnPush`, plantillas con `@if` y Material (`mat-card`, `mat-form-field`, `matInput`, `mat-button`, `mat-progress-bar`, `mat-icon`). Piezas compartidas en `features/access/shared/`:
   - `PasswordFieldComponent`: `mat-form-field` con botón de mostrar/ocultar (etiquetas "Mostrar contraseña"/"Ocultar contraseña" y `aria-pressed`); recibe el `FormControl`, la etiqueta y el valor de `autocomplete`.
   - `passwordsMatch()` (validador de grupo, error en el campo de confirmación) y constantes de validación (mínimo 8 caracteres) y mensajes de error en español por tipo de validador.
   - Directiva `FocusFirstInvalid`: en un envío con el formulario inválido, marca los campos como tocados y da el foco al primer control `.ng-invalid` (solo en navegador).
   - Región de resultados: un contenedor `role="status"`/`aria-live="polite"` para éxitos y `role="alert"` para errores del envío.
   Alternativa descartada: formularios por plantilla (`ngModel`): peor soporte de validadores cruzados y de pruebas.

3. **`AuthService`: operaciones nuevas y corrección del cierre.**
   - `startSession(session)` privado (tokens, usuario actual, renovación programada), usado por `login` y por `verifyEmail`.
   - `register(input)`, `verifyEmail(token)`, `resendVerification(email)`, `forgotPassword(email)`, `resetPassword(token, newPassword)`, con modelos `RegisterRequest`, `RegisterResponse` (`user`, `tenant {id, name, slug, plan}`, `message`) y `MessageResponse` en `core/auth/session.model.ts`.
   - `logout()`: lee el token de refresco; si existe llama a `POST /auth/logout` con `{ refreshToken }`; si no existe (o ya caducó), solo limpia y navega. Sigue ignorando el error del gateway (la limpieza local manda); como un fallo así no se ve, una prueba con el ejemplo real verifica el cuerpo enviado.
   - Mensajes por operación con `withErrorMessage` en `core/auth/auth-messages.ts` (no en `features/`, porque pertenecen al servicio): login `{401: 'Correo o contraseña incorrectos'}`; register `{409: 'Ya existe una cuenta con ese correo', 400: 'Revisa los datos e inténtalo de nuevo'}`; verifyEmail y resetPassword `{400, 401, 404, 410: 'El enlace no es válido o ha caducado'}`. Los estados exactos que usa el gateway para un token inválido no están documentados (no hay captura): se cubren los habituales y se comprueba en la verificación en vivo; si el gateway devuelve un `code` específico se añadirá por código con `provideApiErrorMessages`.

4. **Destino seguro tras iniciar sesión (`returnUrl`).** Función pura `safeReturnUrl(raw)` en `core/auth/return-url.ts`, usada por el login y probada con vectores de ataque. Reglas: debe ser texto que empiece por una sola `/`; se rechazan `//`, `/\`, cualquier carácter de control o espacio (el navegador los elimina y `/\t/evil` se convertiría en `//evil`), esquemas (`javascript:`, `http:`), y rutas que empiecen por `/acceso`; se normaliza con `new URL(raw, 'http://origen.invalid')` exigiendo el mismo origen; se devuelve ruta + consulta + fragmento. Cualquier otra cosa devuelve `/`. Se navega con `router.navigateByUrl`.

5. **Acciones con token de un solo uso solo en navegador.** `VerifyEmailComponent` y `ResetPasswordComponent` leen `token` de la URL y, en el mismo momento, sustituyen la URL por una sin `token` (`router.navigate([], { queryParams: { token: null }, queryParamsHandling: 'merge', replaceUrl: true })`) para que no quede en el historial. La llamada a `verifyEmail` se hace en `afterNextRender` (no durante el render de servidor): si el SSR consumiera el token de un solo uso, la llamada del cliente fallaría. Una bandera impide una segunda llamada ante re-renderizados. El token se conserva en memoria del componente hasta el envío del restablecimiento.

6. **Registro.** Campos: nombre, apellidos, nombre de la empresa (`tenantName`), correo, contraseña y confirmación. Tras `201` se muestra un panel "Revisa tu correo" (con la dirección usada, botón "Reenviar correo" y enlace a iniciar sesión) y **no** se inicia sesión aunque el gateway lo permitiría sin verificar: así el flujo coincide con el mensaje del backend ("Revisa tu correo para verificar la cuenta"). Los campos de contraseña se vacían tras cada envío, correcto o no. La validación de cliente de la contraseña es solo `required` + mínimo 8 caracteres + coincidencia (el patrón del legacy `^[a-zA-Z0-9]{6,10}$` rechazaría contraseñas válidas del gateway, como las de sus propios ejemplos); la política real la aplica el backend y su rechazo se muestra con el mensaje de 400 del registro.

7. **Recuperación y restablecimiento.** `forgotPassword` muestra siempre el mensaje neutro (sin distinguir existencia). En un fallo (red o 5xx) muestra el error genérico y **no** la confirmación. `resetPassword` correcto navega a `/acceso` con el aviso "Contraseña actualizada, ya puedes iniciar sesión" (por `MatSnackBar` cargado de forma diferida, como el aviso de sesión caducada), sin iniciar sesión.

8. **Menú de usuario y cierre confirmado.** El shell añade a la barra un botón de cuenta (`mat-menu`) con el nombre (o el correo si no hay nombre) y el correo en una cabecera no interactiva, y la opción "Cerrar sesión", que abre un `ConfirmDialogComponent` reutilizable (`shared/confirm-dialog/`, entradas: título, mensaje, texto del botón de confirmar; sirve luego para los borrados de las listas). Escape o "Cancelar" cierran sin cambios y devuelven el foco al botón de cuenta. Confirmar llama a `AuthService.logout()`.

9. **Carga diferida y presupuesto.** Cada pantalla es un `loadComponent`; `AccessLayoutComponent` y `ShellComponent` también. Los estilos de componente se mantienen mínimos (el aspecto sale de los tokens `--mat-sys-*`) para no acercarse a los 2 kB de aviso por componente. `@angular/forms` y los módulos de Material de formulario van en los fragmentos diferidos. Se compara el tamaño del bundle inicial antes y después: debe bajar al salir el shell del arranque.

10. **SSR y prerender.** Con `prerender: true` el build prerenderiza las rutas descubiertas; `/` pasará por `authGuard` y se resolverá como la pantalla de acceso. Es inofensivo (el servidor del repositorio sirve `index.csr.html`), pero se comprueba en la primera compilación: si el build avisa o falla, se pasa a `prerender: { discoverRoutes: false }` más `routesFile` solo con `/acceso`. Los escenarios SSR de las specs se actualizan para pedir `/acceso`.

11. **Pruebas.**
    - Servicio: `AuthService` con los fixtures reales de `auth` (register, verify-email, resend-verification, forgot-password, reset-password, logout) comprobando método, URL, cuerpo, mensajes de error y que no se guardan tokens donde no toca.
    - `safeReturnUrl`: pruebas de tabla con los vectores de ataque.
    - Componentes: una prueba por pantalla con `TestBed` y manipulación del DOM (escribir, enviar, estados de carga, errores, anuncios `aria-live`, foco), `HttpTestingController` y `Router` real.
    - Rutas: `RouterTestingHarness` con las rutas reales (anónimo en `/`, con sesión en `/acceso`, enlaces de correo con sesión, `returnUrl`, comodín).
    - Navegador: comprobación con Chrome sin interfaz (capturas a 360 y 1200 px, orden de tabulación y Intro) y `curl` al servidor SSR para `/acceso`.
    - Gateway real: verificación opcional y **solo con confirmación expresa** del usuario (cuenta desechable): login incorrecto (mensaje), registro duplicado (409) y solicitud de recuperación (200 neutro). La verificación de correo y el restablecimiento dependen de un token enviado por correo y se prueban contra el gateway falso.
12. **Textos** en español, en un fichero de constantes de la feature (`access.messages.ts`) para facilitar una futura internacionalización; no se introduce una librería de i18n.

## Risks / Trade-offs

- [El bundle inicial tiene ~9 kB de margen] → shell y pantallas diferidos; se mide antes y después y la tarea de cierre exige el build sin avisos.
- [El token de verificación o de restablecimiento es de un solo uso] → solo se consume en navegador, una vez, y se retira de la URL; el SSR nunca lo ve consumido.
- [`returnUrl` es un vector de redirección abierta] → `safeReturnUrl` con lista de rechazos y pruebas de tabla; ante la duda, inicio.
- [El prerender de `/` pasa por la guarda] → comprobación en el primer build y alternativa con `discoverRoutes: false`.
- [Estados HTTP del gateway para un token inválido sin documentar] → mapeo amplio (400, 401, 404, 410) y verificación en vivo; ampliable por código con `provideApiErrorMessages`.
- [El gateway permite iniciar sesión sin verificar el correo] → decisión de backend; la app no lo bloquea. Si producto quiere exigirlo, es un cambio posterior (banner o bloqueo por `emailVerified`).
- [El registro revela si un correo ya existe (409)] → inherente al contrato del gateway y a la experiencia de registro; la recuperación y el reenvío sí son neutros.
- [Proteger `/` rompe los escenarios SSR existentes] → las specs `frontend-app-shell` y `frontend-platform` se modifican en este change para usar `/acceso`.
- [Los enlaces de los correos los define el backend] → si no apuntan a `/acceso/verificar-email?token=` y `/acceso/restablecer?token=`, las pantallas son correctas pero inalcanzables desde el correo; se resuelve configurando la plantilla del gateway (ver Open Questions).
- [Sin captura de errores para estos endpoints] → los mensajes por estado son una hipótesis razonable; el mecanismo de mensajes personalizables permite corregirlos sin tocar los interceptores.

## Migration Plan

1. Rama `feat/access-screens` partiendo de la rama actual.
2. Orden: servicio y modelos, utilidad `safeReturnUrl`, piezas compartidas, reorganización de rutas y layouts (con el área privada ya protegida), menú de usuario, pantallas una a una, verificación de presupuesto y SSR, documentación.
3. Rollback: revertir la rama. El único cambio visible de comportamiento es que `/` exige sesión; no hay migración de datos.

## Open Questions

- ¿A qué dirección apuntan los enlaces de los correos de verificación y de restablecimiento? Las pantallas esperan `/acceso/verificar-email?token=...` y `/acceso/restablecer?token=...`; si el gateway genera otras (por ejemplo, su propia página HTML de `GET /auth/verify-email`), hay que alinear la plantilla del backend. No cambia las specs ni las tareas.
- ¿Cuál es la política de contraseñas del gateway? Este change valida solo un mínimo de 8 caracteres; se puede endurecer cuando se documente.
- ¿Hay textos legales (términos y privacidad) que mostrar en el registro? Hoy no se incluye la casilla del legacy porque no hay texto ni enlace al que apuntar.
