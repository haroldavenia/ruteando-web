
/**=========================================================
 * Module: itinerary_model.js
 * modelo para manejo de itinerarios y sus direcciones
 =========================================================*/

 App.factory('Itinerary',[
  '$q',
  '$http',
  'Address',
  function ($q, $http, Address) {
    'use strict'

  var defaultItinerary = {
    id : '',
    journey : '',
    addresses : [],
    initAddress : ''
  };

  var generatorId = 0;
  function getId(){
    return (++generatorId);
  }

  function Itinerary (dataItinerary) {
    if(dataItinerary){
      this.setData(dataItinerary);
    }else{
      this.setData(defaultItinerary);
    }
  }

  Itinerary.prototype = {
    setData : function(dataItinerary) {
      $.extend(true,this,defaultItinerary,dataItinerary);
    },

    load : function () {
      return this.loadAddresses(1); // cambiar esto para no cambiar datos por defecto
      //return this.loadAddresses(this.id);
    },

    loadAddresses : function(id) {
      var that = this;
      return Address.getAddressesJourney(id).then(function(result) {
        angular.forEach(result, function(value, key){
          generatorId = (value.id > generatorId)? value.id: generatorId;
          that.addresses.push( new Address(value) );
        });

        return true;
      }, function(result) {
        console.error("=== Error Itinerary :",result)
        return false;
      });
    },
    
    setAddresses : function(addresses) {
      if(angular.isArray(addresses)){
        this.addresses.clear();
        var that = this;
        angular.forEach(addresses, function(value, key){
          value.itineraryId = that.id;
          that.addresses.push(new Address(value));
        });
      }
    },
    
    getAddresses : function() {
      return this.addresses;
    },
    
    uploadItinerary : function (doThat) {
      // TODO: subir el itinerario al servidor y hacer lo qeu diga en le parametro doThat
      var that = this;
       return _doThat(this.addresses).then(function(result){
        that.journeyId = result.id;
        that.save();
        return result;
      });
    },

    save : function () {
      // body...
      console.log("=== save Itinerary: ", this);
    }, 

    addAddress : function (address) {
      return this._retrivieInstance(address);
    },

    removeAddress : function (address) {
      var _address = this._search(address.id);
      if(_address){
        return this.addresses.splice(_address,1);
      }
    },

    updateAddress : function (address) {
      return this._retrivieInstance(address);
    },

    _search : function (addressId) {
      var i;
      for(i = 0; i < this.addresses.length; i++){
        if(addressId == this.addresses[i].id){
          return this.addresses[i];
        }
      }
    },

    _retrivieInstance : function (addressData) {
      var instance = this._search(addressData.id);
      if(instance){
        instance.setData(addressData);
      }else{
        instance = new Address(addressData);
        instance.id = getId();
        this.addresses.push(instance);
      }

      return instance;
    }
  };

  /**
    esto solo simula la subida del JSON con las direcciones
    lo cual debe responder con los datos del nuevo trajecto
  */
  function _doThat (addresses) {
    var deferred = $q.defer();
    var randomId = Math.floor(Math.random()*99999);
    var journey = {
      id : randomId,
      name : "Journey-"+randomId,
      settingId : 1,
      routes : Math.floor(Math.random()*100)
    };
    setTimeout(function (){
      deferred.resolve(journey);
    }, 3000)
    return deferred.promise
  }

   return Itinerary;
 }]);