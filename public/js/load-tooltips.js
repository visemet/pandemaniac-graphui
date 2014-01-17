$(function() {
  $('[data-toggle="popover"]').popover({
    html: true
  , trigger: 'hover'
  , title: '<i>Participants</i>'
  , content: function() {
      var teams = $(this).data('teams-list').split(' ')
        , list = $('<ul class="nav">');

      teams.forEach(function(team) {
        list.append($('<li>' + team + '</li>'));
      });

      list.append($('</ul>'));
      return list;
    }
  });
});
