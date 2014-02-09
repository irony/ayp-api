var Photo = require('AllYourPhotosModels').photo;
var Group = require('AllYourPhotosModels').group;
var User = require('AllYourPhotosModels').user;
var nconf = require('nconf');
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var async = require('async');
var knox = require('knox');
var s3 = knox.createClient(nconf.get('aws'));
var ObjectId = require('mongoose').Types.ObjectId;
var _ = require('lodash');

module.exports = function(app){


  app.get('/api/library', function(req, res){
    console.log('loading library');
    var limit = req.query.limit || 2000;
    var baseUrl = 'https://phto.org/thumbnail';

    if (!req.user) return res.send('Login first');

    // first check e-tag, this will be adding a little more time but it is worth it?
    async.parallel({
      total : function(done){
        Photo.find({'owners': req.user._id}).count(done);
      },
      modified: function  (done) {
        Photo.findOne({'owners': req.user._id}, 'modified')
          .sort({'modified': -1})
          .exec(function(err, photo){
            return done(err, photo && photo.modified);
          });
      },
      userId : function(done){
          return done(null, req.user._id);
      }
    }, function(err, results){

      if (!results.total) return res.json(results);

      var etag = results.total + '-' + results.modified.getTime();
      res.setHeader('Last-Modified', results.modified);
      res.setHeader('ETag', etag);

      res.setHeader("Cache-Control", "public");
      res.setHeader("Max-Age", 0);

      if (req.headers['if-none-match'] === etag.toString()) {
        res.statusCode = 304;
        console.log('304');
        return res.end();
      } else {
        console.debug(req.headers);
      }

      res.setHeader("Cache-Control", "max-age=604800, private");

      // if we have new data, let's query it again
      async.parallel({
        photos : function(done){

          // return all photos with just bare minimum information for local caching
          Photo.find({'owners': req.user._id}, 'copies.' + req.user._id + ' taken source ratio store mimeType')
      //      .sort('-copies.' + req.user._id + '.interestingness')
          .where('taken').lt(req.query.taken || new Date())
          .where('mimeType').equals('image/jpeg')
          .where('modified').gt(req.query.modified || new Date(1900,0,1))
          .where('store.thumbnail').exists()
          .sort(req.query.modified ? {'modified' : 1} : {'taken' : -1})
          .skip(req.query.skip)
          .limit(parseInt(limit,10) +  1)
          .exec(function(err, photos){
            console.log('result', err || photos && photos.length);

            async.map((photos || []), function(photo, next){
              var mine = photo.copies[req.user._id] || {};
              var vote = mine.vote || (mine.calculatedVote);
              return next(null, {
                _id : photo._id,
                taken:photo.taken && photo.taken.getTime(),
                cluster:mine.cluster,
                src: s3.signedUrl(
                    '/thumbnail/' + photo.source + '/' + photo._id
                  , moment().add('year', 1).startOf('year').toDate()
                ).replace(baseUrl, '$') || null,
                vote: Math.floor(vote),
                ratio: photo.ratio
              });

            }, done);
          });
        }
      }, function(err, results){

          var next = results.photos.length > limit && results.photos.pop()[req.query.modified ? 'modified' : 'taken'] || null;
          results.next = next; //(results.photos.length === limit) && last.taken || null;
          results.baseUrl = baseUrl;

          return res.json(results);

      });
    });

  });

};