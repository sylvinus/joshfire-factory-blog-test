
/**
 * @fileoverview Static HTML content data source that outputs a blog post.
 *
 * The datasource is intended to match a regular CMS blog post (e.g. what
 * a Wordpress user sees when he/she edits a post or a page)
 *
 * The datasource returns a feed with only one item.
 */

/*global define*/

define('databases/static/post',[], function () {

  return {
    /**
     * Description of the datasource for the factory
     */
    desc: {
      "options": {
        "schema": {
          "name": {
            "type": "string",
            "title": "Title"
          },
          "articleBody": {
            "type": "string",
            "title": "Content"
          }
        },
        "form": [
          "name",
          {
            "type": "wysihtml5",
            "key": "articleBody"
          }
        ]
      },
      "runAtClient": "force",
      "outputType" : "BlogPosting"
    },


    /**
     * Fetches the HTML content of the blog post based on the
     * parameters of the datasource.
     *
     * In practice, the function merely returns the parameters but this
     * function could be overwritten in a derivated datasource to fetch
     * the actual content from a remote source.
     *
     * @function
     * @param {Object} query Query parameters. Must define a 'name' and
     *  'articleBody' properties (or one of them)
     * @param {function(Object, Object)} callback Callback function.
     *   Returns a text.
     */
    fetch: function (query, callback) {
      var filter = (query && query.filter) ? query.filter : {};

      if (!filter.name && !filter.articleBody) {
        return callback('Page is empty');
      }

      // Note additional properties that caller might have set in the query
      // filter will be stored in the object returned. That's on purpose to
      // let templates append additional properties on top of the name and
      // articleBody properties.
      return callback(null, filter);
    },


    /**
     * Normalizes the blog post returned by the fetch method.
     *
     * In practice, the function simply clones the content
     *
     * @function
     * @param {Object} data The data that was received, a JSON object that
     *  should have a name and an articleBody properties, but which may
     *  define additional properties if needed.
     * @param {Object} query Query parameters (which could include filtering options)
     * @param {function(Object, Object)} callback Callback function.
     *   The second argument of the callback is an object with an "entries" property
     *   that contains the list of items normalized according to the schema.org hierarchy.
     */
    process: function (data, query, callback) {
      // Clone the filter so that further changes don't affect the
      // original datasource's parameters.
      var post = JSON.parse(JSON.stringify(data));

      // Set the output type, unless the caller already chose to set
      // it to something else.
      post['@type'] = post['@type'] || 'BlogPosting';

      // Return the post as a single entry feed
      return callback(null, {
        entries: [
          post
        ]
      });
    },


    /**
     * Fetches and normalizes the data.
     * @function
     * @param {Object} query Query parameters. Feed specific object.
     * @param {function(Object, Object)} callback Callback function.
     *   receives the error or the normalized feed.
     */
    find: function (query, callback) {
      // Implementation note: same code as example/news
      var self = this;
      self.fetch(query, function (err, data) {
        if (err) {
          return callback(err, null);
        }
        else {
          self.process(data, query, function (err, convertedData) {
            return callback(err, convertedData);
          });
        }
      });
    }
  };
});
/* RequireJS plugin */
define('datajslib',{
    normalize: function (name, normalize) {
        if (name=="jquery" || name.match(/^runtime\-(nodejs|browser)/)) return name;
        console.log("LIB",name,normalize("runtime-nodejs/"+name));
        return normalize("runtime-nodejs/"+name);
    },
    load: function (name, req, load, config) {
        //req has the same API as require().
        req([name], function (value) {
            load(value);
        });
    }
});
/**
 * @fileoverview The JSON Form "defaults" library exposes a setDefaultValues
 * method that extends the object passed as argument so that it includes
 * values for all required fields of the JSON schema it is to follow that
 * define a default value.
 *
 * The library is called to complete the configuration settings of a template in
 * the Factory and to complete datasource settings.
 *
 * The library is useless if the settings have already been validated against the
 * schema using the JSON schema validator (typically, provided the validator is
 * loaded, submitting the form created from the schema will raise an error when
 * required properties are missing).
 *
 * Note the library does not validate the created object, it merely sets missing
 * values to the default values specified in the schema. All other values may
 * be invalid.
 *
 * Nota Bene:
 * - in data-joshfire, the runtime/nodejs/lib/jsonform-defaults.js file is a
 * symbolic link to the jsonform submodule in deps/jsonform
 * - in platform-joshfire, the server/public/js/libs/jsonform-defaults.js file
 * is a symbolic link to the jsonform submodule in deps/jsonform
 */

