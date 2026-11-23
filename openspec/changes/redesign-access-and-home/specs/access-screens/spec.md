# Spec Delta

## MODIFIED Requirements

### Requirement: Coherencia entre pantallas de acceso
Las pantallas de acceso con formulario (iniciar sesión, crear cuenta, recuperar y restablecer contraseña, y verificar correo) SHALL compartir el mismo aspecto de título, formulario, botón principal y enlaces secundarios.

#### Scenario: Título y botón principal
- **WHEN** se abren dos pantallas de acceso cualesquiera con un formulario
- **THEN** el título tiene la misma tipografía y separación, y el botón principal ocupa todo el ancho del formulario

#### Scenario: Enlaces secundarios
- **WHEN** una pantalla ofrece otras opciones, como «¿Olvidaste tu contraseña?», «¿No tienes cuenta? Crear cuenta», «¿Ya tienes cuenta? Iniciar sesión» o «Volver a iniciar sesión»
- **THEN** los enlaces usan el mismo estilo en todas las pantallas y las invitaciones a cambiar de pantalla van centradas bajo el formulario, a 24px de él

#### Scenario: Comportamiento intacto
- **WHEN** se envía un formulario de acceso, válido o inválido
- **THEN** la validación, los mensajes, el foco al primer campo con error, la redirección y los anuncios a lectores de pantalla se comportan igual que antes

### Requirement: Tarjeta centrada
El contenido de las pantallas de acceso SHALL mostrarse, en pantallas estrechas (menos de 1024px), en una tarjeta centrada en vertical y en horizontal sobre la ilustración, con un ancho máximo cómodo, que no oculta el formulario en pantallas bajas. En pantallas anchas (desde 1024px) SHALL mostrarse en una columna propia a pantalla completa, junto a la ilustración.

#### Scenario: Pantalla alta
- **WHEN** la ventana es alta y mide menos de 1024px de ancho
- **THEN** la tarjeta queda centrada en ambos ejes sobre la ilustración, que llena la ventana

#### Scenario: Pantalla baja o formulario largo
- **WHEN** el contenido es más alto que la ventana, como en el registro con el teclado del móvil abierto
- **THEN** la página se desplaza en vertical y todo el formulario es alcanzable, sin recortes

#### Scenario: Pantalla estrecha
- **WHEN** el ancho de la ventana es de 360px (o de 320px)
- **THEN** la tarjeta ocupa el ancho disponible con margen y no hay desplazamiento horizontal

#### Scenario: Pantalla ancha
- **WHEN** la ventana mide 1024px de ancho o más
- **THEN** la ilustración con la presentación ocupa la columna izquierda, fija mientras el formulario se desplaza, y el formulario ocupa una columna a pantalla completa a la derecha, con un ancho de contenido de 400px como máximo

#### Scenario: Sin desenfoque disponible
- **WHEN** el navegador no soporta el desenfoque del fondo de la tarjeta
- **THEN** la tarjeta se muestra opaca y legible

### Requirement: Fondo decorativo accesible
El fondo de las pantallas de acceso SHALL ser una ilustración decorativa del negocio (depósito, rutas, paradas y zona) que no aporta información, no recibe foco y no interfiere con el formulario.

#### Scenario: Oculto a lectores de pantalla
- **WHEN** un lector de pantalla recorre la página
- **THEN** no anuncia ningún contenido del fondo

#### Scenario: Sin foco ni clics
- **WHEN** la persona recorre la página con el teclado o hace clic sobre el fondo
- **THEN** el fondo no recibe el foco y no intercepta ningún clic

#### Scenario: Se adapta al tema
- **WHEN** cambia entre tema claro y oscuro
- **THEN** el fondo cambia con él y no reduce la legibilidad del texto de la tarjeta

#### Scenario: Rutas luminosas en tema oscuro
- **WHEN** el tema es oscuro
- **THEN** las rutas se dibujan con tonos más luminosos que en el tema claro y cada uno supera 3 a 1 de contraste frente a la superficie oscura

#### Scenario: Sin imágenes externas
- **WHEN** se abre una pantalla de acceso
- **THEN** el fondo y la marca se dibujan sin pedir ninguna imagen al servidor

## ADDED Requirements

### Requirement: Presentación del producto
En pantallas anchas, junto a la ilustración, las pantallas de acceso SHALL mostrar una presentación breve del producto con un título y tres ventajas, que no se muestra en pantallas estrechas y que va después del formulario en el orden de lectura.

