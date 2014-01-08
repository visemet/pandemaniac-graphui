
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path');

var helpers = require('./submit-helpers');

module.exports = exports = function(db, client) {
  helpers = helpers(db);

  return (
    { download: function(req, res, next) {
        var graph = req.params.id
          , filename = req.query.file || graph + '.json';

        // Check that the graph name is valid
        helpers.verifyName(graph, function(err, found) {
          if (err) {
            return next(err);
          }

          if (!found || !found.canDownload) {
            return res.status(400).render('400');
          }

          // Check that the graph file exists
          var pathname = path.join('private', 'graphs', found.graph.file);
          fs.exists(pathname, function(exists) {
            if (!exists) {
              return res.status(500).render('500');
            }

            // Send the file
            res.download(pathname, filename, function(err) {
              if (err) {
                return next(err);
              }

              var team = req.user;

              // Check whether has already submitted
              var query = { team: team, graph: graph }
                , sort = []
                , update = { $setOnInsert: query }
                , options = { safe: true, upsert: true, new: false };

              var attempts = db.collection('attempts');
              attempts.findAndModify(query, sort, update, options,
                function(err, attempt) {
                  if (err) {
                    return next(err);
                  }

                  // Note that findAndModify returns {}
                  // when document was not present, instead of null
                  if (found.canUpload && !attempt._id) {
                    // Set key to expire with timeout only if does not
                    // already exist
                    var key = helpers.makeKey(graph, team)
                      , timeout = found.graph.timeout;
                    client.set(key, true, 'EX', timeout, 'NX', function(err) {
                      if (err) {
                        return next(err);
                      }
                    });
                  }
                }
              );
            });
          });
        });
      }

    }
  );
};
