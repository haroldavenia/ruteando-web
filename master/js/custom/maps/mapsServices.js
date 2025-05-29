
/**=========================================================
 * Module: MapServices
 * servicio que coordina interacciones con los mapas de OpenLayer
 =========================================================*/
/* globals App, ol, angular */
App.factory('MapsServices', [
  'APP_COLORS',
  'config',
  function (APP_COLORS, config) {
    'use strict';

    var DEFAULT_DATA_PROYECCTION = 'EPSG:4326',     // proyeccion que se utilzan en los datos del geojson
        DEFAULT_FEATURE_PROYECTION = 'EPSG:3857';   // proyeccion que se utiliza en los mapas
        
    // DOM contenedores del mapa
    var openLayerDivElement,    // DOM element que contiene el mapa de open layer
        mapDivContainer;   // DOM element que sirve de contenedor de mapas

    // referencias de objetos a mapas 
    var openLayerMap;           // referencia para el mapa openlayer

    // view para controlar el mapa
    var view,                   // refencia de la vista del mapa
        switcherLayer;          // referencia del switcher de capas

    // capas para el mapa
    var osmLayer,               // capa de dibujo del mapa de openlayer
        routeLayer,             // capa de dibujo de las rutas
        pointLayer,             // capa para dibujar el punto selector de coordenadas del mapa
        locationLayer,          // capa para agregar la posición actual
        vectorSource,           // capa temporaral para agregar markers de los paquetes
        clusterSource,          // capa que define el cluster de los markers
        routes,                 // Array de capas de rutas
        selectCluster;          // Capa de paquetes seleccionados del cluster

    //grupos de capas
    var groupBase,              // grupo de capas de mapas
        groupRoute,             // grupo de capas de rutas
        groupPoint,             // grupo de capas de puntos
        layers;                 // array contendor de todas las capas
        
    // cache de estilos para los distintos tipos de ruta
    var styleCache = {};
    var valueRGBa;  // valor por default en en inicializacion del color de las rutas
    var maxZoom = 18; // Valor maximo de zoom

    // lista de colores en formato hexagesimal que se utilizan en los estilos de las rutas
    var setColorsHex = ["#dc0b0","#458b74","#c1cdcd","#0000ff","#0000ee","#00008b","#8a2be2","#a52a2a","#ff4040","#ee3b3b","#cd3333","#8b2323","#5f9ea0","#98f5ff","#8ee5ee",
    "#7ac5cd","#53868b","#7fff00","#76ee00","#66cd00","#458b00","#d2691e","#ff7f24","#ee7621","#cd661d","#ff7f50","#ff7256","#ee6a50","#cd5b45","#8b3e2f","#6495ed","#8b8878",
    "#00ffff","#00eeee","#00cdcd","#008b8b","#b8860b","#ffb90f","#eead0e","#cd950c","#a2cd5a","#6e8b3d","#ff8c00","#ff7f00","#ee7600","#cd6600","#8b4500","#9932cc","#bf3eff",
    "#b23aee","#9a32cd","#68228b","#e9967a","#483d8b","#00ced1","#9400d3","#ff1493","#ee1289","#cd1076","#8b0a50","#00b2ee","#009acd","#00688b","#1874cd","#104e8b","#b22222",
    "#ff3030","#ee2c2c","#cd2626","#8b1a1a","#ff69b4","#ff6eb4","#ee6aa7","#cd6090","#8b3a62","#8b3a3a","#00cd00","#008b00","#ff6eb4","#ee6aa7","#cd6090","#8b3a62","#cd5c5c",
    "#cd5555","#8b3a3a","#7cfc00","#9ac0cd","#68838b","#f08080","#cd8c95","#8b5f65","#8b5742","#20b2aa","#607b8b","#8470ff","#32cd32","#ff00ff","#ee00ee","#cd00cd","#8b008b",
    "#b03060","#ff34b3","#ee30a7","#cd2990","#8b1c62","#66cdaa","#66cdaa","#0000cd","#ba55d3","#e066ff","#d15fee","#b452cd","#7a378b","#9370db","#9f79ee","#8968cd","#5d478b",
    "#3cb371","#7b68ee","#c71585","#191970","#8b795e","#000080","#8b5a00","#ff4500","#ee4000","#cd3700","#8b2500","#da70d6","#8b475d","#a020f0","#663399","#9b30ff","#912cee",
    "#7d26cd","#551a8b","#ff0000","#ee0000","#cd0000","#8b0000","#4169e1","#4876ff","#436eee","#3a5fcd","#27408b","#8b4513","#4a708b","#6a5acd","#836fff","#7a67ee","#6959cd",
    "#473c8b","#4682b4","#63b8ff","#5cacee","#4f94cd","#36648b","#4682b4","#4f94cd","#36648b","#8b7b8b","#ff6347","#ee5c42","#cd4f39","#8b3626","#00c5cd","#00868b","#ee82ee",
    "#d02090","#ff3e96","#ee3a8c","#cd3278","#8b2252","#ffff00"];


    /**
     * calcula la escala actual del mapa deacuerdo a la resolucion del view
     * @return {double} scala del mapa
     */
    function resolutionMap(){
      var resolution = view.getResolution();
      var units = view.getProjection().getUnits();
      var dpi = 25.4 / 0.28;
      var mpu = ol.proj.METERS_PER_UNIT[units];
      var scale = resolution * mpu * 39.37 * dpi;

      return scale;
    }

    /**
     * calcula la escala para iconos que representan los paquetes en el mapa 
     * @param  {double} increment     [description]
     * @param  {double} maxResolution resolucion maxima permitida en el mapa
     * @return {double}               escala de resolucion del icono
     */
    function resolutionIcon(increment, minZoom, zoom) {
      var scale;
      if (zoom < minZoom) {
          scale = 0;
      } else if (zoom < (maxZoom * 20)/100) {
          scale = 0.25;
      } else {
          scale = ((increment +(zoom*increment/maxZoom)) + 0.05);
      }

      return scale;
    }

    /**
     * calcula la escala del ancho de lineas que representan las rutas segun 
     * el zoom aactual del mapa
     * @param  {double} max_value ?¿?¿?
     * @param  {double} _zoom     zoom actual del mapa
     * @return {double}           ancho de la linea de acuerdo a la resolucion del mapa
     */
    function resolutionLine(max_value, _zoom) { 
      if (_zoom < 2){
        return 0.2;
      } else if (_zoom < 3) {
        return 0.6;
      } else if (_zoom < 4) {
        return 0.8;    
      } else if (_zoom < 6) {
        return 1;    
      } else if (_zoom <  8) {
        return  2;
      } else if (_zoom < 10) {
        return  4;
      } else if (_zoom < 12) {
        return  6; 
      } else if (_zoom < 14) {
        return  7; 
      } else if (_zoom < 16) {
        return  10; 
      } else if (_zoom < 18) {
        return  14;
      } else {
        return 16;
      }
    }

    /**
     * calcula la escala de la fuente para los iconos que representan los paquetes segun 
     * el zoom del mapa
     * @param  {double} increment     delta de incrementeo de resolucion
     * @param  {double} maxResolution resolucion maxima permitida
     * @return {double}               escala de resolucion de la fuente
     */
    function resolutionFont(increment, minZoom, zoom) {

        var scale;
        if (zoom < minZoom) {
            scale=0;
        } else if (zoom < (maxZoom*20)/100) {
            scale = 0.25;
        } else {
            scale = ((increment +(zoom*increment)/maxZoom) + 0.05);
        }

        return scale;
    }

    /**
     * calcula un offset que mantiene centrado el texto del los iconos que representan 
     * los paquetes en cada cambio del zomm del mapa
     * @return {double} offset calculado
     */
    function resolutionOffSet(increment, minZoom, zoom)
    {
        var scale;
        if (zoom < minZoom) {
            scale = 0;
        } else if (zoom < (maxZoom * 20)/100) {
            scale = (increment +(zoom*increment/maxZoom));
        } else {
            scale = ((increment +(zoom*increment)/maxZoom) + 0.05);
        }

        return scale;
    }

    /**
    * funcion para crear estilos de los paquetes de acuerdo al zoom del mapa
    * @return {ol.style.Style}         el nuevo estylo del marcador
    */
    function getIconStyleCLuster() {

        /**
         * [style description]
         * @param  {Array<ol.Feature>}    feature    trae los features que se esten sobrelapando
         * @param  {double}               resolution trae la resolucion actual del mapa. (no se utiliza)
         * @return {ol.style.Style}                  funcion para el calculo de estilos segun la resolucion
         */
        var style = function (feature, resolution) {
            var style;
            if (!!openLayerMap) {
                var name;
                var size = feature.get('features').length;
                var theFeature = feature.get('features')[0];
                var zoom_ = openLayerMap.getView().getZoom();
                var resFont = resolutionFont(0.6, 2, zoom_);
                var offSet = resolutionOffSet(-16, 2, zoom_);

                if (resFont === 0) {
                    name = '';
                } else {
                    name = theFeature.get('name');
                }

                if (size === 1) { // realiza un style para un unico feature
                    if (name === 'Start') {
                        style = [
                            new ol.style.Style({
                                image: new ol.style.Icon({
                                    anchorOrigin: 'top-left',
                                    anchorXUnits: 'fraction',
                                    anchorYUnits: 'fraction',
                                    anchor: [0.5, 1],
                                    size: [90, 120],
                                    //opacity: 1.0,
                                    src: 'app/img/marker-depot.png',
                                    scale: resolutionIcon(0.17, 2, zoom_)
                                })
                            })
                        ];
                    } else {
                        style = [new ol.style.Style({
                            image: new ol.style.Icon(({
                                anchorOrigin: 'top-left',
                                anchorXUnits: 'fraction',
                                anchorYUnits: 'fraction',
                                anchor: [0.5, 1],
                                size: [90, 120],
                                //opacity: 1.0,
                                src: 'app/img/marker-red.png',
                                scale: resolutionIcon(0.17, 2, zoom_)
                            })),
                            text: new ol.style.Text({
                                text: name,
                                scale: resFont,
                                offsetY: offSet,
                                textAlign: 'center',
                                textBaseline: "middle",
                                font: 'bold 12px Arial Narrow',
                                fill: new ol.style.Fill({
                                    color: '#152e35',
                                    width: 2
                                }),
                                stroke: new ol.style.Stroke({
                                    color: '#fff',
                                    width: 5
                                }),
                                offsetX: 0,
                                rotation: 0
                            })
                        })];
                    }
                } else { // realiza un cluster para un array de features que se estes solpando en el mapa
                    style = styleCache[size];
                    if (!style) {
                        style = [
                            new ol.style.Style({
                                image: new ol.style.Circle({
                                    radius: 12,
                                    stroke: new ol.style.Stroke({
                                        color: '#2aabcf',
                                        width: 4
                                    }),
                                    fill: new ol.style.Fill({
                                        color: '#FFFFFF'
                                    })
                                }),
                                text: new ol.style.Text({
                                    textAlign: "center",
                                    textBaseline: "middle",
                                    font: 'bold 12px Arial Narrow',
                                    text: size.toString(),
                                    fill: new ol.style.Fill({
                                        color: '#152e35'
                                    }),
                                    stroke: new ol.style.Stroke({
                                        color: '#fff',
                                        width: 1
                                    }),
                                    offsetX: 0,
                                    offsetY: 0,
                                    rotation: 0
                                })
                            })];
                        styleCache[size] = style;
                    }
                }
                return style;
            }
            ;

        }
        return style;
    }

    /**
     * trae un estilo de icono para punto de localizacion en el mapa de acuerdo al zoom
     * @return {ol.style.Icon} nuevo estilo de icono
     */
    function getIconStyleLocation() {
        var iconStyle;
        if (!!openLayerMap) {
            var zoom_ = openLayerMap.getView().getZoom();
            iconStyle = new ol.style.Style({
                image: new ol.style.Icon(({
                    anchorOrigin: 'bottom-left',
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'fraction',
                    anchor: [0.5, 0.5],
                    size: [32, 32],
                    //opacity: 1.0,
                    src: 'app/img/marker-location.png',
                    scale: resolutionIcon(0.4, 2, zoom_)
                }))
            });
        }
        return iconStyle;
    }

    /**
     * returna un nuevo estilo para las rutas en el mapa deacuerdo al zoom actual
     * @return {ol.style.Style} nuevo estilo de la ruta
     */
    function getStyleRoutes() {
      var zoom_;
      var style;
      if (!!openLayerMap){ // se comprueba que la referencia al mapa de openlayer haya sido instanciada
       zoom_ = openLayerMap.getView().getZoom();
       style = new ol.style.Style({
            stroke: new ol.style.Stroke(({
                color : valueRGBa,
                width: resolutionLine(10, zoom_),
                opacity: 0.5
            }))
        });
      }
      return style;
    }

    // Style for selection
    var img = new ol.style.Circle(
    {
        radius: 5,
        stroke: new ol.style.Stroke(
        {
            color:"rgba(0,255,255,1)",
            width:1
        }),
        fill: new ol.style.Fill(
        {
            color:"rgba(0,255,255,0.3)"
        })
    });

    var style0 = new ol.style.Style(
    {
        image: img
    });

    var style1 = new ol.style.Style(
    {
        image: img,
        // Draw a link beetween points (or not)
        stroke: new ol.style.Stroke(
        {
            color:"#fff",
            width:1
        })
    });

    // function getSelectStyleCluster() {
    //     var style = new ol.style.Style({
    //         image: getIconStyleCLuster(),
    //         // Draw a link beetween points (or not)
    //         stroke: new ol.style.Stroke(
    //         {
    //             color: "#fff",
    //             width: 1
    //         })
    //     });
    //
    //     return style;
    // }

    /**
     * Convert Hex color to RGB
     * @param  {string} hex     color en formato hexagesimal 
     * @param  {double} opacity opacidad entre [0-1]
     * @return {string}         string en formato: 'rbga(#,#,#,#)'
     */
    function convertHex(hex,opacity){

        var result;
        if (!!hex)
        {
            hex = hex.replace('#','');
            var r = parseInt(hex.substring(0,2), 16);
            var g = parseInt(hex.substring(2,4), 16);
            var b = parseInt(hex.substring(4,6), 16);

            // Add Opacity to RGB to obtain RGBA
            result = 'rgba('+r+','+g+','+b+','+opacity+')';
        }

        return result;
    }

    /**
     * selecciona un color aleatorio desde el array de setColorsHex
     * @return {string} string en formato: 'rbga(#,#,#,#)'
     */
    function getColor() {
        var value = Math.floor(Math.random() * ((setColorsHex.length - 0) + 1));
        var color = setColorsHex[value];
        return convertHex(color, 0.5);
    }

    // NOTA: se utiliza en un futuro
    function getRandomColor() {
        var letters = '0123456789ABCDEF'.split('');
        var color = '#';
        for (var i = 0; i < 6; i++ ) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return convertHex(color, 0.5);
    }

    /**
    * helper para setear valores por defecto
    * @param {*} currentValue valor actaul que se va a asignar
    * @param {*} defaultValue valor por defecto en caso de que currentValue = false
    */
    function setValue(currentValue, defaultValue) {
      return (typeof currentValue !== 'undefined')? currentValue : defaultValue;
    }

    /**
   * returna una nueva feature en el punto [x,y]
   * @param  {Array<x,y>} point array de coordenadas [x,y] donde esta uvicada la nueva feature en el mapa
   * @return {ol.Feature}       nueva feature en las coordenadas indicadas por point
   */
    function getIconFeature (point, value) {
        var iconFeature = new ol.Feature({
          geometry: new ol.geom.Point(point),
          name: value.toString()
        });

        return iconFeature;
    }

    /**
    * funcion de incializacion del mapa en la vista
    * @param  {Object} options     {key:value} de opciones del inicializacion del mapa
    *                              mapId : id del DOM element donde se agrega el mapa
    *                              controlId : id los controles del mapa (aqui utilizado para cargar
    *                              los mapa de openlayer como controles en en el mapa de google map)
    *                              container : id del div que servira de contenedor para el mapa
    *                              onClickMap : callback que maneja el evento singleClick dispoarado
    *                              por el mapa
    * @return {ol.Map}         el mapa creado con las opciones espesificadas
    */
    function init (options) {
      var openLayerDivID, containerMapDivID, onClickMapCallback, onDblClickMapCallback;

      if (!options || !options.container){
        throw "No se puede mostrar el mapa";
      }else{
        openLayerDivID          = options.controlId || "olmap";
        containerMapDivID       = options.container || "map"; 
        onClickMapCallback      = options.onClickMap || null; //function(coordinate){;}; 
        onDblClickMapCallback   = options.onDblClickMap || null; //function(coordinate){;}; 
      }

      openLayerDivElement     = document.createElement('div');
      openLayerDivElement.id  = openLayerDivID;
      openLayerDivElement.className += 'olmap';
      mapDivContainer = document.getElementById(containerMapDivID);
      mapDivContainer.appendChild(openLayerDivElement);

      valueRGBa = getColor();

      // definicion de la view de mapa
      view = new ol.View({
        center: ol.proj.transform([0.0,0.0], 'EPSG:4326', 'EPSG:3857'),
        minZoom: 2.5,
        maxZoom: maxZoom
      });

      view.on('change:resolution', onChangeResolution);   // manejador para el cambio de resolucion del mapa

      osmLayer = new ol.layer.Tile({title:'Map Box', type:'base'});       // capa para el mapa de openlayer
      osmLayer.setVisible(true);
      //osmLayer.setSource(new ol.source.OSM());
      osmLayer.setSource(new ol.source.XYZ({
        url: config().mapBoxURL
      }));            

      //Variables temporales para la creación de un vector Layer con cluster de distancia
      vectorSource = new ol.source.Vector();
      clusterSource = new ol.source.Cluster({
          distance: 40,
          source: vectorSource
      });          

      // capa para dibujar los puntos de visitas de una ruta en el mapa con cluster de distancia
      pointLayer = new ol.layer.Vector({
          title: 'Visitas',
          visible:true,
          source: clusterSource,
          animationDuration: 700,
          style: getIconStyleCLuster()
      });

      // capa para dibujar las rutas en el mapa
      routeLayer = new ol.layer.Vector({
        title: 'Route',
        visible: true,
        source : new ol.source.Vector()
      });

      // capa para dibujar los puntos de packetes en el mapa
      locationLayer = new ol.layer.Vector({
        title: 'location',
        visible:true,
        source : new ol.source.Vector(),
        style: getIconStyleLocation()
      });

      // grupo de capas para los mapas
      groupBase = new ol.layer.Group({
        title : 'Mapa Base:',
        layers : [osmLayer]
      });

      // grupo de capas que contienen las rutas de un trayecto
      groupRoute = new ol.layer.Group({
        title : 'Rutas',
        layers : [routeLayer]
      });

      // grupo de capas que contienen los puntos de paquetes y de visitas
      groupPoint = new ol.layer.Group({
        title: 'Puntos de:',
        layers : [pointLayer, locationLayer]
      });

      layers = [];
      layers.push(groupBase);
      layers.push(groupRoute);
      layers.push(groupPoint);

      switcherLayer = new ol.control.LayerSwitcher({ tipLabel : 'Legende' });
 
      // referencia para el mapa de openlayer
      openLayerMap = new ol.Map({
        layers: layers,
        interactions: ol.interaction.defaults({
          altShiftDragRotate: false,
          dragPan: false,
          rotate: false
        }).extend([new ol.interaction.DragPan({kinetic: null})]),
        target: openLayerDivElement,
        view: view 
      });

      //actualiza la posición del mapa al dar click
      openLayerMap.on('click', function(evt) {
        //goToPoint(evt.coordinate, false);
      });

      if(onClickMapCallback){ 
        openLayerMap.on('singleclick', function (evt) {
          goToPoint(evt.coordinate, false);
          var tr = transformToPolar(evt.coordinate);
          onClickMapCallback(tr);
        });
      }
      if(onDblClickMapCallback){ 
        openLayerMap.on('dblclick', function (evt) {
          goToPoint(evt.coordinate, false);
          var tr = transformToPolar(evt.coordinate);
          onDblClickMapCallback(tr);
        });
      }

      view.setCenter([0, 0]);
      view.setZoom(5);
      openLayerMap.addControl(switcherLayer);    // se agrega el switcher de capas en el mapa
      return openLayerMap;
    }

    /**
    * callback para actualizar los estilos de las features deacuerdo a la resolucion del mapa
    * @return {[type]} [description]
    */
    function onChangeResolution() {
        pointLayer.setStyle = getIconStyleCLuster();
        locationLayer.setStyle = getIconStyleLocation();
        routeLayer.getSource().forEachFeature(function(feature){
          var style = getStyleRoutes();
          feature.setStyle(style);
        });
    }

    /**
    * registra un nuevo manejador de eventos en el mapa
    * @param  {string} onEvent         evento al cual se registra el manejador
    * @param  {callabck} handlerCallback callback para menajr el evento
    * @return {void}                 [description]
    */ 
    function registerEventHandler(onEvent, handlerCallback) {
      openLayerMap.on(onEvent, handlerCallback);
    }

    /**
    * retorna la referencia al mapa de openlayer
    * @return {void}
    */
    function getMap() {
      return openLayerMap;
    }

    // function onSelectCluster() {
    //
    //   selectCluster.getFeatures().on(['add'], function (e) {
    //       var c = e.element.get('features');
    //       if (c.length == 1) {
    //           var feature = c[0];
    //           console.log("One feature selected...<br/>(id=" + feature.get('id') + ")");
    //       }
    //       else {
    //           console.log("Cluster (" + c.length + " features)");
    //       }
    //   })
    //
    //   selectCluster.getFeatures().on(['remove'], function (e) {
    //       //$(".infos").html("");
    //   })
    // }
    /**
    * realiza un zoon sobre la ruta espesifica que tenga el feature con id = idRoute
    * @param  {number|string} idRoute id de la feature donde se encuentra la capa
    * @return {void}         
    */
    function zoonToRoute (idRoute) {
      var layer;
      layer = findRouteInLayers(groupRoute.getLayers(), idRoute);
      if(layer){
        openLayerMap.getView().fit(layer.getSource().getExtent(), openLayerMap.getSize(),{});    
      }
    }


    /**
    * realiza un busqueda sobre las features de las capas de rutas para encontrar la capa con id = idRoute
    * @param  {Array<ol.layer.Vector>} layers  capas de vectores de las rutas
    * @param  {number|string} idRoute id de la ruta a buscar
    * @return {ol.layer.Vector}         capa que contiene la feature con el id = idRoute
    */
    function findRouteInLayers(layers, idRoute){
      var layer;
      angular.forEach(layers, function (ly) {
        if(ly.getSource().getFeatureById(idRoute)){
          layer = ly;
        }
      });
      return layer;
    }

    /**
    * helper apra transformar coordenadas polares a coordenadas cartecianas
    * @param  {Object} coordinate objeto con las coordenadas {latitude:y , longitude:x}
    * @param  {object} options    opciones de la proueccion de las coordenadas de origen y destino
    * @return {Array<logitude, latitude>}            array con las nuevas coordenadas cartecianas [x,y]
    */
    function transformCoordinates(coordinate, options){
      var _options = options || {};
      var src = _options.src || DEFAULT_DATA_PROYECCTION,
          dst = _options.dst || DEFAULT_FEATURE_PROYECTION;
      return ol.proj.transform([coordinate.longitude, coordinate.latitude], src, dst);
    }

    function transformToCartesians(coordinates) {
      var options = {
        src : DEFAULT_DATA_PROYECCTION,
        dst: DEFAULT_FEATURE_PROYECTION
      };
       var valid = validateCoordenates(coordinates);
      return (angular.isDefined(valid))? transformCoordinates(valid, options) : null;
    }

    function transformToPolar(coordinates) {
      var options = {
        src: DEFAULT_FEATURE_PROYECTION,
        dst : DEFAULT_DATA_PROYECCTION
      };
       var valid = validateCoordenates(coordinates);
      return (angular.isDefined(valid))? transformCoordinates(valid, options) : null;
    }

    function validateCoordenates(coordinates){
      var valid = {
        longitude : null,
        latitude : null 
      };

      valid.longitude = coordinates.longitude || coordinates[0];
      valid.latitude = coordinates.latitude || coordinates[1];
      
      return (angular.isNumber(valid.longitude) && angular.isNumber(valid.latitude))? valid : null;  
    }

    /**
    * centra el mapa en las coordenadas espesificas y coloca el apuntador en las mismas coordenadas
    * @param  {Object} coordinate objeto con las coordenadas {latitude:y , longitude:x} el cual se coloca el apuntador
    * @param  {object} options    center: centra tambien el mapa en las coordenadas
    * @return {void}
    */
    function goToPoint(coordinate, transform, center){  
      var tc, marker;
      var vectorSource = locationLayer.getSource();
      if(!coordinate) {return;}
      vectorSource.clear();
      tc = (transform === true) ? transformCoordinates(coordinate) : coordinate;
      marker = getIconFeature(tc, "");
      vectorSource.addFeature(marker);
      (center)? view.setCenter(tc): null;
    }

   
    /**
    * transforma un array de coordenadas polares [{latitude, longitude},...] a un array de coordenadas cartesianas [[x,y],...]
    * @param  {Array<Object>} pathPoints array con las coordenadas polares
    * @return {Array<Array[x,y]>}      arry con las coordenadas cartesianas            
    */
    function transformPathPoints(pathPoints) {
      var trasnformPoints = [];
      if(angular.isArray(pathPoints)){
        angular.forEach(pathPoints, function (point) {
          this.push(transformCoordinates(point));
        }, trasnformPoints);
      }
      return trasnformPoints;
    }

    /**
    * transforma un array de rutas de coordenadas polares en un array de rutas en coordenadas cartesianas
    * @param  {Array} pathArray array de rutas en coordenadas polares
    * @return {array}           array de rutas en coordenadas cartesianas
    */
    function transformPathArray(pathArray) {
      var transformPathArray = [];
      if(angular.isArray(pathArray)){
        angular.forEach(pathArray, function(pathPoints){
          this.push(transformPathPoints(pathPoints));
        }, transformPathArray);
      }
      return transformPathArray;
    }

    /**
    * crea una nueva feature a partir de una array de corodenadas cartesianas
    * @param  {Array<x,y>}     points  array de puntos cartesianos
    * @param  {Object}     options     id : id de la nueva feature
    *                                  name : nombre de la nueva feature
    * @return {ol.Feature}         nueva feature con la geometria del array de puntos
    */
    function getLineFeature(points, options) {
      var _options = options || {};
      var line = new ol.Feature({
        geometry : new ol.geom.LineString(points),
      });

      (angular.isDefined(_options.name))? line.setGeometryName(_options.name) : false;
      (angular.isDefined(_options.id))? line.setId(_options.id) : false;

      return line;
    }

    /**
    * crea todas las features a partir de un array de rutas
    * @param  {Array} transformPathArray array de rutas (array de puntos)
    * @return {Array}                    array de features
    */
    function getLinesFeatures(transformPathArray) {
      var linesFeatures = [];
      angular.forEach(transformPathArray, function(transformPath){
        this.push(getLineFeature(transformPath));
      }, linesFeatures);

      return linesFeatures;
    }

    /**
    * muestra un array de rutas en el mapa
    * @param  {Array} pathArray array de rutas a mostrar
    * @return {void}           
    */
    function showPath(pathArray) {
      var extent;
      var result = [];
      result = transformPathArray(pathArray);
      result = getLinesFeatures(result);
      routes = result;
      var source = routeLayer.getSource();
      source.addFeature(routes[0]);
      extent = source.getExtent();
      openLayerMap.getView().fit(extent, openLayerMap.getSize(),{});
    }

    /**
    * muestra los puntos de visitas marcados en arrayPoints
    * @param  {Array} arrayPoints array de coordenadas donde se indican todas las visitas
    * @return {voi}             
    */
    function showPoints (arrayPoints, place) {
      var tc, marker;
      vectorSource.clear();
      if (place !== '') {
        tc = transformCoordinates({
          longitude : parseFloat(place.longitude),
          latitude : parseFloat(place.latitude)
        });
        marker = getIconFeature(tc,"Start");
        vectorSource.addFeature(marker);
      }

      angular.forEach(arrayPoints, function(pack, key){
        tc = transformCoordinates({
          longitude : parseFloat(pack.longitude),
          latitude : parseFloat(pack.latitude)
        });
        marker = getIconFeature(tc, key+1);
        vectorSource.addFeature(marker);
      });

        // Select interaction to spread cluster out and select features
        // selectCluster = new ol.interaction.SelectCluster(
        //     {	// Point radius: to calculate distance between the features
        //         pointRadius:7,
        //         animate: true,
        //         // Feature style when it springs apart
        //         featureStyle: function()
        //         {
        //             return [style1];
        //         }
        //     });
        //
        // openLayerMap.addInteraction(selectCluster);
    }


    return {
      init : init,
      registerEventHandler: registerEventHandler,
      getMap : getMap,
      zoonToRoute : zoonToRoute,
      goToPoint : goToPoint,
      showPath : showPath,
      showPoints : showPoints,
      zoom : function(value) { view.setZoom(value); },
      center: function(coordinates) { view.setCenter(transformCoordinates(coordinates)); }
      //showPackages:showPackages,
    };
  }
]);
