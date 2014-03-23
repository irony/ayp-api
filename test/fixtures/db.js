var mongoose = require('mongoose'),
    models  = require('AllYourPhotosModels'),
    faker  = require('charlatan'),
    User = models.user,
    Photo = models.photo,
    ObjectId = mongoose.Schema.Types.ObjectId;


exports.user = new User({
  displayName: faker.Name.name(),
  username : faker.Internet.userName(),
  emails: [faker.Internet.email()]
})

var photos = [];
var i = 1000;

while(i--)
{
  var photo = new Photo({
    "taken" : new Date()-Math.random()*1000000,
    "modified" : new Date(),
    "mimeType" : "image/jpeg",
    "ratio" : 1.5,
    "store" : {
      "thumbnail" : {
        url: 'http://lorempixel/'
      }
    },
    "copies" : {
    },
    "owners" : [
      exports.user
    ]
  });
  photos.push(photo);
}

photos=photos
.sort(function(a,b){return a.taken - b.taken})
.map(function (photo) {
  photo.save();
  return photo;
});

exports.photos = photos;
exports.user.save();

