
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path');

var MongoClient = require('mongodb').MongoClient
  , ObjectID = require('mongodb').ObjectID

/*
 * GET description of a simulation.
 */

exports.index = function(req, res, next) {
  res.render('graph/graph');
};

/*
 * GET structure of a simulation.
 */
exports.structure = function(req, res, next) {
  var id = req.params.id;

  MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {
    if (err) {
      return next(err);
    }

    var attempts = db.collection('attempts')
      , query;

    try {
      query = { _id: new ObjectID(id) };
    } catch (e) {
      return res.json(404, { error: 'invalid graph' });
    }

    attempts.findOne(query, function(err, doc) {
      if (err) {
        return next(err);
      }

      if (!doc) {
        return res.json(404, { error: 'invalid graph' });
      }

      var graphs = db.collection('graphs');

      graphs.findOne({ name: doc.graph }, function(err, doc) {
        if (err) {
          return next(err);
        }

        db.close();

        var pathname = path.join('private/graphs', doc.file);

        fs.readFile(pathname, { encoding: 'utf8' }, function(err, data) {
          if (err) {
            return next(err);
          }

          res.json(JSON.parse(data));
        });
      });
    });
  });
};

/*
 * GET layout of a simulation.
 */
exports.layout = function(req, res, next) {
  var id = req.params.id;

  MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {
    if (err) {
      return next(err);
    }

    var attempts = db.collection('attempts')
      , query;

    try {
      query = { _id: new ObjectID(id) };
    } catch (e) {
      return res.json(404, { error: 'invalid graph' });
    }

    attempts.findOne(query, function(err, doc) {
      if (err) {
        return next(err);
      }

      if (!doc) {
        return res.json(404, { error: 'invalid graph' });
      }

      var graphs = db.collection('graphs');

      graphs.findOne({ name: doc.graph }, function(err, doc) {
        if (err) {
          return next(err);
        }

        db.close();

        var pathname = path.join('private/layouts', doc.file);

        fs.readFile(pathname, { encoding: 'utf8' }, function(err, data) {
          if (err) {
            return next(err);
          }

          res.json(JSON.parse(data));
        });
      });
    });
  });
};

/*
 * GET model of a simulation.
 */
exports.model = function(req, res, next) {
  var id = req.params.id;

  MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {
    if (err) {
      return next(err);
    }

    var attempts = db.collection('attempts')
      , query;

    try {
      query = { _id: new ObjectID(id), file: { $exists: true } };
    } catch (e) {
      return res.json(404, { error: 'invalid graph' });
    }

    attempts.findOne(query, function(err, doc) {
      if (err) {
        return next(err);
      }

      if (!doc) {
        return res.json(404, { error: 'invalid graph' });
      }

      db.close();

      var pathname = path.join('private/runs', doc.file);

      fs.readFile(pathname, { encoding: 'utf8' }, function(err, data) {
        if (err) {
          return next(err);
        }

        res.json(JSON.parse(data));
      });
    });
  });
};
