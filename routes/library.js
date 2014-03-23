var Photo = require('AllYourPhotosModels').photo;
var Group = require('AllYourPhotosModels').group;
var passport   = require('AllYourPhotosModels').passport;
var User = require('AllYourPhotosModels').user;
var nconf = require('nconf');
var async = require('async');
var ObjectId = require('mongoose').Types.ObjectId;
var _ = require('lodash');

module.exports = function(app){

  app.get('/api/library', function(req, res){
    var limit = req.query.limit || 2000;
    var baseUrl = 'https://phto.org/thumbnail';

    if (!req.user) return res.send('Login first', 403);

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

      if (false && req.headers['if-none-match'] === etag.toString()) {
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
          .where('taken').lte(req.query.taken || req.query.to || new Date())
          .where('taken').gte(req.query.taken || req.query.from || new Date(1900,0,1))
          .where('mimeType').equals('image/jpeg')
          .where('modified').gt(req.query.modified || new Date(1900,0,1))
          .where('store.thumbnail').exists()
          .sort(req.query.modified ? {'modified' : 1} : {'taken' : -1})
          .skip(req.query.skip)
          .limit(parseInt(limit,10) +  1)
          .exec(function(err, photos){
            done(null, (photos || []).map(function(photo){
              var mine = photo.getMine(req.user);
              mine.src = mine.src && mine.src.replace(baseUrl, '$') || null;
              return mine;
            }));
          });
        }
      }, function(err, results){

          var next = results.photos.length > limit && results.photos.pop()[req.query.modified ? 'modified' : 'taken'] || null;
          results.next = next; //(results.photos.length === limit) && last.taken || null;
          results.baseUrl = baseUrl;
          results.photos = results.photos || [];
          if (results.photos.length){
            results.from = results.photos[0].taken;
            results.to = results.photos.slice(-1).pop().taken;
          }

          return res.json(results);

      });
    });

  });

};