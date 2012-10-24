/* coffee-script example usage - at https://github.com/johan/dotjs/commits/johan

   on path_re: ['^/([^/]+)/([^/]+)(/?.*)', 'user', 'repo', 'rest']
      query: true
      dom:
        keyboard: 'css  .keyboard-shortcuts'
        branches: 'css+ .js-filter-branches h4 a'
        dates:    'css* .commit-group-heading'
        tracker:  'css? #gauges-tracker[defer]'
        johan_ci: 'xpath* //li[contains(@class,"commit")][.//a[.="johan"]]'
      ready: (path, query, dom) ->

   ...would make something like this call, as the path regexp matched, and there
   were DOM matches for the two mandatory "keyboard" and "branches" selectors:

   ready( { user: 'johan', repo: 'dotjs', rest: '/commits/johan' }
        , {} // would contain all query args (if any were present)
        , { keyboard: Node<a href="#keyboard_shortcuts_pane">
          , branches: [ Node<a href="/johan/dotjs/commits/coffee">
                      , Node<a href="/johan/dotjs/commits/dirs">
                      , Node<a href="/johan/dotjs/commits/gh-pages">
                      , Node<a href="/johan/dotjs/commits/johan">
                      , Node<a href="/johan/dotjs/commits/jquery-1.8.2">
                      , Node<a href="/johan/dotjs/commits/master">
                      ]
          , dates: [ Node<h3 class="commit-group-heading">Oct 07, 2012</h3>
                   , Node<h3 class="commit-group-heading">Aug 29, 2012</h3>
                   , ...
                   ]
          , tracker: null
          , johan_ci: [ Node<li class="commit">, ... ]
          }
        )

   A selector returns an array of matches prefixed for "css*" and "css+" (ditto
   xpath), and a single result if it is prefixed "css" or "css?":

   If your script should only run on pages with a particular DOM node (or set of
   nodes), use the 'css' or 'css+' (ditto xpath) forms - and your callback won't
   get fired on pages that lack them. The 'css?' and 'css*' forms would run your
   callback but pass null or [] respectively, on not finding such nodes. You may
   recognize the semantics of x, x?, x* and x+ from regular expressions.

   (see http://goo.gl/ejtMD for a more thorough discussion of something similar)

   The dom prtoperty is recursively defined so you can make nested structures.
   If you want a property that itself is an object full of matched things, pass
   an object of sub-dom-spec:s, instead of a string selector:

   on dom:
        meta:
          base:  'xpath? /head/base
          title: 'xpath  string(/head/title)'
        commits: 'css* li.commit'
      ready: (dom) ->

   You can also deconstruct repeated templated sections of a page into subarrays
   scraped as per your specs, by picking a context node for a dom spec. This is
   done by passing a two-element array: a selector resolving what node/nodes you
   look at and a dom spec describing how you want it/them deconstructed for you:

   on dom:
        meta:
          [ 'xpath /head',
            base:  'xpath? base
            title: 'xpath  string(title)'
          ]
        commits:
          [ 'css* li.commit',
            avatar_url:  ['css img.gravatar', 'xpath string(@src)']
            author_name: 'xpath string(.//*[@class="author-name"])'
          ]
      ready: (dom) ->

   The mandatory/optional selector rules defined above behave as you'd expect as
   used for context selectors too: a mandatory node or array of nodes will limit
   what pages your script gets called on to those that match it, so your code is
   free to assume it will always be there when it runs. An optional context node
   that is not found will instead result in that part of your DOM being null, or
   an empty array, in the case of a * selector.

 */

