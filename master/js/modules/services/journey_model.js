
/**=========================================================
 * Module: journey_model.js
 * modelo para el manejo de trayectos
 =========================================================*/

App.factory('Journey', [
  'Itinerary',
  function (Itinerary) {
    var defaultJourney = {
      id : '',
      name : '',
      setting: { id : ''},
      routes : 0,
      file : ''
    }

    function Journey (journeyData) {
      if(journeyData){
        this.setData(journeyData);
      }else{
        this.setData(defaultJourney);
      }
    }

    Journey.prototype = {
      setData : function(journeyData) {
        $.extend(true,this,defaultJourney,journeyData)
      },
    };

    return Journey;
}])