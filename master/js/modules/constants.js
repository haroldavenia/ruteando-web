/**=========================================================
 * Module: constants.js
 * Define constants to inject across the application
 =========================================================*/
App
  .constant('APP_COLORS', {
    'primary':                '#5d9cec',
    'success':                '#27c24c',
    'info':                   '#23b7e5',
    'warning':                '#ff902b',
    'danger':                 '#f05050',
    'inverse':                '#131e26',
    'green':                  '#37bc9b',
    'pink':                   '#f532e5',
    'purple':                 '#7266ba',
    'dark':                   '#3a3f51',
    'yellow':                 '#fad732',
    'gray-darker':            '#232735',
    'gray-dark':              '#3a3f51',
    'gray':                   '#dde6e9',
    'gray-light':             '#e4eaec',
    'gray-lighter':           '#edf1f2'
  })
  .constant('APP_MEDIAQUERY', {
    'desktopLG':             1200,
    'desktop':                992,
    'tablet':                 768,
    'mobile':                 480
  })
  .constant('ROAD_RESTRICTION_TYPE', {
    'TIME':'TIME',
    'RESOURCE_TIME': 'RESOURCE_TIME',
    'FIXED_ROUTES' : 'FIXED_ROUTES'    
  })
  .constant('TYPE_LENGTH_OF_STAY', {
    'FIXED':'FIXED',
    'DEFINE_ITINERARY': 'DEFINE_ITINERARY'
  })
  .constant('APP_REQUIRES', {
    // jQuery based and standalone scripts
    scripts: {
      'whirl':              ['vendor/whirl/dist/whirl.css'],
      'classyloader':       ['vendor/jquery-classyloader/js/jquery.classyloader.min.js'],
      'animo':              ['vendor/animo.js/animo.js'],
      'fastclick':          ['vendor/fastclick/lib/fastclick.js'],
      'modernizr':          ['vendor/modernizr/modernizr.js'],
      'animate':            ['vendor/animate.css/animate.min.css'],
      'icons':              [
                              'vendor/skycons/skycons.js',
                              'vendor/fontawesome/css/font-awesome.min.css',
                              'vendor/simple-line-icons/css/simple-line-icons.css',
                              'vendor/weather-icons/css/weather-icons.min.css'
                            ],
      'sparklines':         ['app/vendor/sparklines/jquery.sparkline.min.js'],
      'wysiwyg':            [
                              'vendor/bootstrap-wysiwyg/bootstrap-wysiwyg.js',
                              'vendor/bootstrap-wysiwyg/external/jquery.hotkeys.js'
                            ],
      'slimscroll':         ['vendor/slimScroll/jquery.slimscroll.min.js'],
      'screenfull':         ['vendor/screenfull/dist/screenfull.js'],
      'vector-map':         [
                              'vendor/ika.jvectormap/jquery-jvectormap-1.2.2.min.js',
                              'vendor/ika.jvectormap/jquery-jvectormap-1.2.2.css'
                            ],
      'vector-map-maps':    [
                              'vendor/ika.jvectormap/jquery-jvectormap-world-mill-en.js',
                              'vendor/ika.jvectormap/jquery-jvectormap-us-mill-en.js'
                            ],
      'loadGoogleMapsJS':   ['app/vendor/gmap/load-google-maps.js'],
      'flot-chart':         ['vendor/Flot/jquery.flot.js'],
      'flot-chart-plugins': [
                              'vendor/flot.tooltip/js/jquery.flot.tooltip.min.js',
                              'vendor/Flot/jquery.flot.resize.js',
                              'vendor/Flot/jquery.flot.pie.js',
                              'vendor/Flot/jquery.flot.time.js',
                              'vendor/Flot/jquery.flot.categories.js',
                              'vendor/flot-spline/js/jquery.flot.spline.min.js'
                            ],
                                  // jquery core and widgets
      'jquery-ui':          [
                              'vendor/jquery-ui/ui/core.js',
                              'vendor/jquery-ui/ui/widget.js'
                            ],
                                   // loads only jquery required modules and touch support
      'jquery-ui-widgets':  [
                              'vendor/jquery-ui/ui/core.js',
                              'vendor/jquery-ui/ui/widget.js',
                              'vendor/jquery-ui/ui/mouse.js',
                              'vendor/jquery-ui/ui/draggable.js',
                              'vendor/jquery-ui/ui/droppable.js',
                              'vendor/jquery-ui/ui/sortable.js',
                              'vendor/jqueryui-touch-punch/jquery.ui.touch-punch.min.js'
                            ],
      'moment' :            ['vendor/moment/min/moment-with-locales.min.js'],
      'inputmask':          ['vendor/jquery.inputmask/dist/jquery.inputmask.bundle.min.js'],
      'flatdoc':            ['vendor/flatdoc/flatdoc.js'],
      'codemirror':         [
                              'vendor/codemirror/lib/codemirror.js',
                              'vendor/codemirror/lib/codemirror.css'
                            ],
      // modes for common web files
      'codemirror-modes-web': [
                                'vendor/codemirror/mode/javascript/javascript.js',
                                'vendor/codemirror/mode/xml/xml.js',
                                'vendor/codemirror/mode/htmlmixed/htmlmixed.js',
                                'vendor/codemirror/mode/css/css.js'
                              ],
      'taginput' :          [
                              'vendor/bootstrap-tagsinput/dist/bootstrap-tagsinput.css',
                              'vendor/bootstrap-tagsinput/dist/bootstrap-tagsinput.min.js'
                            ],
      'bootstrap':          ['vendor/bootstrap/js/bootstrap.js'],
      'filestyle':          ['vendor/bootstrap-filestyle/src/bootstrap-filestyle.js'],
      'parsley':            ['vendor/parsleyjs/dist/parsley.min.js'],
      'fullcalendar':       [
                              'vendor/fullcalendar/dist/fullcalendar.min.js',
                              'vendor/fullcalendar/dist/fullcalendar.css'
                            ],
      'gcal':               ['vendor/fullcalendar/dist/gcal.js'],
      'chartjs':            ['vendor/Chart.js/Chart.js'],
      'morris':             [
                              'vendor/raphael/raphael.js',
                              'vendor/morris.js/morris.js',
                              'vendor/morris.js/morris.css'
                            ],
      'loaders.css':        ['vendor/loaders.css/loaders.css'],
      'spinkit':            ['vendor/spinkit/css/spinkit.css'],
      'openLayer':          [
                              'vendor/openLayer3/ol-debug.js',
                              'vendor/openLayer3/ol.css',
                              //  'vendor/openLayer3/ol.js'
                            ],
      'openLayerSwitcher':  [
                              'vendor/openLayerSwitcher/ol3-layerswitcher.js',
                              'vendor/openLayerSwitcher/ol3-layerswitcher.css'
                            ],
      // 'ol3-AnimatedCluster':[
      //                         'vendor/ol3-AnimatedCluster/interaction/selectclusterinteraction.js',
      //                         'vendor/ol3-AnimatedCluster/layer/animatedclusterlayer.js'
      //                       ],
      'json2html':          [
                              'vendor/json2html/jquery.json2html.js',
                              'vendor/json2html/json2html.js'
                            ],
      'jsPDF':              [
                              'vendor/jsPDF/jspdf.min.js',
                              // 'vendor/jspdf/dist/jspdf.debug.js',
                              // 'vendor/jsPDF/jspdf.debug.js',
                            ],
      'jsPDF.plugins':      [

                              'vendor/jsPDF/png.js',
                              'vendor/jsPDF/zlib.js',
                              'vendor/jsPDF/plugins/addimage.js',
                              //'vendor/jsPDF/plugins/addhtml.js',
                              /*'vendor/jsPDF/plugins/annotations.js',
                              'vendor/jsPDF/plugins/autoprint.js',
                              'vendor/jsPDF/plugins/canvas.js',
                              'vendor/jsPDF/plugins/cell.js',
                              'vendor/jsPDF/plugins/context2d.js',
                              'vendor/jsPDF/plugins/from_html.js',
                              'vendor/jsPDF/plugins/javascript.js',
                              'vendor/jsPDF/plugins/outline.js',*/
                              'vendor/jsPDF/plugins/png_support.js',
                              /*'vendor/jsPDF/plugins/split_text_to_size.js',
                              'vendor/jsPDF/plugins/standard_fonts_metrics.js',
                              'vendor/jsPDF/plugins/svg.js',
                              'vendor/jsPDF/plugins/total_pages.js',*/
                              'vendor/jspdf-autotable/dist/jspdf.plugin.autotable.js'
                            ],
      'fakerJS':            [
                              'vendor/fakerJS/js/faker.js',
                              'vendor/fakerJS/js/prettyPrint.js',
                              'vendor/fakerJS/locales/es/faker.es.min.js',
                              'vendor/fakerJS/locales/en/faker.en.min.js',
                              'vendor/fakerJS/locales/en_GB/faker.en_GB.min.js'
                            ],
      'alasql_excel':       [
                              'vendor/alasql_xlsx/alasql.min.js',
                              'vendor/alasql_xlsx/xlsx.core.min.js'
                            ],
      'uiSelect':         ['vendor/angular-ui-select3/src/select3.js', 
                           'vendor/angular-ui-select/dist/select.css']
    },
    modules: [
      {name: 'toaster',                   files: ['vendor/angularjs-toaster/toaster.js',
                                                 'vendor/angularjs-toaster/toaster.css']},
      {name: 'localytics.directives',     files: ['vendor/chosen_v1.2.0/chosen.jquery.min.js',
                                                 'vendor/chosen_v1.2.0/chosen.min.css',
                                                 'vendor/angular-chosen-localytics/chosen.js']},
      {name: 'ngDialog',                  files: ['vendor/ngDialog/js/ngDialog.min.js',
                                                 'vendor/ngDialog/css/ngDialog.min.css',
                                                 'vendor/ngDialog/css/ngDialog-theme-default.min.css'] },
      {name: 'ngWig',                     files: ['vendor/ngWig/dist/ng-wig.min.js'] },
      {name: 'ngTable',                   files: ['vendor/ng-table/dist/ng-table.min.js',
                                                  'vendor/ng-table/dist/ng-table.min.css']},
      {name: 'ngTableExport',             files: ['vendor/ng-table-export/ng-table-export.js']},
      {name: 'angularBootstrapNavTree',   files: ['vendor/angular-bootstrap-nav-tree/dist/abn_tree_directive.js',
                                                  'vendor/angular-bootstrap-nav-tree/dist/abn_tree.css']},
      {name: 'htmlSortable',              files: ['vendor/html.sortable/dist/html.sortable.js',
                                                  'vendor/html.sortable/dist/html.sortable.angular.js']},
      {name: 'xeditable',                 files: ['vendor/angular-xeditable/dist/js/xeditable.js',
                                                  'vendor/angular-xeditable/dist/css/xeditable.css']},
      {name: 'angularFileUpload',         files: ['vendor/angular-file-upload/angular-file-upload.js']},
      {name: 'ngImgCrop',                 files: ['vendor/ng-img-crop/compile/unminified/ng-img-crop.js',
                                                  'vendor/ng-img-crop/compile/unminified/ng-img-crop.css']},
      {name: 'ui.select',                 files: ['vendor/angular-ui-select/dist/select.js',
                                                  'vendor/angular-ui-select/dist/select.css']},
      {name: 'ui.codemirror',             files: ['vendor/angular-ui-codemirror/ui-codemirror.js']},
      {name: 'angular-carousel',          files: ['vendor/angular-carousel/dist/angular-carousel.css',
                                                  'vendor/angular-carousel/dist/angular-carousel.js']},
      {name: 'ngGrid',                    files: ['vendor/ng-grid/build/ng-grid.min.js',
                                                  'vendor/ng-grid/ng-grid.css' ]},
      {name: 'infinite-scroll',           files: ['vendor/ngInfiniteScroll/build/ng-infinite-scroll.js']},
      {name: 'ui.bootstrap-slider',       files: ['vendor/seiyria-bootstrap-slider/dist/bootstrap-slider.min.js',
                                                  'vendor/seiyria-bootstrap-slider/dist/css/bootstrap-slider.min.css',
                                                  'vendor/angular-bootstrap-slider/slider.js']},
      {name: 'ui.bootstrap.datepicker',   files: ['vendor/angular-bootstrap-datepicker/ui-bootstrap-datepicker-tpls-0.14.3.min.js']},
      {name: 'textAngularSetup',          files: ['vendor/textAngular/src/textAngularSetup.js']},
      {name: 'textAngular',               files: ['vendor/textAngular/dist/textAngular-rangy.min.js',
                                                  'vendor/textAngular/src/textAngular.js',
                                                  'vendor/textAngular/src/textAngularSetup.js',
                                                  'vendor/textAngular/src/textAngular.css'], serie: true},
      {name: 'angular-rickshaw',          files: ['vendor/d3/d3.min.js',
                                                  'vendor/rickshaw/rickshaw.js',
                                                  'vendor/rickshaw/rickshaw.min.css',
                                                  'vendor/angular-rickshaw/rickshaw.js'], serie: true},
      {name: 'angular-chartist',          files: ['vendor/chartist/dist/chartist.min.css',
                                                  'vendor/chartist/dist/chartist.js',
                                                  'vendor/angular-chartist.js/dist/angular-chartist.js'], serie: true},
      {name: 'ui.map',                    files: ['vendor/angular-ui-map/ui-map.js']},
      {name: 'datatables',                files: ['vendor/datatables/media/css/jquery.dataTables.css',
                                                  'vendor/datatables/media/js/jquery.dataTables.js',
                                                  'vendor/angular-datatables/dist/angular-datatables.js'], serie: true},
      {name: 'angular-jqcloud',           files: ['vendor/jqcloud2/dist/jqcloud.css',
                                                  'vendor/jqcloud2/dist/jqcloud.js',
                                                  'vendor/angular-jqcloud/angular-jqcloud.js']},
      {name: 'angularGrid',               files: ['vendor/ag-grid/dist/angular-grid.css',
                                                  'vendor/ag-grid/dist/angular-grid.js',
                                                  'vendor/ag-grid/dist/theme-dark.css',
                                                  'vendor/ag-grid/dist/theme-fresh.css']},
      {name: 'ng-nestable',               files: ['vendor/ng-nestable/src/angular-nestable.js',
                                                  'vendor/nestable/jquery.nestable.js']},
      {name: 'akoenig.deckgrid',          files: ['vendor/angular-deckgrid/angular-deckgrid.js']},
      {name: 'satellizer',                files: ['vendor/satellizer/satellizer.js']}
    ]
  })
;