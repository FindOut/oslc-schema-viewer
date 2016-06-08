var express = require('express');
var webpackDevMiddleware = require("webpack-dev-middleware");
var webpack = require("webpack");
var config = require("./webpack.config.js");
var path = require('path');
var http = require('request');
var local_config = require('./local.config.json');
var fs = require('fs');

var port = 3011;

var app = express();
app.use(webpackDevMiddleware(webpack(config), {}));

app.get('/proxy', function (request, response) {
  console.log('url', request.query.url);

  var useCache = true;
  if (useCache) {
    response.header('ETag', 'asdqweasd');
    response.header('Content-Type', 'application/xml');
    response.header('Access-Control-Allow-Origin', '*');
    response.send(getFromCache(request.query.url));
  } else {
    http.get({
      url: request.query.url,
      auth: local_config.auth,
      headers: {
        'Accept': 'application/rdf+xml'
      }
    }, function (error, resp, body) {
      if (error || resp.statusCode != 200) {
        console.error('error', error);
        console.error('status', resp && resp.statusCode);
        response.status(500).send(error);
      } else {
        response.header('ETag', 'asdqweasd');
        response.header('Content-Type', 'application/xml');
        response.header('Access-Control-Allow-Origin', '*');
        var result = body
          //.replace(/bugzilla/g, 'simulink')
          //  .replace(/simulink/g, 'bugzilla')
          .replace(/http:\/\/10\.238\.2\.156:8080\/oslc4jsimulink/g,
            'https://vservices.offis.de/rtp/simulink/v1.0/services')
          .replace(/http:\/\/10\.238\.2\.156:8080\/oslc4jbugzilla/g,
            'https://vservices.offis.de/rtp/bugzilla/v1.0/services');
        saveToCache(request.query.url, result);
        console.log(result);
        response.send(result);
      }
    });
  }
});

app.use('/', express.static(path.resolve('./app')));
app.listen(port, function () {
  console.log('listening at localhost:' + port);
});

var cacheFolder = 'cache';
if (!fs.existsSync(cacheFolder)) {
  fs.mkdirSync(cacheFolder);
}

function saveToCache(url, result) {
  fs.writeFile(path.join(cacheFolder, encodeURIComponent(url)) + '.xml', result, 'utf8');
}
function getFromCache(url) {
  return fs.readFileSync(path.join(cacheFolder, encodeURIComponent(url)) + '.xml', 'utf8');
}
