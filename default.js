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

 */
function on(opts) {
  function get(x) { rules[x] = undefined; return opts[x]; }
  function array(a) { return typeof a === 'object' && a.length ? a : [a]; }
  function isArray(a) {
    return '[object Array]' === Object.prototype.toString.call(a);
  }
  var input = [] // args for the callback(s?) the script wants to run
    , rules = Object.create(opts)
    , tests =
      { path_re: [test_regexp, location.pathname]
      , query:   [test_query,  location.search]
      , dom:     [test_dom,    document]
      }
    , FAIL = new function() {}
    , debug = get('debug')
    , script = get('name')
    , ready = get('ready')
    , load = get('load')
    , name, rule, test, outcome
    ;

  if (typeof ready !== 'function' && typeof load !== 'function')
    throw new Error('on() needs at least a "ready" or "load" function!');

  try {
    for (name in rules) {
      rule = rules[name];
      if (rule === undefined) continue; // was some callback, or other non-rule
      test = tests[name];
      if (!test) throw new Error('did not grok rule "'+ name +'"!');
      outcome = run_test(name, rule, test);
      if (outcome === FAIL) return false; // this page doesn't satisfy all rules
      if (outcome !== undefined) input.push(outcome);
    }
  }
  catch(e) {
    if (debug) console.warn("on(debug): we didn't run because of", e);
    return false;
  }

  if (ready) ready.apply(opts, input.concat());
  if (load) window.addEventListener('load', function() {
    ready.apply(opts, input.concat());
  });
  return input.concat(opts);

  function run_test(name, rule, test_spec) {
    var fn = test_spec.shift(), data = test_spec.shift();
    return fn.apply(data, array(rule));
  }

  function test_query(rule) {
    var q = unparam(this);
    if (rule === true) return q; // true => decode the query for me!
    throw new Error('bad query type '+ (typeof rule) +': '+ rule);
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

  function test_regexp(re, names) {
    if (typeof re === 'string') re = new RegExp(re);
    if (!(re instanceof RegExp))
      throw new Error((typeof re) +' was not a regexp: '+ re);

    var ok = re.exec(this);
    if (ok === null) return FAIL;
    if (!names) return ok;
    for (var named = {}, i = 1; i < arguments.length; i++)
      named[arguments[i]] = ok[i];
    return named;
  }

  function test_dom(rules) {
    var tests =
        { css:    not_null($C)
        , 'css?': $C
        , 'css+': one_or_more($c)
        , 'css*': $c
        , xpath:  not_null($X)
        , 'xpath?': $X
        , 'xpath+': one_or_more($x)
        , 'xpath*': $x
        }
      , predicate = /^((?:css|xpath)[?+*]?)\s+(.*)/
      , dom = {}
      , type, rule, func, match, got;

    for (var name in rules) {
      if ((match = predicate.exec(rules[name]))) {
        type = match[1];
        rule = match[2];
        func = tests[type];
      }
      if (!match || !func)
        throw new Error('unknown dom match rule: '+ rules[name]);
      if ((got = func.call(this, rule)) === FAIL) return FAIL;
      dom[name] = got;
      rules[name] = rule;
    }
    return dom;

    function not_null(fn) { return function(s) {
      var x = fn.apply(this, arguments); return x !== null ? x : FAIL;
    }; }

    function one_or_more(fn) { return function(s) {
      var x = fn.apply(this, arguments); return x.length ? x : FAIL;
    }; }

    function $c(css) { return this.querySelectorAll(css); }
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
