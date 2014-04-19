var passport   = require('AllYourPhotosModels').passport,
    signal     = require('../signal');

module.exports = function(app){

  'use strict';

  app.all('/api/queue/*', function (req, res, next) {
    console.log('queue', req.user);
    if (req.user && req.user._id) return next();
    passport.authenticate('bearer', { session: false })(req, res, next);
  });

  app.get('/api/queue/scan/:connector', function(req, res){
    res.json(signal.scan(req.user, req.params.connector));
  });

  app.get('/api/queue/cluster', function(req, res){
    res.json(signal.cluster(req.user));
  });

  app.get('/api/queue/downloader/:folder', function(req, res, next){
    var folder = req.params.folder;
    if (!folder) return next('Folder parameter (thumbnail or original) required');
    signal.missingDownload(req.user, folder, function(err, jobs){
      res.json(jobs.length);
    });
  });
};