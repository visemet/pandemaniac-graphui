
/**
 * Module dependencies.
 */

var MongoClient = require('mongodb').MongoClient;

var _db; // Variable to hold the connected database.

// Caches the connection to the database.
exports.connect = function(callback) {
  if (_db) {
    return callback(null, _db);
  }

  MongoClient.connect('mongodb://localhost/test', function(err, db) {
    _db = db;
    return callback(err, db);
  });
};
