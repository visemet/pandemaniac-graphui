$(function() {
  // TODO: get adjacency list from the server
  var adj = { 1: [ 7, 2, 6 ]
            , 2: [ 8, 3, 1 ]
            , 3: [ 4, 2, 9 ]
            , 4: [ 10, 3, 5 ]
            , 5: [ 6, 4, 11 ]
            , 6: [ 1, 5, 12 ]
            , 7: [ 1, 20, 13 ]
            , 8: [ 2, 14, 21 ]
            , 9: [ 3, 22, 15 ]
            , 10: [ 4, 16, 23 ]
            , 11: [ 5, 17, 24 ]
            , 12: [ 6, 19, 18 ]
            , 13: [ 7, 19 ]
            , 14: [ 20, 8 ]
            , 15: [ 21, 9 ]
            , 16: [ 22, 10 ]
            , 17: [ 23, 11 ]
            , 18: [ 24, 12 ]
            , 19: [ 12, 13 ]
            , 20: [ 14, 7 ]
            , 21: [ 8, 15 ]
            , 22: [ 9, 16 ]
            , 23: [ 10, 17 ]
            , 24: [ 11, 18 ]
            };

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
