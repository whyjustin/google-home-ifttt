var Promise = require("bluebird");

function Dropbox(configuration) {
  const dropbox = new (Promise.promisifyAll(require('dropbox')))({
    accessToken: configuration.accessToken
  });
  const path = configuration.path;
  const callbacks = [];
  var me = {};

  me.subscribeCallback = function(file, callback) {
    callbacks.push({
      file: file,
      callback: callback
    });
  };

  function downloadAndDeleteFile(file, callbackFunction) {
    return new Promise(function (fulfill, reject) {
      dropbox.filesDownload({path: file.path_lower})
          .then(function(response) {
            var json = JSON.parse(response.fileBinary);
            callbackFunction(json);
            fulfill();
            deleteFile(file.path_lower).then(function() {
              fulfill();
            }).catch(function(error) {
              reject(error);
            });
          })
          .catch(function(error) {
            reject(error);
          });
    });
  }

  function deleteFile(file) {
    return dropbox.filesDelete({path: file})
        .catch(function(error) {
          console.log(error);
        });
  }

  function pollDropbox() {
    dropbox.filesListFolder({path: path})
        .then(function(response) {
          var downloadQueue = [];
          for (var i = 0; i < response.entries.length; i++) {
            var file = response.entries[i];
            if (file['.tag'] !== 'file') {
              continue;
            }
            for (var j = 0; j < callbacks.length; j++) {
              var callback = callbacks[j];
              if (file.name.toLowerCase() === callback.file) {
                downloadQueue.push(downloadAndDeleteFile(file, callback.callback));
              }
            }
          }

          Promise.all(downloadQueue)
              .then(function() {
                  setTimeout(pollDropbox, 1000);
              })
              .catch(function(error) {
                console.log(error);
                setTimeout(pollDropbox, 1000);
              });
        })
        .catch(function(error) {
          console.log(error);
          setTimeout(pollDropbox, 1000);
        });
  }

  setTimeout(pollDropbox, 1000);
  return me;
}

module.exports = Dropbox;
