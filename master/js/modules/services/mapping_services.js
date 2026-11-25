/**=========================================================
 * Modudule: mapping_services.js
 * servicio para mapear campos de las peticiones y respuestas
 =========================================================*/



App.factory('Mapping', [function () {

  var model = {
    addressModel : [
      { src : 'id',         dst : 'id' },
      { src : '_desc',      dst : 'address' },
      { src : 'latitude',   dst : 'y'},
      { src : 'longitude',  dst : 'x'},
      { src : 'weight',     dst : 'weigth'},
      { src : 'volume',     dst : 'volume'},
      { src : 'unloadingTime',     dst : 'lengthOfStay'},
      { src : 'city',       dst : 'city'}
    ]
  }
  
  /**
   * @param  {object}   src         objecto de origen de valores
   * @param  {object}   model       campos a mapear del objeto de origen 
   * @param  {boolean}  inverse     mapeo de datos inversos desde el origen 
   *                                (false : src -> dst, true: dst -> src)
   * @return {object}   result      objecto con los campos mapeados desde el origen
   */
  function mapping (srcData, model, inverse) {
    var inverse = inverse || false, 
        dst = '', src = '', result = {};

    if(!srcData || !model){
      console.log(src);
      return;
    };

    for(var index = 0; index < model.length; ++index){
      if(inverse){
        src = model[index].dst;
        dst = model[index].src;
      }else{
        src = model[index].src;
        dst = model[index].dst;
      }

      if( srcData.hasOwnProperty(src) ){
        result[dst] = srcData[src];
      }
    }

    return result;
  }

  return {
    mapping : mapping,
    model : model
  };
}])
