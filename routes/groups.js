var Photo = require('AllYourPhotosModels').photo;
var Group = require('AllYourPhotosModels').group;
var passport   = require('AllYourPhotosModels').passport;
var User = require('AllYourPhotosModels').user;
var ObjectId = require('mongoose').Types.ObjectId;
var nconf = require('nconf');
var path = require('path');
var moment = require('moment');
var async = require('async');

module.exports = function(app){
  
  app.get('/api/groups', function(req, res){
    if (!req.user) return res.send('Login first', 403);

    console.log(req.user._id)
    // return all photos with just bare minimum information for local caching
    Group.find({ 'userId': req.user }, { photos : {$slice : 5}, from: 1, to: 1, value: 1 })
    .sort({'to' : -1})
    .populate('photos', 'copies taken store')
    .exec(function(err, groups){
      if (err) throw err;

      async.map((groups || []), function(group, next){
        var best = group.photos.map(function(photo){ 
          return photo.getMine(req.user) 
        });

        return next(err, {
          _id : group._id,
          from : group.from,
          to: group.to,
          value: group.value,
          src: photos[0].signedSrc,
          best: best
        })
      }, function(err, groups){
        if (err) return res.send('Error:' + err, 500);
        return res.json(groups);
      });
    });
  });

};