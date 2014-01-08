
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path');

var mongo = ObjectID = require('mongodb').ObjectID

module.exports = exports = function(db) {
  return (
    { layout: function(req, res) {
        var id = req.params.id
          , query;

        try {
          query = { _id: new ObjectID(id) };
        } catch (e) {
          return res.json(404, { error: 'unknown layout' });
        }

        var runs = db.collection('runs');
        runs.findOne(query, function(err, doc) {
          if (err) {
            return res.json(500);
          }

          if (!doc) {
            return res.json(404, { error: 'unknown layout' });
          }

          var graphs = db.collection('graphs');
          graphs.findOne({ name: doc.graph }, function(err, doc) {
            if (err) {
              return res.json(500);
            }

            var pathname = path.join('private', 'layouts', doc.file);
            fs.readFile(pathname, { encoding: 'utf8' }, function(err, data) {
              if (err) {
                return res.json(500);
              }

              res.json(JSON.parse(data));
            });
          });
        });
      }

    }
  );
};

