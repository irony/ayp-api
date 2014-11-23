var jobs = require('ayp-jobs');

module.exports = function(app){


  app.post('/api/upload', function(req, res){

    var uploadConnector = jobs.uploadHandler;
    uploadConnector.handleRequest(req, function(err, results){
      if (err) {
        console.log('Error: upload aborted: '.red, err);
        res.status(500).json(err.toString());
        return res.end();
      }
      try{
        res.json(results);
      } catch (ex){
        console.log('Error: Could not send response: '.red, ex);
        res.end();
      }
    });
    
  });

};