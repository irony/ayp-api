// run tests locally or with test collection
var nconf = require('nconf');
nconf.overrides({
  mongoUrl : 'mongodb://192.168.59.103/ayp-test'
});

nconf
  .env() // both use environment and file
  .file({file: 'config.json', dir:'../../', search: true});


var chai      = require('chai')
  , expect    = chai.expect
  , express   = require('express')
  , request   = require('supertest')
  , models    = require('ayp-models').init()
  , User      = models.user
  , Photo     = models.photo
  , passport  = require('ayp-models').passport
  , sessionOptions  = { key: 'express.sid', cookieParser: express.cookieParser, secret: 'fdasfdas'}
  , api       = require('../index.js')
  , fixtures  = require('./fixtures/db')
  , app
  , token
  , cookie;

console.debug = function(){};

describe('library', function() {
  before(function (done) {
    var web = express();
    web.use(express.urlencoded());
    web.use(express.json());
    web.use(express.session(sessionOptions));
    web.use(passport.initialize());
    web.use(passport.session());

    app = api.init(web);

    fixtures.user.generateToken(function (_token) {
      token = _token;
      done();
    });
  });  

  it('should get latest in library', function(done){

    request(app)
    .get('/api/library')
    .query({access_token: token})
    .expect(200)
    .end(function(err, res) {
      if (err) throw err;
      expect(res.body.photos).to.have.length(fixtures.photos.length);
      done();
    });

  })

  it('should get photos between two dates and get correct length', function(done){

    var expected = fixtures.photos.slice(400,500);

    request(app)
    .get('/api/library')
    .query({
      access_token: token, 
      from: expected[0].taken, 
      to: expected[-1].taken
    })
    .expect(200)
    .end(function(err, res) {
      if (err) throw err;
      expect(res.body.photos).to.have.length(expected.length);
      done();
    });

  })

  it('should get photos between two dates and get correct content', function(done){

    var expected = fixtures.photos.slice(400,500);

    request(app)
    .get('/api/library')
    .query({
      access_token: token, 
      from: expected[0].taken, 
      to: expected.pop().taken
    })
    .expect(200)
    .end(function(err, res) {
      if (err) throw err;
      expect(new Date(res.body.photos[0].taken)).to.equal(expected[0].taken, "first is different");
      expect(new Date(res.body.photos.pop().taken)).to.eql(expected.pop().taken, "last is different from last");
      done();
    });

  })
});