function on(opts) {
  function get(x)      { rules[x] = undefined; return opts[x]; }
  function isArray(x)  { return Object_toString.call(x) === '[object Array]'; }
  function isObject(x) { return Object_toString.call(x) === '[object Object]'; }
  function array(a)    { return Array_slice.call(a, 0); } // array:ish => Array
  function arrayify(x) { return isArray(x) ? x : [x]; }  // non-array? => Array
  var input = [] // args for the callback(s?) the script wants to run
    , rules = Object.create(opts) // wraps opts in a pokeable inherit layer
    , tests =
      { path_re: [test_regexp, location.pathname]
      , query:   [test_query,  location.search]
      , dom:     [test_dom,    document]
      }
    , FAIL = new function() {}
    , Object_toString = Object.prototype.toString
    , Array_slice = Array.prototype.slice
    , debug = get('debug')
    , script = get('name')
    , ready = get('ready')
    , load = get('load')
    , name, rule, test, result
    ;

  if (typeof ready !== 'function' && typeof load !== 'function')
    throw new Error('on() needs at least a "ready" or "load" function!');

  try {
    for (name in rules) {
      rule = rules[name];
      if (rule === undefined) continue; // was some callback, or other non-rule
      test = tests[name];
      if (!test) throw new Error('did not grok rule "'+ name +'"!');
      result = test[0].call(test[1], rule);
      if (result === FAIL) return false; // this page doesn't satisfy all rules
      if (result !== undefined) input.push(result);
    }
  }
  catch(e) {
    if (debug) console.warn("on(debug): we didn't run because " + e.message);
    return false;
  }

  if (ready) ready.apply(opts, input.concat());
  if (load) window.addEventListener('load', function() {
    ready.apply(opts, input.concat());
  });
  return input.concat(opts);

  function test_query(spec) {
    var q = unparam(this);
    if (spec === true) return q; // true => decode the query for me!
    throw new Error('bad query type '+ (typeof spec) +': '+ rule);
  }

  function unparam(query) {
    var data = {};
    (query || '').replace(/\+/g, '%20').split('&').forEach(function(kv) {
      kv = /^\??([^=]*)=(.*)/.exec(kv);
      if (!kv) return;
      var prop, val, k = kv[1], v = kv[2], e, m;
      try { prop = decodeURIComponent(k); } catch (e) { prop = unescape(k); }
      try { val  = decodeURIComponent(v); } catch (e) { val  = unescape(v); }
      data[prop] = val;
    });
    return data;
  }

  function test_regexp(spec) {
    if (!isArray(spec)) spec = arrayify(spec);
    var re = spec.shift();
    if (typeof re === 'string') re = new RegExp(re);
    if (!(re instanceof RegExp))
      throw new Error((typeof re) +' was not a regexp: '+ re);

    var ok = re.exec(this);
    if (ok === null) return FAIL;
    if (!spec.length) return ok;
    var named = {};
    ok.shift(); // drop matching-whole-regexp part
    while (spec.length) named[spec.shift()] = ok.shift();
    return named;
  }

  // DOM constraint tester / scraper facility:
  // "this" is the context Node(s) - initially the document
  // "spec" is either of:
  //   * css / xpath Selector "selector_type selector"
  //   * resolved for context [ context Selector, spec ]
  //   * an Object of spec(s) { property_name: spec, ... }
  function test_dom(spec) {
    var tests =
        { 'css':    not_null($C)
        , 'css?':   $C
        , 'css+':   one_or_more($c)
        , 'css*':   $c
        , 'xpath':  not_null($X)
        , 'xpath?': $X
        , 'xpath+': one_or_more($x)
        , 'xpath*': $x
        }
      , context, results, result, i, property_name;

    // validate context:
    if (this === null || this === FAIL) return this;
    if (isArray(this)) {
      for (results = [], i = 0; i < this.length; i++) {
        result = test_dom.call(this[i], spec);
        if (result === FAIL) return FAIL;
        results.push(result);
      }
      return results;
    }
    if (typeof this !== 'object' || !('nodeType' in this))
      throw new Error('illegal context: '+ this);

    // handle input spec format:
    if (typeof spec === 'string') return lookup.call(this, spec);
    if (isArray(spec)) {
      context = lookup.call(this, spec[0]);
      return test_dom.call(context, spec[1]);
    }
    if (isObject(spec)) {
      results = {};
      for (property_name in spec) {
        result = test_dom.call(this, spec[property_name]);
        if (result === FAIL) return FAIL;
        results[property_name] = result;
      }
      return results;
    }

    throw new Error("dom spec was neither a String, Object nor Array: "+ spec);

    function lookup(rule) {
      if (typeof rule !== 'string')
        throw new Error('non-String dom match rule: '+ rule);
      var match = /^((?:css|xpath)[?+*]?)\s+(.*)/.exec(rule), type, func;
      if (match) {
        type = match[1];
        rule = match[2];
        func = tests[type];
      }
      if (!func) throw new Error('unknown dom match rule: '+ rule);
      return func.call(this, rule);
    }

    function not_null(fn) { return function(s) {
      var x = fn.apply(this, arguments); return x !== null ? x : FAIL;
    }; }

    function one_or_more(fn) { return function(s) {
      var x = fn.apply(this, arguments); return x.length ? x : FAIL;
    }; }

    function $c(css) { return array(this.querySelectorAll(css)); }
    function $C(css) { return this.querySelector(css); }

    function $x(xpath) {
      var doc = this.evaluate ? this : this.ownerDocument, next;
      var got = doc.evaluate(xpath, this, null, 0, null), all = [];
      switch (got.resultType) {
        case got.STRING_TYPE:  return got.stringValue;
        case got.NUMBER_TYPE:  return got.numberValue;
        case got.BOOLEAN_TYPE: return got.booleanValue;
        default: while ((next = got.iterateNext())) all.push(next); return all;
      }
    }
    function $X(xpath) {
      var got = $x.call(this, xpath);
      return got instanceof Array ? got[0] || null : got;
    }
  }
}
