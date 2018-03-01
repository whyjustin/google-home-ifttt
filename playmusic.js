var Promise = require("bluebird");
var playMusic = new (Promise.promisifyAll(require('playmusic')))();

function PlayMusic(configuration) {
  var initialized = false;
  var me = {};

  const playTypes = {
    track: 1,
    artist: 2,
    album: 3,
    playlist: 4,
    station: 6,
    youtube_video: 8
  };
  const seedType = {
    trackId: 2,
    artistId: 3
  };

  playMusic.init({
    email: configuration.username,
    password: configuration.password
  }, function(err) {
    if (err) {
      throw err;
    }
    initialized = true;
  });

  me.search = function(query) {
    return new Promise(function(fulfill, reject) {
      if (!initialized) {
        reject();
        return;
      }

      playMusic.search(query, 5, function(err, data) {
        if (err) {
          reject(err);
          return;
        }

        var station = data.entries.find(function(entry) { // sort by match score
          return entry.type == playTypes.station;
        });
        if (!station) {
          reject();
          return;
        }
        station = station.station;

        function handleStation(station) {
          if (err) {
            reject(err);
            return;
          }
          var response = station.mutate_response[0];
          playMusic.getStationTracks(response.id, 10, function(err, stream) {
            var resolveUrlPromises = [];
            stream.data.stations[0].tracks.forEach(function(track) {
              resolveUrlPromises.push(new Promise(function(fulfill, reject) {
                playMusic.getStreamUrl(track.nid, function(err, url) {
                  if (err) {
                    reject(err);
                    return;
                  }
                  fulfill({
                    album: track.album,
                    artist: track.artist,
                    title: track.title,
                    nid: track.nid,
                    uri: url
                  });
                });
              }));
            });
            Promise.all(resolveUrlPromises)
                .then(function(tracks) {
                  fulfill(tracks);
                })
                .catch(function(err) {
                  reject(err);
                });
          });
        }

        if (station.seed.seedType == seedType.trackId) {
          playMusic.createStation(station.name, station.seed.trackId, 'track', function(err, station) {
            handleStation(station);
          });
        } else if (station.seed.seedType == seedType.artistId) {
          playMusic.createStation(station.name, station.seed.artistId, 'artist', function(err, station) {
            handleStation(station);
          });
        }

        //fulfill();
        return;
        console.log(song);
        playMusic.getStreamUrl(song.track.nid, function(err, streamUrl) {
          console.log(streamUrl);
        });
      });
    });
  };

  return me;
}

module.exports = PlayMusic;
