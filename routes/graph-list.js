
/**
 * Module dependencies.
 */

module.exports = exports = function(db) {
  return (
    { index: function(req, res) {
        return res.render('graph/graph');
      }

    , list: function(req, res, next) {
        // Get all teams
        findAllTeams(db, function(err, teams) {
          if (err) {
            return next(err);
          }

          // Get all graphs, grouped by category
          getAllCategories(db, function(err, categories) {
            if (err) {
              return next(err);
            }

            var graphs = extractGraphs(categories);

            var invTeams = makeInverse(teams)
              , invGraphs = makeInverse(graphs);

            // Initialize empty matrix number of teams by number of graphs
            var matrix = prepareMatrix(teams.length, graphs.length);

            // Iterate through all runs
            var runs = db.collection('runs');
            runs.find({}).each(function(err, doc) {
              if (err) {
                return next(err);
              }

              // Check if have exhausted cursor
              if (doc === null) {
                return res.render('graph/dashboard', { matrix: matrix
                                                     , teams: teams
                                                     , categories: categories
                                                     });
              }

              var j = invGraphs[doc.graph];
              doc.teams.forEach(function(team) {
                var i = invTeams[team];

                if (i !== undefined && j !== undefined) {
                  if (!matrix[i][j]) {
                    matrix[i][j] = [];
                  }

                  var score = 0;
                  if (doc.scores) {
                    score = doc.scores[team];
                  }

                  matrix[i][j].push({ id: doc._id
                                    , teams: doc.teams
                                    , score: score });
                }
              });
            });
          });
        });
      }

    }
  );
};

/**
 * Returns an array of team names, sorted in lexiographical order.
 *
 * db = database connection
 * next = function(error, result)
 */
function findAllTeams(db, next) {
  var res = [];

  var teams = db.collection('teams');
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

/**
 * Returns an array of category objects, sorted by name in
 * lexiographical order.
 *
 * db = database connection
 * next = function(error, result)
 *
 */
function getAllCategories(db, next) {
  var group = { $group: { _id: '$category', graphs: { $push: '$name' } } }
    , sort = { $sort : { '_id' : 1 } };

  var graphs = db.collection('graphs');
  graphs.aggregate([ group, sort ], function(err, res) {
    if (err) {
      return next(err);
    }

    var categories = [];

    res.forEach(function(value) {
      var category = { name: value._id, graphs: value.graphs };
      categories.push(category);
    });

    return next(null, categories);
  });
};

/**
 * Returns the list of graphs in order by category.
 */
function extractGraphs(categories) {
  var graphs = [];

  categories.forEach(function(value) {
    graphs.push.apply(graphs,value.graphs);
  });

  return graphs;
}

/**
 * Returns an object with keys as the values in the list, and values as
 * the index of that element in the list.
 */
function makeInverse(list) {
  var res = {};

  list.forEach(function(value, index) {
    res[value] = index;
  });

  return res;
};

/**
 * Returns a matrix of size `numRows` by `numColumns`, with each element
 * set as the specified value.
 */
function prepareMatrix(numRows, numColumns, fill) {
  var matrix = [];

  for (var i = 0; i < numRows; i++) {
    var row = [];

    for (var j = 0; j < numColumns; j++) {
      row.push(fill);
    }

    matrix.push(row);
  }

  return matrix;
};
