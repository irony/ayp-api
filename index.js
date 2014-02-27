var _ = require('lodash');
var api = module.exports = {
  routes : require('require-dir')('./routes'),
  init : function(app){

    _.each(api.routes, function(route){
      route(app);
    });


    /* automatic documentation
    swagger = require("swagger-node-express");
    swagger.setAppHandler(app);
    swagger.addModels(require('AllYourPhotosModels'));
    swagger.configure("http://api.allyourphotos.org", "0.1");
    */
  }
};
