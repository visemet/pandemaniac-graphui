
/**
 * Module dependencies.
 */

var index = require('./submit-index')
  , list = require('./submit-list')
  , download = require('./submit-download')
  , upload = require('./submit-upload');

var _ = require('underscore');

module.exports = exports = function(db, client) {
  index = index(db, client);
  list = list(db, client);
  download = download(db, client);
  upload = upload(db, client);

  return _.extend({}, index, list, download, upload);
};
