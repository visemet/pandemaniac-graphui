
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path')
  , util = require('util')
  , lineReader = require('line-reader');

var redis = require('redis')
  , client = redis.createClient();

var MongoClient = require('mongodb').MongoClient
  , ObjectID = require('mongodb').ObjectID

/*
 * GET list of submissions.
 */

exports.list = function(req, res) {
  MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {
    if (err) {
      return next(err);
    }

    var graphs = db.collection('graphs');

    var now = new Date()
      , query = { start: { $lt: now }, end: { $gt: now } };

    var active = [];

    graphs.find(query).each(function(err, doc) {
      if (err) {
        db.close();
        return next(err);
      }

      // Check if have exhausted cursor
      if (doc === null) {
        db.close();
        return res.render('submit/dashboard', { active: active });
      }

      active.push({ href: doc.name, text: doc.name });
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

      if (ttl !== -1) {
        // Select upload tab
        selected = 'upload';

        // Set timer value
        remain = ttl;
      }

      // Check whether has already submitted
      MongoClient.connect('mongodb://localhost:27017/test',
        function(err, db) {
          if (err) {
            return next(err);
          }

          var attempts = db.collection('attempts');

          var id = ObjectID.createFromHexString(req.user)
            , query = { team: id, graph: submission };

          attempts.findOne(query, function(err, attempt) {
            db.close();

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
              if (ttl === -1) {
                error = [ 'Failed to submit before timeout.' ];
              }
            }

            // ...while submission time remains
            else if (ttl !== -1) {
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
        }
      );
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
        MongoClient.connect('mongodb://localhost:27017/test',
          function(err, db) {
            if (err) {
              return next(err);
            }

            var attempts = db.collection('attempts');

            var id = ObjectID.createFromHexString(req.user)
              , query = { team: id, graph: submission }
              , sort = []
              , update = { $setOnInsert: query }
              , options = { w: 1, upsert: true, new: false };

            attempts.findAndModify(query, sort, update, options,
              function(err, attempt) {
                db.close();

                if (err) {
                  return next(err);
                }

                // Returns {} when not present, instead of null
                if (!attempt._id) {
                  // Set key to expire with timeout
                  // only if does not already exist
                  client.set(key, true, 'EX', timeout, 'NX', function(err) {
                    if (err) {
                      return next(err);
                    }
                  });
                }
              }
            );
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
      MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {
        if (err) {
          return next(err);
        }

        var attempts = db.collection('attempts');

        var id = ObjectID.createFromHexString(req.user)
          , query = { team: id, graph: submission }
          , update = { $push: { at: now } };

        attempts.update(query, update, { w: 1 }, function(err, docs) {
          db.close();

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

      MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {
        if (err) {
          return next(err);
        }

        var teams = db.collection('teams');

        var id = ObjectID.createFromHexString(req.user);
        teams.findOne({ _id: id }, function(err, team) {
          db.close();

          if (err) {
            return next(err);
          }

          var now = new Date();

          // Compute the filename for the submission
          var dir = path.join('private/uploads', team.name)
            , file = util.format('%s-%s.txt', submission, +now)
            , pathname = path.join(dir, file);

          fs.mkdir(dir, 0755, function(err) {
            // Ignore errors about the directory already existing
            if (err && err.code !== 'EEXIST') {
              return next(err);
            }

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
  });
};

function verifyName(submission, found) {
  // Check that submission name is in a proper format
  // and extract its semantic meaning
  var match = /^(\d+)\.(\d+)\.(\d+)$/.exec(submission);

  if (!match) {
    return found(null, false);
  }

  MongoClient.connect('mongodb://localhost:27017/test', function(err, db) {
    if (err) {
      return found(err);
    }

    var graphs = db.collection('graphs');

    var now = new Date()
      , query = { name: submission, start: { $lt: now }, end: { $gt: now } };

    graphs.findOne(query, function(err, doc) {
      db.close();

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
                  }
      );
    });
  });
};
