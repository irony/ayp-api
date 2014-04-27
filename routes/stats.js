var Photo = require('AllYourPhotosModels').photo;
var passport = require('AllYourPhotosModels').passport;
var ip = require('ip').address();
var async = require('async');

module.exports = function(app){

  app.all('/api/stats/*', function (req, res, next) {
    if (req.user && req.user._id) return next();
    passport.authenticate('bearer', { session: false })(req, res, next);
  });

  app.get('/api/stats', function(req, res){

    async.parallel({
      all: function  (done) {
        Photo.find({'owners': req.user._id})
          .count(done);
      },
      copies: function  (done) {
        Photo.find()
          .where('copies.' + req.user._id).exists(true)
          .count(done);
      },
      originals: function  (done) {
        Photo.find({'owners': req.user._id})
          .where('store.original.stored').exists(true)
          .count(done);
      },
      thumbnails: function  (done) {
        Photo.find({'owners': req.user._id})
          .where('store.thumbnail.stored').exists(true)
          .count(done);
      },
      queuedThumbnails : function(done){
        Photo.find()
        .where('store.thumbnail.stored').exists(false)
        // .where('store.lastTry').gte(new Date() - 24 * 60 * 60 * 1000) // skip photos with previous download problems
        .count(done);
      },
      errors: function  (done) {
        Photo.find({'owners': req.user._id})
          .count(done);
      },
      ip: function(done){
        return done(null, ip);
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