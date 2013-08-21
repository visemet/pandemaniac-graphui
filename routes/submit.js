
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path');

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
  var submission = req.params.id;

  // TODO: fail if key does not exists

  // TODO: read file and validate

  exports.index(req, res);
};
