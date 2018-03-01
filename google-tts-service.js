/*
 Portions of tts-service.js as marked by comments are from https://github.com/jishi/node-sonos-http-api

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

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const os = require('os');

const app = express();

function TTSService(configuration) {
  const me = {};
  const port = configuration.port || 3000;
  const web = 'static';
  const tts = 'tts';

  if (!fs.existsSync(web)) {
    fs.mkdir(web);
  }
  if (!fs.existsSync(path.resolve(web, tts))) {
    fs.mkdir(path.resolve(web, tts));
  }

  // http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
  let interfaces = os.networkInterfaces();
  var ipAddresses = Object.keys(interfaces)
      .reduce((results, name) => results.concat(interfaces[name]), [])
      .filter((iface) => iface.family === 'IPv4' && !iface.internal)
      .map((iface) => iface.address);

  if (ipAddresses.length === 0) {
    throw 'Unable to determine local IP address';
  }

  const ip = ipAddresses[0];

  app.use(express.static(web));
  app.listen(port);

  me.getSpeechFile = (phrase) => {
    // Logic from https://github.com/jishi/node-sonos-http-api/blob/master/lib/tts-providers/default/google.js
    const phraseHash = crypto.createHash('sha1').update(phrase).digest('hex');
    const filename = `${phraseHash}.mp3`;
    const filepath = path.resolve(web, tts, filename);
    const expectedUri = `http://${ip}:${port}/${tts}/${filename}`;

    if (fs.existsSync(filepath)) {
      fs.accessSync(filepath, fs.R_OK);
      return Promise.resolve(expectedUri);
    }

    return new Promise((resolve, reject) => {
      var file = fs.createWriteStream(filepath);
      var options = {
        "headers": {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36"},
        "host": "translate.google.com",
        "path": "/translate_tts?client=tw-ob&tl=en&q=" + encodeURIComponent(phrase)
      };
      var callback = (response) => {
        if (response.statusCode < 300 && response.statusCode >= 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.end();
            resolve(expectedUri);
          });
        }
        else {
          reject(`Download from google TTS failed with status ${response.statusCode}, ${response.message}`);
        }
      };

      http.request(options, callback).on('error', (err) => {
        fs.unlink(filepath);
        reject(err);
      }).end();
    });
  };

  return me;
}

module.exports = TTSService;
