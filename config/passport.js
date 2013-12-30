
/**
 * Module dependencies.
 */

var bcrypt = require('bcrypt-nodejs')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

var mongo = require('./mongo');

passport.use(new LocalStrategy(function(username, password, done) {
  mongo.connect(function(err, db) {
    if (err) {
      return done(err);
    }

    var teams = db.collection('teams');

    teams.findOne({ name: username }, function(err, team) {
      if (err) {
        return done(err);
      }

      // Check that team exists
      if (!team) {
        return done(null, false, { message: 'Invalid username.' });
      }

      // Check that password matches
      bcrypt.compare(password, team.hash, function(err, auth) {
        if (err) {
          return done(err);
        }

        if (!auth) {
          return done(null, false, { message: 'Invalid password.' });
        }

        done(null, team);
      });
    });
  });
}));

passport.serializeUser(function(user, done) {
  done(null, user.name);
});

passport.deserializeUser(function(username, done) {
  done(null, username);
});

module.exports = passport;
