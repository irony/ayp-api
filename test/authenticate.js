var chai      = require('chai')
  , expect    = chai.expect
  , express   = require('express')
  , request   = require('supertest')
  , passport  = require('AllYourPhotosModels').passport
  , sessionOptions  = { key: 'express.sid', cookieParser: express.cookieParser, secret: 'fdasfdas'}
  , api       = require('../index.js')

  , app
  , cookie;

describe('login', function() {
  beforeEach(function () {
    app = api.init(express());
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.session(sessionOptions));
    app.use(passport.initialize());
    app.use(passport.session());


    
  });  

  it('should not serve a resource without user logged in', function (done) {
    request(app)
    .get('/api/groups/')
    .expect(401, done)
  });


  it('should be possible to request a resource without logging in', function (done) {
    request(app)
    .get('/api/groups/')
    .expect(401, done)
  });

  it('should login with cookies', function(done){

    var random = Math.random() * 1000000;
    request(app)
    .post('/api/register')
    .send({username: 'test' + random, password:'test'})
    .expect(200)
    .end(function(err, res) {
      if (err) throw err;
      expect(res.body).to.have.property('auth_token');
      request(app)
      .get('/api/user/groups')
      .expect(200)
      .end(function(err, response) {
        done();
      });
    });

  })

  xit('should be possible to call dropbox connector', function(done){
  });

  

});