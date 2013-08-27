
/**
 * Module dependencies.
 */

var bcrypt = require('bcrypt-nodejs')
  , MongoClient = require('mongodb').MongoClient
  , passport = require('passport');

exports.register = function(req, res) {
  req.flash('warn', 'Password is transmitted in plain-text!');

  error = req.flash('error');
  warn = req.flash('warn');
  info = req.flash('info');
  log = req.flash('log');

  res.render('team/register',
    { title: 'Pandemaniac'
    , error: error
    , warn: warn
    , info: info
    , log: log
    }
  );
};

exports.doRegister = function(req, res) {
  var username = req.body.username
    , password = req.body.password;

  MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {
    if (err) {
      throw err;
    }

    var teams = db.collection('teams');

    bcrypt.genSalt(10, function(err, salt) {
      if (err) {
        throw err;
      }

      bcrypt.hash(password, salt, null, function(err, crypted) {
        if (err) {
          throw err;
        }

        delete req.body.password;
        var team = { name: username, hash: crypted };

        teams.insert(team, { safe: true }, function(err, docs) {
          // Check for duplicate username
          if (err && err.message.indexOf('E11000 ') !== -1) {
            req.flash('error', '%s is already taken.', username);
            return res.redirect('/register');
          }

          // Some other kind of error
          else if (err) {
            throw err;
          }

          req.login(docs[0], function(err) {
            if (err) {
              throw err;
            }

            req.flash('log', 'Successfully registered as team %s.', docs[0].name);
            res.redirect('/');
          });
        });
      });
    });
  });
};

exports.login = function(req, res) {
  req.flash('warn', 'Password is transmitted in plain-text!');

  error = req.flash('error');
  warn = req.flash('warn');
  info = req.flash('info');
  log = req.flash('log');

  res.render('team/login',
    { title: 'Pandemaniac'
    , error: error
    , warn: warn
    , info: info
    , log: log
    }
  );
};

exports.doLogin = function(req, res) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      throw err;
    }

    // Failed to authenticate
    if (!user) {
      req.flash('error', 'Invalid team name or password.');
      return res.redirect('/login');
    }

    req.login(user, function(err) {
      if (err) {
        throw err;
      }

      req.flash('log', 'Successfully logged in.');
      res.redirect('/');
    });
  })(req, res);
};

exports.logout = function(req, res) {
  req.logout();
  req.flash('log', 'Successfully logged out.');
  res.redirect('/');
};

exports.index = function(req, res) {
  res.render('team/dashboard', { title: 'Pandemaniac' });
};
