const uuid = require('uuid4');
const formurlencoded = require('form-urlencoded');
const plexIdentifier = '27a9e256-2a36-4fd2-b8bb-fefc042ec1b1';

function Plex(configuration, storageApi, videoApi) {
  const file = 'plex.txt';
  let plexApi = new (require('plex-api'))({
    hostname: configuration.hostname,
    port: configuration.port || 32400,
    options: {
      identifier: plexIdentifier,
      deviceName: 'Google Home Middleware'
    }
  });

  storageApi.subscribeCallback(file, function(response) {
    var commandMatch = response.command.match(/^(\S*)( ?)(.*)$/);
    if (!commandMatch) {
      return;
    }
    var command = commandMatch[1];
    if (command.toLowerCase() === 'play') {
      play(commandMatch[3]);
    }
  });

  function playMedia(media) {
    var part = media.Media[0].Part[0];
    var url = 'http://' + configuration.hostname + ':' + configuration.port + part.key;
    var container = part.container;
    var title = media.title;
    var thumb = 'http://' + configuration.hostname + ':' + configuration.port + media.art;
    videoApi.play(url, container, title, thumb);
  }

  function play(query) {
    plexApi.query('/library/onDeck').then(function(result) {
      var media = result.MediaContainer.Metadata.find(function(metaData) {
        return (metaData.type === 'episode' || metaData.type === 'movie') &&
            (metaData.grandparentTitle.toLowerCase().indexOf(query.toLowerCase()) > -1 ||
            metaData.title.toLowerCase().indexOf(query.toLowerCase()) > -1);
      });

      if (media && media.Media.length > 0 && media.Media[0].Part.length > 0) {
        playMedia(media);
        return;
      }

      plexApi.query(`/search?query=${query}`).then(function(result) {
        var media = result.MediaContainer.Metadata.find(function(metaData) {
          return metaData.type === 'episode' || metaData.type === 'movie'
        });
        if (media && media.Media.length > 0 && media.Media[0].Part.length > 0) {
          playMedia(media);
        }
      });
    });
  }

  function getTranscodeUrl(url) {
    var transcodeUrl = 'http://' + configuration.hostname + ':' + configuration.port + '/video/:/transcode/universal/start.m3u8?';
    var session = uuid();
    var settings = {
      protocol: 'hls',
      session: session,
      offset: 0 ,
      //videoResolution: '576x320',
      //maxVideoBitrate: 720,
      videoQuality: 100,
      directStream: '1',
      directPlay: '0',
      //subtitleSize: 100,
      //audioBoost: 100,
      fastSeek: '1',
      path: url,
      'X-Plex-Platform': 'Chrome',
      'X-Plex-Device-Name': 'Google Chrome Middleware',
      'X-Plex-Client-Identifier': plexIdentifier
    };
    return transcodeUrl + formurlencoded(settings);
  }
}

module.exports = Plex;
