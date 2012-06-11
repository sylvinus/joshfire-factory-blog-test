
var _ = require("underscore"),
    request = require('request'),
    requirejs = require("requirejs"),
    querystring = require("querystring"),
    fs = require("fs");

/* This bootstrap script is documented at http://developer.joshfire.com/ */
var Joshfire = {};

Joshfire.factory = {
  globalConfig: {"DATAVERSION":"1","DATAHOSTPORT":"localhost:40020","STATSHOSTPORT":"localhost:40023","HOSTPORT":"localhost:40021"},
  config: {"app":{"id":"4fc877ec5d5e4c3813000004","icon":null,"logo":null,"name":"xx","version":"1.0"},"template":{"id":"4fd3715b31e9315e4800011e","name":"sylvainzimmer.com","version":"0.1.0","options":{"title":"Sylvain Zimmer","perpage":10,"maintabtitles":["Blog","Projects"],"maintaburls":["/*","/projects"]}}},
  device: {"type":"desktop"},
  plugins: {}
};

Joshfire.factory.config.deploy = {"env":"dev","type":"local","id":""};
Joshfire.factory.config.datasources = {"main":[{"name":"Main blog feed","db":"wordpress","col":"posts","query":{"filter":{"url":"sylvainzimmer.com"},"options":{}},"runatclient":true,"missingKeys":[],"outputType":"BlogPosting"},{"name":"Projects page","db":"static","col":"post","query":{"filter":{"articleBody":"A few projects I’m currently involved with:<ul><li><a target=\"_blank\" rel=\"nofollow\" href=\"http://joshfire.com/\">Joshfire</a>&nbsp;: The new company I co-founded in 2011 in Paris. I’m currently Chief Technical Officer, working on an open source HTML5/JavaScript&nbsp;<a target=\"_blank\" rel=\"nofollow\" href=\"http://framework.joshfire.com/\">framework</a>&nbsp;for making multi-device apps.</li><li><a target=\"_blank\" rel=\"nofollow\" href=\"http://www.jamendo.com/\">Jamendo</a>&nbsp;: The biggest European free music community I founded back in 2004. I served as CTO until 2011 and I’m now involved as a board member. We released in 2009 a one-stop shop for&nbsp;<a target=\"_blank\" rel=\"nofollow\" href=\"http://pro.jamendo.com/\">music licensing</a>.</li><li><a target=\"_blank\" rel=\"nofollow\" href=\"http://www.tedxparis.com/\">TEDxParis</a>&nbsp;: The local chapter of the prestigious&nbsp;<a target=\"_blank\" rel=\"nofollow\" href=\"http://www.ted.com/\">TED</a>&nbsp;conferences. Next big event will happen end of 2012. Stay tuned!</li><li><a target=\"_blank\" rel=\"nofollow\" href=\"http://www.creativecommons.org/\" title=\"Link: http://www.creativecommons.org/\">Creative Commons</a>&nbsp;: A game-changing non-profit creating “Some rights reserved” licenses. I’m always envangelizing CC wherever I can!</li><li><a target=\"_blank\" rel=\"nofollow\" href=\"http://chessathome.org/\">Chess@home</a>&nbsp;: A 48h hacking project gone wild! We’re doing SETI@home for Chess, all in JavaScript running inside the browsers of thousands. We plan to break the Guinness World Record for largest networked chess AI.</li><li><a target=\"_blank\" rel=\"nofollow\" href=\"http://parishackers.org/\">Paris Hackers</a>&nbsp;: A local community of hackers (mostly readers of&nbsp;<a target=\"_blank\" rel=\"nofollow\" href=\"http://news.ycombinator.com/\">Hacker News</a>) I bootstraped with<a target=\"_blank\" rel=\"nofollow\" href=\"http://twitter.com/tbassetto\">@tbassetto</a></li></ul>Other stuff I hacked on:<ul><li><a target=\"_blank\" rel=\"nofollow\" href=\"http://www.lesarchitectures.com/\">LesArchitectures.com</a>&nbsp;: French blog of Eliane about architecture and society issues.</li><li><a target=\"_blank\" rel=\"nofollow\" href=\"http://www.contrapunctus14.org/\">Contrapunctus XIV</a>&nbsp;: A new side-project… I hope it will become the central place of information about JS Bach’s last, beautiful and unfinished fugue.</li><li><a target=\"_blank\" rel=\"nofollow\" href=\"http://corewar.joshfire.com/\">Corewars in Javascript</a></li></ul>","name":"Projects"}},"runatclient":true,"missingKeys":[],"outputType":"BlogPosting"}]};






