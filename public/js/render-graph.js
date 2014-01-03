$(function() {
  var loc = window.location.pathname
    , id = loc.substr(loc.lastIndexOf('/') + 1, loc.length);

  // Get adjacency list from the server
  $.getJSON('/api/v1/graph/' + id + '/structure', function(adj) {

    // Get graph layout from the server
    $.getJSON('/api/v1/graph/' + id + '/layout', function(pos) {
      var prefix = '_';

      function computeNodes(refs) {
        return $.map(adj, function(value, key) {
          var node = refs[key];

          if (node) {
            delete node.team;
          } else {
            refs[key] = { id: key, x: pos[key].x, y: pos[key].y };
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

      function zoom() {
        vis.attr('transform', 'translate(' + d3.event.translate + ')'
            + 'scale(' + d3.event.scale + ')');
      };

      var width = '100%'
        , height = 500;

      var color = d3.scale.category10();

      var force = d3.layout.force()
          .nodes(nodes)
          .links(links)
          .size([ width, height ]);

      var vis = d3.select('#chart')
          .append('svg:svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', '0 0 960 ' + height)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .attr('pointer-events', 'all')
          .append('svg:g')
            .attr('width', width)
            .attr('height', height)
            .call(d3.behavior.zoom().scaleExtent([0.25, 4]).on('zoom', zoom))
          .append('svg:g')
            .attr('width', width)
            .attr('height', height);

      vis.append('svg:rect')
          .attr('width', width)
          .attr('height', height)
          .style('fill', 'white');

      var link = vis.selectAll('line.link');

      if (nodes.length <= 200) {
        link.data(links)
            .enter().append('svg:line')
            .attr('class', 'link')
            .attr('x1', function(d) { return d.source.x; })
            .attr('y1', function(d) { return d.source.y; })
            .attr('x2', function(d) { return d.target.x; })
            .attr('y2', function(d) { return d.target.y; })
            .style('stroke', 'gray')
            .style('opacity', 0.1);
      }

      var legend = d3.select('#legend')
          .append('svg:svg')
            .attr('width', width)
            .attr('height', height);

      var node = vis.selectAll('circle.node')
          .data(nodes)
          .enter().append('svg:circle')
          .attr('r', 3)
          .attr('id', function(d, i) { return prefix + d.id; })
          .attr('class', 'node')
          .attr('cx', function(d) { return d.x; })
          .attr('cy', function(d) { return d.y; })
          .style('fill', 'gray')
          .style('opacity', 0.8);

      var colors = {}
        , num_colors = 0;

      var items = {}
        , padding = 5;

      var uncolored = '$uncolored';

      function applyDiff(refs, diff) {
        if (diff) {
          $.each(diff, function(key, values) {
            $.each(values, function(i, value) {
              // Subtract nodes that were taken
              var old = refs[value].team ? refs[value].team : uncolored;
              items[old].score -= 1;

              refs[value].team = key;
            });

            // Add new nodes reached
            items[key].score += values.length;
          });
        }
      };

      // Get steps of simulation from the server
      $.getJSON('/api/v1/graph/' + id + '/model', function(steps) {
        $.each(steps['0'], function(key, values) {
          num_colors++;
          colors[key] = color(num_colors);
        });

        // Set up the legend
        function computeItems() {
          items[uncolored] = { color: 'gray', score: nodes.length };

          $.each(steps['0'], function(key, values) {
            items[key] = { color: colors[key], score: 0 };
          });
        };

        computeItems();

        legend.selectAll('text')
            .data(d3.entries(items), function(d) { return d.key; })
            .enter().append('text')
            .attr('x', '2em')
            .attr('y', function(d, i) { return padding + i + 'em'; })
            .text(function(d) {
              return d.key + ' - ' + d.value.score;
            });

        legend.selectAll('circle')
            .data(d3.entries(items), function(d) { return d.key; })
            .enter().append('circle')
            .attr('cx', '1em')
            .attr('cy', function(d, i) { return padding + i - 0.3 + 'em'; })
            .attr('r', '0.4em')
            .style('fill', function(d) { return d.value.color });

        var applied = -1;

        function step(size) {
          var stepNo = +$('#step-no').val()
            , remain;

          // Starting from step that was already applied,
          // ...or a decrement
          if (stepNo < applied || size < 0) {
            computeNodes(refs);
            computeItems();
            remain = stepNo + size;
            applied = -1;
            stepNo = 0;
          }

          // Otherwise, an increment
          else {
            remain = size;
          }

          var changes = [];

          while (remain > 0) {
            applyDiff(refs, steps[stepNo]);
            applied++;
            stepNo++;
            remain--;
          }

          node.data(nodes).style('fill', function(d) {
            if (d.team) {
              return colors[d.team];
            }

            return 'gray';
          });

          legend.selectAll('text')
              .data(d3.entries(items), function(d) { return d.key; })
              .text(function(d) {
                return d.key + ' - ' + d.value.score;
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
  });
});
