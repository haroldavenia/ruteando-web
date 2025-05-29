/**=========================================================
 * Module: osrm_http.js
 * service para las conexiones con los servicios de ruteo.
 =========================================================*/

App.service('osrmHttp',[
  '$http',
  '$q',
  '$filter',
  'config',
  function ($http, $q, $filter, config) {
    return ({
      OptimalRouteOfPointCloud : OptimalRouteOfPointCloud,
      optimisationForMessenger : optimisationForMessenger,
      optimisationForPackages : optimisationForPackages
    });

    function parseTime(date) {
      var HH_mm = date.split(":");
      var time = new Date();
      time.setHours(HH_mm[0]);
      time.setMinutes(HH_mm[1]);
      return time;
    }

    function formatDate(date) {
      return $filter('date')(date, 'yyyy-MM-dd');
      /*      
      var year = date.getYear();
      var month = date.getMonth();
      var day = date.getDay();
      return year + "-" + month + "-" + day;
      */
    }


    function OptimalRouteOfPointCloud(Journey) {
      var finalTime = parseTime(Journey.setting.finishTime);
      var initTime = parseTime(Journey.setting.initTime);
      var maxiumTime;
      
      if ( initTime > finalTime) {
       maxiumTime = (Math.round((parseTime("23:59") - initTime) / 1000)) + (Math.round((finalTime - parseTime("00:00")) / 1000));
      } else {
        maxiumTime = Math.round( (parseTime(Journey.setting.finishTime) - parseTime(Journey.setting.initTime)) / 1000);
      }      
//      var maxiumTime = Math.round( (parseTime(Journey.setting.finishTime) - parseTime(Journey.setting.initTime)) / 1000);

      var param = {
        nameJourney : Journey.name,
        routeRestrictionType : Journey.setting.roadRestrictionType,
        cargoInput : [],
        configuration : {
          maxiumTime: maxiumTime,
          startTime : Journey.setting.initTime + ':00',
          backToDepot: Journey.setting.backToStartPoint,
          resource: [{}],
          depot: {
            name : Journey.place.name,
            address: Journey.place.address,
            latitude: Journey.place.latitude,
            longitude: Journey.place.longitude
          },
          restriction: [{}]
        },
        date : formatDate(Journey.date),
        numberOfRoutes: Journey.setting.fixedRoutes,
        transport: [{}]
      };
      
      

      for (var i = 0; i < Journey.itinerary.length ; i++) {
        
        var timeState = (Journey.setting.typeLengthOfStay == "FIXED") ? Journey.setting.lengthOfStay : Journey.itinerary[i].timeState; 
        
        param.cargoInput.push({
          id : Journey.itinerary[i].id,
          _desc : Journey.itinerary[i].address,
          latitude : Journey.itinerary[i].latitude,
          longitude : Journey.itinerary[i].longitude,
          timeState : Journey.itinerary[i].timeState,
          guideNumber : Journey.itinerary[i].guideNumber,
          weight : Journey.itinerary[i].weight,
          volume : Journey.itinerary[i].volume,
          unloadingTime : timeState*60,
          city : 'BOGOTA'
        });
      };
      var url = 'http://app.ruteando.co:9000/hanoit/v2/delivery/optimalRouteOfPointCloud';

      return $http({ method: "post", data: param, url : url });
    }

    function optimisationForMessenger(Journey) {
      var finalTime = parseTime(Journey.setting.finishTime);
      var initTime = parseTime(Journey.setting.initTime);
      var maxiumTime;
      
      if ( initTime > finalTime) {
       maxiumTime = (Math.round((parseTime("23:59") - initTime) / 1000)) + (Math.round((finalTime - parseTime("00:00")) / 1000));
      } else {
        maxiumTime = Math.round( (parseTime(Journey.setting.finishTime) - parseTime(Journey.setting.initTime)) / 1000);
      }      
//      var maxiumTime = Math.round( (parseTime(Journey.setting.finishTime) - parseTime(Journey.setting.initTime)) / 1000);

      var param = {
        nameJourney : Journey.name,
        routeRestrictionType : Journey.setting.roadRestrictionType,
        cargoInput : [],
        configuration : {
          maxiumTime: maxiumTime,
          startTime : Journey.setting.initTime + ':00',
          backToDepot: Journey.setting.backToStartPoint,
          resource: [{}],
          depot: {
            name : Journey.place.name,
            address: Journey.place.address,
            latitude: Journey.place.latitude,
            longitude: Journey.place.longitude
          },
          restriction: [{}]
        },
        date : formatDate(Journey.date),
        numberOfRoutes: Journey.setting.fixedRoutes,
        transport: [{}]
      };

      for (var i = 0; i < Journey.itinerary.length ; i++) {

        var timeState = (Journey.setting.typeLengthOfStay == "FIXED") ? Journey.setting.lengthOfStay : Journey.itinerary[i].timeState; 

        param.cargoInput.push({
          id : Journey.itinerary[i].id,
          _desc : Journey.itinerary[i].address,
          latitude : Journey.itinerary[i].latitude,
          longitude : Journey.itinerary[i].longitude,
          weight : Journey.itinerary[i].weight,
          volume : Journey.itinerary[i].volume,
          unloadingTime : timeState*60,
          city : 'BOGOTA'
        });
      };

      var url = 'http://app.ruteando.co:9000/hanoit/v2/delivery/optimisationForMessenger';

      return $http({ method: "post", data: param, url : url });
    }


    function optimisationForPackages(Journey) {			
      var finalTime = parseTime(Journey.setting.finishTime);
      var initTime = parseTime(Journey.setting.initTime);
      var maxiumTime;
      
      if ( initTime > finalTime) {
       maxiumTime = (Math.round((parseTime("23:59") - initTime) / 1000)) + (Math.round((finalTime - parseTime("00:00")) / 1000));
      } else {
        maxiumTime = Math.round( (parseTime(Journey.setting.finishTime) - parseTime(Journey.setting.initTime)) / 1000);
      }      
//      var maxiumTime = Math.round( (parseTime(Journey.setting.finishTime) - parseTime(Journey.setting.initTime)) / 1000);
      var param = {
        nameJourney : Journey.name,
        routeRestrictionType : Journey.setting.roadRestrictionType,
        cargoInput : [],
        configuration : {
          maxiumTime: maxiumTime,
          startTime : Journey.setting.initTime + ':00',
          backToDepot: Journey.setting.backToStartPoint,
          resource: [],
          depot: {
            name : Journey.place.name,
            address: Journey.place.address,
            latitude: Journey.place.latitude,
            longitude: Journey.place.longitude
          },
          restriction: []
        },
        date : formatDate(Journey.date),
        numberOfRoutes: Journey.setting.fixedRoutes,
        transport: [{}]
      };

      
      for (var i = 0; i < Journey.itinerary.length ; i++) {
        
        var timeState = (Journey.setting.typeLengthOfStay == "FIXED") ? Journey.setting.lengthOfStay : Journey.itinerary[i].timeState; 

        param.cargoInput.push({
          id : Journey.itinerary[i].id,
          _desc : Journey.itinerary[i].address,
          latitude : Journey.itinerary[i].latitude,
          longitude : Journey.itinerary[i].longitude,
          weight : Journey.itinerary[i].weigth,
          volume : Journey.itinerary[i].volume,
          unloadingTime : timeState*60,
          city : 'BOGOTA'
        });
      };

      if (Journey.setting.evaluateWeight && Journey.setting.evaluateVolume) {
        for (var i = 0; i < Journey.setting.settingResource.length; i++) {
          param.configuration.resource.push({
            name: Journey.setting.settingResource[i].typeVehicle.name,
            maxiumVolume: Journey.setting.settingResource[i].typeVehicle.volume,
            maxiumWeight: Journey.setting.settingResource[i].typeVehicle.weight,
            quantity: Journey.setting.settingResource[i].quantity
          });
        }
      } else if (Journey.setting.evaluateWeight) {
        for (var i = 0; i < Journey.setting.settingResource.length; i++) {
          param.configuration.resource.push({
            name: Journey.setting.settingResource[i].typeVehicle.name,
            maxiumWeight: Journey.setting.settingResource[i].typeVehicle.weight,
            quantity: Journey.setting.settingResource[i].quantity
          });
        }
      } else if (Journey.setting.evaluateVolume) {
        for (var i = 0; i < Journey.setting.settingResource.length; i++) {
          param.configuration.resource.push({
            name: Journey.setting.settingResource[i].typeVehicle.name,
            maxiumVolume: Journey.setting.settingResource[i].typeVehicle.volume,
            quantity: Journey.setting.settingResource[i].quantity
          });
        }
      } else {
        param.configuration.resource = null;
      }

      if (Journey.setting.evaluateRestrictionPackage) {
        if (Journey.setting.evaluateWeight && Journey.setting.evaluateVolume) {
          for (var i = 0; i < Journey.setting.settingResource.length; i++) {
            param.configuration.restriction.push({
              name: Journey.setting.settingResource[i].typeVehicle.name,
              nameOfResources: [Journey.setting.settingResource[i].typeVehicle.name],
              upperWeightLimit: Journey.setting.settingResource[i].typeVehicle.restriction.maxWeight,
              lowerWeightLimit: Journey.setting.settingResource[i].typeVehicle.restriction.minWeight,
              upperVolumeLimit: Journey.setting.settingResource[i].typeVehicle.restriction.maxVolume,
              lowerVolumeLimit: Journey.setting.settingResource[i].typeVehicle.restriction.minVolume
            });
          }	        
        } else if (Journey.setting.evaluateWeight) {
          for (var i = 0; i < Journey.setting.settingResource.length; i++) {
            param.configuration.restriction.push({
              name: Journey.setting.settingResource[i].typeVehicle.name,
              nameOfResources: [Journey.setting.settingResource[i].typeVehicle.name],
              upperWeightLimit: Journey.setting.settingResource[i].typeVehicle.restriction.maxWeight,
              lowerWeightLimit: Journey.setting.settingResource[i].typeVehicle.restriction.minWeight
            });
          }	        
        } else if (Journey.setting.evaluateVolume) {
          for (var i = 0; i < Journey.setting.settingResource.length; i++) {
            param.configuration.restriction.push({
              name: Journey.setting.settingResource[i].typeVehicle.name,
              nameOfResources: [Journey.setting.settingResource[i].typeVehicle.name],
              upperVolumeLimit: Journey.setting.settingResource[i].typeVehicle.restriction.maxVolume,
              lowerVolumeLimit: Journey.setting.settingResource[i].typeVehicle.restriction.minVolume
            });
          }	        
        }
      } else {
        param.configuration.restriction = null;
      }
      console.log(param);
      var url = 'http://app.ruteando.co:9000/hanoit/v2/delivery/optimisationForPackages';
      return $http({ method: "post", data: param, url : url });
    }
    
    





  }]);
