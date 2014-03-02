var User       = require('AllYourPhotosModels').user,
    passport   = require('AllYourPhotosModels').passport,
    connectors = require('AllYourPhotosConnectors')(),
    _          = require('lodash');

module.exports = function(app){


  app.get('/api/user/exist', function(req, res){
    User.find({'emails.value':req.query.q}).or({username : req.query.q}).or({emails : req.query.q}).count(function(err, result){
      return res.json(result > 0);
    });
  });

  app.get('/api/auth/:connector/:callback?', function(req, res, next){
    var connector = connectors[req.params.connector];
    passport.authenticate(connector.name, {scope : connector.scope}, function(err, user, info) {
      if (err) { return next(err); }
      if (!user) { return res.send('Incorrect credentials', 401); }

      if(!user.token){
        user.generateToken(function(){
          res.json({userId : user._id, auth_token: user.token});
        });
      } else {
        res.json(user.token);
      }

    })(req, res, next);
  });


  app.post('/api/login', passport.authenticate('local'), function(req, res) {
    res.json({userId : user._id, auth_token: user.token});
  });

  app.post('/api/register', function(req, res) {
      //TODO: verify email req.body.username

      User.register(new User({ username : req.body.username, emails: [req.body.username] }), req.body.password, function(err, account) {
        req.user.generateToken(function(){
          res.json({userId : user._id, auth_token: user.token});
        });
      });
  });



};