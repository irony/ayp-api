var Group = require('AllYourPhotosModels').group;
var _ = require('lodash');
var async = require('async');

module.exports = function (app) {
  
  app.get('/api/groups', function (req, res) {
    if (!req.user) return res.send('Login first', 403);

    // return all photos with just bare minimum information for local caching
    Group.find({ 'userId': req.user }, { photos : {$slice : 5}, from: 1, to: 1, value: 1 })
    .sort({'to' : -1})
    .populate('photos', 'copies taken store')
    .exec(function(err, groups){
      if (err) throw err;

      async.map((groups || []), function(group, next){
        if (!group.photos.length) return next(null, null);

        var best = group.photos.map(function(photo){ 
          return photo.getMine(req.user);
        });

        return next(err, {
          _id : group._id,
          from : group.from,
          to: group.to,
          value: group.value,
          src: group.photos[0].signedSrc,
          best: best
        });
      }, function(err, groups){
        if (err) throw err;
        return res.json(_.compact(groups));
      });
    });
  });

};