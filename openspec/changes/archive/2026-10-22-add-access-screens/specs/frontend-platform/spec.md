# Spec Delta

## MODIFIED Requirements

### Requirement: Renderizado en servidor conservado
La aplicación SHALL seguir sirviéndose con SSR sin acceder a APIs exclusivas del navegador durante el render, y SHALL hidratarse en el cliente sin errores.

#### Scenario: Respuesta SSR
- **WHEN** se ejecuta el servidor Node generado y se pide `/acceso`
- **THEN** la respuesta HTML contiene el formulario de inicio de sesión ya renderizado

#### Scenario: Hidratación sin errores
- **WHEN** el navegador carga `/acceso` desde el servidor SSR
- **THEN** la consola no muestra errores de hidratación ni de proveedores

#### Scenario: Ruta desconocida
- **WHEN** se pide una ruta que no existe
- **THEN** la aplicación redirige a `/`
