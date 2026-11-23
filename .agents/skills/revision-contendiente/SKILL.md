---
name: revision-contendiente
description: Procedimiento de revisión adversarial de una historia de la migración - errores del contrato, sesión y concurrencia, datos límite, unidades y coordenadas, seguridad de la UI; con reproducción ejecutable y sin tocar datos reales.
---

# Revisión contendiente

1. Declara modelo propio y de la sesión principal; si coinciden, es una limitación.
2. Lee la spec, el contrato y el diff. Hipótesis por categoría: errores HTTP del contrato, sesión/refresh, concurrencia y doble envío, paginación y vacíos, unidades y coordenadas, XSS/CSV, navegación.
3. Reproduce cada hipótesis con una prueba temporal (Karma con `$httpBackend`, Playwright con `page.route`, o `x-mock-scenario` en `tests/mock-api`) en el directorio temporal. Límite 60 s por prueba.
4. Solo `tests/mock-api` o el tenant de pruebas; nunca datos reales ni carga contra el backend compartido.
5. Informe con severidad, reproducción, impacto y veredicto. Hipótesis no reproducidas no bloquean.
