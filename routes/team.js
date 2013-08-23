
/**
 * Module dependencies.
 */

var bcrypt = require('bcrypt-nodejs')
  , MongoClient = require('mongodb').MongoClient

exports.register = function(req, res) {
  res.render('team/register', { title: 'Pandemaniac' });
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
            // TODO: report back to the user
            res.redirect('/register');
          } else if (err) {
            throw err;
          } else {
            req.login(docs[0], function(err) {
              if (err) {
                throw err;
              }

              return res.redirect('/team/' + req.user.name);
            });
          }
        });
      });
    });
  });
};

exports.login = function(req, res) {
  res.render('team/login', { title: 'Pandemaniac' });
};

exports.logout = function(req, res) {
  req.logout();
  res.redirect('/');
};

exports.index = function(req, res) {
  res.render('team/dashboard', { title: 'Pandemaniac' });
};
