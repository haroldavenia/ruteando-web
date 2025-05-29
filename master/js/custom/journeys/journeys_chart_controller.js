/**=========================================================
 * Module: journeys_form_controller.js
 * controllador del formulario de trayectos
 =========================================================*/

 App.controller('JourneysChartController',[
    '$scope',
    '$rootScope',
    'JourneyHttp',
    'ChartData',
    function ($scope, $rootScope, JourneyHttp, ChartData) {


  // BAR
  $scope.barData = ChartData.load('json/bar.json');
  // ----------------------------------- 
  $scope.barOptions = {
      series: {
          bars: {
              align: 'center',
              lineWidth: 0,
              show: true,
              barWidth: 0.6,
              fill: 0.9
          }
      },
      grid: {
          borderColor: '#eee',
          borderWidth: 1,
          hoverable: true,
          backgroundColor: '#fcfcfc'
      },
      tooltip: true,
      tooltipOpts: {
          content: function (label, x, y) { return x + ' : ' + y; }
      },
      xaxis: {
          tickColor: '#fcfcfc',
          mode: 'categories'
      },
      yaxis: {
          position: ($scope.app.layout.isRTL ? 'right' : 'left'),
          tickColor: '#eee'
      },
      shadowSize: 0
  };


  // BAR STACKED
  // ----------------------------------- 
  $scope.barStackeData = ChartData.load('json/barstacked.json');
  $scope.barStackedOptions = {
      series: {
          stack: true,
          bars: {
              align: 'center',
              lineWidth: 0,
              show: true,
              barWidth: 0.6,
              fill: 0.9
          }
      },
      grid: {
          borderColor: '#eee',
          borderWidth: 1,
          hoverable: true,
          backgroundColor: '#fcfcfc'
      },
      tooltip: true,
      tooltipOpts: {
          content: function (label, x, y) { return x + ' : ' + y; }
      },
      xaxis: {
          tickColor: '#fcfcfc',
          mode: 'categories'
      },
      yaxis: {
          min: 0,
          max: 200, // optional: use it for a clear represetation
          position: ($scope.app.layout.isRTL ? 'right' : 'left'),
          tickColor: '#eee'
      },
      shadowSize: 0
  };



/*

  	JourneyHttp.getChartData().then(function(result){
  		$scope.barData = 
  	})	
	$scope.barData = [{
  label "Sales",
  color: "#9cd159",
  data: [
    ["Jan", 27],
    ["Feb", 82],
    ["Mar", 56],
    ["Apr", 14],
    ["May", 28],
    ["Jun", 77],
    ["Jul", 23],
    ["Aug", 49],
    ["Sep", 81],
    ["Oct", 20]
  ]
}];
*/


    }
]).service('ChartData', ["$resource", function($resource){
  
  var opts = {
      get: { method: 'GET', isArray: true }
    };
  return {
    load: function(source){
      return $resource(source, {}, opts).get();
    }
  };
}]);