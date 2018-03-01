const sonos = require('sonos');

function Sonos(configuration, storage, musicApi) {
  const file = 'sonos.txt';
  var device;

  var search = sonos.search(function(dev) {
    if (!configuration.roomName) {
      device = dev;
      subscribe();
    } else {
      dev.deviceDescription(function(err, info) {
        if (configuration.roomName === info.roomName) {
          device = dev;
          subscribe();
        }
      });
    }
  });
  setTimeout(function () {
    search.destroy();

    if (!device) {
      throw 'No Sonos device found.'
    }
  }, 1000 * 10);

  function subscribe() {
    storage.subscribeCallback(file, function(response) {
      var commandMatch = response.command.match(/^(\S*)( ?)(.*)$/);
      if (!commandMatch) {
        return;
      }
      var command = commandMatch[1];
      if (command.toLowerCase() === 'play') {
        if (!commandMatch[3]) {
          device.play();
        }
        else {
          musicApi.search(commandMatch[3])
              .then(function(track) {
                device.play(track.uri, function(err, result) {
                  console.log(err);
                });
              })
              .catch(function(error) {
                console.log(error);
              });
        }
      }
    });
  }
}

module.exports = Sonos;
