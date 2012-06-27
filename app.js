var express = require('express'),
	_ = require("underscore"),
  xml = require("xml"),
	JoshfireFactory = require("joshfirefactory");


var app = express.createServer();

app.configure(function(){
  app.set('views', __dirname + '/tpl');
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
  app.use(express.static(__dirname + '/public'));
});

JoshfireFactory.bootstrap({save:true,appid:"4fc877ec5d5e4c3813000004",host:"joshfire:firejosh@localhost:40021",deviceid:"desktop"},function(err, Joshfire) {

  if (err) return console.error(err);

  var options = Joshfire.factory.config.template.options;

  var baseTplVars = {
    options: options,
    _:_,
    xml:xml,
    Joshfire: Joshfire
  };

  // Add the routes by desc length.
  // This is a hack so that /xxx goes before /*
  _.chain(options.maintaburls).sortBy(function(x) {return -x.length;}).each(function(url) {

    //Find index back
    var idx = _.indexOf(options.maintaburls,url);

    app.get(url, function(req, res){

      var pageparams = {
        page:1,
        navbase:""
      };

      // This bit is still site-specific :/
      
      var ds = Joshfire.factory.getDataSource("main").children[idx];

      var query = JSON.parse(JSON.stringify(ds.config.query));

      if (url.match(/\*/)) {

        var isCategory = req.params[0].match(/^category\/([a-z0-9_\-]+)/i);
        if (isCategory) {
          query.filter.categories = isCategory[1];
          pageparams.category = isCategory[1];
          pageparams.navbase = "/"+isCategory[0];
          //strip the category component from the url, it might be paginated also
          req.params[0] = req.params[0].substring(isCategory[0].length);
        }

        var isPagination = req.params[0].match(/^(\/)?page\/([0-9]+)/);
        if (isPagination) {
          pageparams.page = parseInt(isPagination[2],10);
          query.skip=Math.max(0,(parseInt(isPagination[2],10)-1)*options.perpage);
          query.limit=options.perpage;
        }

        if (!isCategory && !isPagination) {
          query.filter.path = req.params[0];
        }
        
      }
      console.log("Query:",query);
      
      ds.find(query,function(err,data) {

        if (err) {
          return res.send("Internal error",500);
        }

        var tpl = "mainpage";
        var dolayout = true;

        if (req.query.feed=="rss" || req.query.feed=="rss2") {
          tpl = "rss";
          dolayout = false;
          res.header("Content-Type","text/xml; charset=UTF-8");
        }

        res.render(tpl, _.extend({
          mainidx:idx,
          pageparams:pageparams,
          datasource:ds,
          dataquery:query,
          layout:dolayout,
          data:data
        },baseTplVars));
      });
      
    });

  });


  var port = process.env.PORT || 5000;

  app.listen(port, function() {
    console.log("Listening on " + port);
  });

});