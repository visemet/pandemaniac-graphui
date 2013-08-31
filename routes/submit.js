
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

  var team = req.user
    , key = submission + '+' + team;

  var selected = 'download'
    , timeout = 60 // one minute
    , remain = 0;

  var info;

  // TODO: get timeout for graph

  client.ttl(key, function(err, ttl) {
    if (err) {
      return next(err);
    }

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

exports.upload = function(req, res, next) {
  var submission = req.params.id
    // TODO: validate submission
    , array = submission.split('.').map(function(num) {
        return parseInt(num, 10);
      });

  var major = array[0]
    , minor = array[1]
    , patch = array[2];

  var hadError = false;

  // TODO: fail if key does not exists

  // TODO: compute name to use for file

  var outPathname = path.join('private/uploads', submission + '.txt');

  // TODO: overwrite file if it already exists?

  // Read file
  //    validate and copy to uploads directory

  var inPathname = req.files.vertices.path
    , lineNo = 0
    , remain = minor;

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
};
