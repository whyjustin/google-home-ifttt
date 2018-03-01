const request = require('request');
const dateFormat = require('dateformat');

function Sonarr(configuration, storageApi, speakerApi) {
  const file = 'sonarr.txt';

  storageApi.subscribeCallback(file, function(response) {
    let commandMatch = response.command.match(/^(\S*)( ?)(.*)$/);
    if (!commandMatch) {
      return;
    }

    let command = commandMatch[1];
    let query = commandMatch[3];

    switch (query) {
      case 'new':
        getNew().then(function(speech) {
          speakerApi.say(speech);
        });
        break;
      case 'showing':
        getShowing().then(function(speech) {
          speakerApi.say(speech);
        });
        break;
    }
  });

  function getNew() {
    return new Promise((fulfill, reject) => {
      const endpoint = 'history';

      request(buildHttpOptions(endpoint), (error, response, body) => {
        if (error) {
          reject(error);
          return;
        }
        var newShows = body.records.filter((record) => {
          return record.eventType === 'downloadFolderImported';
        }).sort(function(a, b) {
          return new Date(b.airDate) - new Date(a.airDate);
        }).map(function(record) {
          return {
            series: record.series.title,
            episode: record.episode.title,
            date: buildDateString(record.episode.airDate)
          };
        });

        fulfill(dedupAndBuildSpeech(newShows));
      });
    });
  }

  function getShowing() {
    return new Promise((fulfill, reject) => {
      const endpoint = 'calendar';

      request(buildHttpOptions(endpoint), (error, response, body) => {
        if (error) {
          reject(error);
          return;
        }
        var showing = body.filter(function(show) {
          return show.hasFile;
        }).sort(function(a, b) {
          return new Date(b.airDate) - new Date(a.airDate);
        }).map(function(show) {
          return {
            series: show.series.title,
            episode: show.title,
            date: buildDateString(show.airDate)
          };
        });

        fulfill(dedupAndBuildSpeech(showing));
      });
    });
  }

  function buildDateString(airDate) {
    const today = new Date();
    const date = new Date(airDate);

    if (today.getYear() === date.getYear() && today.getMonth() === date.getMonth()) {
      if (today.getDay() === date.getDay()) {
        return 'today';
      }
      else if (today.getDay() === date.getDay() - 1) {
        return 'yesterday';
      }
    }

    return dateFormat(date, 'mmmm dS, yyyy');
  }

  function dedupAndBuildSpeech(shows) {
    shows.filter((record, index) => {
      return shows.indexOf(record) === index;
    });

    let speech = shows.reduce((acc, newShow) => {
      return acc + `${newShow.series}: ${newShow.episode} airing ${newShow.date}, `;
    }, '');

    return !speech ? 'No new episodes.' : speech;
  }

  function buildHttpOptions(endpoint) {
    return {
      "url": `http://${configuration.hostname}:${configuration.port}/api/${endpoint}?apikey=${configuration.apiKey}`,
      "json": true
    };
  }

  return {
    sayNew: getNew,
    getShowing: getShowing
  }
}

module.exports = Sonarr;
