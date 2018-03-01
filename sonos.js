const sonos = new (require('sonos-discovery'))();

function Sonos(configuration, storage, musicApi, ttsApi) {
  const file = 'sonos.txt';
  const me = {};

  var load = new Promise(function(fulfill, reject) {
    sonos.on('initialized', function() {
      if (!sonos.getPlayer(configuration.defaultRoomName)) {
        throw `No Sonos room named ${configuration.defaultRoomName}`;
      }
      subscribe();
      fulfill();
    });
  });

  me.say = function(phrase) {
    load.then(function() {
      ttsApi.getSpeechFile(phrase).then(function(uri) {
        var player = getPlayer();
        player.coordinator.setAVTransport(uri).then(() => player.coordinator.play());
      });
    });
  };

  function getPlayer(name) {
    name = name || configuration.defaultRoomName;
    let player = sonos.getPlayer(name);
    if (!player) {
      console.log(`No Sonos room named ${configuration.defaultRoomName}`);
    }
    return player;
  }

  function getAllPlayers() {
    return sonos.players;
  }

  function subscribe() {
    storage.subscribeCallback(file, function(response) {
      let command, query, roomName;
      let commandMatch = response.command.match(/^(\S*)( ?)(.*)( on )(.*)$/);
      if (commandMatch) {
        command = commandMatch[1];
        query = commandMatch[3];
        roomName = commandMatch[5];
      } else {
        commandMatch = response.command.match(/^(\S*)( ?)(.*)$/);
        command = commandMatch[1];
        query = commandMatch[3];
      }

      if (!commandMatch) {
        return;
      }

      if (command.toLowerCase() === 'play') {
        let player = getPlayer(roomName);
        if (!query) {
          player.coordinator.play();
        }
        else {
          if (configuration.shortcuts) {
            configuration.shortcuts.forEach(function(shortcut) {
              if (shortcut.key === query) {
                player.coordinator.setAVTransport(shortcut.uri).then(() => player.coordinator.play());
              }
            });
          }
          musicApi.search(query)
              .then(function(track) {
                player.coordinator.setAVTransport(track.uri, track.metadata).then(() => player.coordinator.play());
              })
              .catch(function(error) {
                console.log(error);
              });
        }
      } else if (command.toLowerCase() === 'pause') {
        let players;
        if (roomName) {
          players = [getPlayer(roomName)];
        } else {
          players = getAllPlayers();
        }
        players.forEach(function(player) {
          player.coordinator.pause();
        });
      } else if (command.toLowerCase() === 'stop') {
        let players;
        if (roomName) {
          players = [getPlayer(roomName)];
        } else {
          players = getAllPlayers();
        }
        players.forEach(function(player) {
          player.coordinator.stop();
        });
      }
    });
  }

  return me;
}

module.exports = Sonos;
