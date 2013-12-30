$(function() {
  $('[data-toggle="popover"]').popover({
    html: true
  , trigger: 'hover'
  , title: '<i>Participants</i>'
  , content: function() {
      var teams = $(this).data('content').split(' ')
        , list = $('<ul class="nav nav-list">');

      teams.forEach(function(team) {
        list.append($('<li>' + team + '</li>'));
      });

      list.append($('</ul>'));
      return list;
    }
  });
});