Joshfire.datajs = {};

(function(config, globalConfig) {

  /**
   * Datasource collection object that exposes a 'find' method to retrieve
   * feed items from the data proxy.
   *
   * @class
   * @param {String} db The datasource provider
   * @param {String} colname The collection in the provider's catalog
   * @param {Object} options Common query options (e.g. filtering options)
   * @returns {Collection} The collection that matches the given parameter.
   */
  var collection = function (db, colname, options) {
    options = options || {};

    /**
     * Sends a request to the data proxy to fetch collection feed items
     * @function
     * @param {Object} query Query parameters (search field, query filters...)
     * @param {function} callback Callback method that receives a potential
     *  error and the list of data entries as an object. The returned object
     *  includes an 'entries' property that contains the list of items.
     */
    this.find = function (query, callback) {
      var self = this,
        finalQuery = {},
        uri = null;

      // Clone default options
      _.extend(finalQuery, options);
      _.extend(finalQuery, query);

      // Add API key
      finalQuery.apikey = config.app.id;

      if (finalQuery.filter) {
        finalQuery.filter = JSON.stringify(finalQuery.filter);
      }

      uri = 'http://' + globalConfig.DATAHOSTPORT +
        '/api/'+ globalConfig.DATAVERSION +
        '/' + db +'/'+ colname;

      request({uri:uri, timeout:30000, qs:finalQuery, json:true}, function (err, resp, data) {
        if (data && !data.name && self.name) {
          // Propagate datasource title to the returned feed
          // if not already set
          data.name = self.name;
        }

        console.log("FIND!",uri,finalQuery, options, query,data);

        callback(err,data);
      });
    };

    /**
     * Returns the type of items that a call to find would return.
     *
     * The output type returned by this function is taken from the datasource
     * query options (the Factory saves the outputType along with
     * query parameters). For datasources that return mixed content, the
     * output type is normally the most precise type that is possible.
     *
     * In the absence of bugs, getOutputType() should return the same value
     * as getDesc().outputType, the difference being that getOutputType()
     * returns a value immediately whereas getDesc() may send an HTTP
     * request.
     *
     * @function
     * @return {string} Type of items returned by the collection,
     *   "Thing" if the output type is not present in the query options.
     */
    this.getOutputType = function () {
      if (this.config && this.config.outputType) {
        return this.config.outputType;
      }
      else {
        return 'Thing';
      }
    };

    /**
     * Runs given function when object is 'loaded'.
     *
     * In practice, the function is run immediately, and here only for
     * interface symmetry with datajs.client.js.
     *
     * @function
     * @param {function} f The function to execute.
     */
    this.onLoaded = function (f) {
      f();
    };

    /**
     * Gets the description of the datasource.
     *
     * The description is a JSON object that details the collection
     * parameters. The returned object is usually the collection's
     * "desc" property, but may be more precise depending on the
     * query options (typically the outputType may be adjusted for
     * a more precise one for the given query).
     *
     * @function
     * @param {function} callback Callback function called with the error
     *  and the description.
     */
    this.getDesc = function(callback) {
      client.getCollectionDesc(db, colname, options, callback);
    };
  };


  Joshfire.datajs.proxy = {
    /**
     * Creates a new datasource collection object.
     *
     * Feed items are not fetched at this stage. Call the 'find' method
     * on the returned object to retrieve the feed.
     *
     * @function
     * @param {String} db The datasource provider
     * @param {String} colname The collection in the provider's catalog
     * @param {Object} options Common query options (e.g. filtering options)
     * @returns {Collection} The collection
     */
    getCollection: function (db, colname, options) {
      return new collection(db, colname, options);
    },

    /**
     * Gets the description of the datasource collection
     * from the data proxy.
     *
     * The description is a JSON object that details the collection
     * parameters.
     *
     * @function
     * @param {String} db The datasource provider
     * @param {String} colname The collection in the provider's catalog
     * @param {Object} options Common query options (e.g. filtering options)
     * @param {function} callback Callback function called with the error
     *  and the description.
     */
    getCollectionDesc: function(db, colname, options, callback) {
      var self = this,
        finalQuery = {},
        uri = null;

      if (options) _extend(finalQuery, options);
      if (finalQuery.filter) {
        finalQuery.filter = JSON.stringify(finalQuery.filter);
      }

      uri = 'http://' + globalConfig.DATAHOSTPORT +
        '/api/' + globalConfig.DATAVERSION +
        '/' + db +'/'+ colname + '/_desc';


      request({uri:uri, timeout:30000, qs:finalQuery, json:true}, function (err, resp, data) {
        callback(err,data);
      });
    }
  };

})(Joshfire.factory.config, Joshfire.factory.globalConfig);



