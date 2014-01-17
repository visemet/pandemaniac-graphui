
/**
 * Module dependencies.
 */

var express = require('express')
  , flash = require('connect-flash')
  , http = require('http')
  , net = require('net')
  , path = require('path');

var mongo = require('./config/mongo')
  , passport = require('./config/passport')
  , redis = require('redis');

var routes = require('./routes')
  , submit = require('./routes/submit')
  , team = require('./routes/team')
  , graph = require('./routes/graph');

var RedisStore = require('connect-redis')(express);

var app = express();

app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ store: new RedisStore(), secret: 'keyboard cat' }));
  app.use(express.methodOverride());
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.static(path.join(__dirname, 'public')));

  // Middleware to refresh notifications
  app.use(function(req, res, next) {
    res.locals({ title: 'Pandemaniac'
               , error: req.flash('error')
               , warn: req.flash('warn')
               , info: req.flash('info')
               , log: req.flash('log')
               , user: !!req.user
               });

    next(null, req, res);
  });

  app.use(app.router);

  // Fallback to 404 if no matching route found
  app.use(function(req, res) {
    res.status(404).render('404');
  });
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

app.get('/', routes.index);

function restrict(req, res, next) {
  if (req.user) {
    return next();
  }

  res.redirect('/login');
}

function anonymous(req, res, next) {
  if (!req.user) {
    return next();
  }

  res.redirect('/');
}

mongo.connect(function(err, db) {
  if (err) {
    throw err;
  }

  var client = redis.createClient();

  team = team(passport, db);
  submit = submit(db, client);
  graph = graph(db);

  // Set up team routes
  app.get('/register', anonymous, team.register);
  app.post('/register', anonymous, team.doRegister);
  app.get('/login', anonymous, team.login);
  app.post('/login', anonymous, team.doLogin);
  app.get('/logout', team.logout);

  // Set up submit routes
  app.get('/submit', restrict, submit.list);
  app.get('/submit/:id', restrict, submit.index);
  app.get('/submit/:id/download', restrict, submit.download);
  app.post('/submit/:id/upload', restrict, submit.upload);

  // Set up graph routes
  app.get('/graph', graph.list);
  app.get('/graph/:id', graph.index);
  app.get('/api/v1/graph/:id/structure', graph.structure);
  app.get('/api/v1/graph/:id/layout', graph.layout);
  app.get('/api/v1/graph/:id/model', graph.model);

  http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
  });
});


