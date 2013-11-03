
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path');

var d3 = require('d3')
  , _ = require('underscore');

var pathname = path.join('private', 'graphs', process.argv[2])
fs.readFile(pathname, { encoding: 'utf8' }, function(err, data) {
  if (err) {
    throw err;
  }

  var adj = JSON.parse(data);

  function computeNodes(refs) {
    return _.map(adj, function(value, key) {
      refs[key] = { id: key };
      return refs[key];
    });
  };

  var refs = {}
    , nodes = computeNodes(refs)
    , links = d3.merge(nodes.map(function(source) {
        return adj[source.id].map(function(targetId) {
          return { source: refs[source.id]
                 , target: refs[targetId]
                 };
        });
      }));

  var width = 960
    , height = 500;

  var force = d3.layout.force()
      .nodes(nodes)
      .links(links)
      .size([ width, height ]);

  var EPSILON = 0;

  force.start();

  while (force.alpha() > EPSILON) {
    force.tick();
  }

  force.stop();

  var result = {};
  _.each(refs, function(value, key) {
    result[key] = { x: value.x, y: value.y };
  });

  console.log(JSON.stringify(result));
});
