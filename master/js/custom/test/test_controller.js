// test controller

App.controller('TestController',[
  '$scope',
  '$rootScope',
  '$http',
  'PdfExporter',
  'RouteTabService',
  'Decoder',
  'MapsServices',
  'Mapping',
  'GeocodingServices',
  'XlsxExporter',
  'JourneyHttp',
  function ( $scope, $rootScope, $http, PdfExporter, RouteTabService, Decoder, MapsServices, Mapping, GeocodingServices, XlsxExporter, JourneyHttp) {
    $scope.name = "";
    $scope.ran = function (argument) {
      $scope.name = faker.name.firstName();
      console.log(getData(3, 'visit'));
    };

    $scope.listaVisita = function (argument) {
      var pdf = new PdfExporter(), visitas = getData(100, 'visit');
      console.log(visitas);
      pdf.getReportVisitList(visitas);
    }

    function getData(cuantity, type) {
      var item, data = [],
          cuantity = cuantity || 0,
          type = type || "",
          number = faker.random.number, 
          address = faker.address.streetAddress; 
      
      var visit = function (id) {
        return {
          id : id,
          origin : address(),
          destination : address(),
          distance : number(100)+" Kms.",
          duration : number(10)+" Min.",
          timeArrival : number(24)+":"+number(60),
          timeDeparture : number(24)+":"+number(60),
          lengthStay : number(10)+' Min.'
        };
      }

      var route = function (id) {
        return {
          id : id,
          name : faker.address.streetAddress()
        }
      }

      if(type == 'visit') item = visit;
      else if(type == 'routeList') item = route;
      else item = function(id){return id;};

      for(var i = 1; i <= cuantity; ++i){
        data.push(item(i));
      }

      return data;
    }

    $scope.change = function () {
      /*var cantidad = Math.floor(Math.random()*10);
      var routeList = getData(cantidad, 'routeList');
      console.log(routeList);
      RouteTabService.update(routeList);*/

      $http.get('http://localhost:3000/server/path/rutaMixin.geojson')
        .success(function(data, status, headers, config) {
            RouteTabService.update(data);
            //console.log(data);
          })
        .error(function(data, status, headers, config) {
            console.error(status);
          });
    };

    $scope.openRute = function () {
      $rootScope.$broadcast('offsidebar.route.open', {});
    };

    $scope.openOther = function () {
      $rootScope.$broadcast('offsidebar.other.open', {});
    };

    $scope.testDecode = function (argument) {
      $http.get('http://localhost:3000/server/response/optimalRouteOfPointCloud.json')
        .success(function (data) {
          var points = Decoder.decodePoints(data.route_geometry);
          MapsServices.showPath([points]);
        })
    };

    $scope.testDecodeMultiple = function (argument) {
      $http.get('http://localhost:3000/server/response/multiplePathPoints.json')
        .success(function (data) {

          var paths = [], decodePaths;
          angular.forEach(data.output, function(value){
            this.push(value['route_geometry']);
          }, paths);
          decodePaths = Decoder.decodePaths(paths);
          MapsServices.showPath(decodePaths);
        })
    };

    $scope.testMapping = function () {
      var cargo = {
        "id": "0",
        "latitude": 4.646039742152375,
        "longitude": -74.01256556250007,
        "weight": 1000000,
        "volume": 0,
        "transport_id": 0,
        "unloadingTime": 300,
        "status": null,
        "status_message": null,
        "startTimeOfDelivery": null,
        "endTimeOfDelivery": null,
        "city": "Testcity",
        "desc": null
      };

      console.log(Mapping.mapping(cargo, Mapping.model.addressModel));
    };

    $scope.testReverse = function (argument) {
      var coordinates = {longitud: -74.04487, latitud: 4.73162};
      GeocodingServices.reverse(coordinates.longitud, coordinates.latitud).then(function (data) {
        console.log(data);
      }, function (data) {
        console.log(data);
      });
    }

    $scope.testPoints = function (argument) {
      var points = [
        {longitude: -74.04487, latitude: 4.73162},
        {longitude: -78.04487, latitude: 8.73162},
        {longitude: -82.04487, latitude: 12.73162}
      ];

      MapsServices.showPoints(points);
    }

    $scope.$on('$viewContentLoaded', function (event){
      $scope.mapGoogle = MapsServices.init({
        container : 'map',
        controlId : 'olmap'
      });
    });

    $scope.testExcel = function () {
      var items = [{
            name: "John Smith",
            email: "j.smith@example.com",
            dob: "1985-10-10"
        }, {
            name: "Jane Smith",
            email: "jane.smith@example.com",
            dob: "1988-12-22"
        }, {
            name: "Jan Smith",
            email: "jan.smith@example.com",
            dob: "2010-01-02"
        }, {
            name: "Jake Smith",
            email: "jake.smith@exmaple.com",
            dob: "2009-03-21"
        }, {
            name: "Josh Smith",
            email: "josh@example.com",
            dob: "2011-12-12"
        }, {
            name: "Jessie Smith",
            email: "jess@example.com",
            dob: "2004-10-12"
        }
      ];

      JourneyHttp.getList(function(data) {
        var j = data.filter(function (value) {
          return value.id === '560abf02e4b042e146fe7a99';
        })[0];

        XlsxExporter.getReportVisitList(j.routes[0]);
        //console.log(items);
        //alasql('SELECT * INTO XLSX("john.xlsx",{headers:true}) FROM ?',[items]);
      });
    }
  }
]);