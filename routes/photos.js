var Photo = require('ayp-models').photo;
var passport = require('ayp-models').passport;
var async = require('async');
var request = require('request');
var signal = require('../signal');
var ObjectId = require('mongoose').Types.ObjectId;
var connectors = require('ayp-connectors')();

module.exports = function(app){ 

  app.all('/api/photo/*', function (req, res, next) {
    if (req.user) return next();
    passport.authenticate('bearer', { session: false })(req, res, next);
  });

  app.get('/api/photo/cameras', function(req, res, next){
    Photo.aggregate([
      {
        $match: {
          owners: req.user._id
        }
      },
      {
        $project: {
          lensMake: '$exif.exif.LensMake',
          lens: '$exif.exif.LensModel',
          camera: '$exif.exif.SerialNumber'
        }
      },
      {
        $group: {
          _id: {maker : '$lensMake', camera: '$camera'},
          lens: { $addToSet: '$lens' },
          // TODO: crawl: 
          // https://www.google.se/search?q=EF24-105mm+f/4L+IS+USM&safe=off&es_sm=91&source=lnms&tbm=isch
          count: { $sum: 1 }
        }
      }
    ], {}, function(err, cameras){
      if (err) return next(err);
      res.json(cameras);
    });

  });

  // app.get('/api/photo/timezones', function(req, res, next){
  //   Photo.aggregate([
  //     {
  //       $match: {
  //         owners: req.user._id
  //       }
  //     },
  //     {
  //       $unwind: '$exif.gps.GPSLongitude'
  //     },
  //     {
  //       $project: {
  //         longitude: '$exif.gps.GPSLongitude',
  //         longitudeRef: '$exif.gps.GPSLongitudeRef',
  //       }
  //     },
  //     {
  //       $group: {
  //         _id: '$_id',
  //         mainLongitude: {$first: '$longitude'},
  //       }
  //     },
  //     {
  //       $group: {
  //         _id: {'$mainLongitude': 1, '$longitudeRef': 1},
  //         sum: {$sum: 1},
  //       }
  //     }
  //   ], {}, function(err, cameras){
  //     if (err) return next(err);
  //     res.json(cameras);
  //   });

  // });

  app.get('/api/photo/:id', function(req, res){

    Photo.findOne({_id: new ObjectId(req.params.id), owners : req.user._id})
    .populate('owners')
    .select('mimeType exif copies.' + req.user._id + ' modified path source store taken owners')
    .exec(function(err, photo){
      if (err) return res.send('Error finding photo', 500);
      if (!photo) return res.send('Could not find photo ' + req.params.id, 403);

      var mine = photo.copies[req.user._id];
      mine.vote = mine.vote || (mine.calculatedVote);
      mine.location = photo.location || photo.getLocation();
      mine.store = photo.store || {};
      mine.owners = photo.owners.map(function(owner){
        return {
          displayName: owner.displayName,
          _id: owner._id,
          facebookId: owner.accounts && owner.accounts.facebook && owner.accounts.facebook.id
        };
      });

      if (!mine.store.original && connectors[photo.source]){
        connectors[photo.source].getOriginalUrl(req.user, photo, function(err, original){
          mine.store.original = original;
          return res.json(mine);
        });
      } else {
        return res.json(mine);
      }
    });
  });


  app.get('/api/photoFeed', function(req, res){

    var reverse = req.query.reverse === 'true',
        filter = (reverse) ? {$gte : req.query.startDate || new Date()} : {$lte : req.query.startDate || new Date()};

    console.log('searching photos:', req.query);

    Photo.find({'owners': req.user._id}, 'copies.' + req.user._id + ' ratio taken store mimeType src')
    .where('taken', filter)
    .where('copies.' + req.user._id + '.hidden').ne(true)
    .where('store.thumbnail.stored').exists()
    .where('copies.' + req.user._id + '.calculatedVote').lte(parseFloat(req.query.vote))
    .sort((reverse ? '':'-') + 'taken')
    .skip(req.query.skip || 0)
    .limit(req.query.limit || 100)
    .exec(function(err, photos){
      if (err) throw err;

      if (!photos || !photos.length){
        return res.json(photos);
      }

      console.log('found %d photos', photos.length);
      photos = photos.reduce(function(a,b){
        var diffAverage = 0,
            last = a.length ? a[a.length-1] : null;

        if (last) {
          b.timeDiff = Math.abs(last.taken.getTime() - b.taken.getTime());
          b.diffTotal = (last.diffTotal || 0) + b.timeDiff;
          diffAverage = b.diffTotal / a.length;
        }

        // Allow at least one fourth of the photos in the group.
        // And then only add photos which similar time diff compared to the rest of the photos
        // This is to prevent 'horungar' from being added to a group
        if (a.length <= photos.length / 4 || b.timeDiff < diffAverage * 1.5) a.push(b);

        return a;
      }, []);

      async.map((photos || []), function(photo, done){
        photo.mine = photo.copies[req.user._id]; // only use this user's personal settings
        var vote = photo.mine.vote || (photo.mine.calculatedVote);
        /*
        if (res.push){
          // SPDY is supported
          photo.src = '/thumbnail/' + photo.source + '/' + photo._id;
          s3.get(photo.src).on('response', function(_res){
            res.push(photo.src,{}, function(pushStream){
              _res.pipe(pushStream);
            });
          }).end();
        }*/

        return done(null, {id: photo._id, tags: photo.mine.tags, taken: photo.taken, mimeType: photo.mimeType, src:photo.src, vote: Math.floor(vote), ratio: photo.ratio});

      }, function(err, photos){
        return res.json(photos);
      });
    });
  });

  app.get('/api/upload', function(req, res){
    //http://dev.allyourphotos.org:3000/api/upload?image=http://app4.pixlr.com/_temp/5355fd05d535cfcad4000036.jpg&type=jpg&title=Venice&state=replace'
    var uploadHandler = require('ayp-jobs').uploadHandler;
    var image = request(req.query.image);
    image.headers['content-type'] = 'image/jpeg';
    uploadHandler.handleRequest(image, function(err, results){
      if (err) throw err;
      console.log('handleRequest', arguments);
    });

  });

  app.post('/api/upload', function(req, res){

    var uploadHandler = require('ayp-jobs').uploadHandler;
    uploadHandler.handleRequest(req, function(err, results){
      if (err) {
        console.log('Error: upload aborted: '.red, err);
        res.status(500).json(err.toString());
        return res.end();
      }

      try{
        res.json(results);
        signal.cluster(req.user);
      } catch (ex){
        console.log('Error: Could not send response: '.red, ex);
        return res.end();
      }
    });
    
  });



  //http://www.allyourphotos.org/upload?image=http://app4.pixlr.com/_temp/534e688dd535cfc8a30000c4.jpg&type=jpg&title=Namnl%C3%B6s&state=replace


  app.post('/api/photoRange', function(req, res){

    if (!req.user){
      res.writeHead(403);
      return res.json({error:'Login first'});
    }

    Photo.find({'owners': req.user._id}, 'src vote')
    .limit(500)
    .where('taken').gte(req.body.from).lte(req.body.to)
    .where('copies.' + req.user._id + '.vote').lte(req.vote || 10)
    .sort('-taken')
    .exec(function(err, photos){
      async.map((photos || []), function(photo, done){
        return done(null, photo.getMine(req.user));
      }, function(err, photos){
        return res.json(photos);
      });
    });
  });
};