#### Scenario: Contenido
- **WHEN** se abre una pantalla de acceso en una ventana de 1024px o más
- **THEN** se ve el título «Planifica y sigue tus rutas.» con la palabra «rutas» destacada y tres ventajas con icono decorativo

#### Scenario: Pantalla estrecha
- **WHEN** la ventana mide menos de 1024px
- **THEN** la presentación no se muestra y el eslogan «Planifica y sigue tus rutas» aparece bajo la marca

#### Scenario: Orden de lectura
- **WHEN** un lector de pantalla o el teclado recorre la página
- **THEN** el formulario se encuentra antes que la presentación, aunque esta se vea a la izquierda

#### Scenario: Colores forzados
- **WHEN** el navegador usa colores forzados
- **THEN** la palabra destacada vuelve a texto normal, sin depender del degradado

### Requirement: Controles de las pantallas de acceso
Los campos, botones y enlaces de las pantallas de acceso SHALL tener un aspecto y un tamaño táctil comunes, definidos con los tokens de Angular Material y sin alterar el aspecto de los controles de otras áreas.

#### Scenario: Campos con contorno
- **WHEN** se abre cualquier pantalla de acceso con campos
- **THEN** los campos se muestran con contorno y esquinas de 12px, y los mensajes de error aparecen bajo su campo con el color de error

#### Scenario: Botones
- **WHEN** se muestra el botón principal o uno secundario de una pantalla de acceso
- **THEN** mide 48px de alto y tiene esquinas de 12px, y el principal ocupa todo el ancho del formulario

#### Scenario: Enlaces
- **WHEN** una pantalla muestra enlaces propios del formulario, como «¿Olvidaste tu contraseña?»
- **THEN** cada enlace usa el color de la marca (no el del navegador), conserva el subrayado y, si es un enlace aparte, mide al menos 44px de alto

#### Scenario: Negrita
- **WHEN** una pantalla de acceso muestra texto en negrita, como el correo del panel «Revisa tu correo»
- **THEN** se usa el peso 500 que la aplicación carga y no una negrita sintetizada

### Requirement: Registro compacto
La pantalla de creación de cuenta SHALL mostrar el nombre y los apellidos en una misma fila cuando haya espacio, sin cambiar el orden de tabulación ni los campos.

#### Scenario: Con espacio
- **WHEN** la ventana mide más de 420px de ancho
- **THEN** «Nombre» y «Apellidos» comparten fila y el resto de campos ocupan el ancho del formulario

#### Scenario: Pantalla muy estrecha
- **WHEN** la ventana mide 420px de ancho o menos
- **THEN** todos los campos se muestran en una sola columna

### Requirement: Requisitos de contraseña como etiquetas
Los requisitos de la política de contraseña SHALL mostrarse como etiquetas con icono y texto cuyo estado (pendiente, cumplido o no cumplido) se distingue también sin el color.

#### Scenario: Estados
- **WHEN** la persona escribe una contraseña en el registro o en el restablecimiento
- **THEN** cada requisito se muestra como una etiqueta redondeada: neutra con un círculo vacío si está pendiente, verde con una marca si está cumplido y rojo suave con una cruz si no se cumple tras tocar el campo

#### Scenario: Barra de seguridad
- **WHEN** el campo de contraseña del registro o del restablecimiento muestra sus requisitos
- **THEN** una barra de cinco tramos sobre las etiquetas rellena con el degradado de la marca un tramo por requisito cumplido, y no se anuncia porque las etiquetas ya dicen el estado

#### Scenario: Lectores de pantalla
- **WHEN** un lector de pantalla recorre los requisitos
- **THEN** anuncia cada texto con su estado («cumplido», «no cumplido» o «pendiente») y el icono no se anuncia

#### Scenario: Contraste
- **WHEN** se mide el texto de cada etiqueta frente a su fondo
- **THEN** la relación de contraste es de al menos 4,5 a 1 en el tema claro y en el oscuro

### Requirement: Título de bienvenida y frase de apoyo
Las pantallas de iniciar sesión, crear cuenta, recuperar y verificar SHALL abrir con un título y una frase de apoyo breve, y el título SHALL conservar el margen común de las pantallas de acceso.

#### Scenario: Iniciar sesión
- **WHEN** se abre `/acceso`
- **THEN** el título es «Bienvenido de nuevo» y la frase de apoyo, «Inicia sesión para seguir tus rutas.», y el botón principal se llama «Iniciar sesión»

