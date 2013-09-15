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

  app.get('/api/photo/:id', function(req, res){
    if (!req.user) return res.send('Login first..', 500);

    Photo.findOne({_id: new ObjectId(req.params.id), owners : req.user._id}, function(err, photo){
      if (err) return res.send('Error finding photo', 500);
      if (!photo) return res.send('Could not find photo ' + req.params.id, 403);
      photo.mine = photo.copies[req.user._id]; // only use this user's personal settings
      photo.vote = photo.mine.vote || (photo.mine.calculatedVote);

      if (photo.exif && photo.exif.gps){
        if (photo.exif.gps.length){
          photo.exif.gps = photo.exif.gps.reduce(function(gps, tag){
          gps[tag.tagName] = tag.value;
          return gps;
          }, {});
        }
        photo.metadata = photo.metadata || {};
        if (photo.exif.gps.GPSLatitude && photo.exif.gps.GPSLatitude.length)
          photo.metadata.position = {lat: parseFloat(photo.exif.gps.GPSLatitude[0] + "." + photo.exif.gps.GPSLatitude[1],10), lng: parseFloat(photo.exif.gps.GPSLongitude[0] + "." + photo.exif.gps.GPSLongitude[1],10)};
      }


      res.json(photo);
    });
  });

  app.get('/api/photoFeed', function(req, res){
    if (!req.user){
      return res.send('Login first', 403);
    }

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
        // This is to prevent "horungar" from being added to a group
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
          global.s3.get(photo.src).on('response', function(_res){
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

  app.post('/api/upload', function(req, res, next){
    if (!req.user){
      return res.send('Login first', 403);
    }

    var uploadConnector = require('../connectors/upload.js');
    uploadConnector.handleRequest(req, function(err, results, next){
      if (err) {
        console.log('Error: upload aborted: '.red, err);
        res.status(500).json(err.toString());
        return res.end();
      }
      try{
        res.json(results);
      } catch (err){
        console.log('Error: Could not send response: '.red, err);
        res.end();
      }
    });
    
  });

  app.post('/api/photoRange', function(req, res){

    var startDate = req.body.dateRange.split(' - ')[0],
    stopDate = req.body.dateRange.split(' - ')[1];

    if (!req.user){
      res.writeHead(403);
      return res.json({error:'Login first'});
    }
    

    if (!req.body.dateRange){
      res.writeHead(500);
      return res.json("No daterange");
    }

    Photo.find({'owners': req.user._id})
    .limit(500)
    .where('taken').gte(startDate).lte(stopDate)
    .sort('-taken')
    .exec(function(err, photos){

      async.map((photos || []), function(photo, done){
        photo.metadata = null;
        return done(null, photo);
      }, function(err, photos){
        return res.json(photos);
      });


    });
  });



  });


};