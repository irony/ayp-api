var Photo = require('AllYourPhotosModels').photo;
var passport = require('AllYourPhotosModels').passport;
var publicAddress = require('public-address');
var async = require('async');

// resolve this servers public ip by requesting the address from remoteaddress.net
var ip = null;


module.exports = function(app){

  app.all('/api/stats', function (req, res, next) {
    if (req.user && req.user._id) return next();
    passport.authenticate('bearer', { session: false })(req, res, next);
  });

  app.get('/api/stats', function(req, res){

    async.parallel({
      all: function  (done) {
        Photo.find({'owners': req.user._id})
          .count(done);
      },
      accounts: function(done){
        done(null, req.user.accounts && Object.keys(req.user.accounts) || []);
      },
      originals: function  (done) {
        Photo.find({'owners': req.user._id})
          .where('store.original.stored').exists(true)
          .count(done);
      },
      /*videos: function  (done) {
        Photo.find({'owners': req.user._id})
          .where('mimeType', /video/)
          .count(done);
      },*/
      thumbnails: function  (done) {
        Photo.find({'owners': req.user._id})
          .where('store.thumbnail.stored').exists(true)
          .count(done);
      },
      ip: function(done){
        // cached value
        if (ip) return done(null, ip);
        if (process.env.NODE_ENV !== 'production') {
          return done(null, 'dev.allyourphotos.org');
        }

        publicAddress(function(err, data){
          if (err) return done(err);
          ip = (data.address);
          return done(null, ip);
        })
      },
      modified: function  (done) {
        Photo.findOne({'owners': req.user._id}, 'modified')
          .sort({'modified': -1})
          .exec(function(err, photo){
            done(err, photo && photo.modified);
          });
      }

    }, function (err, result) {
      return res.json(result);
    });

    


  });


};