var express = require('express');

var app = express.createServer();

app.configure(function(){
  app.set('views', __dirname + '/tpl');
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
  app.use(express.static(__dirname + '/public'));
});

app.get('/', function(req, res){
  res.render('index', {
    title: 'Sylvain Zimmer'
  });
});

var port = process.env.PORT || 5000;

app.listen(port, function() {
  console.log("Listening on " + port);
});