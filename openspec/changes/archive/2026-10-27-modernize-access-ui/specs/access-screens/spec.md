# Spec Delta

## ADDED Requirements

### Requirement: Tema claro y oscuro automático
Las pantallas de acceso SHALL mostrarse en tema claro u oscuro según la preferencia del sistema de la persona, sin afectar al tema del resto de la aplicación.

#### Scenario: Preferencia oscura
- **WHEN** el sistema tiene el tema oscuro activado y se abre una pantalla de acceso
- **THEN** la pantalla se muestra con fondo, tarjeta, texto y marca en tonos oscuros

#### Scenario: Preferencia clara
- **WHEN** el sistema tiene el tema claro activado y se abre una pantalla de acceso
- **THEN** la pantalla se muestra en tonos claros

#### Scenario: Cambio de preferencia
- **WHEN** la persona cambia el tema del sistema con la pantalla abierta
- **THEN** la pantalla cambia de tema sin recargarse

#### Scenario: El resto de la aplicación no cambia
- **WHEN** la persona inicia sesión con el tema oscuro del sistema activado
- **THEN** el área privada se muestra con el tema que tenía antes de este cambio

### Requirement: Marca de la aplicación
Cada pantalla de acceso SHALL mostrar la marca de Ruteando, con su emblema y el nombre como texto real, con los colores del tema.

#### Scenario: Marca visible
- **WHEN** se abre cualquier pantalla de acceso
- **THEN** se ve el emblema y el texto «Ruteando» encima del contenido de la tarjeta

#### Scenario: Emblema decorativo
- **WHEN** un lector de pantalla recorre la marca
- **THEN** anuncia solo el nombre «Ruteando» y ignora el emblema

#### Scenario: Colores del tema
- **WHEN** cambia entre tema claro y oscuro
- **THEN** el emblema y el texto de la marca cambian con él y siguen siendo legibles

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

#### Scenario: Sin imágenes externas
- **WHEN** se abre una pantalla de acceso
- **THEN** el fondo y la marca se dibujan sin pedir ninguna imagen al servidor

### Requirement: Movimiento reducido
Cualquier animación de las pantallas de acceso SHALL ser breve, ocurrir una sola vez al entrar y desactivarse cuando la persona pide movimiento reducido.

#### Scenario: Animación de entrada
- **WHEN** se abre una pantalla de acceso sin preferencia de movimiento reducido
- **THEN** la ruta del fondo se dibuja una vez en menos de dos segundos y el formulario está utilizable desde el primer momento

#### Scenario: Movimiento reducido
- **WHEN** el sistema pide movimiento reducido
- **THEN** el fondo se muestra ya dibujado, sin animación

### Requirement: Contraste suficiente
El texto y los controles de las pantallas de acceso SHALL tener contraste suficiente sobre su fondo en los temas claro y oscuro.

#### Scenario: Texto
- **WHEN** se mide el texto del título, las etiquetas, los enlaces, los mensajes de error y el texto de los botones frente a su fondo
- **THEN** la relación de contraste es de al menos 4,5 a 1 en ambos temas

#### Scenario: Controles y foco
- **WHEN** se miden el borde de los campos y el indicador de foco frente a su fondo
- **THEN** la relación de contraste es de al menos 3 a 1 en ambos temas

#### Scenario: Más contraste
- **WHEN** el navegador usa colores forzados o el sistema pide más contraste
- **THEN** la tarjeta es opaca y no depende de transparencias ni de desenfoque para ser legible

### Requirement: Tarjeta centrada
El contenido de las pantallas de acceso SHALL mostrarse en una tarjeta centrada en vertical y en horizontal, con un ancho máximo cómodo, que no oculta el formulario en pantallas bajas.

#### Scenario: Pantalla alta
- **WHEN** la ventana es alta y ancha
- **THEN** la tarjeta queda centrada en ambos ejes

#### Scenario: Pantalla baja o formulario largo
- **WHEN** el contenido de la tarjeta es más alto que la ventana, como en el registro con el teclado del móvil abierto
- **THEN** la página se desplaza en vertical y todo el formulario es alcanzable, sin recortes

#### Scenario: Pantalla estrecha
- **WHEN** el ancho de la ventana es de 360px
- **THEN** la tarjeta ocupa el ancho disponible con margen y no hay desplazamiento horizontal

#### Scenario: Sin desenfoque disponible
- **WHEN** el navegador no soporta el desenfoque del fondo de la tarjeta
- **THEN** la tarjeta se muestra opaca y legible

### Requirement: Coherencia entre pantallas de acceso
Las pantallas de acceso con formulario (iniciar sesión, crear cuenta, recuperar y restablecer contraseña, y verificar correo) SHALL compartir el mismo aspecto de título, formulario, botón principal y enlaces secundarios.

#### Scenario: Título y botón principal
- **WHEN** se abren dos pantallas de acceso cualesquiera con un formulario
- **THEN** el título tiene la misma tipografía y separación, y el botón principal ocupa todo el ancho del formulario

#### Scenario: Enlaces secundarios
- **WHEN** una pantalla ofrece otras opciones, como «¿Olvidaste tu contraseña?» o «Crear cuenta»
- **THEN** los enlaces se muestran agrupados bajo el formulario con el mismo estilo en todas las pantallas

#### Scenario: Comportamiento intacto
- **WHEN** se envía un formulario de acceso, válido o inválido
- **THEN** la validación, los mensajes, el foco al primer campo con error, la redirección y los anuncios a lectores de pantalla se comportan igual que antes
