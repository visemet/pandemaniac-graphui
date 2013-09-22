
/**
 * Module dependencies.
 */

var express = require('express')
  , flash = require('connect-flash')
  , http = require('http')
  , net = require('net')
  , path = require('path');

var routes = require('./routes')
  , submit = require('./routes/submit')
  , team = require('./routes/team')
  , graph = require('./routes/graph');

var bcrypt = require('bcrypt-nodejs')
  , MongoClient = require('mongodb').MongoClient
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

var app = express();

app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(express.methodOverride());
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.static(path.join(__dirname, 'public')));

  // Middleware to refresh notifications
  app.use(function(req, res, next) {
    app.locals({
      title: 'Pandemaniac'
    , error: req.flash('error')
    , warn: req.flash('warn')
    , info: req.flash('info')
    , log: req.flash('log')
    });

    next(null, req, res);
  });

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

app.get('/register', anonymous, team.register);
app.post('/register', anonymous, team.doRegister);
app.get('/login', anonymous, team.login);
app.post('/login', anonymous, team.doLogin);
app.get('/logout', team.logout);

passport.use(new LocalStrategy(function(username, password, done) {
  MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {
    if (err) {
      return done(err);
    }

    var teams = db.collection('teams');

    function callback(err, res, msg) {
      db.close();
      done(err, res, msg);
    };

    teams.findOne({ name: username }, function(err, team) {
      if (err) {
        return callback(err);
      }

      // Check that team exists
      if (!team) {
        return callback(null, false, { message: 'Invalid username.' });
      }

      // Check that password matches
      bcrypt.compare(password, team.hash, function(err, auth) {
        if (err) {
          return callback(err);
        }

        if (!auth) {
          return callback(null, false, { message: 'Invalid password.' });
        }

        callback(null, team);
      });
    });
  });
}));

passport.serializeUser(function(user, done) {
  done(null, user._id.toHexString());
});

passport.deserializeUser(function(id, done) {
  done(null, id);
});

app.get('/team/:id', restrict, team.index);

app.get('/submit', restrict, submit.list);
app.get('/submit/:id', restrict, submit.index);
app.get('/submit/:id/download', restrict, submit.download);
app.post('/submit/:id/upload', restrict, submit.upload);

app.get('/api/v1/graph/:id/structure', graph.structure);
app.get('/api/v1/graph/:id/model', graph.model);

http.createServer(app).listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});
