
/**
 * Module dependencies.
 */

var helpers = require('./submit-helpers');

module.exports = exports = function(db, client) {
  helpers = helpers(db);

  return (
    { list: function(req, res, next) {
        // Find all graphs
        findAllGraphs(db, function(err, graphs) {
          if (err) {
            return next(err);
          }

          // Classify all attempts
          var team = req.user;
          classifyAllAttempts(db, client, team, function(err, attempts) {
            if (err) {
              return next(err);
            }

            var active = []
              , now = new Date();

            graphs.forEach(function(value) {
              var graph = attempts[value.name] || { downloaded: false
                                                  , expired: value.end <= now
                                                  };
              graph.href = value.name;
              graph.text = value.name;

              active.push(graph);
            });

            return res.render('submit/dashboard', { active: active });
          });
        });
      }

    }
  );
};

/**
 * Returns a list of graphs that have been started, sorted by end time.
 *
 * db = database client
 * next = function(error, result)
 */
function findAllGraphs(db, next) {
  var res = [];

  var now = new Date()
    , query = { start: { $lt: now } };

  var graphs = db.collection('graphs');
  graphs.find(query, {}, { sort: 'end' }).each(function(err, doc) {
    if (err) {
      return next(err);
    }

    // Check if have exhausted cursor
    if (doc === null) {
      return next(null, res);
    }

    res.push(doc);
  });
};

/**
 * Returns an object with keys as the graph names and values as objects
 * of the form
 *   { downloaded: bool, uploaded: bool, expired: bool }
 * based on whether the graph was downloaded, a submission was made for
 * it, and whether the timer has expired.
 *
 * Note that all of these graphs must have been downloaded in order for
 * them to appear in the attempts collection.
 *
 * db = database connection
 * client = redis client
 * team = string
 * next = function(error, result)
 */
function classifyAllAttempts(db, client, team, next) {
  var res = {};

  // Find all submissions made by the team
  var query = { team: team };

  var attempts = db.collection('attempts');
  attempts.find(query, function(err, cursor) {
    function iter(err, doc) {
      if (err) {
        return next(err);
      }

      // Check if have exhausted cursor
      if (doc === null) {
        return next(null, res);
      }

      // Find how much time remains for submission
      var key = helpers.makeKey(doc.graph, doc.team);
      client.ttl(key, function(err, ttl) {
        if (err) {
          return next(err);
        }

        res[doc.graph] = classifyAttempt(doc, ttl);
        return cursor.nextObject(iter);
      });
    };

    if (err) {
      return next(err);
    }

    return cursor.nextObject(iter);
  });
};

/**
 * Returns a object of the form
 *   { downloaded: bool, uploaded: bool, expired: bool }
 * based on whether the graph was downloaded, a submission was made for
 * it, and whether the timer has expired.
 *
 * Note that all of these graphs must have been downloaded in order for
 * them to appear in the attempts collection.
 *
 * attempt = database record
 * ttl = integer
 */
function classifyAttempt(attempt, ttl) {
  var res = { downloaded: true };

  // Check whether any successful submissions have been made
  if (attempt.at) {
    res.uploaded = true;
  } else {
    res.uploaded = false;
  }

  // Check whether any time remains for submission
  if (ttl === -2) {
    res.expired = true;
  } else if (ttl >= 0) {
    res.expired = false;
  }

  return res;
};
