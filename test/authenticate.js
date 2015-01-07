// run tests locally or with test collection
var nconf = require('nconf');
nconf.file({file: 'config.json', dir:'../../', search: true});

var chai = require('chai'),
  expect = chai.expect,
  express = require('express'),
  request = require('supertest'),
  session = require('express-session'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  passport = require('ayp-models').passport, 
  sessionOptions = {
    passport: passport,
    secret: nconf.get('sessionSecret'),
    resave: true,
    saveUninitialized: true
  },
  api = require('../index.js'),
  app, token;

describe.only('auth', function() {
  before(function () {
    var web = express();
    web.use(cookieParser());
    web.use(bodyParser.json());
    web.use(session(sessionOptions));
    web.use(passport.initialize());
    web.use(passport.session(sessionOptions));

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
    .post('/api/user/register')
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
    .post('/api/user/register')
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
    .post('/api/user/register')
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
        expect(res.body).to.have.property('access_token');
        done();
      });
    });

  });

  it('should register + login and receive a cookie', function(done){

    var random = Math.random() * 1000000;
    request(app)
    .post('/api/user/register')
    .send({username: 'test' + random, password:'test'})
    .expect(200)
    .end(function(err, res) {
      if (err) throw err;
      token = res.body['access_token'];
      request(app)
      .post('/api/user/login')
      .send({ username : 'test' + random, password:'test' })
      .expect(200)
      .expect('set-cookie', /connect.sid=.*;/, done);
    });

  })



});