
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path')
  , lineReader = require('line-reader');

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

exports.index = function(req, res) {
  var submission = req.params.id;

  // TODO: check if key exists in Redis (select upload tab)
  // TODO: check if already have submitted (disable upload)

  res.render('submit/form',
    { title: 'Pandemaniac'
    , submission: submission
    }
  );
};

/*
 * GET graph as file.
 */

exports.download = function(req, res) {
  // TODO: determine which graph to serve

  var submission = req.params.id
    , filename = req.query.file;

  var pathname = path.join('private/graphs', submission + '.txt');

  // Check that the file exists
  fs.exists(pathname, function(exists) {
    if (exists) {
      res.download(pathname, filename, function(err) {
        if (err) {
          console.error(err);
        } else {
          // TODO: store key that expires after X time in Redis
          //       only if it does not already exist and have not
          //       already submitted
        }
      });
    } else {
      res.status(404).render('404');
    }
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
