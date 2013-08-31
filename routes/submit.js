
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
        , info
        , remain;


      // Check if key has already expired
      if (ttl === -1) {
        // TODO: disable upload tab

        // TODO check that have not already submitted
        info = [ 'Please refresh after download completes.' ];
      } else {
        // Select upload tab
        selected = 'upload';

        // Set timer value
        remain = ttl;
      }

      res.render('submit/form',
        { submission: submission
        , selected: selected
        , timeout: timeout
        , remain: remain
        , info: info
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

        // TODO: check that has not already submitted

        // Set key to expire with timeout only if does not already exist
        client.set(key, true, 'EX', timeout, 'NX', function(err) {
          if (err) {
            return next(err);
          }
        });
      });
    });
  });
};

exports.upload = function(req, res, next) {
  var submission = req.params.id;

  verifyName(submission, function(err, found) {
    if (err) {
      return next(err);
    }

    if (!found) {
      return res.status(400).render('400');
    }

    var remain = found.minor;

    // TODO: fail if key does not exists

    // TODO: compute name to use for file

    var outPathname = path.join('private/uploads', submission + '.txt');

    // TODO: overwrite file if it already exists?

    // Read file
    //    validate and copy to uploads directory

    var inPathname = req.files.vertices.path
      , lineNo = 0
      , hadError = false;

    lineReader.eachLine(inPathname, function(line, isLast, nextLine) {
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

      // Append to output file
      fs.appendFile(outPathname, line + '\n', function(err) {
        if (err) {
          return next(err);
        }

        remain--;
        nextLine(); // continue reading
      });
    }).then(function() {
      // TODO: discard output file if had errors
      //       note that was only created if (lineNo !== 0)

      if (hadError) {
        return res.redirect('/submit/' + submission);
      }

      req.flash('log', 'Successfully uploaded for %s.', submission);
      res.redirect('/submit');
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

      found(null, { major: match[0]
                  , minor: match[1]
                  , patch: match[2]
                  , graph: doc
                  }
      );
    });
  });
};
