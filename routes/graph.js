
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
  var group = { $group: { _id: '$category', graph: { $push: '$name' } } }
    , sort = { $sort : { '_id' : 1 } };

  graphs.aggregate([ group, sort ], function(err, res) {
    if (err) {
      return next(err);
    }

    var categories = []
      , graphs = [];

    res.forEach(function(value) {
      var category = {};
      category[value._id] = value.graph;

      categories.push(category);
      graphs.push.apply(graphs, value.graph)
    });

    return next(null, { categories: categories, graphs: graphs });
  });
};

function findAllRuns(runs, next) {
  // runs.aggregate([{ $unwind: '$teams' }], next);
  runs.find({}).each(next);
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
      findAllGraphs(graphs, function(err, value) {
        if (err) {
          return doNext(err);
        }

        var categories = value.categories
          , graphs = value.graphs;

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

        // Iterate through all runs, unwound by team
        findAllRuns(runs, function(err, run) {
          if (err) {
            return doNext(err);
          }

          if (!run) {
            db.close();
            return res.render('graph/dashboard', { matrix: matrix
                                                 , teams: teams
                                                 , categories: categories
                                                 , graphs: graphs });
          }

          var j = invGraphs[run.graph];
          run.teams.forEach(function(team) {
            var i = invTeams[team];

            if (i !== undefined && j !== undefined) {
              if (!matrix[i][j]) {
                matrix[i][j] = [];
              }

              matrix[i][j].push({ id: run._id, teams: run.teams });
            }
          });
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

    var runs = db.collection('runs')
      , query;

    try {
      query = { _id: new ObjectID(id) };
    } catch (e) {
      return res.json(404, { error: 'invalid graph' });
    }

    runs.findOne(query, function(err, doc) {
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

    var runs = db.collection('runs')
      , query;

    try {
      query = { _id: new ObjectID(id) };
    } catch (e) {
      return res.json(404, { error: 'invalid graph' });
    }

    runs.findOne(query, function(err, doc) {
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

    var runs = db.collection('runs')
      , query;

    try {
      query = { _id: new ObjectID(id), file: { $exists: true } };
    } catch (e) {
      return res.json(404, { error: 'invalid graph' });
    }

    runs.findOne(query, function(err, doc) {
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
