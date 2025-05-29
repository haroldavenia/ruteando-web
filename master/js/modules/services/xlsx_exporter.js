
/**=========================================================
 * Module: address_model.js
 * modelo para el manejo de direcciones
 =========================================================*/

 App.factory('XlsxExporter', ['PdfExporter',function (PdfExporter) {

    var defaultReportData = {
      visitList : {
        columns : [
          { title : "ID",               dataKey : "visitNumber"},
          //{ title : "Nombre",           dataKey : "name"},
          { title : "Salida",           dataKey : "departureAddress"},
          { title : "Llegada",          dataKey : "arrivalAddress"},
          { title : "Nº Guia",          dataKey : "guideNumber"},
          { title : "Ciudad",           dataKey : "city"},
          { title : "Zona",             dataKey : "zone"},
          { title : "T. de LLegada (min)",    dataKey : "timeArrival"},
          { title : "Estadia (min)",          dataKey : "timeState"},
          { title : "Distancia (mts)",        dataKey : "distanceArrival"}/*,
          { title : "Longitud",         dataKey : "longitude"},
          { title : "Latitud",          dataKey : "latitude"}*/

          /*,
          { title : "Hora de llegada",  dataKey : "timePlanningArrival"},
          { title : "Origen",           dataKey : "origin"},
          { title : "Destino",          dataKey : "destination"},
          { title : "Duracion",         dataKey : "duration"},
          { title : "Hora de Salida",   dataKey : "timeDeparture"},
          { title : "Estadia",          dataKey : "timeState"}*/
        ]
      }
    };

    function getReportJourneyVisitList(journey) {
      var journeyRoutesItems = [];
      var optsList=[];
      var header = true;
      angular.forEach(journey, function(route, key){
        var visitas = (new PdfExporter()).getVisitsFw(route);
        var items = getItems(visitas, defaultReportData.visitList.columns);
        optsList.push({sheetid: route.name || ("Ruta-"+key), header:header});
        header = false;
        journeyRoutesItems.push(items);
      });

      exportToXLSXMultiSheets (journeyRoutesItems, 'routes_visits_list.xlsx', optsList)
      //exportToXLSX(items, 'visits_list.xlsx'); sheetid: trick
    }

    function getReportVisitList(route) {
      var visitas = (new PdfExporter()).getVisitsFw(route);
      var items = getItems(visitas, defaultReportData.visitList.columns);
      exportToXLSX(items, 'visits_list.xlsx');
    }

    function getItems(arrayModel, columns) {
      var items = [], item, model, column;
      for (var i = 0; i < arrayModel.length; i++) {
        model = arrayModel[i];
        item = {};
        for (var j = 0; j < columns.length; j++) {
          column = columns[j];
          item[column.title] = model[column.dataKey];
        };
        items.push(item);
      };
      return items;
    }

    function exportToXLSX (items, name) {
      var name = name || 'report';
      if(!items) return;
      alasql('SELECT * INTO XLSX("'+name+'",{headers:true}) FROM ?',[items]);
    };

    function exportToXLSXMultiSheets (itemsSheets, name, optionsSheets) {
      var name = name || 'report';
      if(!itemsSheets || !optionsSheets) return;
      //alasql('SELECT * INTO XLSX("'+name+'",{headers:true}) FROM ?',[items]);
      alasql('SELECT INTO XLSX("'+name+'",?) FROM ?',[optionsSheets,itemsSheets])
    };

   return {
    getItems : getItems,
    defaultReportData : defaultReportData,
    getReportVisitList : getReportVisitList,
    getReportJourneyVisitList: getReportJourneyVisitList
   };
 }])
