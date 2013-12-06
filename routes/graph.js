
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

function findAllTeams(teams, next) {
  var res = [];

  teams.find({}, { sort: 'name' }).each(function(err, doc) {
    if (err) {
      return next(err);
    }

    // Check if have exhausted cursor
    if (doc === null) {
      return next(null, res);
    }

    res.push(doc.name);
  });
};

function findAllGraphs(graphs, next) {
  var res = [];

  // TODO: group by category
  graphs.find({}, { sort: 'name' }).each(function(err, doc) {
    if (err) {
      return next(err);
    }

    // Check if have exhausted cursor
    if (doc === null) {
      return next(null, res);
    }

    res.push(doc.name);
  });
};

function findAllRuns(runs, next) {
  runs.aggregate([{ $unwind: '$teams' }], next);
};

/*
 * GET listing of simulations.
 */
exports.list = function(req, res, next) {
  MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {
    if (err) {
      return next(err);
    }

    var teams = db.collection('teams')
      , graphs = db.collection('graphs')
      , runs = db.collection('runs');

    function doNext(err) {
      db.close();
      next(err);
    };

    // Get all teams
    findAllTeams(teams, function(err, teams) {
      if (err) {
        return doNext(err);
      }

      // Get all graphs, grouped by category
      findAllGraphs(graphs, function(err, graphs) {
        if (err) {
          doNext(err);
        }

        // Iterate through all runs, unwound by team
        findAllRuns(runs, function(err, runs) {
          if (err) {
            doNext(err);
          }

          var invTeams = {};
          teams.forEach(function(value, index) {
            invTeams[value] = index;
          });

          var invGraphs = {};
          graphs.forEach(function(value, index) {
            invGraphs[value] = index;
          });

          var matrix = [];

          // Initialize empty matrix
          // number of teams by number of graphs
          teams.forEach(function() {
            var row = [];

            graphs.forEach(function() {
              row.push(null);
            });

            matrix.push(row);
          });

          runs.forEach(function(doc) {
            var i = invTeams[doc.teams];
            var j = invGraphs[doc.graph];

            matrix[i][j] = doc._id;
          });

          res.render('graph/dashboard', { matrix: matrix
                                        , teams: teams
                                        , graphs: graphs });
        });
      });
    });
  });
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
