
/**
 * Module dependencies.
 */

var bcrypt = require('bcrypt-nodejs')
  , MongoClient = require('mongodb').MongoClient
  , passport = require('passport');

exports.register = function(req, res) {
  var warn = [ 'Password is transmitted in plain-text!' ];
  res.render('team/register', { warn: warn });
};

exports.doRegister = function(req, res, next) {
  var username = req.body.username
    , password = req.body.password;

  MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {
    if (err) {
      return next(err);
    }

    var teams = db.collection('teams');

    bcrypt.genSalt(10, function(err, salt) {
      if (err) {
        return next(err);
      }

      bcrypt.hash(password, salt, null, function(err, crypted) {
        if (err) {
          return next(err);
        }

        delete req.body.password;
        var team = { name: username, hash: crypted };

        teams.insert(team, { w: 1 }, function(err, docs) {
          // Check for duplicate username
          if (err && err.message.indexOf('E11000 ') !== -1) {
            req.flash('error', '%s is already taken.', username);
            return res.redirect('/register');
          }

          // Some other kind of error
          else if (err) {
            return next(err);
          }

          req.login(docs[0], function(err) {
            if (err) {
              return next(err);
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
  var warn = [ 'Password is transmitted in plain-text!' ];
  res.render('team/login', { warn: warn });
};

exports.doLogin = function(req, res) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return next(err);
    }

    // Failed to authenticate
    if (!user) {
      req.flash('error', 'Invalid team name or password.');
      return res.redirect('/login');
    }

    req.login(user, function(err) {
      if (err) {
        return next(err);
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
  res.render('team/dashboard');
};
