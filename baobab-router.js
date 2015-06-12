'use strict';

var HashUrlHandler = function() {
  var
    _onChangeCallback,
    _hashListener,
    _hashInterval,
    _stored;

  function init(onChangeCallback) {
    _onChangeCallback = onChangeCallback;
    _stored = window.location.hash.replace(/^#/, '');
    _onChangeCallback(_stored);

    // Listen to the url changes:
    if ('onhashchange' in window) {
      _hashListener = function() {
        var url = window.location.hash.replace(/^#/, '');
        if (url !== _stored) {
          _stored = url;
          _onChangeCallback(_stored);
        }
      };

      window.addEventListener('hashchange', _hashListener, false);
    } else {
      _stored = window.location.hash;
      _hashInterval = window.setInterval(function() {
        var url = window.location.hash.replace(/^#/, '');
        if (url !== _stored) {
          _stored = url;
          _onChangeCallback(_stored);
        }
      }, 100);
    }
  }

  function updateUrl(url, force) {
    if (force || _stored !== url) {
      window.location.hash = url;
      _stored = url;
      _onChangeCallback(_stored);
    }
  }

  function kill() {
    // Url update capture:
    if (_hashListener)
      window.removeEventListener('hashchange', _hashListener, false);
    else if (_hashInterval)
      window.clearInterval(_hashInterval);
  }

  this.init = init;
  this.updateUrl = updateUrl;
  this.kill = kill;
};

var HistoryUrlHandler = function(settings) {
  var
    _settings = settings || {},
    _history = _settings.history || window.history,
    _basePath = _settings.basePath || '',
    _onChangeCallback,
    _popstateListener;

  function init(onChangeCallback) {
    _onChangeCallback = onChangeCallback;
    _popstateListener = function(e) {
      var path = window.location.pathname.substring(_basePath.length);
      _onChangeCallback(path);
    };

    window.addEventListener('popstate', _popstateListener);
    _popstateListener();
  }

  function updateUrl(url) {
    if (window.location.pathname !== _basePath + url) {
      _history.pushState(null, null, _basePath + url);
    }
  }

  function kill() {
    window.removeEventListener('popstate', _popstateListener, false);
  }

  function navigate(url) {
    HistoryUrlHandler.navigate(_basePath, url);
  }

  this.init = init;
  this.updateUrl = updateUrl;
  this.kill = kill;
  this.navigate = navigate;
};

HistoryUrlHandler.navigate = function(basePath, url) {
  var popstateEvent = document.createEvent('Event');
  popstateEvent.initEvent('popstate', true, true);
  window.history.pushState(null, null, basePath + url);
  window.dispatchEvent(popstateEvent);
};

/*************************
 * PRIVATE STATIC METHODS:
 * ***********************
 */
var __defaultSolver = /:([^\/:]*)/g;

/**
 * This function takes a route's url (that might have some expression to solve,
 * such as /toto/:tutu/tata or so), and an actual url. It will then compare
 * them to find if the url does match.
 *
 * Examples:
 * *********
 * > __doesUrlMatch('/a/b/c', '/a/b/c');  // returns true
 * > __doesUrlMatch('/a/b/c', '/a/c/b');  // returns false
 *
 * > __doesUrlMatch('/a/b', '/a/b/c');    // returns true
 * > __doesUrlMatch('/a/:b/c', '/a/b/c'); // returns true
 * > __doesUrlMatch('/a/:b', '/a/b/c');   // returns true
 *
 * > __doesUrlMatch('/a/:b', '/a/b/c', /:([^\/:]*)/g);      // returns true
 * > __doesUrlMatch('/a/{b}', '/a/b/c', /\{([^\/\}]*)\}/g); // returns true
 * > __doesUrlMatch('/a/:b', '/a/b/c', /\{([^\/\}]*)\}/g);  // returns false
 *
 * @param  {string}  routeUrl The route's url.
 * @param  {string}  url      The current url.
 * @param  {?RegExp} solver    The dynamic values solver. If not specified, the
 *                             default solver will be used instead.
 * @return {boolean}           Returns true if the url does match the path, and
 *                             false else.
 */
function __doesUrlMatch(routeUrl, url, solver) {
  var i,
      l,
      match,
      routeArray = routeUrl.split('/'),
      urlArray = url.split('/');

  // Check lengths:
  if (routeArray.length > urlArray.length)
    return false;

  for (i = 0, l = routeArray.length; i < l; i++) {
    match = routeArray[i].match(solver || __defaultSolver);

    if (
      (!match && (routeArray[i] !== urlArray[i])) ||
      (match && !urlArray[i])
    )
      return false;
  }

  return true;
}

/**
 * This function takes a route's state constraints (that might have some dynamic
 * values, such as ":tutu" or so), and the actual app state. It will then
 * compare them to find if the url does match, and return an object with the
 * dynamic strings current values. It returns false if the state does not match.
 *
 * Scalars are compared with the "===" operator, but another test checks if both
 * values to treat them as the same value.
 *
 * @param  {object}  routeState    The route's state constraints.
 * @param  {object}  url          The current state.
 * @param  {array}   dynamicValues The array of the dynamic values.
 * @return {?object}               Returns an object with the dynamic values if
 *                                 the state does match the constraints, and
 *                                 null else.
 */
function __doesStateMatch(routeState, state, dynamicValues) {
  var k,
      localResults,
      results = {};

  dynamicValues = dynamicValues || [];

  // Arrays:
  if (Array.isArray(routeState)) {
    if (!Array.isArray(state) || routeState.length !== state.length)
      return null;
    else {
      if (routeState.every(function(val, i) {
        if ((localResults = __doesStateMatch(val, state[i], dynamicValues))) {
          results = __deepMerge(results, localResults);
          return true;
        }
      }))
        return results;
      else
        return null;
    }

  // Objects:
  } else if (routeState && typeof routeState === 'object') {
    if (!state || typeof state !== 'object')
      return null;
    else {
      for (k in routeState)
        if ((localResults = __doesStateMatch(
          routeState[k],
          state[k],
          dynamicValues
        ))) {
          results = __deepMerge(results, localResults).value;
        } else {
          return null;
        }

      return results;
    }

  // Dynamics:
  } else if (~dynamicValues.indexOf(routeState)) {
    results[routeState] = state;
    return results;

  // Null / undefined cases:
  } else if (
    (routeState === undefined || routeState === null) &&
    (state === undefined || state === null)
  ) {
    return results;

  // Other scalars:
  } else if (routeState === state)
    return results;

  return null;
}

/**
 * This function will extract from a state constraints object and a list of
 * dynamic value names a list of paths, with the related values. The goal is to
 * transform state contraints object into baobab compliant paths for later
 * updates.
 *
 * @param  {route}  state    The state constraints to extract the paths from.
 * @param  {array}  dynamics The array of the dynamic values names (like ":toto"
 *                           for instance).
 * @param  {?array} results  The results array to push the newly found paths
 *                           into. Only used in the recursion.
 * @param  {?array} path     The current path to use as paths prefix. Only used
 *                           in the recursion.
 * @return {array}           The array of every paths found, with the related
 *                           found values and a flag specifying wether the paths
 *                           are related to a dynamic value or not.
 */
function __extractPaths(state, dynamics, results, path) {
  results = results || [];
  dynamics = dynamics || [];

  var i,
      l,
      result;

  for (i in state) {
    if (
      state[i] &&
      (typeof state[i] === 'object') &&
      Object.keys(state[i]).length
    )
      __extractPaths(
        state[i],
        dynamics,
        results,
        (path || []).concat(i)
      );
    else
      results.push({
        path: (path || []).concat(i),
        value: state[i],
        dynamic: !!~dynamics.indexOf(state[i])
      });
  }

  return results;
}

/**
 * This function will build the routes tree, formed for BaobabRouter. It will do
 * the following things, and then execute recursively on the children routes:
 *
 *   - Check default routes validity (must match a child's path)
 *   - Retrieve for each route the list of related paths
 *   - Detect sub-routes overriding a parent's state
 *   - Detect dynamic patterns in routes
 *
 * The function identifies the tree's root when no baseState and no basePath are
 * given.
 *
 * @param  {object}  route     The input route object.
 * @param  {regexp}  solver    The solver to use.
 * @param  {?object} baseState The optional base state, ie the recursively
 *                             merged state of the route's parents.
 * @param  {?string} basePath  The optional base path, ie the recursively
 *                             concatenated path of the route's parents.
 * @return {route}             The well-formed route object.
 */
function __makeRoutes(route, solver, baseTree, basePath) {
  var mergedTree,
      routeTree = {};

  if (route.state)
    routeTree.state = route.state;
  if (route.facets)
    routeTree.facets = route.facets;
  mergedTree = __deepMerge(baseTree || {}, routeTree);

  basePath = basePath || '';

  route.fullPath = __concatenatePaths(basePath, route.path);
  route.fullTree = mergedTree.value;
  route.overrides = mergedTree.conflicts;
  route.dynamics = route.fullPath.match(solver) || [];
  route.updates = __extractPaths(route.fullTree, route.dynamics);

  if (route.defaultRoute)
    route.fullDefaultPath =
      __concatenatePaths(route.fullPath, route.defaultRoute);

  if (route.routes)
    route.routes = route.routes.map(function(child) {
      return __makeRoutes(
        child,
        solver,
        route.fullTree,
        route.fullPath
      );
    });

  route.overrides =
    route.overrides ||
    (route.routes || []).some(function(child) {
      return child.overrides;
    });

  // Some root-specific verifications:
  if (arguments.length <= 2) {
    // Find every facets in the tree:
    route.facets = Object.keys(
      (route.routes || []).reduce(function findFacets(facets, route) {
        for (var k in route.facets || {})
          facets[k] = true;

        (route.routes || []).reduce(findFacets, facets);
        return facets;
      }, {})
    );

    // Check read-only paths:
    route.readOnly = (route.readOnly || []).map(function(path) {
      return ['state'].concat(path);
    }).concat(route.facets.map(function(facet) {
      return ['facets', facet];
    }));

    // The root must have a default route:
    if (!route.defaultRoute)
      throw (new Error(
        'BaobabRouter.__makeRoutes: ' +
        'The root must have a default route.'
      ));
  }

  // Check that default route is valid:
  if (
    route.defaultRoute &&
    !(route.routes || []).some(function(child) {
      return __doesUrlMatch(child.path, route.defaultRoute);
    })
  )
    throw (new Error(
      'BaobabRouter.__makeRoutes: ' +
      'The default route "' + route.defaultRoute + '" does not match any ' +
      'registered route.'
    ));

  if (!('path' in route) && !route.defaultRoute)
    throw (new Error(
      'BaobabRouter.__makeRoutes: ' +
      'A route must have either a path or a default route.'
    ));

  // Each route must have some state restriction (except for the root):
  if (arguments.length > 2 && !route.updates.length)
    throw (new Error(
      'BaobabRouter.__makeRoutes: ' +
      'Each route should have some state restrictions.'
    ));

  return route;
}

/**
 * This function will merge multiple objects into one. Each object will
 * overrides the previous ones. Also, this function will return an object with
 * two keys: "value" contains the new object, and "conflicts" is a flag
 * specifying wether some paths contain different values in different objects.
 *
 * Examples:
 * *********
 * > var a = { key: 'value' },
 * >     b = __deepMerge(a);
 * > a === b; // false
 * > b.key;   // 'value'
 *
 * > __deepMerge(
 * >   { a: 1 },
 * >   { b: 1 },
 * >   { c: 1 }
 * > );
 * > // { a: 1, b: 1, c: 1 }
 *
 * > __deepMerge(
 * >   { a: 1 },
 * >   { a: 2 },
 * >   { a: 3 }
 * > );
 * > // { a: 3 }
 *
 * @param  {object*} objects The objects to merge.
 * @return {object}          An object containing the merged object under the
 *                           key "value", and a flag specifying if some keys
 *                           where having different values in the different
 *                           arguments, under the key "conflicts".
 */
function __deepMerge() {
  var i,
      k,
      l,
      obj,
      res,
      merged,
      conflicts = false;

  for (i = 0, l = arguments.length; i < l; i++) {
    obj = arguments[i];

    if (obj && typeof obj === 'object') {
      if (!res)
        res = Array.isArray(obj) ? [] : {};

      for (k in obj) {
        merged = __deepMerge(res[k], obj[k]);
        conflicts = conflicts || merged.conflicts;
        res[k] = merged.value;
      }

    } else {
      if (res !== undefined && res !== obj)
        conflicts = true;
      res = obj;
    }
  }

  return {
    value: res,
    conflicts: conflicts
  };
}

/**
 * This function compares two arrays (usually two paths for Baobab), and returns
 * true if they have the same length and equals elements in the same order.
 *
 * @param  {array}   a1 The first array.
 * @param  {array}   a2 The second array.
 * @return {boolean}    True if the values are equals, false else.
 */
function __compareArrays(a1, a2) {
  var i,
      l = a1.length;

  if (
    !Array.isArray(a1) ||
    !Array.isArray(a2) ||
    l !== a2.length
  )
    return false;

  for (i = 0; i < l; i++)
    if (a1[i] !== a2[i])
      return false;

  return true;
}

/**
 * This function takes a well formed URL from any BaobabRouter instance's route,
 * with potentially dynamic attributes to resolve, and a object with the related
 * values, and returns the URL with the values inserted instead of the dynamics.
 *
 * Examples:
 * *********
 * > __resolveURL('a/b/c'); // same as __resolveURL('a/b/c', {});
 * > // 'a/b/c' (nothing to solve)
 *
 * > __resolveURL('a/:b/c/:d', { ':b': 'B', ':d': 'D' });
 * > // 'a/B/c/D'
 *
 * > __resolveURL('a/:b/:b', { ':b': 'B' });
 * > // 'a/B/B'
 *
 * > __resolveURL('a/:b/:c', { ':c': 'C', ':d': 'D' });
 * > // 'a/:b/C'
 *
 * @param  {string}  url The URL to resolve.
 * @param  {?object} obj An optional object with the dynamic values to insert.
 * @return {string}      The resolved URL.
 */
function __resolveURL(url, obj) {
  obj = obj || {};

  return url.split('/').map(function(s) {
    return obj.hasOwnProperty(s) ? obj[s] : s;
  }).join('/');
}

/**
 * This function builds a proper path from a route's path and its parents paths.
 *
 * Examples:
 * *********
 * > __concatenatePaths('a');        // '/a'
 * > __concatenatePaths('/a');       // '/a'
 * > __concatenatePaths('a', '');    // '/a'
 * > __concatenatePaths('', 'b');    // '/b'
 *
 * > __concatenatePaths('a', 'b');   // '/a/b'
 * > __concatenatePaths('a', '/b');  // '/a/b'
 * > __concatenatePaths('a/', '/b'); // '/a/b'
 * > __concatenatePaths('a/', 'b');  // '/a/b'
 * > __concatenatePaths('/a', '/b'); // '/a/b'
 *
 * @param  {string+} paths the different paths to concatenate.
 * @return {string}        The cleaned path.
 */
function __concatenatePaths() {
  return (
    ('/' + Array.prototype.map.call(arguments, function(str) {
      return str || '';
    }).join('/'))
      .replace(/\/+/g, '/')
      .replace(/\/+$/g, '')
  );
}




/**
 * The baobab-router constructor. In its current state, the baobab-router does
 * not expose anything to its public API.
 *
 * Recognized settings:
 * ********************
 * - {?RegExp} solver A custom solver to identify dynamic values in paths.
 *
 * @param {Baobab}  tree     The Baobab instance to connect the router to.
 * @param {Object}  routes   The routes tree. It must have a defaultRoute string
 *                           and a routes array.
 * @param {?Object} settings An optional object of settings. The list of
 *                           recognized settings is described up here.
 */
var BaobabRouter = function(tree, routes, settings) {

  /*********************
   * PRIVATE ATTRIBUTES:
   * *******************
   */

  var _facet,
      _facetListener,
      _stateListener,
      _tree = tree,
      _settings = settings || {},
      _solver = _settings.solver || __defaultSolver,
      _urlHandler = _settings.urlHandler || new HashUrlHandler(),
      _routesTree = __makeRoutes(__deepMerge(routes).value, _solver),
      _forceUpdateUrl = false;





  /******************
   * PRIVATE METHODS:
   * ****************
   */

  /**
   * This function will recursively check the url to find a route that matches.
   * If none is found, then the default route will be used instead.
   *
   * Then, the state will be updated to match the selected route's state
   * constraints.
   */
  function _checkUrl(url, basePath, baseRoute) {
    var match,
        doCommit,
        path = basePath || '',
        route = baseRoute || _routesTree;

    // Check if route match:
    match = __doesUrlMatch(route.fullPath, url);
    if (!match)
      return false;

    // Check if a child does match (without using default values):
    if (
      route.routes &&
      route.routes.some(function(child) {
        return _checkUrl(url, route.fullPath, child);
      })
    )
      return true;

    // If there is a default route, check which route it does match:
    if (match && route.defaultRoute) {
      url = (url || '').split('/');
      path = route.fullDefaultPath.split('/').map(function(str, i) {
        return str.match(_solver) ?
          url[i] || str :
          str;
      }).join('/');
      _updateUrl(path);
      return true;
    }

    // If the route matched and has no default route:
    if (match && !route.defaultRoute) {
      // Apply updates:
      route.updates.map(function(obj) {
        var update = {
          path: obj.path,
          value: obj.value
        };

        if (obj.dynamic)
          update.value = url.split('/')[
            route.fullPath.split('/').indexOf(update.value)
          ];

        if (!_routesTree.readOnly.some(function(path) {
          return __compareArrays(update.path, path);
        })) {
          if (update.path.length > 1) {
            _tree.set(update.path.slice(1), update.value);
            doCommit = true;
          }
        }
      });

      // Commit only if something has actually been updated:
      if (doCommit)
        _tree.commit();

      return true;
    }
  }

  /**
   * This function will recursively check the state to find a route with
   * matching state constraints. If none is found, then the default route will
   * be used instead.
   *
   * Then, the url will be updated to match the selected route's one.
   */
  function _checkState(basePath, baseRoute, baseTree) {
    var k,
        match,
        path = basePath || '',
        tree = baseTree || {
          state: _tree.get(),
          facets: _routesTree.facets.reduce(function(res, facet) {
            res[facet] = _tree.facets[facet].get();
            return res;
          }, {})
        },
        route = baseRoute || _routesTree;

    // Check if route match:
    match = baseTree ?
      __doesStateMatch(tree, route.fullTree, route.dynamics) :
      __doesStateMatch(route.fullTree, tree, route.dynamics);
    if (!match && arguments.length > 0 && !route.overrides)
      return false;

    // Check if a child does match:
    if (
      route.routes &&
      route.routes.some(function(child) {
        return _checkState(route.fullPath, child);
      })
    )
      return true;

    // If the root route did not find any match, let's compare the tree with
    // only the read-only restrictions:
    if (!arguments.length) {
      _forceUpdateUrl = true;

      var restrictedTree = __extractPaths(tree).filter(function(obj) {
        return _routesTree.readOnly.some(function(path) {
          return __compareArrays(obj.path, path);
        });
      }).reduce(function(res, obj) {
        obj.path.reduce(function(localTree, string, i) {
          if (i === obj.path.length - 1)
            localTree[string] = obj.value;
          else
            localTree[string] =
              localTree[string] ||
              (
                typeof obj.path[i + 1] === 'number' ?
                  [] :
                  {}
              );

          return localTree[string];
        }, res);
        return res;
      }, {});

      if (
        route.routes.some(function(child) {
          return _checkState(route.fullPath, child, restrictedTree);
        })
      )
        return true;
    }

    if (match) {
      _updateUrl(__resolveURL(
        route.defaultRoute ?
          route.fullDefaultPath :
          route.fullPath,
        match
      ));

      return true;
    }
  }

  /**
   * This function will update the url, and execute the _checkUrl method
   * if the new url is different from the stored one.
   *
   * @param  {string} url The new url.
   */
  function _updateUrl(url) {
    var _force = _forceUpdateUrl;
    _forceUpdateUrl = false;
    if (_urlHandler.updateUrl(url, _force)) {
      _checkUrl(url);
    }
  }





  /*****************
   * PUBLIC METHODS:
   * ***************
   */
  function kill() {
    _urlHandler.kill();

    // Unbind the tree:
    _facet.release();
    _routesTree.facets.forEach(function(facet) {
      _tree.facets[facet].off('update', _facetListener);
    });
    _tree.router = null;
  }





  /*****************
   * INITIALIZATION:
   * ***************
   */

  // Check that there is no router already bound to this tree:
  if (_tree.router)
    throw (new Error(
      'BaobabRouter (constructor): ' +
      'A router has already been bound to this tree.'
    ));
  _tree.router = this;

  // Listen to the state changes:
  _facetListener = function() {
    _checkState();
  };

  _facet = _tree.createFacet({
    cursors: __extractPaths(
      _routesTree.routes.reduce(
        function _extract(arr, child) {
          return (child.routes || []).reduce(
            _extract,
            arr.concat(child.updates.map(function(obj) {
              return obj.path.slice(1);
            }))
          );
        },
        []
      ).filter(function(path) {
        return path && path.length;
      }).reduce(function(context, path) {
        path.reduce(function(localContext, key) {
          return (key in localContext) ?
            localContext[key] :
            (localContext[key] = {});
        }, context);
        return context;
      }, {}),
      []
    ).reduce(function(result, obj, i) {
      result['path_' + i] = obj.path;
      return result;
    }, {})
  });

  _facet.on('update', _facetListener);
  _routesTree.facets.forEach(function(facet) {
    _tree.facets[facet].on('update', _facetListener);
  });

  // Export publics:
  this.kill = kill;

  _urlHandler.init(function(url) {
    _checkUrl(url);
  });
};

// Baobab-Router version:
BaobabRouter.version = '1.0.0';

// Expose private methods for unit testing:
BaobabRouter.__doesUrlMatch = __doesUrlMatch;
BaobabRouter.__doesStateMatch = __doesStateMatch;
BaobabRouter.__extractPaths = __extractPaths;
BaobabRouter.__makeRoutes = __makeRoutes;
BaobabRouter.__deepMerge = __deepMerge;
BaobabRouter.__compareArrays = __compareArrays;
BaobabRouter.__resolveURL = __resolveURL;
BaobabRouter.__concatenatePaths = __concatenatePaths;

// Expose private attributes for unit testing:
BaobabRouter.__defaultSolver = __defaultSolver;

// Expose public types:
BaobabRouter.HashUrlHandler = HashUrlHandler;
BaobabRouter.HistoryUrlHandler = HistoryUrlHandler;

/****************
 * EXPORT MODULE:
 * **************
 */
module.exports = BaobabRouter;
