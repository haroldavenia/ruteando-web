/**=========================================================
 * Module: journeys_form_controller.js
 * controllador del formulario de trayectos
 =========================================================*/


App.controller('JourneysFormController',[
    '$scope',
    '$rootScope',
    '$state',
    '$translate',
    '$stateParams',
    'FileUploader',
    'config',
    'Journey',
    'Itinerary',
    'SettingsHttp',
    'uuid',
    'tokenStorage',
    'message',
    'tempStorageData',
    function ($scope, $rootScope, $state, $translate, $stateParams, FileUploader, config, Journey, Itinerary, SettingsHttp, uuid, tokenStorage, message, tempStorageData) {
        'use strict';

        $scope.journey = {
            model : {
                name : undefined,
                setting : '',
                place : '',
                itinerary : [],
                file_name : '',
                file_prevw: false,
                file_size: 0
            },
            valid_try_upload : 0,
            goToManually : function() {
                recorrerFileToUpload(function(item, i){
                  item.upload();
                } );

                //$state.go('app.itinerary.list', { data: { journey: $scope.journey.model } });
            },
            goToHelp : function() {
                $state.go('app.journeys.help', { data: $scope.journey.model });
            },
            cancel : function() {
                $state.go('app.journeys.list');
            },
            cancelPreview : function() {
              if( $scope.uploader.queue.length > 0 )
              {
                recorrerFileToUpload(function(item_qu, i){
                  item_qu.remove();
                });
              }
              $scope.journey.valid_try_upload = 0;
              $('.bootstrap-filestyle :input').val('');
              $scope.journey.model.file_name = '';
              $scope.journey.model.file_prevw = false;
              $scope.journey.model.file_size = 0;
            }
        };

        $scope.uploader = new FileUploader({
            url : config().path.api.journeyUploadFile,
            autoUpload : false,
            headers : {
                // Authorization : 'Basic SEFOT0lULUFQUDoxMjM0NTY='
                Authorization : 'Bearer ' + tokenStorage.get()
            },
            removeAfterUpload: true
        });

        // FILTERS

        $scope.uploader.filters.push(
          {
              name: 'checkName',
              fn: function (item) {
                  if ($scope.journey.model.name == undefined || $scope.journey.model.name == '') {
                      $scope.name_required = true;
                      //document.getElementById('filestyle-0').value=''; // esto esta quemado :(
                  } else {
                      $scope.name_required = false;
                  }
                  //return !$scope.name_required;
                  return true;
              }
          },
          {
            name: 'extensionFilter',
            fn: function(item , options) {
                if(validate_is_csv(item.name)){
                  return true;
                }else{
                  return false;
                }
            }
        },
        {
            name: 'sizeFilter',
            fn: function(item , options) {
                if(item.size > 0){
                  return true;
                }else {
                  return false;
                }
            }
        },
        {
            name: 'queeReset',
            fn: function(item , options) {
                if(item.size > 0 && validate_is_csv(item.name)){
                  if( $scope.uploader.queue.length > 0 )
                  {
                    recorrerFileToUpload(function(item_qu, i){
                      item_qu.remove();
                    });
                  }
                  return true;
                }else{
                  return false;
                }
            }
        }
      );

        $scope.uploader.onAfterAddingFile = function(item){
          $scope.journey.valid_try_upload = 1;
          $scope.journey.model.file_name = item.file.name;
          $scope.journey.model.file_prevw = true;
          $scope.journey.model.file_size= item.file.size;
          $('.bootstrap-filestyle :input').val(item.file.name);
        };

        $scope.uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/, filter, options) {
            //console.info('onWhenAddingFileFailed', item, filter, options);
            if(filter.name == 'extensionFilter'){
              message.show("warning", $translate.instant('journeys.form.messages_filters.INVALID_FILE_TYPE'));
            }
            if(filter.name == 'sizeFilter'){
              message.show("warning", $translate.instant('journeys.form.messages_filters.INVALID_FILE_SIZE'));
            }

            if( $scope.uploader.queue.length == 0 )
            {
              $scope.journey.valid_try_upload = 0;
              //$('.bootstrap-filestyle .badge').remove();
              $('.bootstrap-filestyle :input').val('');
              $scope.journey.model.file_name = '';
              $scope.journey.model.file_prevw = false;
              $scope.journey.model.file_size = 0;
            }else{
              $scope.journey.valid_try_upload = 1;
              $scope.journey.model.file_name = getFileName();
            }
        };


        $scope.uploader.onCompleteItem = function(item, response, status, headers) {

            if (response.message) {
                document.getElementById('filestyle-0').value='';
                message.show("error", response.message);
                $rootScope.loadingVisible = false;
            } else {
                var itinerary = response.routes[0].packages;
                $scope.journey.model.itinerary = [];
                tempStorageData.data.cachedJourney =[];
                //$rootScope.cachedJourney = [];
                iterate_array(itinerary, function(itemItinerary, index){
                    set_itinerary(itemItinerary, index);
                });
                $rootScope.loadingVisible = false;
                if ($scope.journey.model.name == undefined || $scope.journey.model.name == '') {
                    $scope.name_required = true;
                } else {
                    $scope.name_required = false;
                    tempStorageData.data.cachedJourney = $scope.journey.model;
                    //$rootScope.cachedJourney = $scope.journey.model;
                    $state.go('app.itinerary.list', { data: { journey: $scope.journey.model } });
                }
            }
        };

        $scope.uploader.onBeforeUploadItem = function (item) {
            $rootScope.loadingVisible = true;
            $scope.name_required = false;
            item.headers.Authorization = 'Bearer ' + tokenStorage.get();
            if ($scope.journey.model.name !== '') {
                var url = item.url;
                item.url = url + "?name="+encodeURI($scope.journey.model.name);
                $scope.journey.uploading = true;
                //$scope.$apply();
            }
        };

        $scope.journey_name = function() {
           if ($scope.journey.model.name !== undefined && $scope.journey.model.name !== '') {
                $scope.name_required = false;
            } else {
                $scope.name_required = true;
            }
        };

        ($stateParams.data) ? $scope.journey.model = $stateParams.data : null;

        function round(value, decimals) {
            return Number(Math.round(value +'e'+ decimals) +'e-'+ decimals).toFixed(decimals);
        }

        function recorrerFileToUpload( metod_to_run )
        {
          iterate_array($scope.uploader.queue, metod_to_run);
        }

        function iterate_array(array, metod_to_run)
        {
          for (var i =0; i < array.length; i++)
          {
            metod_to_run( array[i], i );
          }
        }

        function getFileName()
        {
          var name_file = '';
          recorrerFileToUpload( function(item, i){
            name_file = item.file.name;
          } );

          return name_file;
        }

        function set_itinerary(itinerary_item, i)
        {
          itinerary_item["id"] = i + 1;
          itinerary_item["status"] = (itinerary_item.latitude && itinerary_item.longitude) ? true : false;
          itinerary_item["latitude"] = (itinerary_item.latitude)? round(itinerary_item.latitude, 6) : itinerary_item.latitude;
          itinerary_item["longitude"] = (itinerary_item.longitude)? round(itinerary_item.longitude, 6) : itinerary_item.longitude;

          $scope.journey.model.itinerary.push(itinerary_item);
          //$rootScope.cachedItinerary.push(itinerary_item);
        }

        function validate_is_csv(fileName)
        {
          var fileNameExt = fileName.charAt(fileName.length-3)+fileName.charAt(fileName.length-2)+fileName.charAt(fileName.length-1);
          if(fileNameExt=='csv')
          {
            return true;
          }else {
            return false;
          }
        }
    }
]);
