var chai      = require('chai')
  , expect    = chai.expect
  , express   = require('express')
  , request   = require('supertest')
  , models  = require('AllYourPhotosModels').init()
  , passport  = require('AllYourPhotosModels').passport
  , sessionOptions  = { key: 'express.sid', cookieParser: express.cookieParser, secret: 'fdasfdas'}
  , api       = require('../index.js')

  , app
  , token
  , cookie;

describe('login', function() {
  beforeEach(function () {
    var web = express();
    web.use(express.urlencoded());
    web.use(express.json());

    app = api.init(web);
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


  it('should recieve a token', function(done){

    var random = Math.random() * 1000000;
    request(app)
    .post('/api/register')
    .send({username: 'test' + random, password:'test'})
    .expect(200)
    .end(function(err, res) {
      if (err) throw err;
      expect(res.body).to.have.property('auth_token');
      token = res.body['auth_token'];
      expect(token).to.exist;
      done();
    });

  })


  it('should login with cookies', function(done){

    var random = Math.random() * 1000000;
    request(app)
    .post('/api/register')
    .send({username: 'test' + random, password:'test'})
    .expect(200)
    .end(function(err, res) {
      if (err) throw err;
      token = res.body['auth_token'];
      request(app)
      .get('/api/groups', { auth_token : token })
      .expect(200)
      .end(function(err, response) {
        done();
      });
    });

  })
  xit('should be possible to call dropbox connector', function(done){
  });

  

});