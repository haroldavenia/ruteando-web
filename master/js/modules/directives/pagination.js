App.directive('geoPagination',['$parse', function($parse) {
//		'<li ng-class="{true: "active"}[item == paginations.currentPage]">' +
//	var template = 	'<ul class="pagination pagination-sm" ng-repeat="item in paginations.visiblePages" ng-show="paginations.visiblePages.length > 1">' +
//  '<a ng-click="paginations.changePage(item)">{{item}}</a>' +

	var template = 	'<ul class="pagination pagination-sm" ng-repeat="item in paginations.visiblePages">'+
	'<li><a class="itemAndres" ng-click="">{{item}}</a></li></ul>';

	var link = function(scope, element, attrs) {

		console.log("element");
		console.log(element);
		console.log("scope");
		console.log(scope);
/*
      $("a.itemAndres").on('click', function() {
        alert("aqui toy");

      })
      */
      $( "a" ).on( "click", function() {
        alert( $( this ).text() );
      });


   		scope.paginations = {
   			currentPage : 1,
   			first : "«",
   			last : "»",
   			pages : [],
   			visiblePages : [],
   			totalItems : scope.totalitems,
   			totalPages : 10,
   			maxSize : 3,
   			itemPerPage : scope.itemperpage,
	        setPages : function(items) {
	            this.visiblePages = [];
	            this.visiblePages.push(this.first);
	            for (key in items) {
	              this.visiblePages.push(items[key]);
	            }
	            this.visiblePages.push(this.last);
   				scope.changepage();
	        },
   			changedTotalPages : function() {
   				var pages = Math.ceil(this.totalItems / this.itemPerPage);
   				if (pages > 1) {
   					for (var i = 1; i <= pages; i++) {
   						this.pages.push(i);
   					}
		            var items = this.pages.slice(0, this.maxSize);
		            this.setPages(items);
   				}
   			},
   			changePage : function(page) {
   				alert("aqui toy");
          		var visiblePages = this.visiblePages.slice(1, this.maxSize + 1);
   				if (page == this.first) {
		            var first = this.pages.indexOf(visiblePages[0]);
		            if (visiblePages[0] == this.currentPage) {
		              if (first !== 0) {
		                var items = this.pages.slice(first - 1, first + 2);
		                if (items.length > 0) {
		                  this.setPages(items);
		                  this.currentPage --;
		                } 
		              }             
		            } else {
		              this.currentPage --;
		            }
   				} else if (page == this.last) {
		            var last = this.pages.indexOf(visiblePages[visiblePages.length - 1]);
		            if (last !== this.pages.length - 1) {
		              if (visiblePages[visiblePages.length -1] == this.currentPage) {
		                var items = this.pages.slice(last -1 , last + 2);
		                if (items.length > 0) {
		                  this.setPages(items);
		                  this.currentPage ++;
		                }                 
		              } else {
		                this.currentPage ++;
		              }
            		}	
 				} else {
	   				this.currentPage = page;
   				}
   			}
   		}

   		scope.$watch('paginations.totalitems', function() {
   			scope.paginations.changedTotalPages();
   		})

   	//	scope.changepage();

	}


  return {
    restrict: 'AE',
    replace: true,
    template: template,
    controller : function($scope) {
/*
    	$scope.andres = function() {
    		alert("aqui toy");
    	}
*/
    },
    scope: {
    	itemperpage : '=?',
    	totalpages : '=?',
    	currentpage : '=?',
    	totalitems : '=?',
    	changepage : '&'
    },
	link : link
  }

}])