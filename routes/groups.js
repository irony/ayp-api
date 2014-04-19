var Group = require('AllYourPhotosModels').group;
var passport   = require('AllYourPhotosModels').passport;
var _ = require('lodash');
var async = require('async');

module.exports = function (app) {
  
  app.all('/api/groups*', function (req, res, next) {
    if (req.user) return next();
    passport.authenticate('bearer', { session: false })(req, res, next);
  });

  app.get('/api/groups', function (req, res) {
    if (!req.user) return res.send('Login first', 403);

    // first check e-tag, this will be adding a little more time but it is worth it?
    async.parallel({
      total : function(done){
        Group.find({'userId': req.user._id}).count(done);
      },
      modified: function  (done) {
        Group.findOne({'userId': req.user._id}, 'modified')
          .sort({'modified': -1})
          .exec(function(err, photo){
            return done(err, photo && photo.modified || new Date());
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

      // return all photos with just bare minimum information for local caching
      Group.find({ 'userId': req.user }, { photos : {$slice : 1}, from: 1, to: 1, value: 1 })
      .sort({'to' : -1})
      .populate('photos', 'copies taken store')
      .exec(function(err, groups){
        if (err) throw err;

        async.map((groups || []), function(group, next){
          if (!group.photos.length) return next(null, null);

          var best = group.photos.map(function(photo){
            return photo.getMine(req.user._id);
          });

          return next(err, {
            _id : group._id,
            from : group.from,
            to: group.to,
            value: group.value,
            src: group.photos[0].signedSrc,
            ratio: group.photos[0].ratio,
            best: best
          });
        }, function(err, groups){
          if (err) throw err;
          return res.json(_.compact(groups));
        });
      });
    });
  });

};