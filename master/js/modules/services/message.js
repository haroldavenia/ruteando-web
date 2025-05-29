
App.factory('message', function ($timeout) {

    var instance = {}
    instance.messages = [];

    instance.show = function(type, message) {
      if (message !== null) {

      toastr.options.closeButton = (true);
      toastr.options.positionClass = 'toast-top-center';
      toastr.options.progressBar = true;
      toastr.options.preventDuplicates = true;

      //toastr[type](message, '');
      if(type == 'check')
      {
        toastr.info(message);
      }
      else if(type == 'success')
      {
        toastr.success(message);
      }
      else if(type == 'warning')
      {
        toastr.warning(message);
      }
      else if(type == 'error')
      {
        toastr.error(message);
      }

      // toastr.info();

/*    toastr.options.closeButton = false;
    toastr.options.progressBar = false;
    toastr.options.debug = false;
    toastr.options.positionClass = 'toast-bottom-left';
    toastr.options.showDuration = 333;
    toastr.options.hideDuration = 333;
    toastr.options.timeOut = 4000;
    toastr.options.extendedTimeOut = 4000;
    toastr.options.showEasing = 'swing';
    toastr.options.hideEasing = 'swing';
    toastr.options.showMethod = 'slideDown';
    toastr.options.hideMethod = 'slideUp';*/


      }
    }

    return instance;
  });
