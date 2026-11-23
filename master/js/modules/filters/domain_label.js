/**=========================================================
 * Module: domain_label.js (FND-003)
 * {{ pkg.status | domainLabel:'PackageStatus' }}
 =========================================================*/
(function () {
  'use strict';

  App.filter('domainLabel', ['MasterDomains', function (MasterDomains) {
    function domainLabel(key, code) {
      if (key === null || key === undefined || key === '') { return ''; }
      return MasterDomains.labelNow(code, key);
    }
    domainLabel.$stateful = true;
    return domainLabel;
  }]);
})();