#### Scenario: Crear cuenta
- **WHEN** se abre `/acceso/registro`
- **THEN** el título es «Crea tu cuenta» y la frase de apoyo, «Empieza a planificar tus rutas.»

#### Scenario: Margen del título
- **WHEN** una pantalla muestra su frase de apoyo bajo el título
- **THEN** la frase queda a menos de 12px del título y el título conserva su margen inferior de 20px

### Requirement: Iconos en los campos
Los campos de correo y contraseña de las pantallas de acceso SHALL llevar un icono decorativo a la izquierda que no cambia su nombre accesible.

#### Scenario: Correo y contraseña
- **WHEN** se muestra un campo de correo o de contraseña de una pantalla de acceso
- **THEN** lleva un icono de sobre o de candado, oculto a lectores de pantalla, y su etiqueta y errores siguen siendo los mismos

#### Scenario: Otros campos
- **WHEN** se muestran el nombre, los apellidos o la empresa
- **THEN** no llevan icono

### Requirement: Botón principal con el hilo de la marca
El botón principal de los formularios de acceso SHALL llevar el degradado de la marca mientras esté activo y SHALL volver al color liso de Material al desactivarse.

#### Scenario: Activo
- **WHEN** el botón principal está activo
- **THEN** su fondo es el degradado de la marca y su texto cumple 4,5 a 1 de contraste sobre los dos extremos, en el tema claro y en el oscuro

#### Scenario: Desactivado
- **WHEN** el formulario se envía y el botón queda desactivado
- **THEN** el botón no muestra el degradado y se ve como un botón desactivado de Material

### Requirement: Enlace para recuperar la contraseña y para crear cuenta
En iniciar sesión, «¿Olvidaste tu contraseña?» SHALL ir a la derecha, entre la contraseña y el botón principal, y la invitación a crear cuenta SHALL ir centrada bajo el formulario.

#### Scenario: Olvidaste tu contraseña
- **WHEN** se abre `/acceso`
- **THEN** el enlace «¿Olvidaste tu contraseña?» aparece a la derecha, entre el campo de contraseña y el botón, lleva a `/acceso/recuperar` y mide al menos 44px de alto

#### Scenario: Crear cuenta
- **WHEN** se abre `/acceso`
- **THEN** bajo el formulario, centrado y a 24px de él, aparece «¿No tienes cuenta? Crear cuenta», que lleva a `/acceso/registro`

### Requirement: Pasos del registro en la presentación
En pantallas anchas, la presentación de crear cuenta SHALL mostrar el camino hasta la primera jornada en tres pasos en lugar de las ventajas del producto.

#### Scenario: Tres pasos
- **WHEN** se abre `/acceso/registro` en una ventana de 1024px o más
- **THEN** la presentación muestra «Tu primera jornada, en minutos.» y los pasos «Crea tu cuenta», «Verifica tu correo» y «Planifica tu primera jornada», unidos por una línea y con el primero destacado

#### Scenario: Orden de lectura
- **WHEN** un lector de pantalla recorre los pasos
- **THEN** los encuentra como una lista ordenada y los números dibujados se ignoran

### Requirement: Paneles de estado con icono
Los estados de cuenta (correo enviado, verificando, enlace no válido) SHALL mostrarse en un panel con un icono grande, el título y el texto centrados.

#### Scenario: Revisa tu correo
- **WHEN** se crea una cuenta o se pide recuperar la contraseña
- **THEN** el panel muestra un icono de correo, el título «Revisa tu correo» y el mensaje de siempre, y el icono no se anuncia

#### Scenario: Verificando
- **WHEN** se está verificando el correo
- **THEN** el panel muestra el icono de ruta con un anillo punteado que gira, quieto si se pide movimiento reducido, y el mensaje de progreso sigue anunciándose como estado

#### Scenario: Enlace no válido
- **WHEN** el enlace de verificación o de restablecimiento no sirve
- **THEN** el panel muestra un icono de enlace roto sobre fondo de error, el mensaje y el formulario o enlace para pedir otro

### Requirement: Selector de tema en las pantallas de acceso
Las pantallas de acceso SHALL ofrecer el selector de tema arriba a la derecha del formulario, de modo que se pueda elegir antes de iniciar sesión.

#### Scenario: Disponible antes de entrar
- **WHEN** se abre cualquier pantalla de acceso
- **THEN** arriba a la derecha del formulario hay un botón con la elección actual que abre las opciones Sistema, Claro y Oscuro, sin tapar la marca ni los campos en ningún ancho
