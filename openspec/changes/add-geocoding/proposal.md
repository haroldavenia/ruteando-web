# Proposal

## Why

La app AngularJS ubicaba las direcciones con el geocodificador del gateway y dejaba revisar y corregir las dudosas antes de importar; la nueva exigía coordenadas en el CSV y no ubicaba nada desde los formularios. Se recupera ese comportamiento con el diseño actual.

## What Changes

- `GeocodingApi` (`POST /geocoding` y `/reverse-geocoding`) con el contrato aislado en `core/api/data/geocoding-contract.ts` (lectura tolerante).
- Formularios de paquete y lugar: «Ubicar la dirección en el mapa» y «Tomar la dirección del punto» (`shared/map/address-locator.component.ts`).
- Importación de paquetes: las coordenadas del CSV son opcionales (solo `DIRECCION` es obligatoria). Las filas sin coordenadas se ubican (4 a la vez) y pasan por una pantalla de revisión (ubicadas, aproximadas, manuales, no ubicadas) donde se corrige la dirección, se coloca el punto a mano, se quita la fila o se descarga el informe CSV. Las no ubicadas no se importan.
- `LocalListState` para tablas con filas locales; tonos de estado `geocoding` y `assigned`.
- Gateway simulado: `/geocoding`, `/reverse-geocoding` y CRUD de `/assigned-services`.

## Fuera de alcance

Enviar al gateway la dirección estandarizada, el puntaje y el estado al crear el paquete (el formulario ya los trata como solo lectura). `POST /packages/upload` sigue sin contrato.

## Sin verificar

El contrato de `/geocoding` y `/reverse-geocoding` es una hipótesis (la colección Postman no trae cuerpo ni respuesta); solo se probó con el gateway simulado.
