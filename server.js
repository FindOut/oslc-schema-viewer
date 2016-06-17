var express = require('express');
var webpackDevMiddleware = require("webpack-dev-middleware");
var webpack = require("webpack");
var config = require("./webpack.config.js");
var path = require('path');
var http = require('request');
var fs = require('fs');

var port = 3011;

var localConfigFilename = 'local.config.json';
if (!fs.existsSync(localConfigFilename)) {
  var initialConfig = {
    "auth": {"user": "your_username", "password": "your_password"}
  }
  fs.writeFileSync(localConfigFilename, JSON.stringify(initialConfig, null, '  '), 'utf8');
}
var local_config = require('./local.config.json');

var app = express();
app.use(webpackDevMiddleware(webpack(config), {}));

app.get('/proxy', function (request, response) {
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.header('Pragma', 'no-cache');
  response.header('Expires', '0');

  function copyHeaders(from, headerNameList) {
    toHeaders = {};
    for (var namei in headerNameList) {
      var name = headerNameList[namei];
      if (from[name]) {
        toHeaders[name] = from[name];
      }
    }
    return toHeaders;
  }

  var useCache = true;
  if (useCache) {
    response.header('Content-Type', 'application/xml');
    response.send(getFromCache(request.query.url));
  } else {
    http.get({
      url: request.query.url,
      auth: local_config.auth,
      headers: {'Accept': 'application/rdf+xml'} //copyHeaders(request.headers, ['authorization', 'Accept'])
    }, function (error, resp, body) {
      if (error || resp.statusCode != 200) {
        console.error('error', error);
        console.error('status', resp && resp.statusCode);
        console.error('headers', resp.headers);
        if (resp.headers['www-authenticate']) {
          response.header('www-authenticate', resp.headers['www-authenticate'])
        }
        response.status(resp.statusCode).send(error);
      } else {
        response.header('Content-Type', 'application/xml');
        var result = body
          //.replace(/bugzilla/g, 'simulink')
          //  .replace(/simulink/g, 'bugzilla')
          .replace(/http:\/\/10\.238\.2\.156:8080\/oslc4jsimulink/g,
            'https://vservices.offis.de/rtp/simulink/v1.0/services')
          .replace(/http:\/\/10\.238\.2\.156:8080\/oslc4jbugzilla/g,
            'https://vservices.offis.de/rtp/bugzilla/v1.0/services');
        saveToCache(request.query.url, result);
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
