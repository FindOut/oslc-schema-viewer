var express = require('express');
var webpackDevMiddleware = require("webpack-dev-middleware");
var webpack = require("webpack");
var config = require("./webpack.config.js");
var path = require('path');
var http = require('request');
var fs = require('fs');

var port = 3011;

var app = express();
app.use(webpackDevMiddleware(webpack(config), {}));

app.get('/proxy', function (request, response) {
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.header('Pragma', 'no-cache');
  response.header('Expires', '0');
  var useCache = false;
  if (useCache) {
    response.header('Content-Type', 'application/xml');
    response.send(getFromCache(request.query.url));
  } else {
    http.get({
      url: request.query.url,
      headers: copyHeaders(request.headers, ['authorization', 'accept'])
    }, function (error, resp, body) {
      // copy all headers from resp to response
      for (var key in resp.headers) {
        response.header(key, resp.headers[key]);
      }
      var correctedBody = body
        .replace(/http:\/\/10\.238\.2\.156:8080\/oslc4jsimulink/g,
          'https://vservices.offis.de/rtp/simulink/v1.0/services')
        .replace(/http:\/\/10\.238\.2\.156:8080\/oslc4jbugzilla/g,
          'https://vservices.offis.de/rtp/bugzilla/v1.0/services');
      if (!error) {
        saveToCache(request.query.url, correctedBody);
      }
      response
        .status(resp.statusCode)
        .send(correctedBody);
    });
  }
});

// returns an object containing non-empty headers
// in headerNameList copied from srcHeaders
function copyHeaders(srcHeaders, headerNameList) {
  toHeaders = {};
  for (var namei in headerNameList) {
    var name = headerNameList[namei];
    if (srcHeaders[name]) {
      toHeaders[name] = srcHeaders[name];
    }
  }
  return toHeaders;
}

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
