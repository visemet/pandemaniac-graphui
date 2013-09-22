$(function() {
  var loc = window.location.pathname
    , id = loc.substr(loc.lastIndexOf('/') + 1, loc.length);

  // Get adjacency list from the server
  $.getJSON('/api/v1/graph/' + id + '/structure', function(adj) {
    var prefix = '_';

    var refs = {}
      , nodes = $.map(adj, function(value, key) {
          refs[key] = { id: key };
          return refs[key];
        })
      , links = d3.merge(nodes.map(function(source) {
          return adj[source.id].map(function(targetId) {
            return { source: refs[source.id]
                   , target: refs[targetId]
                   };
          });
        }));

    var width = 960
      , height = 500;

    var color = d3.scale.category10();

    var force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .size([ width, height ])
        .start();

    var vis = d3.select('#chart').append('svg:svg')
        .attr('width', width)
        .attr('height', height);

    var node = vis.selectAll('circle.node')
        .data(nodes)
        .enter().append('svg:circle')
        .attr('r', 5)
        .style('fill', 'gray')
        .attr('class', 'node')
        .attr('id', function(d, i) { return prefix + d.id; })
        .call(force.drag);

    var link = vis.selectAll('line.link')
        .data(links)
        .enter().append('svg:line')
        .attr('class', 'link');

    force.on('tick', function() {
      link.attr('x1', function(d) { return d.source.x; })
          .attr('y1', function(d) { return d.source.y; })
          .attr('x2', function(d) { return d.target.x; })
          .attr('y2', function(d) { return d.target.y; });

      node.attr('cx', function(d) { return d.x; })
          .attr('cy', function(d) { return d.y; });
    });

    // TODO: get diff from the server
    var steps = {
      0: { 1: [ 1, 2, 3 ], 2: [ 4, 5, 6 ] }
    , 1: { 1: [ 7, 8, 9 ], 2: [ 10, 11, 12 ] }
    , 2: { 1: [ 13, 14, 15, 20, 21, 22 ], 2: [ 16, 17, 18, 19, 23, 24 ] }
    };

    var simulation = null;

    var button = $('#chart').find('.btn').get(0);
    button.onclick = function() {
      var stepNo = 0;

      // Prevent simultaneous updates
      if (simulation) {
        clearInterval(simulation);
      }

      node.style('fill', function(d) { return 'gray' });

      simulation = setInterval(function() {
        // Check when reached end of simulation
        if (!steps.hasOwnProperty(stepNo)) {
          return clearInterval(simulation);
        }

        $.each(steps[stepNo], function(key, values) {
          $.each(values, function(i, value) {
            node.filter('#' + prefix + value).style('fill', function(d) {
              return color(key);
            });
          });
        });

        stepNo++;
      }, 1000);
    };
  });
});
