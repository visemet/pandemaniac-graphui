
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path');

var passport = require('../config/passport');

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
