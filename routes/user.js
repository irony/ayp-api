var User       = require('ayp-models').user,
    passport   = require('ayp-models').passport,
    signal     = require('../signal'),
    connectors = require('ayp-connectors')();

module.exports = function(app){


  app.get('/api/user/exist', function(req, res){
    req.session.brute++;
    if (req.session.brute > 20) return res.send('I\'m flattered that you are trying, no more brute attacks please. ;)', 418);
    User.find({'emails':req.query.q}).or({username : req.query.q}).count(function(err, result){
      return res.json(result > 0);
    });
  });

  function me(user){
    return {
      _id : user._id,
      displayName : user.displayName,
      emails : user.emails,
      updated : user.updated,
      access_token : user.token,
      subscription : user.subscription,
    };
  }

  app.get('/api/user/me', passport.authenticate('bearer', { session: false }), function(req, res, next){
    res.json(me(req.user));
  });

  app.post('/api/user/login', passport.authenticate('local'), function(req, res){
    req.user.generateToken(function() {
      if (req.user.accounts) signal.wait(req.user);
      return res.json(me(req.user));
    });
  });

  app.post('/api/user/login', function(req, res, next){
    console.log('step1')
    passport.authenticate('local', function(err, user, info) {
      console.log('step2')
      if (err) return next(err);
      if (!user) {
        console.log('no user')
        req.session.messages = [info.message];
        return res.redirect('/login');
      }
      req.logIn(user, function(err) {
        console.log('generate token')
        if (err) return next(err);
        user.generateToken(function() {
          console.log('logged in', req.user);
          signal.wait(req.user);
          return res.json(me(req.user));
        });
      });
    });
  });

  app.post('/api/user/register', function(req, res, next) {

    //TODO: verify email req.body.username
    User.register(new User({ username : req.body.username, emails: [req.body.username] }), req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        return next(err);
      }
      req.logIn(user, function(){
        user.generateToken(function(){
          res.json(me(user));
        });
      });
    });
  });

  app.get('/api/user/:connector/:callback?', function(req, res, next){
    console.log('connect', req.params);
    var connector = connectors[req.params.connector];
    passport.authenticate(connector.name, {scope : connector.scope}, function(err, user, info) {
      if (err) { 
        console.log('callback', err, user, info)
        return next(err); 
      }
      if (!user) { return res.send('Incorrect credentials', 401); }
      signal.scan(user, connector.name);
      req.logIn(user, function(){
        if(!user.token){
          user.generateToken(function(){
            res.redirect('/me/wall/#access_token=' + user.token);
          });
        } else {
          res.redirect('/me/wall/#access_token=' + user.token);
        }
      });

    })(req, res, next);
  });


  

};