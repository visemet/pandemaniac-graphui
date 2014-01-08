
/**
 * Module dependencies.
 */

module.exports = exports = function(db) {
  return (
    { verifyName: function(graph, callback) {
        // Check that graph name is in a proper format and extract its
        // semantic meaning, i.e. num_players . num_seeds . unique_id
        var match = /^(\d+)\.(\d+)\.(\d+)$/.exec(graph);

        if (!match) {
          return callback(null, false);
        }

        var now = new Date()
          , query = { name: graph, start: { $lt: now } };

        var graphs = db.collection('graphs');
        graphs.findOne(query, function(err, doc) {
          if (err) {
            return callback(err);
          }

          // Check if any matching document exists
          if (doc === null) {
            return callback(null, false);
          }

          // Can always download graphs, but can only upload if has not
          // past the end time
          callback(null, { graph: doc
                         , numPlayers: +match[1]
                         , numSeeds: +match[2]
                         , canDownload: true
                         , canUpload: doc.end > now
                         });
        });
      }

    , makeKey: function(graph, team) {
        return graph + '+' + team;
      }

    }
  );
};
