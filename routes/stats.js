var Photo = require('AllYourPhotosModels').photo;
var Group = require('AllYourPhotosModels').group;
var User = require('AllYourPhotosModels').user;
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var async = require('async');
var ObjectId = require('mongoose').Types.ObjectId;
var _ = require('lodash');

module.exports = function(app){

  app.get('/api/stats', function(req, res){

    if (!req.user) return res.send('Login first', null, 403);

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
        .where('store.error').exists(false) // skip photos with previous download problems
        .count(done);
      },
      errors: function  (done) {
        Photo.find({'owners': req.user._id})
          .where('store.error').exists(true)
          .count(done);
      },
      exif: function  (done) {
        Photo.find({'owners': req.user._id})
          .where('exif').exists(true)
          .count(done);
      },
      interesting: function  (done) {
        Photo.find({'owners': req.user._id})
          .where('copies.' + req.user._id + '.interestingness').gte(100)
          .count(done);
      },
      dropbox: function  (done) {
        Photo.find({'owners': req.user._id})
          .where('source').equals('dropbox')
          .count(done);
      },
      manual: function  (done) {
        Photo.find({'owners': req.user._id})
          .where('source').equals('manual')
          .count(done);
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