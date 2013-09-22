$(function() {
  var loc = window.location.pathname
    , id = loc.substr(loc.lastIndexOf('/') + 1, loc.length);

  // Get adjacency list from the server
  $.getJSON('/api/v1/graph/' + id + '/structure', function(adj) {
    var prefix = '_';

    function computeNodes(refs) {
      return $.map(adj, function(value, key) {
        var node = refs[key];

        if (node) {
          delete node.team;
        } else {
          refs[key] = { id: key };
        }

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
        .attr('id', function(d, i) { return prefix + d.id; })
        .attr('class', 'node')
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

    function reset() {
      node.style('fill', 'gray');
    };

    reset();

    function applyDiff(refs, diff) {
      if (diff) {
        $.each(diff, function(key, values) {
          $.each(values, function(i, value) {
            refs[value].team = key;
          });
        });
      }
    };

    // TODO: get diff from the server
    var steps = {
      0: { 1: [ '1', '2', '3' ], 2: [ '4', '5', '6' ] }
    , 1: { 1: [ '7', '8', '9' ], 2: [ '10', '11', '12' ] }
    , 2: { 1: [ '13', '14', '15', '20', '21', '22' ]
         , 2: [ '16', '17', '18', '19', '23', '24' ]
         }
    };

    var applied = -1;

    function step(size) {
      var stepNo = +$('#step-no').val()
        , remain;

      // Starting from step that was already applied,
      // ...or a decrement
      if (stepNo < applied || size < 0) {
        computeNodes(refs);
        remain = stepNo + size;
        applied = -1;
        stepNo = 0;
      }

      // Otherwise, an increment
      else {
        remain = size;
      }

      while (remain > 0) {
        applyDiff(refs, steps[stepNo]);
        applied++;
        stepNo++;
        remain--;
      }

      node.data(nodes).style('fill', function(d) {
        if (d.team) {
          return color(d.team);
        }

        return 'gray';
      });

      $('#step-no').val(stepNo);
    };

    function run(delay) {
      var simulation = null;

      $('#play').click(function() {
        // Prevent simultaneous updates
        if (simulation) {
          clearInterval(simulation);
        }

        simulation = setInterval(function() {
          var stepNo = +$('#step-no').val();

          // Check when reached end of simulation
          if (!steps.hasOwnProperty(stepNo)) {
            return clearInterval(simulation);
          }

          step(1);
        }, delay);
      });

      $('#step-forward').click(function() {
        if (simulation) {
          clearInterval(simulation);
        }

        step(1);
      });

      $('#step-backward').click(function() {
        if (simulation) {
          clearInterval(simulation);
        }

        step(-1);
      });
    };

    run(1000);
  });
});
