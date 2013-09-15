var _ = require('lodash');
var api = module.exports = {
  routes : require('require-dir')('./routes'),
  init : function(app){
    _.each(api.routes, function(route){
      route(app);
    });
  }
};
