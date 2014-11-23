var User = require('ayp-models').user;
var signal = require('../signal');

module.exports = function(app){
  app.get('/api/dropbox/webhook', function(req, res){
    if (req.query.challenge) {
      res.send(req.query.challenge);
    }
  });

  app.post('/api/dropbox/webhook', function(req, res){
    var payload = req.body;
    if (payload.delta){
      payload.delta.users.map(function(dropboxId){
        User.findOne({ '$where' : 'this.accounts && this.accounts["dropbox"] && this.accounts["dropbox"].id == ' + dropboxId })
        .exec(function (err, user) {
          if (err) throw err;
          
          signal.scan(user, 'dropbox');
        });
      });
      res.send('OK');
    } else {
      res.send('No delta found', 500); 
    }
  })
}