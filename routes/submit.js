
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path')
  , lineReader = require('line-reader');

var redis = require('redis')
  , client = redis.createClient();

var MongoClient = require('mongodb').MongoClient
  , ObjectID = require('mongodb').ObjectID

/*
 * GET list of submissions.
 */

exports.list = function(req, res) {
  // TODO: get list of submissions

  var submissions =
    [ { id: '2.1.1' }
    , { id: '2.1.2' }
    , { id: '2.2.1' }
    ];

  res.render('submit/dashboard',
    { title: 'Pandemaniac'
    , submissions: submissions
    }
  );
};

/*
 * GET description of a submission.
 */

exports.index = function(req, res, next) {
  var submission = req.params.id;

  var team = req.user
    , key = submission + '+' + team;

  var selected = 'download'
    , timeout = 60 // one minute
    , remain = 0;

  // TODO: get timeout for graph

  client.ttl(key, function(err, ttl) {
    if (err) {
      return next(err);
    }

    // Check if key has already expired
    if (ttl === -1) {
      // TODO: disable upload tab

      // TODO check that have not already submitted
      req.flash('info', 'Please refresh after download completes.');
    } else {
      // Select upload tab
      selected = 'upload';

      // Set timer value
      remain = ttl;
    }

    var error = req.flash('error')
      , warn = req.flash('warn')
      , info = req.flash('info')
      , log = req.flash('log');

    res.render('submit/form',
      { title: 'Pandemaniac'
      , submission: submission
      , selected: selected
      , timeout: timeout
      , remain: remain
      , error: error
      , warn: warn
      , info: info
      , log: log
      }
    );
  });
};

/*
 * GET graph as file.
 */

exports.download = function(req, res, next) {
  // TODO: determine which graph to serve

  var submission = req.params.id
    , filename = req.query.file;

  var pathname = path.join('private/graphs', submission + '.txt');

  // TODO: determine timeout for said graph

  var timeout = 60; // one minute

  var team = req.user
    , key = submission + '+' + team;

  // Check that the file exists
  fs.exists(pathname, function(exists) {
    if (!exists) {
      return res.status(404).render('404');
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
};

exports.upload = function(req, res) {
  var submission = req.params.id
    // TODO: validate submission
    , array = submission.split('.').map(function(num) {
        return parseInt(num, 10);
      });

  var major = array[0]
    , minor = array[1]
    , patch = array[2];

  // TODO: fail if key does not exists

  // TODO: compute name to use for file

  var outPathname = path.join('private/uploads', submission + '.txt');

  // TODO: overwrite file if it already exists?

  // Read file
  //    validate and copy to uploads directory

  var inPathname = req.files.vertices.path
    , lineNo = 0
    , remain = minor
    , errors = [];

  lineReader.eachLine(inPathname, function(line, last, next) {
    lineNo++;

    // Check that not too many lines
    if (!last && remain === 0) {
      errors.push({ line: lineNo, message: 'expected end of file' });
      next(false); // stop
    }

    // Check that not too few lines
    else if (last && remain !== 1) {
      errors.push({ line: lineNo, message: 'unexpected end of file' });
      next(false); // stop
    }

    else {
      // Check that line is an integer
      if (/\d+/.test(line)) {
        // TODO: verify value does not exceed maximum

        // Append to output file
        fs.appendFile(outPathname, line + '\n', function(err) {
          if (err) {
            console.error(err);
          }

          remain--;
          next(); // continue
        });
      } else {
        errors.push({ line: lineNo, message: 'expected integer' });
        next(false); // stop
      }
    }
  }).then(function() {
    // TODO: discard output file if had errors
    //       note that was only created if (lineNo !== 0)
  });

  // TODO: report errors back to user
  //       on success: redirect to /submit
  //       on failure: redirect to /submit/id with upload tab selected

  res.redirect('/submit');
};
