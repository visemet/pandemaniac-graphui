
/**
 * Module dependencies.
 */

module.exports = exports = function(passport) {
  return (
    { login: function(req, res) {
        var warn = [ 'Password is transmitted in plain-text!' ];
        res.render('team/login', { warn: warn });
      }

    , doLogin: function(req, res) {
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
      }

    , logout: function(req, res) {
        req.logout();
        req.flash('log', 'Successfully logged out.');
        res.redirect('/');
      }

    }
  );
};
