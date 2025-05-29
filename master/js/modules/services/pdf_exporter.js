
/**=========================================================
 * Module: address_model.js
 * modelo para el manejo de direcciones
 =========================================================*/

App.factory('PdfExporter', ['$filter', function ($filter) {
  var logo = {
    url : "app/img/logo_ruteando2.jpg",
    image : null
  };

  var font = {
    size : {
      xs : 8,
      sm : 10,
      mds : 12,
      md : 14,
      mdl : 16,
      lg : 18,
      xl : 20
    }
  }

  /*  HELP FORT STYLES
  {
      cellPadding: 5,         // number (pt unit)
      fontSize: 10,           // number (pt unit)
      font: "helvetica",      // helvetica, times, courier
      lineColor: 200,         // number( 0 -255 gray scale) , array(R,G,B)
      lineWidth: 0.1,         // number( 0 -255 gray scale) , array(R,G,B)
      fontStyle: 'normal',    // normal, bold, italic, bolditalic
      overflow: 'ellipsize',  // visible, hidden, ellipsize or linebreak
      fillColor: 255,         // number o array(R,G,B)
      textColor: 20,          // number o array(R,G,B)
      halign: 'left',         // left, center, right
      valign: 'middle',       // top, middle, bottom
      fillStyle: 'F',         // 'S', 'F' or 'DF' (stroke, fill or fill then stroke)
      rowHeight: 20,
      columnWidth: 'auto'     // 'auto', 'wrap' or a number
  }
  */

  var tableOptions = {
    // Styling
    theme: 'striped', // 'striped', 'grid' or 'plain'
    styles: {
      columnWidth: 'auto',
      overflow: 'linebreak',
      font : "arial",
      fontStyle : "normal",
      fontSize: font.size.xs,
      // lineColor: 200,
      // lineWidth: 0.1,
    },
    headerStyles: {
      font : "arial",
      fontStyle : "bold",
      halign: 'center',
      valign: 'bottom',
    },
    bodyStyles: {
      rowHeight: 20,
      halign: 'center',
      valign: 'top',
      fillColor: 255,
      fillStyle: 'S',
      cellPadding: 3
    },
    /*alternateRowStyles: {},
    columnStyles: {},*/

    // Properties
    startY: 144,        // false (indicates margin top value) or a number
    margin: {top : 72, left:28, right:28, botton : 56},           //  a number, array or object
    pageBreak: 'auto',    // 'auto', 'avoid' or 'always'
    tableWidth: 'auto'   // 'auto', 'wrap' or a number,

    // Hooks
    /*createdHeaderCell: function (cell, data) {},
    createdCell: function (cell, data) {},
    drawHeaderRow: function (row, data) {},
    drawRow: function (row, data) {},
    drawHeaderCell: function (cell, data) {},
    drawCell: function (cell, data) {},
    beforePageContent: function (data) {},
    afterPageContent: function (data) {}*/
  };

  var tableOptionsRouteInfo = {
    //tableWidth: 'wrap',
    styles: {
      columnWidth: 100,
      overflow: 'linebreak',
      cellPadding: 2,
      font : "arial",
      fontStyle : "normal"
    },
    headerStyles: {
      rowHeight: 15,
      font : "arial",
      fontStyle : "bold",
      fontSize: 10
    },
    bodyStyles: {rowHeight: 16, fontSize: 10, valign: 'middle'},
    margin: {top : 72, left : 56, right :56, botton : 56},
    startY: 120
  }

  var tableOptionsVisitInfo = {
    tableWidth: 'auto',
    styles: {
      columnWidth: 'auto',
      overflow: 'linebreak',
      cellPadding: 2,
      font : "arial",
      fontStyle : "normal"
    },
    headerStyles: {
      rowHeight: 15,
      font : "arial",
      fontStyle : "bold",
      fontSize: 10
    },
    bodyStyles: {rowHeight: 16, fontSize: 8, valign: 'middle'},
    pageBreak: 'avoid'
  }



  var defaultReportData = {
    routeInfo : {
      title : "INFORMACION DE RUTA",
      defaultName : "route_info-",
      properties : {
        distance : "Distancia recorrida:",
        estimatedTime : "Tiempo estimado:",
        numVisits : "Clientes atendidos:",
        avgTimeVisit: "Promedio de tiempo de visita:",
        initTime : "Hora de salida:",
        finalTime : "Hora de finalizacion:",
        weightUse : "Peso usado:",
        volumeUse : "Volumen usado:",
        cost : "Gasolina:"
      },
      minMarginTop : 144,   // unidades en milimetros
      minMarginLeft : 72, // unidades en milimetros
      rowHight :  14,   // unidades en milimetros
      columnWidth : 216 // unidades en milimetros
    },

    visitList : {
      title : "ESTIMACIÓN DE ITINERARIO DE RUTA",
      defaultName : "route_visit_list-",
      columns : [
        //{ title : "ID",               dataKey : "visitNumber"},
        //{ title : "Nombre",           dataKey : "name"},
        /*{ title : "Salida",           dataKey : "departureAddress"},
        { title : "Llegada",          dataKey : "arrivalAddress"},
        { title : "Nº Guia",          dataKey : "guideNumber"},
        { title : "Ciudad",           dataKey : "city"},
        { title : "Zona",             dataKey : "zone"},
        { title : "T. de LLegada",    dataKey : "timeArrival"},
        { title : "Estadia (min)",    dataKey : "timeState"},
        { title : "Distancia",        dataKey : "distanceArrival"}*/
        /*,
        { title : "Longitud",         dataKey : "longitude"},
        { title : "Latitud",          dataKey : "latitude"},
        { title : "Hora de llegada",  dataKey : "timePlanningArrival"},
        { title : "Origen",           dataKey : "origin"},
        { title : "Destino",          dataKey : "destination"},
        { title : "Duracion",         dataKey : "duration"},
        { title : "Hora de Salida",   dataKey : "timeDeparture"},
        { title : "Estadia",          dataKey : "timeState"}*/
      ]
    },

    vehiclesList : {
      title : "REPORTE DE TIPOS DE VEHICULOS",
      defaultName : "route_visit_list-",
      columns : [
        { title : "Nombre",               dataKey : "name"},
        { title : "Peso",           dataKey : "weight"},
        { title : "Capacidad",          dataKey : "capability"},
      ]
    },

    info : {
      columns : [
        { title:"Informacion basica" ,  dataKey:'key'},
        { title:" ",  dataKey:'value'},
      ]
    }
  };

  var getImageFromUrl = function(url, callback) {
    var img = new Image(), data, ret = {
      data: null,
      pending: true
    };

    img.onError = function() {
      throw new Error('Cannot load image: "'+url+'"');
    };

    img.onload = function() {
      var canvas = document.createElement('canvas');
      document.body.appendChild(canvas);
      canvas.width = img.width;
      canvas.height = img.height;

      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      // Grab the image as a jpeg encoded in base64, but only the data
      data = canvas.toDataURL('image/jpeg').slice('data:image/jpeg;base64,'.length);
      // Convert the data to binary form
      data = atob(data);
      document.body.removeChild(canvas);

      ret['data'] = data;
      ret['pending'] = false;
      if (typeof callback === 'function') {
        callback(data);
      }
    };
    img.src = url;

    return ret;
  };

  getImageFromUrl(logo.url, function (img) {
    logo.image = img;
  });

  function loadLogo(url) {
    var _url = (!angular.isUndefined(url))? url : logo.url;
    getImageFromUrl(_url, function (img) {
      logo.image = img;
    });
  };

  function loadData() {
    loadLogo();
    return true;
  };

  function define_visitsColumns(package_zona)
  {
    if(package_zona == true){
      defaultReportData.visitList.columns = [
        { title : "ID",               dataKey : "visitNumber"},
        { title : "Salida",           dataKey : "departureAddress"},
        { title : "Llegada",          dataKey : "arrivalAddress"},
        { title : "Nº Guia",          dataKey : "guideNumber"},
        { title : "Ciudad",           dataKey : "city"},
        { title : "Zona",             dataKey : "zone"},
        { title : "T. de LLegada",    dataKey : "timeArrival"},
        { title : "Estadia (min)",    dataKey : "timeState"},
        { title : "Distancia",        dataKey : "distanceArrival"}
      ];
    }else {
      defaultReportData.visitList.columns = [
        { title : "ID",               dataKey : "visitNumber"},
        { title : "Salida",           dataKey : "departureAddress"},
        { title : "Llegada",          dataKey : "arrivalAddress"},
        { title : "Nº Guia",          dataKey : "guideNumber"},
        { title : "Ciudad",           dataKey : "city"},
        { title : "T. de LLegada",    dataKey : "timeArrival"},
        { title : "Estadia (min)",    dataKey : "timeState"},
        { title : "Distancia",        dataKey : "distanceArrival"}
      ];
    }
  }

  function hayZonaEnPckge(route)
  {
    var zone_pckg=false;
    angular.forEach(route.packages, function(pack, number) {
      if(pack.zone === null || pack.zone === "null" || pack.zone === undefined)
      {
        zone_pckg = zone_pckg;
      }else{
        zone_pckg = true;
      }
    });
    return zone_pckg;
  }

  function PdfExporter (orientation) {
    this.options = {};
    this.options.orientation = orientation || 'p'

    this.report = null;
    this.dataLoaded = loadData();
    if(jsPDF){
      this.doc = new jsPDF(this.options.orientation, 'pt');
    }else{
      alert("no se ha cargado jsPDF");
      this.doc = null;
    }
  };

  PdfExporter.prototype.drawLogo = function(x,y,w,h) {
    if(logo.image){
      this.doc.addImage(logo.image, 'JPEG', x, y, w, h, 'logo');
    }
  };

  PdfExporter.prototype.drawTitle = function(x,y) {
    if(!this.report) return;
    this.doc.setFontSize(font.size.xl);
    this.doc.text(x, y, this.report.title );
  };

  PdfExporter.prototype.getReportRouteInfo = function(routeInfo) {
    var doc, report, row = 0, x = 0, y = 0;
    this.report = defaultReportData.routeInfo;
    report = this.report;

    if(this.doc && angular.isDefined(routeInfo)){
      doc = this.doc
    }else{
      return;
    }

    this.drawLogo(56,36,184,56);
    this.drawTitle(56, 56+20);

    doc.setFontSize(font.size.md);
    y = report.minMarginTop + report.rowHight*row;
    x = report.minMarginLeft;
    doc.setFont('arial', 'bold').text(report.properties.distance, x, y)
    x = report.minMarginLeft+report.columnWidth;
    doc.setFont('arial', 'normal').text(""+routeInfo.distance+" Mtrs.", x, y)
    row++;

    y = report.minMarginTop + report.rowHight*row;
    x = report.minMarginLeft;
    doc.setFont('arial', 'bold').text(report.properties.estimatedTime, x, y)
    x = report.minMarginLeft+report.columnWidth;
    doc.setFont('arial', 'normal').text(""+routeInfo.estimatedTime+" Min.", x, y)
    row++;

    y = report.minMarginTop + report.rowHight*row;
    x = report.minMarginLeft;
    doc.setFont('arial', 'bold').text(report.properties.numVisits, x, y)
    x = report.minMarginLeft+report.columnWidth;
    doc.setFont('arial', 'normal').text(""+routeInfo.numVisits, x, y)
    row++;

    y = report.minMarginTop + report.rowHight*row;
    x = report.minMarginLeft;
    doc.setFont('arial', 'bold').text(report.properties.avgTimeVisit, x, y)
    x = report.minMarginLeft+report.columnWidth;
    doc.setFont('arial', 'normal').text(""+routeInfo.avgTimeVisit, x, y)
    row++;

    y = report.minMarginTop + report.rowHight*row;
    x = report.minMarginLeft;
    doc.setFont('arial', 'bold').text(report.properties.initTime, x, y)
    x = report.minMarginLeft+report.columnWidth;
    doc.setFont('arial', 'normal').text(""+routeInfo.initTime, x, y)
    row++;

    y = report.minMarginTop + report.rowHight*row;
    x = report.minMarginLeft;
    doc.setFont('arial', 'bold').text(report.properties.finalTime, x, y)
    x = report.minMarginLeft+report.columnWidth;
    doc.setFont('arial', 'normal').text(""+routeInfo.finalTime, x, y)
    row++;

    y = report.minMarginTop + report.rowHight*row;
    x = report.minMarginLeft;
    doc.setFont('arial', 'bold').text(report.properties.weightUse, x, y)
    x = report.minMarginLeft+report.columnWidth;
    doc.setFont('arial', 'normal').text(""+routeInfo.weightUse+"%", x, y)
    row++;

    y = report.minMarginTop + report.rowHight*row;
    x = report.minMarginLeft;
    doc.setFont('arial', 'bold').text(report.properties.volumeUse, x, y)
    x = report.minMarginLeft+report.columnWidth;
    doc.setFont('arial', 'normal').text(""+routeInfo.volumeUse+"%", x, y)
    row++;

    y = report.minMarginTop + report.rowHight*row;
    x = report.minMarginLeft;
    doc.setFont('arial', 'bold').text(report.properties.cost, x, y)
    x = report.minMarginLeft+report.columnWidth;
    doc.setFont('arial', 'normal').text(""+routeInfo.cost+" Gal.", x, y)
    row++;

    doc.output('dataurlnewwindow');
  };

  PdfExporter.prototype.getReportVisitList = function(route) {
    var hay_zona = hayZonaEnPckge(route);
    define_visitsColumns(hay_zona);
    this.report = defaultReportData.visitList;
    this.drawLogo(56,36,184,56);
    this.drawTitle(250, 56+20);

    var info = getInfoRoute(route);
    this.report = defaultReportData.info;
    this.doc.autoTable(this.report.columns, info[0], tableOptionsRouteInfo);

    var options = angular.copy(tableOptionsRouteInfo);
    options.margin = {left: 305};
    this.doc.autoTable(this.report.columns, info[1], options);

    this.report = defaultReportData.visitList;
    tableOptions.startY = this.doc.autoTableEndPosY() + 30;
    this.doc.autoTable(this.report.columns, getVisits(route), tableOptions);
    this.doc.output('dataurlnewwindow');
  };

  PdfExporter.prototype.getReportVehicleTypeList = function(lista) {
    this.report = defaultReportData.vehiclesList;
    this.drawLogo(56,36,184,56);
    this.drawTitle(250, 56+20);

    this.doc.autoTable(this.report.columns, lista, tableOptions);
    this.doc.output('dataurlnewwindow');
  };

  PdfExporter.prototype.getReportVisitList2 = function(route) {

    var visits = route.packages;

    angular.forEach(visits, function(visit, key){
      var info = getInfo(visit, visitKeys);
      tableOptionsVisitInfo.startY = this.doc.autoTableEndPosY() + 10;
      this.doc.autoTable(this.report.columns, info, tableOptionsVisitInfo);
    }, this);

    this.doc.output('dataurlnewwindow');
  };

  function getInfoRoute (route) {
    var routeInfo = [];
    var strDiff = '';
      var startRouteDate = ''+route.startRouteDate.hour+':'+route.startRouteDate.minute+':'+route.startRouteDate.second;
      var finishRouteDate = ''+route.finishRouteDate.hour+':'+route.finishRouteDate.minute+':'+route.finishRouteDate.second;
    var total_hour = parseInt(route.duration/3600)
    var total_min = parseInt((route.duration - total_hour*3600) / 60);
      strDiff = ''+total_hour+' h '+total_min+' min.';

    routeInfo[0] = [
      {key: 'Nombre',             value: route.name || 'NA'},
      {key: 'Fecha',     value: route.date || 'NA'},
      {key: 'Total de Visitas',   value: ''+route.packages.length},
      // {key: 'Hora de inicio',     value:  $filter('date')(srd, 'HH:mm' ) },
      // {key: 'Hora de fin',        value: $filter('date')(frd, 'HH:mm' )}
      {key: 'Hora de inicio',     value:  startRouteDate },
      {key: 'Hora de fin',        value: finishRouteDate}
    ];

    var weightUsed = (route.routeRestrictionType == "FIXED_ROUTES")? "No Aplica": convertTo.kilogram(route.weightUsed);
    var volumeUsed = (route.routeRestrictionType == "FIXED_ROUTES")? "No Aplica": convertTo.cubicMeter(route.volumeUsed);

    routeInfo[1] = [
      {key: 'Prom. Estadia', value: convertTo.minutes(route.avgStayTime)},
      {key: 'Distancia',     value: convertTo.kilometer(route.distanceTraveled)},
      {key: 'Peso usado',    value: weightUsed},
      {key: 'Volumen Usado', value: volumeUsed},
      {key: 'Duración',           value: strDiff}
    ];

    return routeInfo;
  };

  var convertTo = {
    minutes : function(sec) {
      return (sec >= 60)? ''+(sec/60).toFixed(2)+' min.': ''+sec+' seg.';
    },

    kilometer : function(meter) {
      return (meter>= 1000)? ''+(meter/1000).toFixed(2)+' Km.': ''+meter+' mts'
    },

    cubicMeter :  function(cubicCentimeter) {
      return (cubicCentimeter >= 100000)? ''+(cubicCentimeter/1000000).toFixed(2)+' m3.': ''+cubicCentimeter+' cm3'
    },

    kilogram : function (gram) {
      return (gram >= 1000)? ''+(gram/1000).toFixed(2)+' Kgr.' : ''+gram+' grm';
    }

  };


  PdfExporter.prototype.getVisitsFw = function(packages) {
    return getVisits(packages);
  };


  function getVisits (route, zona=true) {
    var visits = [], lastAddress = 'DEPOSITO';
    var timeState = 0, sumTime = 0, sumDistance = 0;

    var timeArrival = new Date(route.date);
    timeArrival.setHours(route.startRouteDate.hour);
    timeArrival.setMinutes(route.startRouteDate.minute);
    timeArrival.setSeconds(route.startRouteDate.second);

    console.log( "fechaHora: "+timeArrival );

    angular.forEach(route.packages, function(pack, number) {
      //var time =  (parseFloat(pack.timeArrival || 0) + timeState) * 60;
      var time =  pack.timeArrival + timeState;

      var tiempos = "arrival="+pack.timeArrival+"\t\testadia="+timeState+"\t\t(suma)="+time;
      var ms = "min:"+parseInt(time/60)+"\t\tseg:"+(time%60);
      var antes = "antes: "+$filter('date')(timeArrival, 'HH:mm:ss');

      timeArrival = new Date(
        timeArrival.setSeconds(timeArrival.getSeconds() + time)
      );

      var despues = "despues: "+$filter('date')(timeArrival, 'HH:mm:ss');


      var visit = getInfoVisit(number+1, pack, lastAddress, timeArrival,zona);
      this.push(visit);
      lastAddress = pack.address;
      timeState = pack.timeState;
      sumTime += time;
      sumDistance += pack.distanceArrival;

      sumatoria = "sumatoria: "+sumTime+" seg"
      console.log(antes+'\t\t'+despues+'\t\t'+tiempos+'\t\t'+ms+'\t\t'+sumatoria);
    }, visits);

    sumTime += timeState;

    var timeDepot = route.duration - sumTime;
    var distanceDepot = route.distanceTraveled - sumDistance;

    console.log("ultima estadia:"+ timeState);
    console.log("timeDepot: "+timeDepot+'\t\tduracion: '+route.duration+'\t\tsumatoria: '+sumTime);

    if(timeDepot > 0){
      timeArrival = new Date( timeArrival.setSeconds( timeArrival.getSeconds() + timeDepot ) );

      var row = {};
      row['visitNumber']=visits.length+1;
      row['name']='DEPOSITO';
      row['departureAddress']=lastAddress;
      row['arrivalAddress']='DEPOSITO';
      row['guideNumber']='';
      row['city']='';
      if(zona == true){
        row['zone']='';
      }
      row['timeArrival']=$filter('date')(timeArrival, 'HH:mm:ss');
      row['timeState']='';
      row['distanceArrival']=convertTo.kilometer(distanceDepot);
      row['longitude']='';
      row['latitude']='';
      visits.push(row);
    }
    return visits;
  }


  function getInfoVisit (number, pack, lastAddress, timeArrival, zona=true) {

    var row = { };

    row['visitNumber']=number;
    row['name']=(pack.name || '');
    row['departureAddress']=lastAddress;
    row['arrivalAddress']=(pack.address || '');
    row['guideNumber']=(pack.guideNumber || '');
    row['city']=(pack.city || '');
    if(zona == true){
      row['zone']=(pack.zone == null || '');
    }
    row['timeArrival']=$filter('date')(timeArrival, 'HH:mm:ss');
    row['timeState']=convertTo.minutes(pack.timeState);
    row['distanceArrival']=convertTo.kilometer(pack.distanceArrival);
    row['longitude']=pack.longitude;
    row['latitude']=pack.latitude;

    return row;
  }

  function getInfo (obj, arrayKeys) {
    var routeInfo = [];
    angular.forEach(arrayKeys, function(property){
      var _key, _val;
      if(obj.hasOwnProperty(property.name)){
        _key = property.title;
        _val = (''+obj[property.name]);
        _val = (_val != 'null')? _val : 'NA';
        this.push({
          key: _key,
          value: _val
        });
      }
    }, routeInfo);

    return routeInfo;
  };

  return PdfExporter;
}])
