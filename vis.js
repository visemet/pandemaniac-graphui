
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , net = require('net')
  , fs = require('fs')
  , path = require('path');

var routes = require('./routes')
  , graph = require('./routes/graph');

var app = express();

app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(app.router);
});

app.configure('development', function() {
  app.use(express.errorHandler());
  app.locals.pretty = true;
});

app.configure('production', function() {
  app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).render('500');
  });

  app.locals.pretty = true;
});

app.get('/d3/:id', function(req, res, next) {
  res.render('graph/graph');
});

app.get('/api/v1/graph/:id/structure', function(req, res, next) {
  var filename = req.params.id;
  var pathname = path.join('private', 'graphs', filename);

  fs.readFile(pathname, { encoding: 'utf8' }, function(err, data) {
    if (err) {
      return next(err);
    }

    res.json(JSON.parse(data));
  });
});

app.get('/api/v1/graph/:id/layout', function(req, res, next) {
  var filename = req.params.id;
  var pathname = path.join('private', 'layouts', filename);

  fs.readFile(pathname, { encoding: 'utf8' }, function(err, data) {
    if (err) {
      return next(err);
    }

    res.json(JSON.parse(data));
  });
});

app.get('/api/v1/graph/:id/model', function(req, res, next) {
  res.send(200);
});

app.get('*', function(req, res, next) {
  res.render('404');
});

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
