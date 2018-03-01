var Client = require('castv2-client').Client;
var DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;
var mdns = require('mdns');

function Chromecast(configuration) {
  var device;
  var me = {};

  function getDevice() {
    return new Promise(function(fulfill, reject)
    {
      if (device) {
        fulfill(device);
      }
      else {
        var browser = mdns.createBrowser(mdns.tcp('googlecast'));

        browser.on('serviceUp', function(service) {
          if (service.addresses[0] == configuration.hostname) {
            configureDevice(service.addresses[0]);
          }
          browser.stop();
        });

        browser.start();

        function configureDevice(host) {
          var client = new Client();

          client.connect(host, function() {
            client.launch(DefaultMediaReceiver, function(err, player) {
              if (!err) {
                device = player;
                fulfill(device);
              }

              player.on('status', function(status) {
                console.log(`status broadcast playerState=${status.playerState}`);
              });
            });
          });

          client.on('error', function(err) {
            client.close();
            device = null;
          });
        }
      }
    });
  }

  me.play = function(url, container, title, thumb) {
    getDevice().then(function(device) {
      device.load({
        contentId: url,
        contentType: 'video/' + container,
        streamType: 'BUFFERED',

        metadata: {
          type: 0,
          metadataType: 0,
          title: title,
          images: [
            { url: thumb }
          ]
        }
      }, {autoplay: true}, function(err, status) {
        console.log(status);
      });
    });
  };

  return me;
}

module.exports = Chromecast;
