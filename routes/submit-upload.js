
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path')
  , util = require('util')
  , lineReader = require('line-reader');

var helpers = require('./submit-helpers');

module.exports = exports = function(db, client) {
  helpers = helpers(db);

  return (
    { upload: function(req, res, next) {
        var graph = req.params.id;

        // Check that the graph name is valid
        helpers.verifyName(graph, function(err, found) {
          if (err) {
            return next(err);
          }

          if (!found || !found.canUpload) {
            return res.status(400).render('400');
          }

          var team = req.user;

          // Check that the timer has not yet expired
          // by seeing whether the key still exists
          var key = helpers.makeKey(graph, team);
          client.exists(key, function(err, exists) {
            if (err) {
              return next(err);
            }

            // Check that key exists
            if (!exists) {
              return res.status(400).render('400');
            }

            // Compute the filename for the submission
            var dir = path.join('private', 'uploads', team)
              , now = new Date()
              , file = util.format('%s-%d.txt', graph, +now)
              , pathname = path.join(dir, file);

            // Read file
            //    validate and copy to uploads directory

            var input = req.files.vertices.path
              , numRemain = found.numSeeds
              , output = pathname;

            var lineNo = 0
              , hadError = false
              , wasCreated = false;

            lineReader.eachLine(input, function(line, isLast, nextLine) {
              lineNo++;

              // Check whether each line in the submission is valid
              var checkLine = verifyLine(line, numRemain, isLast);
              if (!checkLine.isValid) {
                hadError = true;
                req.flash('error', checkLine.message, lineNo);
                return nextLine(false); // stop reading
              }

              line = line.trim() + '\n';
              fs.appendFile(output, line, { mode: 0644 }, function(err) {
                if (err) {
                  return next(err);
                }

                wasCreated = true; // file was created
                numRemain--;
                nextLine(); // continue reading
              });
            }).then(function() {
              if (hadError) {
                // Discard invalid output file
                if (wasCreated) {
                  return fs.unlink(output, function(err) {
                    if (err) {
                      return next(err);
                    }

                    res.redirect('/submit/' + graph);
                  });
                }

                return res.redirect('/submit/' + graph);
              }

              // Record submission in database
              var query = { team: team, graph: graph }
                , update = { $push: { at: now } }
                , options = { safe: true, multi: false };

              var attempts = db.collection('attempts');
              attempts.update(query, update, options, function(err, count) {
                if (err) {
                  return next(err);
                }

                req.flash('log', 'Successfully uploaded for graph %s.', graph);
                res.redirect('/submit');
              });
            });
          });
        });
      }

    }
  );
};

/**
 * Validates each line of the submission, ensures the following.
 *
 *   - not too many lines
 *   - not too few lines
 *   - each line is an integer
 *
 * Returns a string with a single placeholder for the line number.
 */
function verifyLine(line, numRemain, isLast) {
  var res = { isValid: true };

  // Check that not too many lines
  if (!isLast && numRemain === 1) {
    res.isValid = false;
    res.message = 'Expected end of file on line %d.';
  }

  // Check that not too few lines
  else if (isLast && numRemain !== 1) {
    res.isValid = false;
    res.message = 'Unexpected end of file on line %d.';
  }

  // Check that each line is an integer
  if (!/^\d+\w*$/.test(line)) {
    res.isValid = false;
    res.message = 'Expected integer on line %d.';
  }

  // TODO: verify value does not exceed maximum

  return res;
};
