
/**=========================================================
 * Module: address_model.js
 * modelo para el manejo de direcciones
 =========================================================*/

App.factory('Address', [
  '$q',
  '$http',
  'JourneyHttp',
  function($q, $http, JourneyHttp) {

    var defaultAddress = {
      id : '',
      address : "",
      city : '',
      volume : '',
      weight : '',
      lengthOfStay : '',
      minTime : '',
      maxTime : '',
      zone : '',
      x : 0.0,
      y : 0.0,
      recipienName : '',
      senderName : '',
      itineraryId : '',
      phoneNumber : '',
      status : false,
      recipientGuide: '',
      alias : '',
      observations : '',
      deliveryTime : ''
    }

    function Address (addressData) {
      // body...
      if(addressData){
        this.setData(addressData);
      }else{
        this.setData(defaultAddress);
      }
    }

    Address.prototype = {
      setData : function(addressData) {
        $.extend(true,this,defaultAddress,addressData)
      }/*,

      getLatitude : function () {
        return this.lat;
      },

      getLongitude : function () {
        return this.lon;
      },

      setLatitude : function (lat) {
        this.lat = lat;
      },

      setLongitude : function (lon) {
        this.lon = lon;
      },

      getAddress : function () {
        return this.address;
      },

      setAddress : function (address) {
        this.address = address;
      }*/

    };

    Address.getAddressesJourney = function(journeyId) {
      var deferred = $q.defer();
/*
      JourneyHttp.getPlaces().then(function(result){
        var data = (journeyId)? result.places : [];
        deferred.resolve(data)
      }, function(result) {
        deferred.reject(result);
      })
*/
      return deferred.promise;
    };

    return Address;

}]);