var Photo = require('AllYourPhotosModels').photo;
var Group = require('AllYourPhotosModels').group;
var User = require('AllYourPhotosModels').user;
var Connectors = require('AllYourPhotosConnectors');
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var async = require('async');
var ObjectId = require('mongoose').Types.ObjectId;
var _ = require('lodash');

module.exports = function(app){


  app.post('/api/upload', function(req, res, next){

    var uploadConnector = Connectors.upload;
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

};