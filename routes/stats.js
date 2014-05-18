var Photo = require('AllYourPhotosModels').photo;
var passport = require('AllYourPhotosModels').passport;
var ip = require('ip').address('public');
var async = require('async');

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
        done(null, Object.keys(req.user.accounts));
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
      accounts: function(done){
        return done(null, Object.keys(req.user.accounts));
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