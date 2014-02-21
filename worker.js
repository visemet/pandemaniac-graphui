
/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path');

var d3 = require('d3')
  , _ = require('underscore');

var pathname = process.argv[2]
  , filename = path.basename(pathname);
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

  // Refer to http://stackoverflow.com/questions/9901565
  var k = Math.sqrt(nodes.length / (width * height));

  var force = d3.layout.force()
      .nodes(nodes)
      .links(links)
      .charge(-5 / k)
      .gravity(10 * k)
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

  pathname = path.join('private', 'layouts', filename);
  fs.writeFile(pathname, JSON.stringify(result), function (err) {
    if (err) {
      throw err;
    }
  });
});
