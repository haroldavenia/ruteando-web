
/**=========================================================
 * Module: geocoding_adapter.js
 * adaptador para el servicio de geocoding en el mapa
 =========================================================*/

App.factory('Geocoding',[ function (argument) {

  var defaultGeocoding = {
    result : {
      longitude: 0.0,
      latitude : 0.0,
      address :"",
      status : false
    },
    address : "address",
    longitude : "longitude",
    latitude : "latitude",
    status : "status",
  }
  
  function Geocoding (geocoding) {
    if(geocoding){
      this.setData(geocoding);
    } else {
      this.setData(defaultGeocoding);
    }
  }

  Geocoding.prototype.setData = function(geocodingData) {
    $.extend(true, this, defaultGeocoding, geocodingData)// body...
  };

  Geocoding.prototype._setter = function(key, value) {
    if(this.result.hasOwnProperty(key)){
      this.result[key] = value;
    }
  };

  Geocoding.prototype._getter = function(key) {
    if(this.result.hasOwnProperty(key)){
      return this.result[key];
    }
  };

  Geocoding.prototype.setLatitude = function(value) {
    this._setter(this.latitude, value);
  };

  Geocoding.prototype.setLongitude = function(value) {
    this._setter(this.longitude, value);
  };

  Geocoding.prototype.setAddress = function(value) {
    this._setter(this.address, value);
  };

  Geocoding.prototype.setStatus = function(value) {
    this._setter(this.status, value);
  };

  Geocoding.prototype.getLatitude = function(value) {
    var latitude = Number(this._getter(this.latitude)); 
    return (latitude === NaN)? 0.0 : latitude;
    // return this._getter(this.latitude);
  };

  Geocoding.prototype.getLongitude = function(value) {
    var longitude = Number(this._getter(this.longitude)); 
    return (longitude === NaN)? 0.0 : longitude;
    //return this._getter(this.longitude);
  };

  Geocoding.prototype.getAddress = function(value) {
    return this._getter(this.address);
  };

  Geocoding.prototype.getStatus = function(value) {
    return this._getter(this.status);
  };

  Geocoding.prototype.getResult = function() {
    return this.result;
  };

  return Geocoding;
}]);