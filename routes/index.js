
/*
 * GET home page.
 */

exports.index = function(req, res) {
  error = req.flash('error');
  warn = req.flash('warn');
  info = req.flash('info');
  log = req.flash('log');

  res.render('index',
    { title: 'Pandemaniac'
    , error: error
    , warn: warn
    , info: info
    , log: log
    }
  );
};
