var _ = require('lodash'),
    User = require('AllYourPhotosModels').user,
    passport = require('AllYourPhotosModels').passport,
    BearerStrategy = require('passport-http-bearer').Strategy;

var api = module.exports = {
  routes : require('require-dir')('./routes'),
  init : function(app){

    app.all('/api/*', function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
      next();
    });

    app.options('/api/*', function(req, res, next) {
      res.send(200);
    });
    

    app.all('/api/*', function (req, res, next) {
        if (req.path == '/api/user/login') return next();
        if (req.path == '/api/user/register') return next();
        if (req.user) return next();
        passport.authenticate('bearer', { session: false })(req, res, next);
    } );

    _.each(api.routes, function(route){
      route(app);
    });

    passport.use(new BearerStrategy(
      function(token, done) {
        User.findOne({ token: token }, function (err, user) {
          if (err || !user) return done(err, user);
          return done(null, user, { scope: 'all' });
        });
      }
    ));

    /* automatic documentation
    swagger = require("swagger-node-express");
    swagger.setAppHandler(app);
    swagger.addModels(require('AllYourPhotosModels'));
    swagger.configure("http://api.allyourphotos.org", "0.1");
    */
    return app;
  }
};
