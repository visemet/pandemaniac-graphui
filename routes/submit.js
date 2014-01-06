
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path')
  , util = require('util')
  , lineReader = require('line-reader');

var redis = require('redis')
  , client = redis.createClient();

var mongo = require('../config/mongo');

function makeKey(graph, team) {
  return graph + '+' + team;
};

function findAllGraphs(graphs, next) {
  var res = [];

  var now = new Date()
    , query = { start: { $lt: now } };

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

function classifyAllAttempts(attempts, team, next) {
  var res = {};

  var query = { team: team };
  attempts.find(query, function(err, cursor) {
    function iter(err, doc) {
      if (err) {
        return next(err);
      }

      // Check if have exhausted cursor
      if (doc === null) {
        return next(null, res);
      }

      var key = makeKey(doc.graph, doc.team);
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
 * Returns a JSON object of the form
 *   { downloaded: bool, uploaded: bool, expired: bool }
 *
 * Note that all of these graphs must have been downloaded in order for
 * them to appear in the attempts collection.
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

/*
 * GET list of submissions.
 */

exports.list = function(req, res) {
  mongo.connect(function(err, db) {
    if (err) {
      return next(err);
    }

    var graphsCollection = db.collection('graphs')
      , attemptsCollection = db.collection('attempts');

    // Find all graphs
    findAllGraphs(graphsCollection, function(err, graphs) {
      if (err) {
        return next(err);
      }

      // Classify all attempts
      var team = req.user;
      classifyAllAttempts(attemptsCollection, team, function(err, attempts) {
        if (err) {
          return next(err);
        }

        var active = [];

        graphs.forEach(function(value) {
          var graph = attempts[value.name] || { downloaded: false };
          graph.href = value.name;
          graph.text = value.name;

          active.push(graph);
        });

        return res.render('submit/dashboard', { active: active });
      });
    });
  });
};

/*
 * GET description of a submission.
 */

exports.index = function(req, res, next) {
  var submission = req.params.id;

  verifyName(submission, function(err, found) {
    if (err) {
      return next(err);
    }

    if (!found) {
      return res.status(404).render('404');
    }

    // Get the submission timeout for the graph
    var timeout = found.graph.timeout;

    var key = submission + '+' + req.user;
    client.ttl(key, function(err, ttl) {
      if (err) {
        return next(err);
      }

      var selected = 'download'
        , error
        , info
        , log
        , remain;

      if (ttl !== -2) {
        // Select upload tab
        selected = 'upload';

        // Set timer value
        remain = ttl;
      }

      // Check whether has already submitted
      mongo.connect(function(err, db) {
        if (err) {
          return next(err);
        }

        var attempts = db.collection('attempts');

        var query = { team: req.user, graph: submission };

        attempts.findOne(query, function(err, attempt) {
          if (err) {
            return next(err);
          }

          // Check if has not attempted yet
          if (!attempt) {
            info = [ 'Please refresh after download completes.' ];
          }

          // ...or has already attempted
          else if (!attempt.at) {
            // ...but failed to submit before timeout
            if (ttl === -2) {
              error = [ 'Failed to submit before timeout.' ];
            }
          }

          // ...while submission time remains
          else if (ttl !== -2) {
              info = [ 'Already have uploaded a submission' ];
          }

          // ...and time has expired
          else {
            log = [ 'Successfully attempted.' ];
          }

          res.render('submit/form', { submission: submission
                                    , selected: selected
                                    , timeout: timeout
                                    , error: error
                                    , info: info
                                    , log: log
                                    , remain: remain
                                    }
          );
        });
      });
    });
  });
};

/*
 * GET graph as file.
 */

exports.download = function(req, res, next) {
  var submission = req.params.id
    , filename = req.query.file;

  verifyName(submission, function(err, found) {
    if (err) {
      return next(err);
    }

    if (!found) {
      return res.status(400).render('400');
    }

    // Get which graph to serve
    // and the submission timeout for said graph
    var pathname = path.join('private/graphs', found.graph.file)
      , timeout = found.graph.timeout;

    var team = req.user
      , key = submission + '+' + team;

    // Check that the file exists
    fs.exists(pathname, function(exists) {
      if (!exists) {
        return res.status(500).render('500');
      }

      res.download(pathname, filename, function(err) {
        if (err) {
          return next(err);
        }

        // Check whether has already submitted
        mongo.connect(function(err, db) {
          if (err) {
            return next(err);
          }

          var attempts = db.collection('attempts');

          var query = { team: team, graph: submission }
            , sort = []
            , update = { $setOnInsert: query }
            , options = { w: 1, upsert: true, new: false };

          attempts.findAndModify(query, sort, update, options,
            function(err, attempt) {
              if (err) {
                return next(err);
              }

              // Returns {} when not present, instead of null
              if (found.canUpload && !attempt._id) {
                // Set key to expire with timeout
                // only if does not already exist
                client.set(key, true, 'EX', timeout, 'NX', function(err) {
                  if (err) {
                    return next(err);
                  }
                });
              }
            });
          }
        );
      });
    });
  });
};

exports.upload = function(req, res, next) {
  var submission = req.params.id;

  function readSubmission(numLines, input, output, now) {
    var lineNo = 0
      , remain = numLines
      , hadError = false
      , created = false;

    lineReader.eachLine(input, function(line, isLast, nextLine) {
      lineNo++;

      // Check that not too many lines
      if (!isLast && remain === 1) {
        hadError = true;

        var message = util.format('Expected end of file on line %d.', lineNo);
        req.flash('error', message);
        return nextLine(false); // stop reading
      }

      // Check that not too few lines
      else if (isLast && remain !== 1) {
        hadError = true;

        var message = util.format('Unexpected end of file on line %d.', lineNo);
        req.flash('error', message);
        return nextLine(false); // stop reading
      }

      // Check that line is an integer
      if (!/\d+/.test(line)) {
        hadError = true;

        var message = util.format('Expected integer on line %d.', lineNo);
        req.flash('error', message);
        return nextLine(false); // stop reading
      }

      // TODO: verify value does not exceed maximum

      fs.appendFile(output, line + '\n', { mode: 0644 }, function(err) {
        if (err) {
          return next(err);
        }

        created = true;
        remain--;
        nextLine(); // continue reading
      });
    }).then(function() {
      if (hadError) {
        function done() {
          res.redirect('/submit/' + submission);
        };

        // Discard invalid output file
        if (created) {
          return fs.unlink(output, function(err) {
            if (err) {
              return next(err);
            }

            done();
          });
        }

        return done();
      }

      // Record submission in database
      mongo.connect(function(err, db) {
        if (err) {
          return next(err);
        }

        var attempts = db.collection('attempts');

        var query = { team: req.user, graph: submission }
          , update = { $push: { at: now } };

        attempts.update(query, update, { w: 1 }, function(err, docs) {
          if (err) {
            return next(err);
          }

          req.flash('log', 'Successfully uploaded for %s.', submission);
          res.redirect('/submit');
        });
      });
    });
  };

  verifyName(submission, function(err, found) {
    if (err) {
      return next(err);
    }

    if (!found) {
      return res.status(400).render('400');
    }

    var key = submission + '+' + req.user;
    client.exists(key, function(err, exists) {
      if (err) {
        return next(err);
      }

      // Check that key exists
      if (!exists) {
        return res.status(400).render('400');
      }

      mongo.connect(function(err, db) {
        if (err) {
          return next(err);
        }

        var teams = db.collection('teams');

        teams.findOne({ name: req.user }, function(err, team) {
          if (err) {
            return next(err);
          }

          var now = new Date();

          // Compute the filename for the submission
          var dir = path.join('private', 'uploads', team.name)
            , file = util.format('%s-%s.txt', submission, +now)
            , pathname = path.join(dir, file);

          // Read file
          //    validate and copy to uploads directory

          var input = req.files.vertices.path
            , numLines = found.minor
            , output = pathname;

          readSubmission(numLines, input, output, now);
        });
      });
    });
  });
};

function verifyName(submission, found) {
  // Check that submission name is in a proper format
  // and extract its semantic meaning
  var match = /^(\d+)\.(\d+)\.(\d+)$/.exec(submission);

  if (!match) {
    return found(null, false);
  }

  mongo.connect(function(err, db) {
    if (err) {
      return found(err);
    }

    var graphs = db.collection('graphs');

    var now = new Date()
      , query = { name: submission, start: { $lt: now } };

    graphs.findOne(query, function(err, doc) {
      if (err) {
        return found(err);
      }

      // Check if any matching document exists
      if (doc === null) {
        return found(null, false);
      }

      found(null, { major: +match[1]
                  , minor: +match[2]
                  , patch: +match[3]
                  , graph: doc
                  , canUpload: doc.end > now
                  }
      );
    });
  });
};
