
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path');

var bcrypt = require('bcrypt-nodejs');

module.exports = exports = function(db) {
  return (
    { register: function(req, res) {
        var warn = res.locals.warn;

        warn.push('Password is transmitted in plain-text!');
        res.render('team/register', { warn: warn });
      }

    , doRegister: function(req, res, next) {
        var username = req.body.username
          , password = req.body.password;

        delete req.body.password;

        // Check whether username and password fields are valid
        var checkUsername = verifyUsername(username)
          , checkPassword = verifyPassword(password);

        if (!checkUsername.isValid) {
          req.flash('error', checkUsername.message);
        }

        if (!checkPassword.isValid) {
          req.flash('error', checkPassword.message);
        }

        if (!checkUsername.isValid || !checkPassword.isValid) {
          return res.redirect('/register');
        }

        // Create the team record and insert it into the database
        makeTeam(username, password, function(err, team) {
          if (err) {
            return next(err);
          }

          var teams = db.collection('teams');

          teams.insert(team, { safe: true }, function(err, docs) {
            // Check for duplicate username
            if (err && err.code === 11000) {
              req.flash('error', 'Team %s is already taken.', username);
              return res.redirect('/register');
            }

            // Some other kind of error
            else if (err) {
              return next(err);
            }

            // Make directory for submissions
            // TODO: handle case where inserting team into database
            //       succeeds, but creating folder fails
            var dir = path.join('private', 'uploads', team.name);
            fs.mkdir(dir, 0755, function(err) {
              if (err) {
                return next(err);
              }

              // Log the team in after registration completes
              req.login(team, function(err) {
                if (err) {
                  return next(err);
                }

                req.flash('log', 'Successfully registered as team %s.'
                               , team.name);
                return res.redirect('/');
              });
            });
          });
        });
      }

    }
  );
};

/**
 * Validates the username field, ensures the following.
 *
 *   - at least 4 characters long
 *   - at most 20 characters long
 *   - contains only alphanumeric characters
 */
function verifyUsername(field) {
  var res = { isValid: true };

  if (field.length < 4) {
    res.isValid = false;
    res.message = 'Team name must be at least 4 characters long.';
  } else if (field.length > 20) {
    res.isValid = false;
    res.message = 'Team name can be at most 20 characters long.';
  } else if (!/^\w+$/.test(field)) {
    res.isValid = false;
    res.message = 'Team name must contain only alphanumeric characters.';
  }

  return res;
};

/**
 * Validates the password field, ensures the following.
 *
 *   - at least 4 characters long
 */
function verifyPassword(field) {
  var res = { isValid: true };

  if (field.length < 4) {
    res.isValid = false;
    res.message = 'Password must be at least 4 characters long.';
  }

  return res;
};

/**
 * Constructs a team document of the following form.
 *   { name: ..., hash: ... }
 *
 * username = string
 * password = string
 * callback = function(error, result)
 */
function makeTeam(username, password, callback) {
  bcrypt.genSalt(10, function(err, salt) {
    if (err) {
      return callback(err);
    }

    bcrypt.hash(password, salt, null, function(err, crypted) {
      if (err) {
        return callback(err);
      }

      var team = { name: username, hash: crypted };

      return callback(null, team);
    });
  });
};
