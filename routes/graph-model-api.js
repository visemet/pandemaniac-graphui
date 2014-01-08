
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path');

var mongo = ObjectID = require('mongodb').ObjectID

module.exports = exports = function(db) {
  return (
    { model: function(req, res) {
        var id = req.params.id
          , query;

        try {
          query = { _id: new ObjectID(id), file: { $exists: true } };
        } catch (e) {
          return res.json(404, { error: 'unknown model' });
        }

        var runs = db.collection('runs');
        runs.findOne(query, function(err, doc) {
          if (err) {
            return res.json(500);
          }

          if (!doc) {
            return res.json(404, { error: 'unknown model' });
          }

          var pathname = path.join('private', 'runs', doc.file);
          fs.readFile(pathname, { encoding: 'utf8' }, function(err, data) {
            if (err) {
              return res.json(500);
            }

            res.json(JSON.parse(data));
          });
        });
      }

    }
  );
};
