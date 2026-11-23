# Design

## Context

Estado de partida (ver `proposal.md` para la motivación):

- `PackagesApi.create(PackageInput)` ya existe con su contrato verificado en fixtures (`name`, `serviceType`, `address`, `location`, `weight`, `volume` obligatorios; `guideNumber`, `pieceNumber`, `observation`, `city`, `country`, `postalCode` opcionales). `guideNumber` es único por tenant y repetirlo responde 409 `CONFLICT`.
- `POST /packages/upload` devuelve 400 sin contrato documentado y no hay geocodificación: el plan B ya anotado es leer el CSV en el navegador.
- `shared/data/csv.ts` sabe **escribir** CSV (`toCsv`, `csvCell`, `downloadCsv`) con BOM, `;` y protección contra fórmulas; no sabe leerlo. La exportación de paquetes ya usa las columnas del legacy (`ID_GUIA;LONGITUD;LATITUD;CIUDAD;PAIS;DIRECCION;...`).
- El legacy ofrecía un archivo de ejemplo y una guía de cinco pasos (descargar, abrir, editar, guardar, verificar) y geocodificaba en el servidor. No hay archivo de ejemplo en el repositorio.

## Goals / Non-Goals

**Goals:**
- Importar volúmenes reales (cientos de filas) con una experiencia entendible: ver qué se va a crear antes de crearlo y qué pasó después.
- No perder trabajo ni dejar al usuario sin saber qué quedó creado cuando algo falla a mitad.
- Que cambiar a `POST /packages/upload` en el futuro no obligue a rehacer la pantalla.

**Non-Goals:**
- Geocodificar, importar Excel, actualizar paquetes existentes, ventanas horarias, remitente o destinatario.
- Una librería de CSV: el formato es simple y el lector propio es pequeño y probado.

## Decisions

### 1. Tres capas separadas: lector, validación, ejecución
- **`parseCsv(text)`** (en `shared/data/csv.ts`): máquina de estados que devuelve `{ rows: string[][], lines: number[], delimiter }`. Maneja BOM, `\r\n` y `\n`, comillas dobles con `""` escapado, separadores y saltos de línea dentro de comillas, líneas vacías (se ignoran) y detecta el separador (`;`, `,` o tabulación) contando en la cabecera fuera de comillas. Se corta al pasar el límite de filas.
- **`validateRows(table)`** (`import/package-rows.ts`): normaliza las cabeceras (minúsculas, sin tildes, sin espacios ni guiones bajos) contra una tabla de alias en español e inglés, ignora columnas desconocidas (las lista), y devuelve `{ valid: ImportRow[], errors: RowError[] }`, donde `ImportRow` lleva `line`, `input: PackageInput` y los valores originales.
- **`runImport(rows, create, options)`** (`import/package-importer.ts`): ejecutor puro de promesas con concurrencia y reintentos, sin tocar Angular ni la UI, para probarlo con funciones falsas.
- *Alternativa descartada:* hacer todo en el componente. Mezclaría parseo, reglas y red y sería inprobable.

### 2. Columnas y valores por defecto
Obligatorias: `DIRECCION`, `LONGITUD`, `LATITUD`. Opcionales: `ID_GUIA`, `NOMBRE`, `SERVICIO`, `CIUDAD`, `PAIS`, `CODIGO_POSTAL`, `PESO`, `VOLUMEN`, `PIEZAS`, `OBSERVACION`. Por defecto: nombre = guía o, si no hay, la dirección; servicio = entrega; peso y volumen = 0; piezas = 1. Es una concesión para que el archivo mínimo sea corto; el gateway exige peso y volumen, y 0 es aceptable como «sin dato» (a contrastar con el gateway real). La cabecera del archivo exportado por la propia aplicación se reconoce, de modo que exportar y reimportar funciona.

### 3. Coordenadas con punto o coma
Se aceptan `4.60872` y `4,60872`. Con separador `,` de columnas, un número con coma decimal solo puede venir entrecomillado, y el lector lo respeta. Rango validado; no se interpreta `1.234,56` como número (se rechaza por ambiguo).

### 4. Ejecución: pool con concurrencia adaptable
Pool de hasta 4 trabajadores que toman filas de una cola. Ante 429 o 503 la fila vuelve a la cola con una espera exponencial (1 s, 2 s, 4 s), la concurrencia máxima baja a la mitad (mínimo 1) y, tras tres intentos, la fila se da por fallida. 409 con guía se cuenta como «ya existía». La cancelación detiene la toma de filas nuevas; las peticiones en vuelo se dejan terminar (cancelarlas dejaría el estado en el servidor incierto) y su resultado se registra.
- *Alternativa descartada:* `forkJoin` con todas las peticiones a la vez. Saturaría el gateway y no permitiría progreso ni cancelación.
- *Alternativa descartada:* petición única `POST /packages/upload`. Sin contrato.

### 5. Estado de la pantalla
Una máquina de estados explícita en una señal: `empty` → `reading` → `preview` → `importing` → `done`. `importing` bloquea cambiar de archivo y activa `canDeactivate` para pedir confirmación al salir. Los resultados por fila se guardan en una lista (línea, estado, motivo) que alimenta el resumen, el reintento y el informe.

### 6. Seguridad del contenido
Las celdas se tratan siempre como texto: se recortan, se limitan a 500 caracteres y se pintan con interpolación de Angular (escapada); nunca `innerHTML`. El informe de errores usa `toCsv` (protección contra fórmulas). El límite de 2 MB y 2000 filas se comprueba antes y durante la lectura.

### 7. Accesibilidad
Control de archivo nativo (`<input type="file">`) con etiqueta visible; resumen y progreso en regiones `aria-live="polite"`; errores y vista previa como tablas con `<caption>` y cabeceras `scope`. El foco no se mueve solo: tras elegir archivo permanece en el control y el resumen se anuncia.

## Risks / Trade-offs

- [Miles de peticiones] → Límite de 2000 filas, concurrencia 4, espera y reducción ante 429 y 503.
- [Importación no transaccional] → Resumen explícito, reintento de las fallidas, informe descargable y aviso de que reimportar sin guía duplicaría paquetes.
- [Peso y volumen 0 por defecto] → Se documenta y se avisa en la guía de campos; a contrastar con el gateway real.
- [CSV hostil o gigante] → Límites, tratamiento como texto, escape y sin fórmulas.
- [Sin geocodificación el archivo necesita coordenadas] → Mensaje claro y pregunta abierta para el equipo del gateway; la plantilla lo explica.
- [Codificaciones distintas de UTF-8 (Excel en español guarda en Windows-1252)] → Se detectan los caracteres de sustitución y se avisa; no se intenta adivinar la codificación.

## Migration Plan

1. `parseCsv` y validación de filas con pruebas de tabla.
2. Ejecutor con concurrencia, reintentos y cancelación con pruebas de tiempo simulado.
3. Pantalla: archivo, vista previa, importación, resultado e informe.
4. Ruta, botón del listado y guarda de salida.
5. Verificación (build, navegador real con subida de archivo, gateway falso) y documentación.

Reversión: aditivo; quitar la ruta y el botón oculta la pantalla.

## Open Questions

- ¿Cuál es el contrato de `POST /packages/upload` y de la geocodificación? Con ellos el archivo no necesitaría coordenadas y la importación sería una sola petición; el ejecutor es intercambiable.
- ¿Acepta el gateway peso y volumen 0? Se verifica con el gateway real.
- ¿Hay límites de ritmo (429) documentados? Hoy se tratan de forma defensiva.
