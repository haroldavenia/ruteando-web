/**
 * fixture('get__places__id') → contenido de tests/fixtures/api-v1/get__places__id.json (FND-001).
 * fixtureBody(nombre) → solo response.body. Lectura síncrona desde el servidor de Karma.
 */
(function (global) {
  'use strict';
  var cache = {};

  function fixture(name) {
    if (!cache[name]) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/base/tests/fixtures/api-v1/' + name + '.json', false);
      xhr.send(null);
      if (xhr.status !== 200) { throw new Error('Fixture no encontrado: ' + name); }
      cache[name] = xhr.responseText;
    }
    return JSON.parse(cache[name]);
  }

  global.fixture = fixture;
  global.fixtureBody = function (name) { return fixture(name).response.body; };
})(window);