global.define = requirejs.define;
require("./datajs_datasources.js");
global.define = null;

/* Client shim! */
var dbrequire = requirejs.config({
  baseUrl: __dirname,
  nodeRequire: require,
  context:"dbrequire"
});

(function (require) {

  // Fork of client.embedded.js
  // Note the dependency to requirejs is mandatory to ensure the right context
  // is used for path resolutions.

  var client = {
    /**
     * Path to databases definitions. This path is relative to the baseUrl
     * config parameter of requirejs. This means that either baseUrl must be
     * set to the root folder of data-joshfire, or urlRoot must be adjusted
     * from the calling code.
     * @type {string}
     */
    urlRoot: 'databases/',

    /**
     * Returns the datasource that matches the given source provider and collection.
     * Returned datasource object features a "find" method that takes a query
     * @function
     * @param {string} db The source provider
     * @param {string} colname The collection name for this source provider
     * @param {Object} options Options to send each time the datasource is requested.
     * @returns {Object} The datasource collection object that features a "find" method.
     */
    getCollection: function (db, colname, options) {
      return new collection(db, colname, options);
    }
  };

  /**
   * Collection class that exposes a "find" method to run queries against
   * the underlying datasource.
   * @constructor
   * @param {string} db The source provider
   * @param {string} colname The collection name for this source provider
   * @param {Object} options Common query options to send with each request
   */
  var collection = function (db, colname, options) {
    var self = this;
    var _loadedCallbacks = [];
    var _loaded = false;
    var collectionObject = null;
    
    /**
     * Runs the function when the collection is loaded.
     * @function
     * @param {function} f Function to execute. The function won't receive
     *  any parameter.
     * @private
     */
    self.onLoaded = function(f) {
      if (!_loaded) {
        _loadedCallbacks.push(f);
      } else {
        f();
      }
    };


    /**
     * Sends a request to the underlying datasource and calls the callback
     * function once done with the retrieved feed (or the error).
     * @function
     * @param {Object} query The request to send
     * @param {function(string,Object)} callback The callback function to call
     *  once done
     * @public
     */
    self.find = function (query, callback) {
      self.onLoaded(function () {
        var completeQuery = _.extend({}, options, query);
        if (collectionObject) {
          collectionObject.find(completeQuery, callback);
        }
        else {
          callback("Collection does not exist.");
        }
      });
    };


    /**
     * Sends a request to the underlying operator and calls the callback
     * function once done with the retrieved feed (or the error).
     * @function
     * @param {Object} data Processor inputs. Typical example for a single
     *  input: { "main": { "entries": [list of items] }}. Input names are
     *  operator specific, "main" by default.
     * @param {Object} query The request to send
     * @param {function(string,Object)} callback The callback function to call
     *  once done
     * @public
     */
    self.process = function (data, query, callback) {
      self.onLoaded(function () {
        var completeQuery = _.extend({}, options, query);
        if (collectionObject && collectionObject.process) {
          collectionObject.process(data, completeQuery, callback);
        }
        else {
          callback("Collection does not exist.");
        }
      });
    };


    // Collection can be safely required
    dbrequire([client.urlRoot + db + "/" + colname], function (col) {
      // Done. Run registered "load" event handlers.
      collectionObject = col;
      _loaded = true;
      for (var i=0;i<_loadedCallbacks.length;i++) {
        _loadedCallbacks[i]();
      }
      _loadedCallbacks = [];
    });

  };

  Joshfire.datajs.client = client;

})(requirejs);






/**
 * @fileoverview Exposes the getDataSource method that returns datasource
 * objects to the Joshfire.factory global object.
 *
 * Datasource objects returned by the getDataSource method may in turn be
 * used to retrieve feeds. The datasource may either run locally (client-side)
 * or through the data proxy.
 *
 * The code requires the following global objects to be available:
 * - window.Joshfire.factory (code uses Joshfire.factory.config)
 * - window.Joshfire.datajs (code uses client.getCollection and/or
 * proxy.getCollection methods depending on datasource parameters)
 */

