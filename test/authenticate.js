// run tests locally or with test collection
var nconf = require('nconf');
nconf.overrides({
  mongoUrl : 'mongodb://192.168.59.103/ayp-test'
});

var chai      = require('chai')
  , expect    = chai.expect
  , express   = require('express')
  , request   = require('supertest')
  , models  = require('ayp-models').init()
  , passport  = require('ayp-models').passport
  , sessionOptions  = { key: 'express.sid', cookieParser: express.cookieParser, secret: 'fdasfdas'}
  , api       = require('../index.js')

  , app
  , token
  , cookie;

describe('auth', function() {
  before(function () {
    var web = express();
    web.use(express.urlencoded());
    web.use(express.json());
    web.use(express.session(sessionOptions));
    web.use(passport.initialize());
    web.use(passport.session());

    app = api.init(web);
  });  

  it('should not serve a resource without user logged in', function (done) {
    request(app)
    .get('/api/groups/')
    .expect(401, function(err){
      if (err) throw err;
      done();
    })
  });


  it('should recieve a token', function(done){

    var random = Math.random() * 1000000;
    request(app)
    .post('/api/register')
    .send({username: 'test' + random, password:'test'})
    .expect(200)
    .end(function(err, res) {
      if (err) throw err;
      expect(res.body).to.have.property('access_token');
      token = res.body['access_token'];
      expect(token).to.exist;
      done();
    });

  })

  it('should authenticate with auth token', function(done){

    var random = Math.random() * 1000000;
    request(app)
    .post('/api/register')
    .send({username: 'test' + random, password:'test'})
    .expect(200)
    .end(function(err, res) {
      if (err) throw err;
      token = res.body['access_token'];
      request(app)
      .get('/api/groups?access_token=' + token )
      .expect(200)
      .end(function(err, response) {
        if (err) throw err;
        done();
      });
    });

  })


  it('should login and receive an auth token', function(done){

    var random = Math.random() * 1000000;
    request(app)
    .post('/api/register')
    .send({username: 'test' + random, password:'test'})
    .expect(200)
    .end(function(err, res) {
      if (err) throw err;
      token = res.body['access_token'];
      request(app)
      .post('/api/user/login')
      .send({ username : 'test' + random, password:'test' })
      .expect(200)
      .end(function(err, res) {
        if (err) throw err;
        expect(res.body).to.have.property("access_token");
        done();
      });
    });

  })

});