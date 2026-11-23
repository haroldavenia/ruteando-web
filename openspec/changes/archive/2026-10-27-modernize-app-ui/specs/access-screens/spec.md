# Spec Delta

## REMOVED Requirements

### Requirement: Tema claro y oscuro automático
**Reason**: El tema claro y oscuro automático pasa a ser el de toda la aplicación y su escenario «El resto de la aplicación no cambia» deja de ser cierto. Los demás escenarios (preferencia oscura, preferencia clara y cambio de preferencia) los cubre ahora, para todas las pantallas incluidas las de acceso, el requisito «Tema claro y oscuro en toda la aplicación» de `app-ui-system`.
**Migration**: Ver `app-ui-system`; las pantallas de acceso siguen mostrándose en claro u oscuro según la preferencia del sistema, ahora con el mismo tema que el resto.
