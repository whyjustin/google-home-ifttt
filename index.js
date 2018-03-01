var configuration = require('./config.json');

const features = configuration.features;
var storageApi;
if (features.dropbox) {
  storageApi = require('./dropbox.js')(features.dropbox);
}

if (!storageApi) {
  throw 'Need at least one storage API configured';
}

var musicApi;
//if (features.playmusic) {
//  musicApi = require('./playmusic.js')(features.playmusic);
//}
if (features.pandora) {
  musicApi = require('./pandora.js')(features.pandora);
}

let ttsApi;
if (features.tts) {
  ttsApi = require('./google-tts-service.js')(features.tts);
}

let speakerApi;
if (features.sonos) {
  if (!musicApi) {
    throw 'Need at least one music API configured to use Sonos';
  }

  if (!ttsApi) {
    throw 'Need at least one TTS API configured to use Sonos';
  }

  speakerApi = require('./sonos.js')(features.sonos, storageApi, musicApi, ttsApi);
}

let videoApi;
if (features.chromecast) {
  videoApi = require('./chromecast.js')(features.chromecast);
}

if (features.plex) {
  if (!videoApi) {
    throw 'Need at least one video API configured to use Plex';
  }

  let plex = require('./plex.js')(features.plex, storageApi, videoApi);
}

if (features.sonarr) {
  if (!speakerApi) {
    throw 'Need at lest one speaker API to use Sonarr';
  }

  let sonarr = require('./sonarr.js')(features.sonarr, storageApi, speakerApi);
}
