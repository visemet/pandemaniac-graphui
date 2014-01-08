
/**
 * Module dependencies.
 */

var _ = require('underscore');

var list = require('./graph-list')
  , structure = require('./graph-structure-api')
  , layout = require('./graph-layout-api')
  , model = require('./graph-model-api');

module.exports = exports = function(db) {
  return _.extend({}, list(db), structure(db), layout(db), model(db));
};
