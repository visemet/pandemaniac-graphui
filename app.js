
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , net = require('net')
  , path = require('path');

var routes = require('./routes')
  , submit = require('./routes/submit')
  , team = require('./routes/team')

var bcrypt = require('bcrypt-nodejs')
  , MongoClient = require('mongodb').MongoClient
  , ObjectID = require('mongodb').ObjectID
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
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
  app.use(express.errorHandler());
  app.locals.pretty = true;
});

app.get('/', routes.index);

app.get('/register', team.register);
app.post('/register', team.doRegister);
app.get('/login', team.login);
app.post('/login', passport.authenticate('local', { successRedirect: 'back'
                                                  , failureRedirect: '/login' }));
app.get('/logout', team.logout);

passport.use(new LocalStrategy(function(username, password, done) {
  MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {
    if (err) {
      return done(err);
    }

    var teams = db.collection('teams');

    function callback(err, res, msg) {
      db.close();
      return done(err, res, msg);
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

        if (auth) {
          return callback(null, team);
        } else {
          return callback(null, false, { message: 'Invalid password.' });
        }
      });
    });
  });
}));

passport.serializeUser(function(user, done) {
  done(null, user._id.toHexString());
});

passport.deserializeUser(function(id, done) {
  MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {
    if (err) {
      return done(err);
    }

    var teams = db.collection('teams');

    function callback(err, res, msg) {
      db.close();
      return done(err, res, msg);
    };

    teams.findOne({ _id: ObjectID.createFromHexString(id) }, function(err, team) {
      return callback(err, team);
    });
  });
});

app.get('/team/:id', team.index);

app.get('/submit', submit.list);
app.get('/submit/:id', submit.index);
app.get('/submit/:id/download', submit.download);
app.post('/submit/:id', submit.upload);

http.createServer(app).listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});
