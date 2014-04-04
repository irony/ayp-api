var Photo = require('AllYourPhotosModels').photo;
var passport   = require('AllYourPhotosModels').passport;
var async = require('async');

module.exports = function(app){

  app.all('/api/library/*', function (req, res, next) {
    if (req.user) return next();
    passport.authenticate('bearer', { session: false })(req, res, next);
  });

  app.get('/api/library', function(req, res){
    var limit = req.query.limit || 2000;
    var baseUrl = 'http://a.phto.org/thumbnail';

    if (!req.user) return res.send('Login first', 403);

    // first check e-tag, this will be adding a little more time but it is worth it?
    async.parallel({
      total : function(done){
        Photo.find({'owners': req.user._id})
          .where('taken').lte(req.query.to || new Date())
          .where('taken').gte(req.query.from || new Date(1900,0,1))
          .where('mimeType').equals('image/jpeg')
          .where('store.thumbnail').exists()
          .count(done);
      },
      modified: function  (done) {
        Photo.findOne({'owners': req.user._id}, 'modified')
          .where('taken').lte(req.query.to || new Date())
          .where('taken').gte(req.query.from || new Date(1900,0,1))
          .where('mimeType').equals('image/jpeg')
          .where('store.thumbnail').exists()
          .sort({'modified': -1})
          .exec(function(err, photo){
            return done(err, photo && photo.modified);
          });
      },
      userId : function(done){
        return done(null, req.user._id);
      }
    }, function(err, results){

      if (err) throw err;

      if (!results.total) return res.json(results);

      var etag = results.total + '-' + results.modified.getTime();
      res.setHeader('Last-Modified', results.modified);
      res.setHeader('ETag', etag);

      res.setHeader('Cache-Control', 'public');
      res.setHeader('Max-Age', 0);

      if (req.headers['if-none-match'] === etag.toString()) {
        res.statusCode = 304;
        console.log('304');
        return res.end();
      } else {
        console.debug(req.headers);
      }

      res.setHeader('Cache-Control', 'max-age=604800, private');

      // if we have new data, let's query it again
      async.parallel({
        photos : function(done){
          Photo.find({'owners': req.user._id}, 'copies.' + req.user._id + ' taken source ratio store mimeType')
          .where('taken').lte(req.query.to || new Date())
          .where('taken').gte(req.query.from || new Date(1900,0,1))
          .where('mimeType').equals('image/jpeg')
          .where('store.thumbnail').exists()
          .sort({'taken' : -1})
          .limit(parseInt(limit,10) +  1)
          .exec(function(err, photos){
            done(null, (photos || []).map(function(photo){
              var mine = photo.getMine(req.user);
              mine.src = mine.src && '$' + mine.src.split(baseUrl.replace('http://','')).pop() || null;
              return mine;
            }));
          });
        }
      }, function(err, results){
        if (err) throw err;
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