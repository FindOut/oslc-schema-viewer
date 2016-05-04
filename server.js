var express = require('express');
var webpackDevMiddleware = require("webpack-dev-middleware");
var webpack = require("webpack");
var config = require("./webpack.config.js");
var path = require('path');
var http = require('request');

var port = 3011;

var app = express();
app.use(webpackDevMiddleware(webpack(config), {}));

app.use('/rio-cm', function(request, response, next) {
  console.log('url', request.originalUrl);
  http({
    url: 'http://localhost:8080' + request.originalUrl,
    headers: {
      'Accept': 'application/rdf+xml'
    }
  }, function (error, resp, body) {
    if (error || resp.statusCode != 200) {
      response.status(500).send(error);
    } else {
      response.header('ETag', 'asdqwe');
      response.header('Content-Type', 'application/xml');
      response.header('Access-Control-Allow-Origin', '*');
      var result = body.replace(/8080/g, '3011');
      console.log(result);
      response.send(result);
    }
  });
});

app.use('/', express.static(path.resolve('./app')));
app.listen(port, function() {
  console.log('listening at localhost:' + port);
});
