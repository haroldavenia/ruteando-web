App.service('loadingStatus', function () {    
    return {
        visible : false,
        show : function() {
            this.visible = true;
        },
        hide : function() {
            this.visible = false;
        }
    }
  });