(function () {
  // Establish the root object:
  // that's "window" in the browser, "global" in node.js
  var root = this;

  /**
   * Sets default values, ensuring that fields defined as "required" in the
   * schema appear in the object. If missing, the hierarchy that leads to
   * a required key is automatically created.
   *
   * @function
   * @param {Object} obj The object to complete with default values according
   *  to the schema
   * @param {Object} schema The JSON schema that the object follows
   * @param {boolean} includeOptionalValues Include default values for fields
   *  that are not "required"
   * @return {Object} The completed object (same instance as obj)
   */
  var setDefaultValues = function (obj, schema, includeOptionalValues) {
    if (!obj || !schema) return obj;

    // Inner function that parses the schema recursively to build a flat
    // list of defaults
    var defaults = {};
    var extractDefaultValues = function (schemaItem, path) {
      var properties = null;
      var child = null;

      if (!schemaItem || (schemaItem !== Object(schemaItem))) return null;

      if (schemaItem.required) {
        // Item is required
        if (schemaItem['default']) {
          // Item defines a default value, let's use it,
          // no need to continue in that case, we have the default value
          // for the whole subtree starting at schemaItem.
          defaults[path] = schemaItem['default'];
          return;
        }
        else if ((schemaItem.type === 'object') || schemaItem.properties) {
          // Item is a required object
          defaults[path] = {};
        }
        else if ((schemaItem.type === 'array') || schemaItem.items) {
          // Item is a required array
          defaults[path] = [];
        }
        else if (schemaItem.type === 'string') {
          defaults[path] = '';
        }
        else if ((schemaItem.type === 'number') || (schemaItem.type === 'integer')) {
          defaults[path] = 0;
        }
        else if (schemaItem.type === 'boolean') {
          defaults[path] = false;
        }
        else {
          // Unknown type, use an empty object by default
          defaults[path] = {};
        }
      }
      else if (schemaItem['default'] && includeOptionalValues) {
        // Item is not required but defines a default value and the
        // include optional values flag is set, so let's use it.
        // No need to continue in that case, we have the default value
        // for the whole subtree starting at schemaItem.
        defaults[path] = schemaItem['default'];
        return;
      }

      // Parse schema item's properties recursively
      properties = schemaItem.properties;
      if (properties) {
        for (var key in properties) {
          if (properties.hasOwnProperty(key)) {
            extractDefaultValues(properties[key], path + '.' + key);
          }
        }
      }

      // Parse schema item's children recursively
      if (schemaItem.items) {
        // Items may be a single item or an array composed of only one item
        child = schemaItem.items;
        if (_isArray(child)) {
          child = child[0];
        }

        extractDefaultValues(child, path + '[]');
      }
    };

    // Build a flat list of default values
    extractDefaultValues(schema, '');

    // Ensure the object's default values are correctly set
    for (var key in defaults) {
      if (defaults.hasOwnProperty(key)) {
        setObjKey(obj, key, defaults[key]);
      }
    }
  };


  /**
   * Sets the key identified by a path selector to the given value.
   *
   * Levels in the path are separated by a dot. Array items are marked
   * with []. For instance:
   *  foo.bar[].baz
   *
   * The hierarchy is automatically created if it does not exist yet.
   *
   * Default values are added to all array items. Array items are not
   * automatically created if they do not exist (in particular, the
   * minItems constraint is not enforced)
   *
   * @function
   * @param {Object} obj The object to build
   * @param {String} key The path to the key to set where each level
   *  is separated by a dot, and array items are flagged with [x].
   * @param {Object} value The value to set, may be of any type.
   */
  var setObjKey = function (obj, key, value) {
    var keyparts = key.split('.');

    // Recursive version of setObjKey
    var recSetObjKey = function (obj, keyparts, value) {
      var arrayMatch = null;
      var reArray = /\[([0-9]*)\]$/;
      var subkey = keyparts.shift();
      var idx = 0;

      if (keyparts.length > 0) {
        // Not the end yet, build the hierarchy
        arrayMatch = subkey.match(reArray);
        if (arrayMatch) {
          // Subkey is part of an array, check all existing array items
          // (no array item created if they do not exist)
          subkey = subkey.replace(reArray, '');
          obj = obj[subkey];
          if (!obj || !_isArray(obj)) {
            return;
          }
          for (var k = 0; k < obj.length; k++) {
            recSetObjKey(obj[k], keyparts, value);
          }
          return;
        }
        else {
          // "Normal" subkey
          if (typeof obj[subkey] !== 'object') {
            obj[subkey] = {};
          }
          obj = obj[subkey];
          recSetObjKey(obj, keyparts, value);
        }
      }
      else {
        // Last key, time to set the value, unless already defined
        arrayMatch = subkey.match(reArray);
        if (arrayMatch) {
          subkey = subkey.replace(reArray, '');
          if (!_isArray(obj[subkey])) {
            obj[subkey] = [];
          }
          idx = parseInt(arrayMatch[1], 10);
          if (!obj[subkey][idx]) {
            obj[subkey][idx] = value;
          }
        }
        else if (!obj[subkey]) {
          obj[subkey] = value;
        }
      }
    };

    // Skip first item if empty (key starts with a '.')
    if (!keyparts[0]) {
      keyparts.shift();
    }
    recSetObjKey(obj, keyparts, value);
  };

  // Taken from Underscore.js (not included to save bytes)
  var _isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) == '[object Array]';
  };


  // Export the code as:
  //  1. an AMD module (the "define" method exists in that case), or
  //  2. a node.js module ("module.exports" is defined in that case), or
  //  3. a global JSONForm object (using "root")
  if (typeof define !== 'undefined') {
    // AMD module
    define('runtime-nodejs/jsonform-defaults',[], function () {
      return {
        setDefaultValues: setDefaultValues
      };
    });
  }
  else if ((typeof module !== 'undefined') && module.exports) {
    // Node.js module
    module.exports = {
      setDefaultValues: setDefaultValues
    };
  }
  else {
    // Export the function to the global context, using a "string" for
    // Google Closure Compiler "advanced" mode
    // (not sure why it's needed, done by Underscore)
    root['JSONForm'] = root['JSONForm'] || {};
    root['JSONForm'].setDefaultValues = setDefaultValues;
  }
})();
define('runtime-nodejs/http',["request"], function (request) {

  // Used to generate unique number for JSON callback function name
  var callbackSeed = (new Date()).getTime();
  
  return {
    "request": function (params, callback) {
      // Ensure parameters are correct
      if (!params || !params.url) {
        return callback("No URI to request");
      }

      // Ensure URL starts with http:// or https://
      if (params.url.search(/^http(s?)\:\/\//i) === -1) {
        return callback("URI to request does not start with 'http://' or 'https://'.");
      }

      // Convert Jquery style params ($.ajax) to an options array that is
      // suitable for the "request" library.
      var rq = {
        method: params.type ? params.type : "GET",
        uri: params.url,
        headers: {
          'User-Agent': 'Joshzilla/1.0',
          'Accept': '*/*',
          'Accept-Charset': 'utf-8'
        }
      };

      if (params.data) {
        rq.body = params.data; //serialize?
        rq.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
      else {
        rq.headers['Content-Length'] = '0';
      }

      // Setting callback parameter when JSONP requested,
      // using user-defined parameters or default conventions
      // (the hash mimics the one generated in jQuery)
      if (params.dataType === 'jsonp') {
        var jsonp = params.jsonp || "callback";
        var jsonCallback = params.jsonCallback ||
          "datajslib_" + (Math.random().toString()).replace(/\D/g, "") + ( callbackSeed++ );
        rq.uri += (/\?/.test(rq.uri) ? "&" : "?") + jsonp + "=" + jsonCallback;
      }

      // Send the HTTP request and call the callback
      // function with the response when we have it.
      request(rq, function (error, response, body) {
        if (error) {
          return callback(error);
        }

        if (params.dataType == 'json' ||
          params.dataType == 'text json' ||
          params.dataType == 'jsonp') {
          var tmp_json;

          try {
            // Strip out JSONP function
            if (params.dataType === "jsonp") {
              body = body.replace(/\)$/,"").replace(/\)\;$/,"");
              body = body.replace(/^[^\(]+\(/,"");
            }
            tmp_json = JSON.parse(body);
          } catch (e) {
            // console.warn('Invalid JSON received: ', body);
            return callback("Could not parse the response received as JSON.\n" +
              "Possible causes:\n" +
              "- the provider did not wrap the object in a JSONP function" +
              " (ensure the jsonp parameter is the right one)\n" +
              "- the JSON is invalid (not much to do in that case)\n" +
              "Exception triggered: " + e);
          }
          return callback(null, tmp_json);
        } else {
          return callback(null, body);
        }
      });

      return true;
    }
  };

});

/**
 * @fileoverview Provides a method to decode a string that contains HTML
 * entities. The method can also be used with XML encoded strings.
 * Given "&lt;p&gt;Jennifer &amp; Jonathan&lt;/p&gt;", the decode method
 * returns "<p>Jennifer & Jonathan</p>".
 *
 * The method supports both named entities and numeric entities such as
 * "&#233;".
 */
/*global define*/

define('runtime-nodejs/htmlentities',[], function () {
  /**
   * Regular expression to extract numeric and named entities
   * @constant
   */
  var entityRe = /&(#?)(\d{1,5}|\w{1,8});/gm;

  /**
   * Known named entities hash table.
   * TODO: check that the list below is complete.
   * @constant
   */
  var namedEntities = {
    "&nbsp;": " ",
    "&iexcl;": "¡",
    "&cent;": "¢",
    "&pound;": "£",
    "&curren;": "¤",
    "&yen;": "¥",
    "&brvbar;": "¦",
    "&sect;": "§",
    "&uml;": "¨",
    "&copy;": "©",
    "&ordf;": "ª",
    "&laquo;": "«",
    "&not;": "¬",
    "&shy;": "",
    "&reg;": "®",
    "&macr;": "¯",
    "&deg;": "°",
    "&plusmn;": "±",
    "&sup2;": "²",
    "&sup3;": "³",
    "&acute;": "´",
    "&micro;": "µ",
    "&para;": "¶",
    "&middot;": "·",
    "&cedil;": "¸",
    "&sup1;": "¹",
    "&ordm;": "º",
    "&raquo;": "»",
    "&frac14;": "¼",
    "&frac12;": "½",
    "&frac34;": "¾",
    "&iquest;": "¿",
    "&Agrave;": "À",
    "&Aacute;": "Á",
    "&Acirc;": "Â",
    "&Atilde;": "Ã",
    "&Auml;": "Ä",
    "&Aring;": "Å",
    "&AElig;": "Æ",
    "&Ccedil;": "Ç",
    "&Egrave;": "È",
    "&Eacute;": "É",
    "&Ecirc;": "Ê",
    "&Euml;": "Ë",
    "&Igrave;": "Ì",
    "&Iacute;": "Í",
    "&Icirc;": "Î",
    "&Iuml;": "Ï",
    "&ETH;": "Ð",
    "&Ntilde;": "Ñ",
    "&Ograve;": "Ò",
    "&Oacute;": "Ó",
    "&Ocirc;": "Ô",
    "&Otilde;": "Õ",
    "&Ouml;": "Ö",
    "&times;": "×",
    "&Oslash;": "Ø",
    "&Ugrave;": "Ù",
    "&Uacute;": "Ú",
    "&Ucirc;": "Û",
    "&Uuml;": "Ü",
    "&Yacute;": "Ý",
    "&THORN;": "Þ",
    "&szlig;": "ß",
    "&agrave;": "à",
    "&aacute;": "á",
    "&acirc;": "â",
    "&atilde;": "ã",
    "&auml;": "ä",
    "&aring;": "å",
    "&aelig;": "æ",
    "&ccedil;": "ç",
    "&egrave;": "è",
    "&eacute;": "é",
    "&ecirc;": "ê",
    "&euml;": "ë",
    "&igrave;": "ì",
    "&iacute;": "í",
    "&icirc;": "î",
    "&iuml;": "ï",
    "&eth;": "ð",
    "&ntilde;": "ñ",
    "&ograve;": "ò",
    "&oacute;": "ó",
    "&ocirc;": "ô",
    "&otilde;": "õ",
    "&ouml;": "ö",
    "&divide;": "÷",
    "&oslash;": "ø",
    "&ugrave;": "ù",
    "&uacute;": "ú",
    "&ucirc;": "û",
    "&uuml;": "ü",
    "&yacute;": "ý",
    "&thorn;": "þ",
    "&yuml;": "ÿ",
    "&fnof;": "ƒ",
    "&Alpha;": "Α",
    "&Beta;": "Β",
    "&Gamma;": "Γ",
    "&Delta;": "Δ",
    "&Epsilon;": "Ε",
    "&Zeta;": "Ζ",
    "&Eta;": "Η",
    "&Theta;": "Θ",
    "&Iota;": "Ι",
    "&Kappa;": "Κ",
    "&Lambda;": "Λ",
    "&Mu;": "Μ",
    "&Nu;": "Ν",
    "&Xi;": "Ξ",
    "&Omicron;": "Ο",
    "&Pi;": "Π",
    "&Rho;": "Ρ",
    "&Sigma;": "Σ",
    "&Tau;": "Τ",
    "&Upsilon;": "Υ",
    "&Phi;": "Φ",
    "&Chi;": "Χ",
    "&Psi;": "Ψ",
    "&Omega;": "Ω",
    "&alpha;": "α",
    "&beta;": "β",
    "&gamma;": "γ",
    "&delta;": "δ",
    "&epsilon;": "ε",
    "&zeta;": "ζ",
    "&eta;": "η",
    "&theta;": "θ",
    "&iota;": "ι",
    "&kappa;": "κ",
    "&lambda;": "λ",
    "&mu;": "μ",
    "&nu;": "ν",
    "&xi;": "ξ",
    "&omicron;": "ο",
    "&pi;": "π",
    "&rho;": "ρ",
    "&sigmaf;": "ς",
    "&sigma;": "σ",
    "&tau;": "τ",
    "&upsilon;": "υ",
    "&phi;": "φ",
    "&chi;": "χ",
    "&psi;": "ψ",
    "&omega;": "ω",
    "&thetasym;": "ϑ",
    "&upsih;": "ϒ",
    "&piv;": "ϖ",
    "&bull;": "•",
    "&hellip;": "…",
    "&prime;": "′",
    "&Prime;": "″",
    "&oline;": "‾",
    "&frasl;": "⁄",
    "&weierp;": "℘",
    "&image;": "ℑ",
    "&real;": "ℜ",
    "&trade;": "™",
    "&alefsym;": "ℵ",
    "&larr;": "←",
    "&uarr;": "↑",
    "&rarr;": "→",
    "&darr;": "↓",
    "&harr;": "↔",
    "&crarr;": "↵",
    "&lArr;": "⇐",
    "&uArr;": "⇑",
    "&rArr;": "⇒",
    "&dArr;": "⇓",
    "&hArr;": "⇔",
    "&forall;": "∀",
    "&part;": "∂",
    "&exist;": "∃",
    "&empty;": "∅",
    "&nabla;": "∇",
    "&isin;": "∈",
    "&notin;": "∉",
    "&ni;": "∋",
    "&prod;": "∏",
    "&sum;": "∑",
    "&minus;": "−",
    "&lowast;": "∗",
    "&radic;": "√",
    "&prop;": "∝",
    "&infin;": "∞",
    "&ang;": "∠",
    "&and;": "∧",
    "&or;": "∨",
    "&cap;": "∩",
    "&cup;": "∪",
    "&int;": "∫",
    "&there4;": "∴",
    "&sim;": "∼",
    "&cong;": "≅",
    "&asymp;": "≈",
    "&ne;": "≠",
    "&equiv;": "≡",
    "&le;": "≤",
    "&ge;": "≥",
    "&sub;": "⊂",
    "&sup;": "⊃",
    "&nsub;": "⊄",
    "&sube;": "⊆",
    "&supe;": "⊇",
    "&oplus;": "⊕",
    "&otimes;": "⊗",
    "&perp;": "⊥",
    "&sdot;": "⋅",
    "&lceil;": "⌈",
    "&rceil;": "⌉",
    "&lfloor;": "⌊",
    "&rfloor;": "⌋",
    "&lang;": "〈",
    "&rang;": "〉",
    "&loz;": "◊",
    "&spades;": "♠",
    "&clubs;": "♣",
    "&hearts;": "♥",
    "&diams;": "♦",
    "&quot;": "\"",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&OElig;": "Œ",
    "&oelig;": "œ",
    "&Scaron;": "Š",
    "&scaron;": "š",
    "&Yuml;": "Ÿ",
    "&circ;": "ˆ",
    "&tilde;": "˜",
    "&ensp;": " ",
    "&emsp;": " ",
    "&thinsp;": " ",
    "&zwnj;": "‌",
    "&zwj;": "‍",
    "&lrm;": "‎",
    "&rlm;": "‏",
    "&ndash;": "–",
    "&mdash;": "—",
    "&lsquo;": "‘",
    "&rsquo;": "’",
    "&sbquo;": "‚",
    "&ldquo;": "“",
    "&rdquo;": "”",
    "&bdquo;": "„",
    "&dagger;": "†",
    "&Dagger;": "‡",
    "&permil;": "‰",
    "&lsaquo;": "‹",
    "&rsaquo;": "›",
    "&euro;": "€"
  };

  return {
    /**
     * Replaces named and numeric entities in the given string with the
     * characters they represent.
     * @function
     * @param {string} str String to decode
     * @returns {string} Decoded string, all numeric and named entities
     *   replaced with corresponding characters. Unknown entities are
     *   removed from the returned string.
     */
    decode: function (str) {
      if (!str) {
        return null;
      }

      return str.replace(entityRe, function (entity) {
        var num = null;

        if (entity.charAt(1) === '#') {
          // Numeric entity, replace by the corresponding character
          if (entity.charAt(2) === 'x') {
            return String.fromCharCode(parseInt(entity.substring(3), 16));
          }
          else {
            return String.fromCharCode(parseInt(entity.substring(2), 10));
          }
        }
        else {
          // Named entity, search in the list
          return namedEntities[entity] || "";
        }
      });
    }
  };
});
/**
 * @fileoverview A forgiving HTML/XML/RSS parser written in JS for both
 * the browser and NodeJS.
 *
 * Original code:
 * https://github.com/tautologistics/node-htmlparser
 * v1.7.2
 *
 * Updates done by tidoust for Joshfire:
 * - code wrapped in a "define" module
 * - HTML named entities correctly supported
 * - CDATA sections handled correctly
 *
 * License
 * -------
 * Copyright 2010, Chris Winberry <chris@winberry.net>. All rights reserved.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

define('runtime-nodejs/htmlparser',["datajslib!htmlentities"], function (htmlentities) {

return (function () {

var _exports = {};


//Types of elements found in the DOM
var ElementType = {
	  Text: "text" //Plain text
	, Directive: "directive" //Special tag < !...>
	, Comment: "comment" //Special tag < !--...- ->
	, Script: "script" //Special tag < script>...< /script>
	, Style: "style" //Special tag < style>...< /style>
	, Tag: "tag" //Any tag that isn't special
}

function Parser (handler, options) {
	this._options = options ? options : { };
	if (this._options.includeLocation == undefined) {
		this._options.includeLocation = false; //Do not track element position in document by default
	}

	this.validateHandler(handler);
	this._handler = handler;
	this.reset();
}

	//**"Static"**//
	//Regular expressions used for cleaning up and parsing (stateless)
	Parser._reTrim = /(^\s+|\s+$)/g; //Trim leading/trailing whitespace
	Parser._reTrimComment = /(^\!--|--$)/g; //Remove comment tag markup from comment contents
	Parser._reWhitespace = /\s/g; //Used to find any whitespace to split on
	Parser._reTagName = /^\s*(\/?)\s*([^\s\/]+)/; //Used to find the tag name for an element

	//Regular expressions used for parsing (stateful)
	Parser._reAttrib = //Find attributes in a tag
		/([^=<>\"\'\s]+)\s*=\s*"([^"]*)"|([^=<>\"\'\s]+)\s*=\s*'([^']*)'|([^=<>\"\'\s]+)\s*=\s*([^'"\s]+)|([^=<>\"\'\s\/]+)/g;
	Parser._reTags = /[\<\>]/g; //Find tag markers
	Parser._reCDEnd = /\]\]\>/g; //End of a CDATA section

	//**Public**//
	//Methods//
	//Parses a complete HTML and pushes it to the handler
	Parser.prototype.parseComplete = function Parser$parseComplete (data) {
		this.reset();
		this.parseChunk(data);
		this.done();
	}

	//Parses a piece of an HTML document
	Parser.prototype.parseChunk = function Parser$parseChunk (data) {
		if (this._done)
			this.handleError(new Error("Attempted to parse chunk after parsing already done"));
		this._buffer += data; //FIXME: this can be a bottleneck
		this.parseTags();
	}

	//Tells the parser that the HTML being parsed is complete
	Parser.prototype.done = function Parser$done () {
		if (this._done)
			return;
		this._done = true;
	
		//Push any unparsed text into a final element in the element list
		if (this._buffer.length) {
			var rawData = this._buffer;
			this._buffer = "";
			var element = {
				  raw: rawData
				, data: (this._parseState == ElementType.Text) ? htmlentities.decode(rawData) : rawData.replace(Parser._reTrim, "")
				, type: this._parseState
				};
			if (this._parseState == ElementType.Tag || this._parseState == ElementType.Script || this._parseState == ElementType.Style)
				element.name = this.parseTagName(element.data);
			this.parseAttribs(element);
			this._elements.push(element);
		}
	
		this.writeHandler();
		this._handler.done();
	}

	//Resets the parser to a blank state, ready to parse a new HTML document
	Parser.prototype.reset = function Parser$reset () {
		this._buffer = "";
		this._done = false;
		this._elements = [];
		this._elementsCurrent = 0;
		this._current = 0;
		this._next = 0;
		this._location = {
			  row: 0
			, col: 0
			, charOffset: 0
			, inBuffer: 0
		};
		this._parseState = ElementType.Text;
		this._prevTagSep = '';
		this._tagStack = [];
		this._handler.reset();
	}
	
	//**Private**//
	//Properties//
	Parser.prototype._options = null; //Parser options for how to behave
	Parser.prototype._handler = null; //Handler for parsed elements
	Parser.prototype._buffer = null; //Buffer of unparsed data
	Parser.prototype._done = false; //Flag indicating whether parsing is done
	Parser.prototype._elements =  null; //Array of parsed elements
	Parser.prototype._elementsCurrent = 0; //Pointer to last element in _elements that has been processed
	Parser.prototype._current = 0; //Position in data that has already been parsed
	Parser.prototype._next = 0; //Position in data of the next tag marker (<>)
	Parser.prototype._location = null; //Position tracking for elements in a stream
	Parser.prototype._parseState = ElementType.Text; //Current type of element being parsed
	Parser.prototype._prevTagSep = ''; //Previous tag marker found
	//Stack of element types previously encountered; keeps track of when
	//parsing occurs inside a script/comment/style tag
	Parser.prototype._tagStack = null;

	//Methods//
	//Takes an array of elements and parses any found attributes
	Parser.prototype.parseTagAttribs = function Parser$parseTagAttribs (elements) {
		var idxEnd = elements.length;
		var idx = 0;
	
		while (idx < idxEnd) {
			var element = elements[idx++];
			if (element.type == ElementType.Tag || element.type == ElementType.Script || element.type == ElementType.style)
				this.parseAttribs(element);
		}
	
		return(elements);
	}

	//Takes an element and adds an "attribs" property for any element attributes found 
	Parser.prototype.parseAttribs = function Parser$parseAttribs (element) {
		//Only parse attributes for tags
		if (element.type != ElementType.Script && element.type != ElementType.Style && element.type != ElementType.Tag)
			return;
	
		var tagName = element.data.split(Parser._reWhitespace, 1)[0];
		var attribRaw = element.data.substring(tagName.length);
		if (attribRaw.length < 1)
			return;
	
		var match;
		Parser._reAttrib.lastIndex = 0;
		while (match = Parser._reAttrib.exec(attribRaw)) {
			if (element.attribs == undefined)
				element.attribs = {};
	
			if (typeof match[1] == "string" && match[1].length) {
				// Attribute with quoted value
				element.attribs[match[1]] = htmlentities.decode(match[2]);
			} else if (typeof match[3] == "string" && match[3].length) {
				// Attribute with single-quoted value
				element.attribs[match[3].toString()] = htmlentities.decode(match[4].toString());
			} else if (typeof match[5] == "string" && match[5].length) {
				// Attribue with unquoted value
				element.attribs[match[5]] = htmlentities.decode(match[6]);
			} else if (typeof match[7] == "string" && match[7].length) {
				// Attribute with no value
				element.attribs[match[7]] = match[7];
			}
		}
	}

	//Extracts the base tag name from the data value of an element
	Parser.prototype.parseTagName = function Parser$parseTagName (data) {
		if (data == null || data == "")
			return("");
		var match = Parser._reTagName.exec(data);
		if (!match)
			return("");
		return((match[1] ? "/" : "") + match[2]);
	}

	//Parses through HTML text and returns an array of found elements
	//I admit, this function is rather large but splitting up had an noticeable impact on speed
	Parser.prototype.parseTags = function Parser$parseTags () {
		var bufferEnd = this._buffer.length - 1;
		while (Parser._reTags.test(this._buffer)) {
			this._next = Parser._reTags.lastIndex - 1;
			var tagSep = this._buffer.charAt(this._next); //The currently found tag marker
			var rawData = this._buffer.substring(this._current, this._next); //The next chunk of data to parse
			//console.log("current", this._current, "rawData", rawData, "next", this._next, "tag", tagSep, "\n");
	
			//A new element to eventually be appended to the element list
			var element = {
				  raw: rawData
				, data: (this._parseState == ElementType.Text) ? rawData : rawData.replace(Parser._reTrim, "")
				, type: this._parseState
			};
	
			var elementName = this.parseTagName(element.data);
	
			//This section inspects the current tag stack and modifies the current
			//element if we're actually parsing a special area (script/comment/style tag)
			if (this._tagStack.length) { //We're parsing inside a script/comment/style tag
				if (this._tagStack[this._tagStack.length - 1] == ElementType.Script) { //We're currently in a script tag
					if (elementName == "/script") //Actually, we're no longer in a script tag, so pop it off the stack
						this._tagStack.pop();
					else { //Not a closing script tag
						if (element.raw.indexOf("!--") != 0) { //Make sure we're not in a comment
							//All data from here to script close is now a text element
							element.type = ElementType.Text;
							//If the previous element is text, append the current text to it
							if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Text) {
								var prevElement = this._elements[this._elements.length - 1];
								prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep + element.raw;
								element.raw = element.data = ""; //This causes the current element to not be added to the element list
							}
						}
					}
				}
				else if (this._tagStack[this._tagStack.length - 1] == ElementType.Style) { //We're currently in a style tag
					if (elementName == "/style") //Actually, we're no longer in a style tag, so pop it off the stack
						this._tagStack.pop();
					else {
						if (element.raw.indexOf("!--") != 0) { //Make sure we're not in a comment
							//All data from here to style close is now a text element
							element.type = ElementType.Text;
							//If the previous element is text, append the current text to it
							if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Text) {
								var prevElement = this._elements[this._elements.length - 1];
								if (element.raw != "") {
									prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep + element.raw;
									element.raw = element.data = ""; //This causes the current element to not be added to the element list
								} else { //Element is empty, so just append the last tag marker found
									prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep;
								}
							} else { //The previous element was not text
								if (element.raw != "") {
									element.raw = element.data = element.raw;
								}
							}
						}
					}
				}
				else if (this._tagStack[this._tagStack.length - 1] == ElementType.Comment) { //We're currently in a comment tag
					var rawLen = element.raw.length;
					if (element.raw.charAt(rawLen - 2) == "-" && element.raw.charAt(rawLen - 1) == "-" && tagSep == ">") {
						//Actually, we're no longer in a style tag, so pop it off the stack
						this._tagStack.pop();
						//If the previous element is a comment, append the current text to it
						if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Comment) {
							var prevElement = this._elements[this._elements.length - 1];
							prevElement.raw = prevElement.data = (prevElement.raw + element.raw).replace(Parser._reTrimComment, "");
							element.raw = element.data = ""; //This causes the current element to not be added to the element list
							element.type = ElementType.Text;
						}
						else //Previous element not a comment
							element.type = ElementType.Comment; //Change the current element's type to a comment
					}
					else { //Still in a comment tag
						element.type = ElementType.Comment;
						//If the previous element is a comment, append the current text to it
						if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Comment) {
							var prevElement = this._elements[this._elements.length - 1];
							prevElement.raw = prevElement.data = prevElement.raw + element.raw + tagSep;
							element.raw = element.data = ""; //This causes the current element to not be added to the element list
							element.type = ElementType.Text;
						}
						else
							element.raw = element.data = element.raw + tagSep;
					}
				}
			}
	
			//Processing of non-special tags
			if (element.type == ElementType.Tag) {
				element.name = elementName;
				
				if (element.raw.indexOf("!--") == 0) { //This tag is really comment
					element.type = ElementType.Comment;
					delete element["name"];
					var rawLen = element.raw.length;
					//Check if the comment is terminated in the current element
					if (element.raw.charAt(rawLen - 1) == "-" && element.raw.charAt(rawLen - 2) == "-" && tagSep == ">")
						element.raw = element.data = element.raw.replace(Parser._reTrimComment, "");
					else { //It's not so push the comment onto the tag stack
						element.raw += tagSep;
						element.decoded = true;
						this._tagStack.push(ElementType.Comment);
					}
				}
				else if (element.raw.indexOf("!") == 0 || element.raw.indexOf("?") == 0) {
					if (element.raw.indexOf("![CDATA[") === 0) {
						// Special handling for this section which typically contains
						// unescaped '<' and '>' characters. The end of the section is
						// identified by the three character long "]]>" sequence.
						this._current += "![CDATA[".length;
						Parser._reCDEnd.lastIndex = this._current;
						if (Parser._reCDEnd.test(this._buffer)) {
							this._next = Parser._reCDEnd.lastIndex - 1;
							tagSep = this._buffer.charAt(this._next);
							rawData = this._buffer.substring(this._current, this._next - 2);
						}
						else {
							rawData = "";
						}
						delete element.name;
						element.type = ElementType.Text;
						element.raw = rawData;
						element.data = element.raw;
						element.decoded = true;

						// Ensure we skip the CDATA section for tags parsing
						Parser._reTags.lastIndex = Parser._reCDEnd.lastIndex;
						this._next = Parser._reTags.lastIndex - 1;
						tagSep = this._buffer.charAt(this._next);
					}
					else {
						element.type = ElementType.Directive;
					}
				}
				else if (element.name == "script") {
					element.type = ElementType.Script;
					//Special tag, push onto the tag stack if not terminated
					if (element.data.charAt(element.data.length - 1) != "/")
						this._tagStack.push(ElementType.Script);
				}
				else if (element.name == "/script")
					element.type = ElementType.Script;
				else if (element.name == "style") {
					element.type = ElementType.Style;
					//Special tag, push onto the tag stack if not terminated
					if (element.data.charAt(element.data.length - 1) != "/")
						this._tagStack.push(ElementType.Style);
				}
				else if (element.name == "/style")
					element.type = ElementType.Style;
				if (element.name && element.name.charAt(0) == "/")
					element.data = element.name;
			}
	
			//Add all tags and non-empty text elements to the element list
			if (element.raw != "" || element.type != ElementType.Text) {
				if (this._options.includeLocation && !element.location) {
					element.location = this.getLocation(element.type == ElementType.Tag);
				}
				if ((element.type === ElementType.Text)
					|| (element.type === ElementType.Comment)) {
					if (!element.decoded) {
						element.data = htmlentities.decode(element.data);
						element.decoded = true;
					}
				}
				this.parseAttribs(element);
				this._elements.push(element);
				//If tag self-terminates, add an explicit, separate closing tag
				if (
					element.type != ElementType.Text
					&&
					element.type != ElementType.Comment
					&&
					element.type != ElementType.Directive
					&&
					element.data.charAt(element.data.length - 1) == "/"
					)
					this._elements.push({
						  raw: "/" + element.name
						, data: "/" + element.name
						, name: "/" + element.name
						, type: element.type
					});
			}
			this._parseState = (tagSep == "<") ? ElementType.Tag : ElementType.Text;
			this._current = this._next + 1;
			this._prevTagSep = tagSep;
		}

		if (this._options.includeLocation) {
			this.getLocation();
			this._location.row += this._location.inBuffer;
			this._location.inBuffer = 0;
			this._location.charOffset = 0;
		}
		this._buffer = (this._current <= bufferEnd) ? this._buffer.substring(this._current) : "";
		this._current = 0;
	
		this.writeHandler();
	}

	Parser.prototype.getLocation = function Parser$getLocation (startTag) {
		var c,
			l = this._location,
			end = this._current - (startTag ? 1 : 0),
			chunk = startTag && l.charOffset == 0 && this._current == 0;
		
		for (; l.charOffset < end; l.charOffset++) {
			c = this._buffer.charAt(l.charOffset);
			if (c == '\n') {
				l.inBuffer++;
				l.col = 0;
			} else if (c != '\r') {
				l.col++;
			}
		}
		return {
			  line: l.row + l.inBuffer + 1
			, col: l.col + (chunk ? 0: 1)
		};
	}

	//Checks the handler to make it is an object with the right "interface"
	Parser.prototype.validateHandler = function Parser$validateHandler (handler) {
		if ((typeof handler) != "object")
			throw new Error("Handler is not an object");
		if ((typeof handler.reset) != "function")
			throw new Error("Handler method 'reset' is invalid");
		if ((typeof handler.done) != "function")
			throw new Error("Handler method 'done' is invalid");
		if ((typeof handler.writeTag) != "function")
			throw new Error("Handler method 'writeTag' is invalid");
		if ((typeof handler.writeText) != "function")
			throw new Error("Handler method 'writeText' is invalid");
		if ((typeof handler.writeComment) != "function")
			throw new Error("Handler method 'writeComment' is invalid");
		if ((typeof handler.writeDirective) != "function")
			throw new Error("Handler method 'writeDirective' is invalid");
	}

	//Writes parsed elements out to the handler
	Parser.prototype.writeHandler = function Parser$writeHandler (forceFlush) {
		forceFlush = !!forceFlush;
		if (this._tagStack.length && !forceFlush)
			return;
		while (this._elements.length) {
			var element = this._elements.shift();
			switch (element.type) {
				case ElementType.Comment:
					this._handler.writeComment(element);
					break;
				case ElementType.Directive:
					this._handler.writeDirective(element);
					break;
				case ElementType.Text:
					this._handler.writeText(element);
					break;
				default:
					this._handler.writeTag(element);
					break;
			}
		}
	}

	Parser.prototype.handleError = function Parser$handleError (error) {
		if ((typeof this._handler.error) == "function")
			this._handler.error(error);
		else
			throw error;
	}

//TODO: make this a trully streamable handler
function RssHandler (callback) {
	RssHandler.super_.call(this, callback, { ignoreWhitespace: true, verbose: false, enforceEmptyTags: false });
}
inherits(RssHandler, DefaultHandler);

	RssHandler.prototype.done = function RssHandler$done () {
		var feed = { };
		var feedRoot;

		var found = DomUtils.getElementsByTagName(function (value) { return(value == "rss" || value == "feed"); }, this.dom, false);
		if (found.length) {
			feedRoot = found[0];
		}
		if (feedRoot) {
			if (feedRoot.name == "rss") {
				feed.type = "rss";
				feedRoot = feedRoot.children[0]; //<channel/>
				feed.id = "";
				try {
					feed.title = DomUtils.getElementsByTagName("title", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.link = DomUtils.getElementsByTagName("link", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.description = DomUtils.getElementsByTagName("description", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.updated = new Date(DomUtils.getElementsByTagName("lastBuildDate", feedRoot.children, false)[0].children[0].data);
				} catch (ex) { }
				try {
					feed.author = DomUtils.getElementsByTagName("managingEditor", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				feed.items = [];
				DomUtils.getElementsByTagName("item", feedRoot.children).forEach(function (item, index, list) {
					var entry = {};
					try {
						entry.id = DomUtils.getElementsByTagName("guid", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.title = DomUtils.getElementsByTagName("title", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.link = DomUtils.getElementsByTagName("link", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.description = DomUtils.getElementsByTagName("description", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.pubDate = new Date(DomUtils.getElementsByTagName("pubDate", item.children, false)[0].children[0].data);
					} catch (ex) { }
					feed.items.push(entry);
				});
			} else {
				feed.type = "atom";
				try {
					feed.id = DomUtils.getElementsByTagName("id", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.title = DomUtils.getElementsByTagName("title", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.link = DomUtils.getElementsByTagName("link", feedRoot.children, false)[0].attribs.href;
				} catch (ex) { }
				try {
					feed.description = DomUtils.getElementsByTagName("subtitle", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.updated = new Date(DomUtils.getElementsByTagName("updated", feedRoot.children, false)[0].children[0].data);
				} catch (ex) { }
				try {
					feed.author = DomUtils.getElementsByTagName("email", feedRoot.children, true)[0].children[0].data;
				} catch (ex) { }
				feed.items = [];
				DomUtils.getElementsByTagName("entry", feedRoot.children).forEach(function (item, index, list) {
					var entry = {};
					try {
						entry.id = DomUtils.getElementsByTagName("id", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.title = DomUtils.getElementsByTagName("title", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.link = DomUtils.getElementsByTagName("link", item.children, false)[0].attribs.href;
					} catch (ex) { }
					try {
						entry.description = DomUtils.getElementsByTagName("summary", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.pubDate = new Date(DomUtils.getElementsByTagName("updated", item.children, false)[0].children[0].data);
					} catch (ex) { }
					feed.items.push(entry);
				});
			}

			this.dom = feed;
		}
		RssHandler.super_.prototype.done.call(this);
	}

///////////////////////////////////////////////////

function DefaultHandler (callback, options) {
	this.reset();
	this._options = options ? options : { };
	if (this._options.ignoreWhitespace == undefined)
		this._options.ignoreWhitespace = false; //Keep whitespace-only text nodes
	if (this._options.verbose == undefined)
		this._options.verbose = true; //Keep data property for tags and raw property for all
	if (this._options.enforceEmptyTags == undefined)
		this._options.enforceEmptyTags = true; //Don't allow children for HTML tags defined as empty in spec
	if ((typeof callback) == "function")
		this._callback = callback;
}

	//**"Static"**//
	//HTML Tags that shouldn't contain child nodes
	DefaultHandler._emptyTags = {
		  area: 1
		, base: 1
		, basefont: 1
		, br: 1
		, col: 1
		, frame: 1
		, hr: 1
		, img: 1
		, input: 1
		, isindex: 1
		, link: 1
		, meta: 1
		, param: 1
		, embed: 1
	}
	//Regex to detect whitespace only text nodes
	DefaultHandler.reWhitespace = /^\s*$/;

	//**Public**//
	//Properties//
	DefaultHandler.prototype.dom = null; //The hierarchical object containing the parsed HTML
	//Methods//
	//Resets the handler back to starting state
	DefaultHandler.prototype.reset = function DefaultHandler$reset() {
		this.dom = [];
		this._done = false;
		this._tagStack = [];
		this._tagStack.last = function DefaultHandler$_tagStack$last () {
			return(this.length ? this[this.length - 1] : null);
		}
	}
	//Signals the handler that parsing is done
	DefaultHandler.prototype.done = function DefaultHandler$done () {
		this._done = true;
		this.handleCallback(null);
	}
	DefaultHandler.prototype.writeTag = function DefaultHandler$writeTag (element) {
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeText = function DefaultHandler$writeText (element) {
		if (this._options.ignoreWhitespace)
			if (DefaultHandler.reWhitespace.test(element.data))
				return;
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeComment = function DefaultHandler$writeComment (element) {
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeDirective = function DefaultHandler$writeDirective (element) {
		this.handleElement(element);
	}
	DefaultHandler.prototype.error = function DefaultHandler$error (error) {
		this.handleCallback(error);
	}

	//**Private**//
	//Properties//
	DefaultHandler.prototype._options = null; //Handler options for how to behave
	DefaultHandler.prototype._callback = null; //Callback to respond to when parsing done
	DefaultHandler.prototype._done = false; //Flag indicating whether handler has been notified of parsing completed
	DefaultHandler.prototype._tagStack = null; //List of parents to the currently element being processed
	//Methods//
	DefaultHandler.prototype.handleCallback = function DefaultHandler$handleCallback (error) {
			if ((typeof this._callback) != "function")
				if (error)
					throw error;
				else
					return;
			this._callback(error, this.dom);
	}
	
	DefaultHandler.prototype.isEmptyTag = function(element) {
		var name = element.name.toLowerCase();
		if (name.charAt(0) == '/') {
			name = name.substring(1);
		}
		return this._options.enforceEmptyTags && !!DefaultHandler._emptyTags[name];
	};
	
	DefaultHandler.prototype.handleElement = function DefaultHandler$handleElement (element) {
		if (this._done)
			this.handleCallback(new Error("Writing to the handler after done() called is not allowed without a reset()"));
		if (!this._options.verbose) {
//			element.raw = null; //FIXME: Not clean
			//FIXME: Serious performance problem using delete
			delete element.raw;
			if (element.type == "tag" || element.type == "script" || element.type == "style")
				delete element.data;
		}
		if (!this._tagStack.last()) { //There are no parent elements
			//If the element can be a container, add it to the tag stack and the top level list
			if (element.type != ElementType.Text && element.type != ElementType.Comment && element.type != ElementType.Directive) {
				if (element.name.charAt(0) != "/") { //Ignore closing tags that obviously don't have an opening tag
					this.dom.push(element);
					if (!this.isEmptyTag(element)) { //Don't add tags to the tag stack that can't have children
						this._tagStack.push(element);
					}
				}
			}
			else //Otherwise just add to the top level list
				this.dom.push(element);
		}
		else { //There are parent elements
			//If the element can be a container, add it as a child of the element
			//on top of the tag stack and then add it to the tag stack
			if (element.type != ElementType.Text && element.type != ElementType.Comment && element.type != ElementType.Directive) {
				if (element.name.charAt(0) == "/") {
					//This is a closing tag, scan the tagStack to find the matching opening tag
					//and pop the stack up to the opening tag's parent
					var baseName = element.name.substring(1);
					if (!this.isEmptyTag(element)) {
						var pos = this._tagStack.length - 1;
						while (pos > -1 && this._tagStack[pos--].name != baseName) { }
						if (pos > -1 || this._tagStack[0].name == baseName)
							while (pos < this._tagStack.length - 1)
								this._tagStack.pop();
					}
				}
				else { //This is not a closing tag
					if (!this._tagStack.last().children)
						this._tagStack.last().children = [];
					this._tagStack.last().children.push(element);
					if (!this.isEmptyTag(element)) //Don't add tags to the tag stack that can't have children
						this._tagStack.push(element);
				}
			}
			else { //This is not a container element
				if (!this._tagStack.last().children)
					this._tagStack.last().children = [];
				this._tagStack.last().children.push(element);
			}
		}
	}

	var DomUtils = {
		  testElement: function DomUtils$testElement (options, element) {
			if (!element) {
				return false;
			}
	
			for (var key in options) {
				if (key == "tag_name") {
					if (element.type != "tag" && element.type != "script" && element.type != "style") {
						return false;
					}
					if (!options["tag_name"](element.name)) {
						return false;
					}
				} else if (key == "tag_type") {
					if (!options["tag_type"](element.type)) {
						return false;
					}
				} else if (key == "tag_contains") {
					if (element.type != "text" && element.type != "comment" && element.type != "directive") {
						return false;
					}
					if (!options["tag_contains"](element.data)) {
						return false;
					}
				} else {
					if (!element.attribs || !options[key](element.attribs[key])) {
						return false;
					}
				}
			}
		
			return true;
		}
	
		, getElements: function DomUtils$getElements (options, currentElement, recurse, limit) {
			recurse = (recurse === undefined || recurse === null) || !!recurse;
			limit = isNaN(parseInt(limit)) ? -1 : parseInt(limit);

			if (!currentElement) {
				return([]);
			}
	
			var found = [];
			var elementList;

			function getTest (checkVal) {
				return(function (value) { return(value == checkVal); });
			}
			for (var key in options) {
				if ((typeof options[key]) != "function") {
					options[key] = getTest(options[key]);
				}
			}
	
			if (DomUtils.testElement(options, currentElement)) {
				found.push(currentElement);
			}

			if (limit >= 0 && found.length >= limit) {
				return(found);
			}

			if (recurse && currentElement.children) {
				elementList = currentElement.children;
			} else if (currentElement instanceof Array) {
				elementList = currentElement;
			} else {
				return(found);
			}
	
			for (var i = 0; i < elementList.length; i++) {
				found = found.concat(DomUtils.getElements(options, elementList[i], recurse, limit));
				if (limit >= 0 && found.length >= limit) {
					break;
				}
			}
	
			return(found);
		}
		
		, getElementById: function DomUtils$getElementById (id, currentElement, recurse) {
			var result = DomUtils.getElements({ id: id }, currentElement, recurse, 1);
			return(result.length ? result[0] : null);
		}
		
		, getElementsByTagName: function DomUtils$getElementsByTagName (name, currentElement, recurse, limit) {
			return(DomUtils.getElements({ tag_name: name }, currentElement, recurse, limit));
		}
		
		, getElementsByTagType: function DomUtils$getElementsByTagType (type, currentElement, recurse, limit) {
			return(DomUtils.getElements({ tag_type: type }, currentElement, recurse, limit));
		}
	}

	function inherits (ctor, superCtor) {
		var tempCtor = function(){};
		tempCtor.prototype = superCtor.prototype;
		ctor.super_ = superCtor;
		ctor.prototype = new tempCtor();
		ctor.prototype.constructor = ctor;
	}

_exports.Parser = Parser;

_exports.DefaultHandler = DefaultHandler;

_exports.RssHandler = RssHandler;

_exports.ElementType = ElementType;

_exports.DomUtils = DomUtils;

return _exports;

})();

});

/**
 * @fileoverview ISO8601 conversion functions.
 *
 * Original code from http://webcloud.se/log/JavaScript-and-ISO-8601/
 *
 * The code has been largely re-written because it did not parse local/UTC
 * dates quite well. In particular, strings such as "2012-02-10T00:00:00Z"
 * were parsed as local dates.
 */
define('runtime-nodejs/iso8601',[],function() {

  /**
   * Regular expression that matches an ISO8601 date
   * @private
   */
  var reDate = /^([0-9]{4})(\-([0-9]{2})(\-([0-9]{2})(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?(Z|(([\-+])([0-9]{2}):([0-9]{2})))?)?)?)?$/;

  /**
   * Regular expression that matches an ISO8601 duration
   * @private
   */
  var reDuration = /^PT([0-9]+)H([0-9]+)M([0-9]+)S$/;


  //from http://webcloud.se/log/JavaScript-and-ISO-8601/
  return {
    /**
     * Returns a Date object that matches the given ISO8601 string.
     *
     * If the string only specifies a day but not time, the string is
     * interpreted as a local date whose time is midnight. That is
     * consistent with the way dates are parsed in JavaScript:
     * https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date/parse
     *
     * @function
     * @param {string} string The ISO8601 string to parse
     * @return {Date} The date object that matches the given string,
     *  null if the incoming string is not a valid date
     */
    toDate: function (string) {
      var d = null,
        offset = 0,
        date = null,
        time = null;
      
      if (!string) {
        return null;
      }

      // Parse the string
      d = string.trim().match(reDate);
      if (!d) {
        // Not a valid date
        return null;
      }
      //console.log(d);

      // If "Z" or a timezone is specified, construct the date as a UTC date,
      // and apply the specified timezone as necessary.
      // If not, the date is to be understood as a local date, where "local"
      // means local to the system that runs the function.
      // Note that a date without time is interpreted as a UTC date whose
      // time is midnight.
      date = new Date(2010, 0, 1);
      if (d[13]) {
        // No time specified, or there's a "Z" or a timezone
        date.setUTCFullYear(d[1], 0, 1);
        date.setUTCHours(0, 0, 0, 0);
        if (d[3]) { date.setUTCMonth(d[3] - 1); }
        if (d[5]) { date.setUTCDate(d[5]); }

        if (d[7]) { date.setUTCHours(d[7]); }
        if (d[8]) { date.setUTCMinutes(d[8]); }
        if (d[10]) { date.setUTCSeconds(d[10]); }
        if (d[12]) { date.setUTCMilliseconds(Number("0." + d[12]) * 1000); }

        if (d[14]) {
          // Some timezone specified, apply the offset
          // and generate the new date
          offset = (Number(d[16]) * 60) + Number(d[17]);
          offset *= ((d[15] == '-') ? 1 : -1);

          time = date.getTime() + (offset * 60 * 1000);
          date.setTime(time);
        }
      }
      else {
        // No time, or time but no timezone, interpret the date as a local date
        date.setFullYear(d[1], 0, 1, 0, 0, 0, 0);
        if (d[3]) { date.setMonth(d[3] - 1); }
        if (d[5]) { date.setDate(d[5]); }
        if (d[7]) { date.setHours(d[7]); }
        if (d[8]) { date.setMinutes(d[8]); }
        if (d[10]) { date.setSeconds(d[10]); }
        if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
      }

      return date;
    },

    /**
     * Returns the ISO8601 string representation of the date, given as a string.
     * The method supports the following formats for the given date string:
     * - RFC822
     * - ISO8601, regardless of whether the code is run under JavaScript v1.8.5+
     * or not.
     *
     * @function
     * @param {string} string The date string to convert to an ISO8601 string
     * @returns {string} The ISO8601 string representation for this date, an
     *  empty string if the string could not be parsed.
     */
    fromString: function (string) {
      var date = null;

      if (!string) {
        return '';
      }

      date = new Date(string);
      if (isNaN(date.getTime())) {
        // The date could not be parsed by the Date object, try to parse the
        // string as ISO8601 (this won't change anything if the underlying
        // JavaScript engine already supports that format, but won't be harmful
        // either).
        date = this.toDate(string);
      }

      // Convert the final date
      return this.fromDate(date);
    },


    /**
     * Returns the ISO8601 string representation of the given date.
     *
     * Milliseconds are only returned when different from 0.
     *
     * @function
     * @param {Date} d The date object to convert
     * @returns {string} The ISO8601 string representation for this date
     */
    fromDate: function (d) {
      var pad = function (n) {
        return (n < 10) ? '0' + n : n;
      };
      var padms = function (n) {
        if (n < 10) {
          return '00' + n;
        }
        else if (n < 100) {
          return '0' + n;
        }
        else {
          return n;
        }
      };

      if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
        return "";
      }

      return d.getUTCFullYear() +
        '-' + pad(d.getUTCMonth() + 1) +
        '-' + pad(d.getUTCDate()) +
        'T' + pad(d.getUTCHours()) +
        ':' + pad(d.getUTCMinutes()) +
        ':' + pad(d.getUTCSeconds()) +
        ((d.getUTCMilliseconds() !== 0) ? '.' + padms(d.getUTCMilliseconds()) : '') +
        'Z';
    },


    /**
     * Returns the ISO8601 string representation of the given date,
     * omitting the time part.
     *
     * The method outputs the local day when the local time evaluates to zero
     * The method outputs the UTC day otherwise. This apparently weird rule
     * allows to stick to the "right" day if the author created the date with:
     *  new Date("21 Apr 1997");
     *
     * This method should only really be used with dates created without time
     * counterpart.
     *
     * @function
     * @param {Date} d The date object to convert
     * @return {string} The ISO8601 string representation for this date
     */
    fromDateNoTime: function (d) {
      var pad = function (n) {
        return (n < 10) ? '0' + n : n;
      };

      if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
        return "";
      }

      if (!d || isNaN(d.getTime())) {
        return "";
      }

      if ((d.getHours() === 0) &&
        (d.getMinutes() === 0) &&
        (d.getSeconds() === 0) &&
        (d.getMilliseconds() === 0)) {
        // Local time evaluates to 0, return local day
        return d.getFullYear() +
          '-' + pad(d.getMonth() + 1) +
          '-' + pad(d.getDate());
      }
      else {
        // Return UTC day
        return d.getUTCFullYear() +
          '-' + pad(d.getUTCMonth() + 1) +
          '-' + pad(d.getUTCDate());
      }
    },


    /**
     * Returns the number of milliseconds that correspond to the given ISO8601 duration.
     * Note the function is restricted to durations of the form "PTnnHnnMnnS" for the time being.
     * @function
     * @param {string} string The ISO8601 string that represents a duration
     * @return {number} The duration in milliseconds
     */
    toDuration: function (string) {
      if (!string) {
        return 0;
      }

      var d = string.match(reDuration);
      if (!d) {
        return 0;
      }
       
      var ms = 0;
      if (d[2]) { ms += Number(d[2]) * 3600 * 1000; }
      if (d[3]) { ms += Number(d[3]) * 60 * 1000; }
      if (d[4]) { ms += Number(d[4]) * 1000; }

      return ms;
    },


    /**
     * Returns the ISO8601 representation of the given duration.
     * The function is not fully generic and only generates durations in the form "PTnnHnnMnnS"
     * (no year, month or day)
     * @function
     * @param {number} ms The duration to convert in milliseconds
     * @return {string} The ISO8601 representation of the duration
     */
    fromDuration: function (ms) {
      var seconds = Math.round(ms / 1000);
      var hours = Math.floor(seconds / 3600);
      var minutes = 0;

      seconds = seconds - hours * 3600;
      minutes = Math.floor(seconds / 60);

      seconds = seconds - minutes * 60;

      return "PT" +
        hours + "H" +
        minutes + "M" +
        seconds + "S";
    }
  };


});
/**
 * @fileOverview
 * 
 * URI support as per rfc3986
 * - Client and Serverside ECMA-262 v3 compatible, node.js friendly
 * - All classes extend the native String implementation
 * - Full test suite can be launched by running URI.Test();
 *
 * This fork from original repo fixes path resolution issues
 * and client-side execution in browser environments, c.f.:
 * - issue #1: https://github.com/webr3/URI/issues/1
 * - issue #2: https://github.com/webr3/URI/pull/2
 * - issue #4: https://github.com/webr3/URI/issues/4
 * - also ensured that the class does not leak to global scope
 * 
 * @author Nathan <http://webr3.org/nathan#me>
 * @author Francois Daoust <francois@joshfire.com>
 * @version 2012-02-09T21:55:00Z
 * @license http://creativecommons.org/publicdomain/zero/1.0/
 *
 * Initial source: <http://github.com/webr3/URI>
 * Source of the fork: <http://github.com/joshfire/URI>
 *
 * To the extent possible under law, <http://webr3.org/nathan#me>
 * has waived all copyright and related or neighboring rights to
 * this work.
 */

define('runtime-nodejs/uri',[], function () {
  var URI;

/**
 * URI Class
 * 
 * @constructor
 * @extends String
 * @param {String} value
 * @requires URI.HeirPart
 * @requires URI.Authority
 * @requires URI.Path
 * @return void
 */
(URI = function( value ) {
  this.value = value;
  this.length = value.length;
  String.call( this , value );
}).prototype = {
  __proto__: String.prototype,
  value: '', length: 0,
  toString: function() { return this.value.toString(); },
  valueOf: function() { return this.value; },
  /**
   * @member URI
   * @return {URI} The URI with any fragment removed
   */
  defrag: function() {
    var i = this.indexOf("#");
    if (i < 0) return this;
    return new URI( this.slice( 0, i ) );
  },
  /**
   * @member URI
   * @return {String} The scheme of this URI or null if schemeless
   */
  scheme: function() {
    var scheme = this.match(/^[a-z0-9\-\+\.]+:/i);
    if (scheme == null ) return null;
    return scheme.shift();
  },
  /**
   * @member URI
   * @return {URI.HeirPart} The heir-part of this URI containing authority and path
   */
  heirpart: function() {
    var heirpart = this.value;
    var q = heirpart.indexOf("?")
    if( q >= 0 ) {
      heirpart = heirpart.substring(0,q);
    } else {
      q = heirpart.indexOf("#")
      if( q >= 0 ) {
        heirpart = heirpart.substring(0,q);
      }
    }
    q = this.scheme();
    if( q ) {
      heirpart = heirpart.slice( q.length );
    }
    return new URI.HeirPart(heirpart);
  },
  /**
   * @member URI
   * @return {String} The query of the URI or null if no query
   */
  querystring: function() {
    var q = this.indexOf("?");
    if (q < 0) return null;
    var f = this.indexOf("#");
    if (f < 0) return this.slice(q);
    return this.substring( q , f );
  },
  /**
   * @member URI
   * @return {String} The fragment of the URI or null if no fragment
   */
  fragment: function() {
    var i = this.indexOf("#");
    if (i < 0) return null;
    return this.slice( i );
  },
  /**
   * @member URI
   * @return {Boolean} True if the URI is an Absolute URI
   */
  isAbsolute: function() {
    return this.scheme() != null && this.heirpart() != null && this.fragment() == null;
  },
  /**
   * @member URI
   * @return {URI} A normalised Absolute URI with paths resolved and fragment removed
   */
  toAbsolute: function() {
    if( this.scheme() == null || this.heirpart() == null ) throw 'URI must have a scheme and a hierpart.';
    var out = this.resolveReference( this );
    return out.defrag();
  },
  /**
   * Implementation of remove-dot-segments from rfc3986
   * 
   * @private
   * @member URI
   * @param {String} input 
   * @return {String}
   */
  removeDotSegments: function( input ) {
    var output = '';
    var q = null;
    while( input.length > 0 ) {
      if( input.substr(0,3) == '../' || input.substr(0,2) == './' ) {
        input = input.slice(input.indexOf('/'));
      } else if( input == '/.' ) {
        input = '/';
      } else if( input.substr(0,3) == '/./'  ) {
        input = input.slice(2);
      } else if( input.substr(0,4) == '/../' || input == '/..' ) {
        if( input == '/..' ) {
          input = '/';
        } else {
          input = input.slice(3);
        }
        q = output.lastIndexOf('/');
        if( q >= 0 ) {
          output = output.substring(0,q);
        } else {
          output = '';
        }
      } else if( input.substr(0,2) == '..' || input.substr(0,1) == '.' ) {
        input = input.slice(input.indexOf('.'));
        q = input.indexOf('.');
        if( q >= 0 ) {
          input = input.slice(q);
        }
      } else {
        if( input.substr(0,1) == '/' ) {
          output += '/';
          input = input.slice(1);
        }
        q = input.indexOf('/');
        if( q < 0 ) {
          output += input;
          input = '';
        } else {
          output += input.substring(0,q);
          input = input.slice(q);
        }
      }
    }
    return output;
  },
  /**
   * Implementation of Reference Resolution from rfc3986
   * Resolves a URI Reference using the current instance as Base URI
   * 
   * @member URI
   * @param {String} reference The URI Reference to resolve
   * @return {URI} Resolved URI Reference
   */
  resolveReference: function( reference ) {
    if(typeof reference == 'string') {
      reference = new URI(reference);
    }
    if( !(reference instanceof URI ) ) {
      throw 'Expected an URI or a String';
    }
    var T = { scheme:'',authority:'',path:'',query:'',fragment:''};
    var q = null;
    if( reference.scheme() ) {
      T.scheme = reference.scheme();
      q = reference.heirpart().authority();
      T.authority += q ? '//' + q : '';
      T.path = this.removeDotSegments( reference.heirpart().path() );
      q = reference.querystring();
      T.query += q ? q : '';
    } else {
      q = reference.heirpart().authority();
      if( q ) {
        T.authority = q ? '//' + q : '';
        T.path = this.removeDotSegments( reference.heirpart().path() );
        q = reference.querystring();
        T.query += q ? q : '';
      } else {
        q = reference.heirpart().path();
        if( q == "" ) {
          T.path = this.heirpart().path();
          q = reference.querystring();
          if( q ) {
            T.query += q ? q : '';
          } else {
            q = this.querystring();
            T.query += q ? q : ''; 
          }
        } else {
          if( q.substring(0,1) == '/' ) {
            T.path = this.removeDotSegments( q );
          } else {
            if( this.heirpart().path() ) {
              q = this.heirpart().path().lastIndexOf('/');
              if( q >= 0 ) {
                T.path = this.heirpart().path().substring(0,++q);
              }
              T.path += reference.heirpart().path();
            } else {
              T.path = '/' + q;
            }
            T.path = this.removeDotSegments( T.path );
          }
          q = reference.querystring();
          T.query += q ? q : ''; 
        }
        q = this.heirpart().authority();
        T.authority = q ? '//' + q : '';
      }
      T.scheme = this.scheme();
    }
    q = reference.fragment();
    T.fragment = q ? q : '';
    return new URI( T.scheme + T.authority + T.path + T.query + T.fragment );
  }
};
/**
 * URI.HeirPart
 * 
 * @constructor
 * @extends String
 * @param {String} value
 * @return void
 */
(URI.HeirPart = function( value ) {
  this.value = value;
  this.length = value.length;
  String.call( this , value );
}).prototype = {
  __proto__: String.prototype,
  toString: function() { return this.value.toString(); },
  valueOf: function() { return this.value; },
  /**
   * @member URI.HeirPart
   * @return URI.Authority The Authority of the URI or null
   */
  authority: function() {
    if( '//' != this.substring(0,2) ) {
      return null;
    }
    var authority = this.slice(2);
    var q = authority.indexOf('/');
    if( q >= 0 ) {
      authority = authority.substr(0,q);
    }
    return new URI.Authority(authority);
  },
  /**
   * @member URI.HeirPart
   * @return URI.Path The Path of the URI
   */
  path: function() {
    var q = this.authority();
    if( !q ) return new URI.Path(this);
    return new URI.Path( this.slice(q.length + 2) );
  }
};

/**
 * URI.Authority
 * 
 * @constructor
 * @extends String
 * @param {String} value
 * @return void
 */
(URI.Authority = function( value ) {
  this.value = value;
  this.length = value.length;
  String.call( this , value );
}).prototype = {
  __proto__: String.prototype,
  toString: function() { return this.value.toString(); },
  valueOf: function() { return this.value; },
  /**
   * @member URI.Authority
   * @return String The user-info of the URI or null
   */
  userinfo: function() {
    var q = this.indexOf("@");
    if(q < 0) return null;
    return this.substr(0,q);
  },
  /**
   * @member URI.Authority
   * @return String The host of the URI, one of ipv4, ipv6, ipvFuture or reg-name
   */
  host: function() {
    var host = this.value;
    // check if userinfo and remove
    var q = host.indexOf("@");
    if(q >= 0) host = host.slice(++q);
    // check if ipv6 or ipfuture
    if( host.indexOf("[") == 0 ) {
      q = host.indexOf("]");
      if( q > 0 ) return host.substring(0,++q);
    }
    // check if we have a port and remove
    q = host.lastIndexOf(":");
    if( q >= 0 ) return host.substring(0,q);
    return host;
  },
  /**
   * @member URI.Authority
   * @return String The port of the URI or null
   */
  port: function() {
    var port = this.value;
    // remove user and pass
    var q = port.indexOf("@");
    if(q >= 0) port = port.slice(q);
    // strip ipv6 or ipfuture if we have one
    if( port.indexOf("[") == 0 ) {
      q = port.indexOf("]");
      if( q > 0 ) port = port.slice(q);
    }
    // check if we have a port return
    q = port.lastIndexOf(":");
    if( q < 0 ) {
      return null;
    }
    port = port.slice(++q);
    return ( port.length == 0 ) ? null : port;  
  }
};

/**
 * URI.Path
 * 
 * @constructor
 * @extends String
 * @param {String} value
 * @return void
 */
(URI.Path = function( value ) {
  this.value = value;
  this.length = value.length;
  String.call( this , value );
}).prototype = {
  __proto__: String.prototype,
  toString: function() { return this.value.toString(); },
  valueOf: function() { return this.value; }
};

/*
// Export URI using similar export mechanism as in underscore.js.
// Compatible with node.js, CommonJS.
// Add 'URI' to the global object if not in a module environment.
if (typeof define === 'function' && define.amd) {
  // Register as a named module with AMD.
  define('uri', function() {
    return URI;
  });
} else if (typeof exports !== 'undefined') {
  if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = URI;
  }
  exports.URI = URI;
} else {
  // Exported as a string, for Closure Compiler "advanced" mode.
  root['URI'] = URI;
}
*/

return URI;

});
//     Underscore.js 1.3.3
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore is freely distributable under the MIT license.
//     Portions of Underscore are inspired or borrowed from Prototype,
//     Oliver Steele's Functional, and John Resig's Micro-Templating.
//     For all details and documentation:
//     http://documentcloud.github.com/underscore

define('runtime-nodejs/underscore',[],function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var slice            = ArrayProto.slice,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) { return new wrapper(obj); };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root['_'] = _;
  }

  // Current version.
  _.VERSION = '1.3.3';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    if (obj.length === +obj.length) results.length = obj.length;
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var reversed = _.toArray(obj).reverse();
    if (context && !initial) iterator = _.bind(iterator, context);
    return initial ? _.reduce(reversed, iterator, memo, context) : _.reduce(reversed, iterator);
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    each(obj, function(value, index, list) {
      if (!iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if a given value is included in the array or object using `===`.
  // Aliased as `contains`.
  _.include = _.contains = function(obj, target) {
    var found = false;
    if (obj == null) return found;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    found = any(obj, function(value) {
      return value === target;
    });
    return found;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method || value : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Return the maximum element or (element-based computation).
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.max.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.min.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var shuffled = [], rand;
    each(obj, function(value, index, list) {
      rand = Math.floor(Math.random() * (index + 1));
      shuffled[index] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, val, context) {
    var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      if (a === void 0) return 1;
      if (b === void 0) return -1;
      return a < b ? -1 : a > b ? 1 : 0;
    }), 'value');
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, val) {
    var result = {};
    var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
    each(obj, function(value, index) {
      var key = iterator(value, index);
      (result[key] || (result[key] = [])).push(value);
    });
    return result;
  };

  // Use a comparator function to figure out at what index an object should
  // be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator) {
    iterator || (iterator = _.identity);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >> 1;
      iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj)                                     return [];
    if (_.isArray(obj))                           return slice.call(obj);
    if (_.isArguments(obj))                       return slice.call(obj);
    if (obj.toArray && _.isFunction(obj.toArray)) return obj.toArray();
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    return _.isArray(obj) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especcialy useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail`.
  // Especially useful on the arguments object. Passing an **index** will return
  // the rest of the values in the array from that index onward. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = function(array, index, guard) {
    return slice.call(array, (index == null) || guard ? 1 : index);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return _.reduce(array, function(memo, value) {
      if (_.isArray(value)) return memo.concat(shallow ? value : _.flatten(value));
      memo[memo.length] = value;
      return memo;
    }, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator) {
    var initial = iterator ? _.map(array, iterator) : array;
    var results = [];
    // The `isSorted` flag is irrelevant if the array only contains two elements.
    if (array.length < 3) isSorted = true;
    _.reduce(initial, function (memo, value, index) {
      if (isSorted ? _.last(memo) !== value || !memo.length : !_.include(memo, value)) {
        memo.push(value);
        results.push(array[index]);
      }
      return memo;
    }, []);
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays. (Aliased as "intersect" for back-compat.)
  _.intersection = _.intersect = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = _.flatten(slice.call(arguments, 1), true);
    return _.filter(array, function(value){ return !_.include(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) results[i] = _.pluck(args, "" + i);
    return results;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i, l;
    if (isSorted) {
      i = _.sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
    for (i = 0, l = array.length; i < l; i++) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item) {
    if (array == null) return -1;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
    var i = array.length;
    while (i--) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, throttling, more, result;
    var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
    return function() {
      context = this; args = arguments;
      var later = function() {
        timeout = null;
        if (more) func.apply(context, args);
        whenDone();
      };
      if (!timeout) timeout = setTimeout(later, wait);
      if (throttling) {
        more = true;
      } else {
        result = func.apply(context, args);
      }
      whenDone();
      throttling = true;
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      if (immediate && !timeout) func.apply(context, args);
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      return memo = func.apply(this, arguments);
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func].concat(slice.call(arguments, 0));
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) { return func.apply(this, arguments); }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    return _.map(obj, _.identity);
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var result = {};
    each(_.flatten(slice.call(arguments, 1)), function(key) {
      if (key in obj) result[key] = obj[key];
    });
    return result;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (obj[prop] == null) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function.
  function eq(a, b, stack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a._chain) a = a._wrapped;
    if (b._chain) b = b._wrapped;
    // Invoke a custom `isEqual` method if one is provided.
    if (a.isEqual && _.isFunction(a.isEqual)) return a.isEqual(b);
    if (b.isEqual && _.isFunction(b.isEqual)) return b.isEqual(a);
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = stack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (stack[length] == a) return true;
    }
    // Add the first object to the stack of traversed objects.
    stack.push(a);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          // Ensure commutative equality for sparse arrays.
          if (!(result = size in a == size in b && eq(a[size], b[size], stack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent.
      if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) return false;
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], stack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    stack.pop();
    return result;
  }

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType == 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Is a given variable an arguments object?
  _.isArguments = function(obj) {
    return toString.call(obj) == '[object Arguments]';
  };
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Is a given value a function?
  _.isFunction = function(obj) {
    return toString.call(obj) == '[object Function]';
  };

  // Is a given value a string?
  _.isString = function(obj) {
    return toString.call(obj) == '[object String]';
  };

  // Is a given value a number?
  _.isNumber = function(obj) {
    return toString.call(obj) == '[object Number]';
  };

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return _.isNumber(obj) && isFinite(obj);
  };

  // Is the given value `NaN`?
  _.isNaN = function(obj) {
    // `NaN` is the only value for which `===` is not reflexive.
    return obj !== obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value a date?
  _.isDate = function(obj) {
    return toString.call(obj) == '[object Date]';
  };

  // Is the given value a regular expression?
  _.isRegExp = function(obj) {
    return toString.call(obj) == '[object RegExp]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Has own property?
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function (n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Escape a string for HTML interpolation.
  _.escape = function(string) {
    return (''+string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g,'&#x2F;');
  };

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object, ensuring that
  // they're correctly added to the OOP wrapper as well.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      addToWrapper(name, _[name] = obj[name]);
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /.^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    '\\': '\\',
    "'": "'",
    'r': '\r',
    'n': '\n',
    't': '\t',
    'u2028': '\u2028',
    'u2029': '\u2029'
  };

  for (var p in escapes) escapes[escapes[p]] = p;
  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
  var unescaper = /\\(\\|'|r|n|t|u2028|u2029)/g;

  // Within an interpolation, evaluation, or escaping, remove HTML escaping
  // that had been previously added.
  var unescape = function(code) {
    return code.replace(unescaper, function(match, escape) {
      return escapes[escape];
    });
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    settings = _.defaults(settings || {}, _.templateSettings);

    // Compile the template source, taking care to escape characters that
    // cannot be included in a string literal and then unescape them in code
    // blocks.
    var source = "__p+='" + text
      .replace(escaper, function(match) {
        return '\\' + escapes[match];
      })
      .replace(settings.escape || noMatch, function(match, code) {
        return "'+\n_.escape(" + unescape(code) + ")+\n'";
      })
      .replace(settings.interpolate || noMatch, function(match, code) {
        return "'+\n(" + unescape(code) + ")+\n'";
      })
      .replace(settings.evaluate || noMatch, function(match, code) {
        return "';\n" + unescape(code) + "\n;__p+='";
      }) + "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __p='';" +
      "var print=function(){__p+=Array.prototype.join.call(arguments, '')};\n" +
      source + "return __p;\n";

    var render = new Function(settings.variable || 'obj', '_', source);
    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for build time
    // precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' +
      source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // The OOP Wrapper
  // ---------------

  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.
  var wrapper = function(obj) { this._wrapped = obj; };

  // Expose `wrapper.prototype` as `_.prototype`
  _.prototype = wrapper.prototype;

  // Helper function to continue chaining intermediate results.
  var result = function(obj, chain) {
    return chain ? _(obj).chain() : obj;
  };

  // A method to easily add functions to the OOP wrapper.
  var addToWrapper = function(name, func) {
    wrapper.prototype[name] = function() {
      var args = slice.call(arguments);
      unshift.call(args, this._wrapped);
      return result(func.apply(_, args), this._chain);
    };
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      var wrapped = this._wrapped;
      method.apply(wrapped, arguments);
      var length = wrapped.length;
      if ((name == 'shift' || name == 'splice') && length === 0) delete wrapped[0];
      return result(wrapped, this._chain);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      return result(method.apply(this._wrapped, arguments), this._chain);
    };
  });

  // Start chaining a wrapped Underscore object.
  wrapper.prototype.chain = function() {
    this._chain = true;
    return this;
  };

  // Extracts the result from a wrapped and chained object.
  wrapper.prototype.value = function() {
    return this._wrapped;
  };

  return _;

});
/**
 * @fileoverview The RSS converter fetches an RSS feed identified by its URI
 * and converts the resulting feed following schema.org, returning a list of
 * BlogPosting items.
 *
 * It is more or less a datasource, except it doesn't define a "desc"
 * property. Check the feed/rss datasource that wraps this library.
 *
 * The RSS converter may take the URI of an HTML page as argument. It
 * extracts the link to the RSS feed and processes the feed in that case.
 *
 * The RSS converter may run client-side but won't work in the generic
 * case in browsers unless the URI to request is from the same origin as
 * the page that requests it (or unless CORS settings are appropriately
 * set server-side).
 */

define('runtime-nodejs/rssconverter',[
  'datajslib!http',
  'datajslib!underscore',
  'datajslib!htmlparser',
  'datajslib!iso8601',
  'datajslib!uri'
], function (http, _, htmlparser, iso8601, URI) {

  /**
   * Shortcut to htmlparser DOM utility functions
   */
  var utils = htmlparser.DomUtils;

  /**
   * Helper function to retrieve the raw text content of a DOM element
   * returned by the htmlparser library.
   * The function trims the string (unless told not to).
   *
   * @function
   * @param {Object} element The DOM element returned by the htmlparser
   * @param {boolean} keepTrailingSpaces true to keep trailing spaces,
   *   false to trim the string
   * @return {String} The raw text content of the DOM element, omitting
   *   tags. The conversion has two HTML-specific rules: it uses the
   *   contents of the 'alt' attribute for 'img' tags and introduce
   *   carriage returns for 'br' tags.
   */
  var getTextContent = function (element, keepTrailingSpaces) {
    var text = '';
    if (!element) {
      return text;
    }
    if (element.children) {
      _.each(element.children, function (child) {
        text += getTextContent(child, true);
      });
    }
    else if (element.type === 'text') {
      text += element.data;
    }
    else if ((element.name === 'img') && element.attribs) {
      text += element.attribs.alt || element.attribs.title || "";
    }
    else if (element.name === 'br') {
      text += "\n";
    }

    // Return text, trimmed except if
    // we're already recursing.
    if (keepTrailingSpaces) {
      return text;
    }
    else {
      return text.trim();
    }
  };

  /*
   * Helper function to retrieve the child of an element returned by the
   * htmlparser library identified by its name.
   *
   * @function
   * @param {String} childName The name of the child to retrieve
   * @param {Object} parent The parent element to extract the child from
   * @return {Object} The corresponding child, null if not found
   */
  var getElementChild = function (childName, parent) {
    if (parent && parent.children) {
      var els = utils.getElementsByTagName(childName, parent.children, false, 1);
      if (els && (els.length > 0)) {
        return els[0];
      }
    }
    return null;
  };

  /**
   * Helper function to retrieve the text content of a child of an element
   * identified by its name.
   *
   * @function
   * @param {String} childName The name of the child to retrieve
   * @param {Object} parent The parent element to extract the child from
   * @return {String} The text content of the child, an empty string if
   *   the child cannot be found.
   */
  var getElementChildText = function (childName, parent) {
    var el = getElementChild(childName, parent);
    if (el) {
      return getTextContent(el);
    }
    else {
      return '';
    }
  };


  return {

    /**
     * Fetches feed items from the source provider.
     * If the data received is an HTML page, the function parses that page
     * and extracts the first link to an RSS feed it can find.
     *
     * @function
     * @param {Object} query Query parameters. Must define a 'filter' property
     *   with a 'url' property that contains the absolute URL to the feed.
     * @param {function(Object, Object)} callback Callback function that
     *   receives the error if one occurred (null otherwise) and a string that
     *   contains the XML feed.
     */
    fetch: function (query, callback) {
      var filter = (query && query.filter) ? query.filter : {};
      var url = null;
      var rssLinkHref = false;

      // Return an empty set if no URL is given
      if (!filter.url) {
        return callback(null, '');   
      }
      
      // Ensure URL starts with http:// or https://
      url = filter.url;
      if (url.search(/^http(s?)\:\/\//i) === -1) {
        url = 'http://' + url;
      }

      // We'll parse the document as an HTML page to start with and
      // try to extract a link to an RSS feed. If that doesn't work,
      // we'll parse the document as an RSS feed directly.
      var htmlHandler = new htmlparser.DefaultHandler(function (error, dom) {
        // Check the RFC: http://www.rssboard.org/rss-autodiscovery
        // We're looking for something like this:
        // <link rel="alternate" type="application/rss+xml" title="my title" href="http://blog.steren.fr/feed/" />

        // Extract the base URI of the document for URI resolution.
        // That's the URL of the document itself, except if it's overridden
        // by a "base" tag:
        // http://www.w3.org/TR/html4/struct/links.html#h-12.4
        var baseuri = null;
        var basetag = utils.getElementsByTagName('base', dom, true, 1);
        if (basetag && basetag.length) {
          basetag = basetag[0];
        }
        if (basetag && basetag.attribs && basetag.attribs.href) {
          baseuri = new URI(basetag.attribs.href).defrag();
        }
        else {
          baseuri = new URI(url).defrag(); 
        }

        // Extract the first "link" tag that appears in the DOM
        // (the code is not restricted to the "head" tag on purpose to ensure
        // the link still gets find when the HTML page is fairly invalid)
        var linktags = utils.getElementsByTagName('link', dom, true);
        var linktag = _.find(linktags, function (item) {
          if (item.attribs && item.attribs.href &&
            item.attribs.rel && (item.attribs.rel === 'alternate') &&
            item.attribs.type && (item.attribs.type === 'application/rss+xml')) {
              return true;
          }
          else {
            return false;
          }
        });
        if (linktag) {
          // Resolve relative link against the base URI of the document
          rssLinkHref = baseuri.resolveReference(linktag.attribs.href).toString();
        }
      }, {
        // HTML parsing options
        ignoreWhitespace: true,
        verbose: false,
        enforceEmptyTags: true
      });

      // Send the HTTP request, expecting raw text as response
      http.request({
        "url": url,
        "dataType": "text"
      }, function (err, data) {
        if (err || !data) {
          return callback(err, data);
        }
        else {
          // Assume the page is an HTML page and try to extract
          // the first link to an RSS feed (in a <link> tag)
          var findRssParser = new htmlparser.Parser(htmlHandler);
          findRssParser.parseComplete(data);

          if (rssLinkHref) {
            // The assumption proved correct, the page was an HTML page
            // that linked to an RSS feed. Time to retrieve that feed
            http.request({
              "url": rssLinkHref,
              "dataType": "text"
            }, function (e, d) {
              return callback(e, d);
            });
          }
          else {
            // The assumption was wrong, the RSS feed is the data received
            return callback(err, data);
          }
        }
      }); 
    },


    /**
     * Normalizes the RSS data received from the source provider.
     *
     * @function
     * @param {Object} data The data that was received
     *(typically the object given to the callback method at the end of a "fetch")
     * @param {Object} query Query parameters (which could include filtering options)
     * @param {function(Object, Object)} callback Callback function.
     *   The second argument of the callback is an object with an "entries" property
     *   that contains the list of items normalized according to the schema.org hierarchy.
     */
    process: function (data, query, callback) {
      var filter = (query && query.filter) ? query.filter : {};

      if (!data) {
        return callback(null, { "entries": [] });
      }

      // Converts the string to a number if possible,
      // returns null if not. No exception raised.
      var safeParseInt = function (str) {
        try {
          if (str) {
            return parseInt(str, 10);
          }
          else {
            return null;
          }
        }
        catch (e) {
          return null;
        }
      };

      // Images extracted from the HTML fragment may be 'pseudo-absolute',
      // i.e. of the form '//foo'. Using a dummy base URI for resolution.
      var baseuri = new URI('http://example.org');

      // Text handler that parses some HTML fragment and returns a fully
      // textual representation. Note this won't work very well if the content
      // contains lists, tables, images, etc.
      // The function does not necessarily expect the fragment to be "clean",
      // i.e it may contain more than one root element.
      // The parser also extracts the first image that appears in the content.
      // This is used to return a thumbnail of the article.
      var parsedText = null;
      var parsedImage = null;
      var textHandler = new htmlparser.DefaultHandler(function (error, dom) {
        if (error || !dom || !dom[0]) {
          parsedText = null;
          parsedImage = null;
          return;
        }
        parsedText = '';
        _.each(dom, function (child) {
          if (parsedText) {
            parsedText += ' ';
          }
          parsedText += getTextContent(child);
        });

        var images = utils.getElementsByTagName("img", dom, true);
        var image = null;
        if (images) {
          image = _.find(images, function (img) {
            return img.attribs &&
              img.attribs.src &&
              (img.attribs.src.search(/\.doubleclick\.net/) === -1) &&
              (img.attribs.src.search(/\.pheedo\.com/) === -1) &&
              (img.attribs.src.search(/\.feedburner\.com/) === -1) &&
              (img.attribs.src.search(/\.fsdn\.com/) === -1);
          });
          if (image) {
            parsedImage = {
              '@type': 'ImageObject',
              'itemType': 'ImageObject',
              'contentURL': baseuri.resolveReference(image.attribs.src).toString()
            };
            if (image.attribs.alt) {
              parsedImage.name = image.attribs.alt;
            }
            if (safeParseInt(image.attribs.width)) {
              parsedImage.width = safeParseInt(image.attribs.width);
            }
            if (safeParseInt(image.attribs.height)) {
              parsedImage.height = safeParseInt(image.attribs.height); 
            }
          }
        }
        return;
      },
      {
        // HTML fragment parsing options
        ignoreWhitespace: true,
        verbose: false,
        enforceEmptyTags: true
      });
      var textParser = new htmlparser.Parser(textHandler);


      // The URL can be a RSS feed or a page containing a <link> to a RSS feed
      // Supported RSS feed formats are RDF/RSS 1.0 and RSS 2.0.
      // In particular, Atom feeds are not (yet) supported.
      // Support is quick-and-dirty and may easily break.
      // The HTML markup of feed items gets lost during the conversion.

      // RSS parser
      var rssHandler = new htmlparser.DefaultHandler(function (error, dom) {
        var type;
        // get the root tag (named "rdf:RDF" or "rss")
        var rss = utils.getElementsByTagName('rdf:RDF', dom, false, 1);
        type = 'rdf';
        if (!rss || (rss.length === 0)) {
          rss = utils.getElementsByTagName('rss', dom, false, 1);
          type = 'rss';
        }
        if (!rss || (rss.length === 0)) {
          return callback('Not a valid feed: root element not found', null);
        }
        rss = rss[0];

        // In rdf, channel.items contains only link to items which are on the same lvl as channel
        // In rss, items are inside channel
        var items = [];
        var channel = rss;
        if (type === 'rss') {
          channel = getElementChild('channel', rss);
          if (!channel) {
            return callback('Not a valid feed: channel tag not found', null);
          }
        }
        items = utils.getElementsByTagName('item', channel.children, false);

        var entries = _.map(items, function(item) {
          var ret = {
            '@type': 'BlogPosting',
            'itemType': 'BlogPosting',
            'name': getElementChildText('title', item)
          };
          var children = [];
          var images = null;
          var value = null;

          value = getElementChildText('link', item);
          if (!value && item.attribs && item.attribs['rdf:about']) {
            value = item.attribs['rdf:about'];
          }
          if (value) {

            //remove Google Analytics utm_* tracking parameters from feeds
            if (value.indexOf("?")>=0) {
              var qs = value.substring(value.indexOf("?")+1);
              //regex from http://stackoverflow.com/questions/1842681/regular-expression-to-remove-one-parameter-from-query-string
              for (var i=0;i<2;i++) qs = qs.replace(/&utm_([a-z]+)(\=[^&]*)?(?=&|$)|^utm_([a-z]+)(\=[^&]*)?(&|$)/g,"");
              value = value.substring(0,value.indexOf("?")+((qs && qs.substring(0,1)!="#")?1:0)+qs);
            }
            ret.url = value;
          }

          // Set the description. This is often HTML content
          // while we rather want to generate raw text here.
          value = getElementChildText('description', item);
          if (value) {
            textParser.parseComplete(value);
            if (parsedText) {
              value = parsedText;
            }
          }
          if (value) {
            ret.description = value;
          }

          // Extract the full body of the article. Here, we'll
          // keep the HTML markup.
          value = getElementChildText('content:encoded', item);
          if (!value) {
            // 'content:encoded' may not be defined, so we'll fallback to
            // 'description' which is often being abused to contain more
            // than just plain text
            value = getElementChildText('description', item);
          }
          if (value) {
            ret.articleBody = value;
          }

          // Set the publication date
          value = getElementChildText('dc:date', item);
          if (!value) {
            value = getElementChildText('pubDate', item);
          }
          if (value) {
            ret.datePublished = iso8601.fromString(value);
          }

          // Set information about entry author
          // (NB: it may be the author's name, the author's email
          // or a mix of both)
          value = getElementChildText('dc:creator', item);
          if (!value) {
            value = getElementChildText('author', item);
          }
          if (value) {
            ret.author = {
              '@type': 'Person',
              'itemType': 'Person',
              'name': value
            };
          }

          // Set information about the subject of the article
          // TODO: would that match "category" in RSS 2.0?
          value = getElementChildText('dc:subject', item);
          if (value) {
            ret.about = {
              '@type': 'Thing',
              'itemType': 'Thing',
              'name': value
            };
          }

          // Set thumbnail if one is defined. It is either:
          // - the first image in articleBody unless prevented by disableThumbnailExtraction
          // - the first media:thumbnail element
          // - the first media:content (which is often abused to contain
          // the avatar of the author unfortunately)
          if (!filter.disableThumbnailExtraction) {
            // No thumbnail explicitly defined, let's parse the body
            // of the article to extract the first image
            parsedImage = null;
            textParser.parseComplete(ret.articleBody);
            if (parsedImage) {
              ret.image = parsedImage;
            }
          }
          if (!ret.image) {
            value = getElementChild('media:thumbnail', item);
            if (value && value.attribs && value.attribs.url) {
              // Simple case, the thumbnail is explicitly defined
              ret.image = {
                '@type': 'ImageObject',
                'itemType': 'ImageObject',
                'contentURL': value.attribs.url
              };
              if (safeParseInt(value.attribs.width)) {
                ret.image.width = safeParseInt(value.attribs.width);
              }
              if (safeParseInt(value.attribs.height)) {
                ret.image.height = safeParseInt(value.attribs.height);
              }
            }
          }
          if (!ret.image) {
            // No thumbnail defined, search 'media:content'
            images = utils.getElementsByTagName('media:content', item.children, false);
            value = _.find(images, function (img) {
              return img.attribs && img.attribs.url &&
                ((img.attribs.medium && (img.attribs.medium === "image")) ||
                (img.attribs.type && (img.attribs.type.indexOf('image/') === 0)));
            });
            if (value) {
              ret.image = {
                '@type': 'ImageObject',
                'itemType': 'ImageObject',
                'contentURL': value.attribs.url
              };
              if (safeParseInt(value.attribs.width)) {
                ret.image.width = safeParseInt(value.attribs.width);
              }
              if (safeParseInt(value.attribs.height)) {
                ret.image.height = safeParseInt(value.attribs.height);
              }
            }
          }

          // Pass properties defined in the Joshfire namespace as-is
          for (var i = 0; i < item.children.length; i++) {
            value = item.children[i];
            if (value.type === "tag") {
              if ((value.name.indexOf('jf:') === 0) ||
                (value.name.indexOf('joshfire:') === 0)) {
                ret[value.name] = getTextContent(value);
              }
            }
          }

          /**
          * Parse the Category tag which is used
          * by many blog RSS feeds. Extract them and
          * put them in an array in the "keyword"
          * property of the parsed item.
          * Empty array if nothing is found.
          **/
          items = utils.getElementsByTagName('category', item);
          if(items) {
            var kw = [];
            // Categories are not concatenated in the same element.
            // Instead, there is a tag for each category.
            for(var i in items) {

              if(!items.hasOwnProperty(i))
                continue;

              // The Category tag exists and it has data
              if(items[i] && items[i].children && items[i].children.length) {
                for(var k in items[i].children) {
                  if(!items[i].children.hasOwnProperty(k))
                    continue;
                  kw.push(items[i].children[k].data);
                }
              } 
            }
            ret.keywords = kw;
          }
          

          return ret;
        });

        callback(null, {"entries":entries});

      },
      {
        // RSS parsing options
        // Important: no empty tags!
        ignoreWhitespace: true,
        verbose: false,
        enforceEmptyTags: false
      });

      var parser = new htmlparser.Parser(rssHandler);
      parser.parseComplete(data);
    },


    /**
     * Fetches and normalizes the data.
     *
     * @function
     * @param {Object} query Query parameters. Expects an object of the form:
     *  { "filter": { "url": "[URL]", disableThumbnailExtraction: true } }
     *  where 'disableThumbnailExtraction' is a flag that means "use RSS
     *  properties only to extract the thumbnail". The URL param is required.
     * @param {function(Object, Object)} callback Callback function.
     *   receives the error or the normalized feed.
     */
    find: function (query, callback) {
      // Implementation note: same code as example/news
      var self = this;
      self.fetch(query, function (err, data) {
        if (err) {
          return callback(err, null);
        }
        else {
          self.process(data, query, function (err, convertedData) {
            return callback(err, convertedData);
          });
        }
      });
    }
  };
});


/**
 * @fileoverview Generic RSS datasource.
 *
 * The datasource is a simple wrapper around the datajslib!rssconverter
 * library that exposes its fetch, process, and find methods.
 */

define('databases/wordpress/posts',[
  'datajslib!rssconverter',
  'datajslib!underscore'
], function (rssconverter, _) {

  return {
    /**
     * Description of the datasource for the factory
     */
    desc: {
      "options": {
        "schema": {
          "url": {
            "title": "Wordpress Blog URL",
            "description": "Root URL of the wordpress blog.",
            "type": "string"
          },
          "path":{
            "title": "Wordpress Post or Page path",
            "description": "Path of the single post or page you want to fetch",
            "type":"string"
          },
          "quantity": {
            "title": "Quantity",
            "description": "The maximum number of posts to display. Defaults to the maximum of posts available. Note that it cannot exceed the maximum set by the owner of the blog.",
            "type": "string"
          },
          "categories": {
            "title": "Category name or ID(s)",
            "description": "Either a category name or a list of coma separated category IDs.",
            "type": "string"
          },
          "excludeCategories": {
            "title": "Exclude particuliar category ID(s)",
            "description": "A list of coma separated category IDs. The posts belonging to these categories will not be displayed.\nWARNING: this field will NOT be used if there is already one or more specified categories in the field above.",
            "type": "string"
          },
          "tags": {
            "title": "Tag name or ID(s)",
            "description": "Either a tag name or a list of coma separated tag IDs.",
            "type": "string"
          },
          "search": {
            "title": "Filter by keyword",
            "description": "Any kind of keyword to search for within the posts. Leave empty for the default feed.",
            "type": "string"
          }
        },
        "form": [
          "url",
          "quantity",
          "search",
          {
            "type": "selectfieldset",
            "title": "Additional filters",
            "items": [
              {
                "type": "optionfieldset",
                "legend": "No Filter",
                "items": []
              },
              {
                "type": "optionfieldset",
                "legend": "Tags",
                "items": [
                  "tags"
                ]
              },
              {
                "type": "optionfieldset",
                "legend": "Categories",
                "items": [
                  "categories",
                  "excludeCategories"
                ]
              }
            ]
          }
        ]
      },
      "runAtClient": "enable",
      "corsRequest": true,
      "maxage": "120",
      "outputType": "BlogPosting"
    },

    /**
     * Fetches feed items from the source provider.
     * If the data received is an HTML page, the function parses that page
     * and extracts the first link to an RSS feed it can find.
     *
     * @function
     * @param {Object} query Query parameters. Must define a 'filter' property
     *   with a 'url' property that contains the absolute URL to the feed.
     * @param {function(Object, Object)} callback Callback function that
     *   receives the error if one occurred (null otherwise) and a string that
     *   contains the XML feed.
     */
    fetch: rssconverter.fetch,


    /**
     * Normalizes the RSS data received from the source provider.
     *
     * @function
     * @param {Object} data The data that was received
     *(typically the object given to the callback method at the end of a "fetch")
     * @param {Object} query Query parameters (which could include filtering options)
     * @param {function(Object, Object)} callback Callback function.
     *   The second argument of the callback is an object with an "entries" property
     *   that contains the list of items normalized according to the schema.org hierarchy.
     */
    process: rssconverter.process,


    /**
     * Fetches and normalizes the data.
     *
     * @function
     * @param {Object} query Query parameters. Expects an object of the form:
     *  { "filter": { "url": "[URL]", disableThumbnailExtraction: true } }
     *  where 'disableThumbnailExtraction' is a flag that means "use RSS
     *  properties only to extract the thumbnail". The URL param is required.
     * @param {function(Object, Object)} callback Callback function.
     *   receives the error or the normalized feed.
     */
    find: function(query, callback) {

      //Make a copy
      query = JSON.parse(JSON.stringify(query));

      if(!query.filter || !query.filter.url){
        rssconverter.find(query, function(err, data) {
          callback(err, data);
        });
        return false;
      }

      var uniquepattern = false,
          baseUrl = query.filter.url,
          categoriesFilter = '&cat=',
          tagsFilter = '&tag=',
          searchFilter = '&s=';

      // If we want to fetch only one page/post
      if (query.filter.path) {
        query.filter.quantity = 1;

        // Luckily, any wordpress post or page RDF feed seems to contain the full page content.
        query.filter.url = query.filter.url.replace(/\/$/,"") + query.filter.path.replace(/^(\/)?/,"/") + "?feed=rdf";

      // All the other parameters are for feeds
      } else {

        /**
        * Loop on the filters and transform what's written into URL
        * readable params for each filter.
        **/
        _.each(query.filter, function(val, key) {
          /** Remove white spaces **/
          val = val.replace(/\s/g, '');

          if(key == 'tags') {
            /** Single ID or ID list(coma) **/
            if(!isNaN(val) || val.indexOf(',') != -1) {
              tagsFilter += val+'';
            }
            /** category name (url pattern changes) **/
            else {
              uniquepattern = true;
              query.filter.url = baseUrl+'/tag/'+val+'/feed';
            }
          }

          else if(key == 'categories') {
            /** Single ID or ID list(coma) **/
            if(!isNaN(val) || val.indexOf(',') != -1) {
              categoriesFilter += val+'';
            }
            /** category name (url pattern changes) **/
            else {
              uniquepattern = true;
              query.filter.url = baseUrl+'/category/'+val+'/feed';
            }
          }

          else if(key == 'excludeCategories') {
            /** We always expect a single ID or a list of numeric IDs **/
            if(!isNaN(val)) {
              categoriesFilter += '-'+val;
            }
            else {
              val = val.split(',');
              for (var i in val) {
                categoriesFilter += '-'+val[i]+',';
              }
            }
          }

          else if(key == 'search' && val.length) {
            searchFilter += val;
          }

        });
        
        /** Construct the full URL by appending the parsed params **/
        /** Uniquepattern is triggered when a different, exclusive URL form is used **/
        if(query.filter.url && !uniquepattern) {
          query.filter.url += '?dummyparam=1'+categoriesFilter+tagsFilter+searchFilter+'&feed=rss2';
        }
        else if(uniquepattern) {
          query.filter.url += '?dummyparam=1'+searchFilter;
        }
      }

      /** Send the query **/
      rssconverter.find(query, function(err, data) {

      	if (!data || err) return callback(err);

        /** Limit the number of entries if necessary **/
        if(query.filter.quantity && !isNaN(query.filter.quantity) && parseInt(query.filter.quantity)) 
          data.entries = data.entries.splice(0, query.filter.quantity);
        
        callback(err, data);
      });
    }
  };
});

;
