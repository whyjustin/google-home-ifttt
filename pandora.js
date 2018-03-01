/*
 Portions of pandora.js as marked by comments are from https://github.com/jishi/node-sonos-http-api

 The MIT License (MIT)

 Copyright (c) 2013 Jimmy Shimizu

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
 rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
 persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
 Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const Anesidora = require("anesidora");

function Pandora(configuration) {
  const pandora = new Anesidora(configuration.username, configuration.password);
  const me = {};

  // Functions from https://github.com/jishi/node-sonos-http-api/blob/master/lib/actions/pandora.js
  function getPandoraMetadata(id, title, auth) {
    return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"
        xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
        <item id="OOOX${id}" parentID="0" restricted="true"><dc:title>${title}</dc:title><upnp:class>object.item.audioItem.audioBroadcast</upnp:class>
        <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON3_${auth}</desc></item></DIDL-Lite>`;
  }

  function getPandoraUri(id) {
    return `pndrradio:${id}?sn=2`;
  }

  function login() {
    return new Promise(function(fulfill, reject) {
      pandora.login(function(err) {
        if (err) {
          reject(err);
          return;
        }

        fulfill();
      });
    });
  }

  me.search = function(query) {
    return new Promise(function(fulfill, reject) {
      var results = [];

      login()
          .then(function() {
            pandora.request('user.getStationList', {}, function(err, result) {
              for (let i = 0; i < result.stations.length; i++) {
                let station = result.stations[i];
                if (station.stationName.toLowerCase().indexOf(query.toLowerCase()) > -1) {
                  fulfill({
                    uri: getPandoraUri(station.stationId),
                    metadata: getPandoraMetadata(station.stationId, station.stationName, configuration.username)
                  });
                  return;
                }
              }

              pandora.request('music.search', {
                'searchText': query
              }, function(err, result) {
                if (err) {
                  reject(err);
                  return;
                }

                if (result.artists != undefined) {
                  result.artists.forEach(function(artist) {
                    results.push({
                      musicToken: artist.musicToken,
                      type: 'artist',
                      score: artist.score
                    });
                  });
                }
                if (result.songs != undefined) {
                  result.songs.forEach(function(song) {
                    results.push({
                      musicToken: song.musicToken,
                      type: 'song',
                      score: song.score
                    });
                  });
                }

                if (results.length === 0) {
                  reject();
                }

                results.sort(function(a, b) {
                  return a.score - b.score;
                });


                pandora.request('station.createStation', {
                  musicToken: results[0].musicToken,
                  musicType: results[0].type
                }, function(err, station) {
                  if (err) {
                    reject(err);
                    return;
                  }

                  fulfill({
                    uri: getPandoraUri(station.stationId),
                    metadata: getPandoraMetadata(station.stationId, station.stationName, configuration.username)
                  });
                });
              });
            });
          })
          .catch(function(err) {
            reject(err);
          });
    });
  };

  return me;
}

module.exports = Pandora;
