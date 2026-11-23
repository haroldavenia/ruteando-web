/**=========================================================
 * Module: units.js (FND-003, FND-004)
 * Unidades fijas de la plataforma (GET /units): g, cm³, cm, m, s.
 * El backend nunca convierte: se convierte para mostrar y antes de enviar.
 =========================================================*/
(function () {
  'use strict';

  var FACTORS = { weight: 1000, volume: 1000000, length: 100, distance: 1000 };
  var DISPLAY_UNIT = { weight: 'kg', volume: 'm³', length: 'm', distance: 'km' };
  var SEPARATORS = { es: { group: ' ', decimal: ',' }, es_AR: { group: '.', decimal: ',' }, en: { group: ',', decimal: '.' } };

  function separators(locale) {
    return SEPARATORS[locale] || SEPARATORS.es;
  }

  /** Formatea con separadores del idioma, hasta `decimals` decimales sin ceros sobrantes. */
  function formatNumber(value, decimals, locale) {
    var sep = separators(locale);
    var fixed = Math.abs(value).toFixed(decimals);
    var parts = fixed.split('.');
    var integer = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep.group);
    var fraction = parts[1] ? parts[1].replace(/0+$/, '') : '';
    return (value < 0 ? '-' : '') + integer + (fraction ? sep.decimal + fraction : '');
  }

  /**
   * Texto capturado ('2,5', '2.5', '1 200,5', '1.200,5') → número; NaN si no es válido.
   * Si aparecen coma y punto, el último es el decimal; un separador repetido es de miles.
   */
  function parseNumber(text) {
    if (typeof text === 'number') { return text; }
    var s = String(text === null || text === undefined ? '' : text).trim().replace(/[\s\u00a0]/g, '');
    var lastComma = s.lastIndexOf(',');
    var lastDot = s.lastIndexOf('.');
    var dec = Math.max(lastComma, lastDot);
    if (lastComma >= 0 && lastDot >= 0) {
      s = s.slice(0, dec).replace(/[.,]/g, '') + '.' + s.slice(dec + 1);
    } else if (dec >= 0) {
      var sep = s.charAt(dec);
      s = s.split(sep).length > 2 ? s.split(sep).join('') : s.replace(sep, '.');
    }
    return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
  }

  function duration(seconds) {
    var total = Math.round(seconds / 60);
    var hours = Math.floor(total / 60);
    var minutes = total % 60;
    return hours + ':' + (minutes < 10 ? '0' : '') + minutes;
  }

  App.factory('Units', ['ApiClient', '$q', '$rootScope', function (ApiClient, $q, $rootScope) {
    var cache = null;

    function load() {
      if (!cache) {
        cache = ApiClient.get('/units').catch(function (error) {
          cache = null;
          return $q.reject(error);
        });
      }
      return cache;
    }

    $rootScope.$on('session:ended', function () { cache = null; });

    /** Valor de la API (g, cm³, cm, m, s) → texto para mostrar. */
    function display(kind, value, options) {
      if (value === null || value === undefined || isNaN(value)) { return '—'; }
      options = options || {};
      var locale = options.locale || 'es';
      if (kind === 'duration') { return duration(value); }
      if (!FACTORS[kind]) { throw new Error('Magnitud desconocida: ' + kind); }
      var decimals = options.decimals !== undefined ? options.decimals : (kind === 'distance' ? 1 : 2);
      return formatNumber(value / FACTORS[kind], decimals, locale) + ' ' + DISPLAY_UNIT[kind];
    }

    /** Valor capturado en la unidad de pantalla → entero en la unidad de la API. */
    function toApi(kind, text) {
      var number = parseNumber(text);
      if (isNaN(number)) { return null; }
      if (kind === 'duration') { return Math.round(number * 60); }
      return Math.round(number * FACTORS[kind]);
    }

    /** Valor de la API → número en la unidad de pantalla (para precargar formularios). */
    function fromApi(kind, value) {
      if (value === null || value === undefined) { return null; }
      return kind === 'duration' ? value / 60 : value / FACTORS[kind];
    }

    return {
      load: load,
      display: display,
      toApi: toApi,
      fromApi: fromApi,
      formatNumber: formatNumber,
      parseNumber: parseNumber,
      duration: duration,
      DISPLAY_UNIT: DISPLAY_UNIT
    };
  }]);
})();