(function (factory, datajs) {

  /**
   * Returns a datasource object that may be used to retrieve feed items
   * for the given datasource input name.
   *
   * @function
   * @param {String} datasourceName The name of the datasource input, as
   *  defined in the template's manifest file (package.json)
   * @return {Object} A datasource object that exposes a "find" method,
   *  null when the datasource cannot be found,
   *  a dummy "empty" datasource when the datasource is defined but does
   *  not target any real datasource.
   */
  var getDataSource = function (datasourceName) {
    var ds = null;
    var ret = null;
    var dsFactory = null;
    var i = 0;
    var emptyds = {
      name: '',
      find: function (query, callback) {
        return callback(null, { entries: [] });
      },
      onLoaded: function (f) {
        f();
      },
      getDesc: function(callback) {
        callback(null, {});
      },
      getOutputType: function() {
        return 'Thing';
      }
    };

    // Check parameters
    if (!datasourceName ||
      !factory ||
      !factory.config ||
      !factory.config.datasources ||
      !factory.config.datasources[datasourceName]) {
      return null;
    }

    // Retrieve the definition of the datasource from the app config
    ds = factory.config.datasources[datasourceName];

    if (Object.prototype.toString.call(ds) == '[object Array]') {
      // The datasource is actually a set of datasources.

      // The "find" method returns a feed whose items are the feeds
      // returned by the underlying datasources. In particular, it
      // does not return the union of the feeds returned by the
      // underlying datasources.
      ret = {
        "children": [],
        "find": function (options, callback) {
          var pending = ds.length;
          var errorCaught = false;
          var entries = [];
          var i = 0;

          // Callback called as soon as a "find" returns, calls the final
          // callback when all collections have been retrieved.
          var cb = function (err, data) {
            pending -= 1;
            if (errorCaught) {
              // Error already caught, do nothing
              return;
            }
            if (err) {
              errorCaught = true;
            }
            if (data) {
              entries.push(data);
            }
            if (err || (pending === 0)) {
              return callback(err, {"entries": entries});
            }
          };

          for (i=0; i<ret.children.length; i++) {
            ret.children[i].find(options, cb);
          }
        }
      };

      // Expose the underlying datasources in the "children" property
      // of the returned object.
      for (i = 0; i < ds.length; i++) {
        // A multiple datasource may contain "null" elements depending
        // on whether the user entered all datasources or not
        if (ds[i]) {
          dsFactory = ds[i].runatclient ? datajs.client : datajs.proxy;
          ret.children[i] = dsFactory.getCollection(ds[i].db, ds[i].col, ds[i].query);
          ret.children[i].name = ds[i].name;

          // Datasource should be opaque from template's point of view,
          // but the config contains useful info, typically the type of
          // items that will be returned (outputType), used by getOutputType
          ret.children[i].config = ds[i];
        }
        else {
          // Return an empty collection for this item
          ret.children[i] = {
            name: emptyds.name,
            find: emptyds.find,
            onLoaded: emptyds.onLoaded,
            getDesc: emptyds.getDesc,
            getOutputType: emptyds.getOutputType
          };
        }
      }
    }
    else if (ds) {
      // Atomic datasource
      dsFactory = ds.runatclient ? datajs.client : datajs.proxy;
      ret = dsFactory.getCollection(ds.db, ds.col, ds.query);
      ret.name = ds.name;

      // Datasource should be opaque from template's point of view,
      // but the config contains useful info, typically the type of
      // items that will be returned (outputType), used by getOutputType
      ret.config = ds;
    }
    else {
      // Datasource defined but not set, return an empty datasource
      ret = {
        name: emptyds.name,
        find: emptyds.find,
        onLoaded: emptyds.onLoaded,
        getDesc: emptyds.getDesc,
        getOutputType: emptyds.getOutputType
      };
    }

    return ret;
  };

  // Expose the "getDataSource" method to Joshfire.factory
  factory.getDataSource = getDataSource;

})(Joshfire.factory, Joshfire.datajs);



Joshfire.factory.deviceReady = function(cb) {

  var datajslib = {};
  _.each(_.flatten(Joshfire.factory.config.datasources),function(ds) {
    datajslib[ds.db+"/"+ds.col]=true;
  });

  return cb();

  var uri = "http://"+Joshfire.factory.globalConfig.DATAHOSTPORT+"/api/" + Joshfire.factory.globalConfig.DATAVERSION + "/_build?"+querystring.encode({"runtime":"nodejs","collections":JSON.stringify(_.keys(datajslib))});
  console.log("Fetching datasources at",uri);
  request({uri: uri},function(err,response,code) {
    if (err) return cb(err);
    fs.writeFile(__dirname+"/datajs_datasources.js",code,"utf-8",cb);
  });

};


exports.Joshfire = Joshfire;