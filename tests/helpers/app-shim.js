/**
 * Módulo `angle` de prueba (FND-001). La app real (master/js/app.init.js) depende de ~20 módulos
 * de bower; las suites Karma cargan solo el código migrado sobre este módulo con las mismas
 * convenciones (global `App`, anotación de array) y dobles mínimos de `translate`.
 * La carga completa de la app se prueba en los E2E (tests/e2e).
 */
/* exported App */
var App = angular.module('angle', []);

App.filter('translate', function () {
  return function (key, params) {
    if (!params) { return key; }
    return key + ' ' + JSON.stringify(params);
  };
});
