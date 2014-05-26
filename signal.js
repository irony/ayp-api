var kue = require('kue'),
  Photo = require('AllYourPhotosModels').photo,
  async = require('async'),
  nconf = require('nconf');

var queue = kue.createQueue({
  redis: nconf.get('redis')
});

module.exports = {
  wait: function(user, connector) {
    var connectors = [];

    if (!connector) {
      if (!user.accounts ||  !user.accounts.length) return console.log('No connectors for this user, specify an connector instead');
      connectors = Object.keys(user.accounts);
    } else {
      connectors = [connector];
    }

    var jobs = [];
    connectors.forEach(function(connectorName){
      jobs.push(queue.create('waitForChanges', {
        title: 'Wait for changes in ' + connectorName + ' for ' + user.displayName + ', via API',
        connectorName: connectorName,
        user: {_id : user._id, displayName : user.displayName}
      }).save());
    });
    return jobs;
  },
  scan: function(user, connector) {
    var connectors = [];

    if (!connector) {
      if (!user.accounts ||  !user.accounts.length) return console.log('No connectors for this user, specify an connector instead');
      connectors = Object.keys(user.accounts);
    } else {
      connectors = [connector];
    }
    console.log('scan', user, connector);

    var job = queue.create('importUserPhotos', {
      title: user.displayName + 's import for ' + connector + ', via API',
      connectorName: connector,
      user: {
        _id: user._id,
        displayName: user.displayName
      }
    })
      .attempts(5)
      .priority('critical')
      .save();
    return job;
  },
  cluster: function(user) {
    var job = queue
      .create('clusterPhotos', {
        user: {
          _id: user._id,
          displayName: user.displayName
        },
        title: 'Clustering ' + user.displayName + '\'s photos, via API'
      })
      .priority('critical')
      .attempts(2)
      .save();
    return job;
  },
  missingDownload: function(fullUser, folder, done) {
    var user = {
      _id: fullUser._id,
      displayName: fullUser.displayName
    };

    Photo.find({}, 'store updated src taken source path mimeType owners')
      .where('store.' + folder + '.stored').exists(false)
      .where('owners', user._id)
      .where('store.error').exists(false) // skip photos with previous download problems
    .sort({
      'taken': -1
    })
      .exec(function(err, photos) {
        if (err) return done(err);
        async.mapLimit(photos, 10, function(photo, next) {
          var job;
          if (folder === 'original') {
            if (fullUser.subscription < new Date()) return next('Subscription expired');
            job = queue.create('downloadOriginals', {
              title: 'Missing original for ' + user.displayName,
              user: user,
              photos: [photo]
            })
              .priority('low')
              .save(next);

          } else {
            job = queue.create('downloadThumbnails', {
              title: 'Missing thumbnail for ' + user.displayName,
              user: user,
              photos: [photo]
            })
              .priority('normal')
              .save(next);
          }
        }, function(err, jobs) {
          done(err, jobs);
        });
      });
  }

};