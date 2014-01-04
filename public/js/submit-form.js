$(function() {
  var timer = $('#timer')
    , bar = timer.find('.progress-bar');

  var timeout = +bar.attr('data-timeout');

  if (timeout !== 0) {
    var progress = setInterval(function() {
      var remain = +bar.attr('data-remain')
        , percent = 100 * (remain / timeout);

      bar.css('width', percent + '%');

      if (remain > 0) {
        bar.attr('data-remain', remain - 1);
      } else {
        clearInterval(progress);
      }
    }, 1000);
  }
});
