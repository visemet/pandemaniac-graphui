
/**
 * Module dependencies.
 */

var _ = require('underscore');

var login = require('./team-login')
  , register = require('./team-register');

module.exports = exports = function(passport, db) {
  return _.extend({}, login(passport), register(db));
};
