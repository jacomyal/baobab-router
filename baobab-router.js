'use strict';



/*************************
 * PRIVATE STATIC METHODS:
 * ***********************
 */
var __defaultSolver = /:([^\/:]*)/g;

/**
 * This function takes a route's hash (that might have some expression to solve,
 * such as /toto/:tutu/tata or so), and an actual hash. It will then compare
 * them to find if the hash does match.
 *
 * Examples:
 * *********
 * > __doesHashMatch('/a/b/c', '/a/b/c');  // returns true
 * > __doesHashMatch('/a/b/c', '/a/c/b');  // returns false
 *
 * > __doesHashMatch('/a/b', '/a/b/c');    // returns true
 * > __doesHashMatch('/a/:b/c', '/a/b/c'); // returns true
 * > __doesHashMatch('/a/:b', '/a/b/c');   // returns true
 *
 * > __doesHashMatch('/a/:b', '/a/b/c', /:([^\/:]*)/g);      // returns true
 * > __doesHashMatch('/a/{b}', '/a/b/c', /\{([^\/\}]*)\}/g); // returns true
 * > __doesHashMatch('/a/:b', '/a/b/c', /\{([^\/\}]*)\}/g);  // returns false
 *
 * @param  {string}  routeHash The route's hash.
 * @param  {string}  hash      The current hash.
 * @param  {?RegExp} solver    The dynamic values solver. If not specified, the
 *                             default solver will be used instead.
 * @return {boolean}           Returns true if the hash does match the path, and
 *                             false else.
 */
function __doesHashMatch(routeHash, hash, solver) {
  var i,
      l,
      match,
      routeArray = routeHash.split('/'),
      hashArray = hash.split('/');

  // Check lengths:
  if (routeArray.length > hashArray.length)
    return false;

  for (i = 0, l = routeArray.length; i < l; i++) {
    match = routeArray[i].match(solver || __defaultSolver);

    if (
      (!match && (routeArray[i] !== hashArray[i])) ||
      (match && !hashArray[i])
    )
      return false;
  }

  return true;
}

/**
 * This function takes a route's state constraints (that might have some dynamic
 * values, such as ":tutu" or so), and the actual app state. It will then
 * compare them to find if the hash does match, and return an object with the
 * dynamic strings current values. It returns false if the state does not match.
 *
 * Scalars are compared with the "===" operator, but another test checks if both
 * values to treat them as the same value.
 *
 * @param  {object}  routeState    The route's state constraints.
 * @param  {object}  hash          The current state.
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
function __makeRoutes(route, solver, baseState, basePath) {
  var mergedState = __deepMerge(baseState || {}, route.state || {});

  basePath = basePath || '';

  route.fullPath = __concatenatePaths(basePath, route.path);
  route.fullState = mergedState.value;
  route.overrides = mergedState.conflicts;
  route.dynamics = route.fullPath.match(solver) || [];
  route.updates = __extractPaths(route.fullState, route.dynamics);

  if (route.defaultRoute)
    route.fullDefaultPath =
      __concatenatePaths(route.fullPath, route.defaultRoute);

  if (route.routes)
    route.routes = route.routes.map(function(child) {
      return __makeRoutes(child, solver, route.fullState, route.fullPath);
    });

  route.overrides =
    route.overrides ||
    (route.routes || []).some(function(child) {
      return child.overrides;
    });

  // Some root-specific verifications:
  if (arguments.length <= 2) {
    route.readOnly = route.readOnly || [];

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
      return __doesHashMatch(child.path, route.defaultRoute);
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
      _hashInterval,
      _hashListener,
      _stateListener,
      _tree = tree,
      _settings = settings || {},
      _solver = _settings.solver || __defaultSolver,
      _stored = window.location.hash.replace(/^#/, ''),
      _routesTree = __makeRoutes(__deepMerge(routes).value, _solver);





  /******************
   * PRIVATE METHODS:
   * ****************
   */

  /**
   * This function will recursively check the hash to find a route that matches.
   * If none is found, then the default route will be used instead.
   *
   * Then, the state will be updated to match the selected route's state
   * constraints.
   */
  function _checkHash(hash, basePath, baseRoute) {
    var match,
        doCommit,
        path = basePath || '',
        route = baseRoute || _routesTree;

    // Check if route match:
    match = __doesHashMatch(route.fullPath, hash);
    if (!match)
      return false;

    // Check if a child does match (without using default values):
    if (
      route.routes &&
      route.routes.some(function(child) {
        return _checkHash(hash, route.fullPath, child);
      })
    )
      return true;

    // If there is a default route, check which route it does match:
    if (match && route.defaultRoute) {
      hash = (hash || '').split('/');
      path = route.fullDefaultPath.split('/').map(function(str, i) {
        return str.match(_solver) ?
          hash[i] || str :
          str;
      }).join('/');
      _updateHash(path);
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
          update.value = hash.split('/')[
            route.fullPath.split('/').indexOf(update.value)
          ];

        if (!_routesTree.readOnly.some(function(path) {
          return __compareArrays(update.path, path);
        })) {
          _tree.set(update.path, update.value);
          doCommit = true;
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
   * Then, the hash will be updated to match the selected route's one.
   */
  function _checkState(basePath, baseRoute, baseState) {
    var k,
        match,
        path = basePath || '',
        state = baseState || _tree.get(),
        route = baseRoute || _routesTree;

    // Check if route match:
    match = baseState ?
      __doesStateMatch(state, route.fullState, route.dynamics) :
      __doesStateMatch(route.fullState, state, route.dynamics);
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
      _stored = null;

      var restrictedState = __extractPaths(state).filter(function(obj) {
        return _routesTree.readOnly.some(function(path) {
          return __compareArrays(obj.path, path);
        });
      }).reduce(function(res, obj) {
        obj.path.reduce(function(localState, string, i) {
          if (i === obj.path.length - 1)
            localState[string] = obj.value;
          else
            localState[string] =
              localState[string] ||
              (
                typeof obj.path[i + 1] === 'number' ?
                  [] :
                  {}
              );

          return localState[string];
        }, res);
        return res;
      }, {});

      if (
        route.routes.some(function(child) {
          return _checkState(route.fullPath, child, restrictedState);
        })
      )
        return true;
    }

    if (match) {
      _updateHash(__resolveURL(
        route.defaultRoute ?
          route.fullDefaultPath :
          route.fullPath,
        match
      ));

      return true;
    }
  }

  /**
   * This function will update the hash, and execute the _checkHash method
   * if the new hash is different from the stored one.
   *
   * @param  {string} hash The new hash.
   */
  function _updateHash(hash) {
    if (_stored !== hash) {
      window.location.hash = hash;

      // Force execute _checkHash:
      if (hash !== _stored) {
        _stored = hash;
        _checkHash(_stored);
      }
    }
  }





  /*****************
   * PUBLIC METHODS:
   * ***************
   */
  function kill() {
    // Hash update capture:
    if (_hashListener)
      window.removeEventListener('hashchange', _hashListener, false);
    else if (_hashInterval)
      window.clearInterval(_hashInterval);

    // Unbind the tree:
    // _facet.off(_stateListener);
    _facet.release();
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

  // Listen to the hash changes:
  if ('onhashchange' in window) {
    _hashListener = function() {
      var hash = window.location.hash.replace(/^#/, '');
      if (hash !== _stored) {
        _stored = hash;
        _checkHash(_stored);
      }
    };

    window.addEventListener('hashchange', _hashListener, false);
  } else {
    _stored = window.location.hash;
    _hashInterval = window.setInterval(function() {
      var hash = window.location.hash.replace(/^#/, '');
      if (hash !== _stored) {
        _stored = hash;
        _checkHash(_stored);
      }
    }, 100);
  }

  // Listen to the state changes:
  _facet = _tree.createFacet({
    cursors: __extractPaths(
      _routesTree.routes.reduce(
        function _extract(arr, child) {
          return (child.routes || []).reduce(
            _extract,
            arr.concat(child.updates.map(function(obj) {
              return obj.path;
            }))
          );
        },
        []
      ).reduce(function(context, path) {
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

  _facet.on('update', function() {
    _checkState();
  });

  // Export publics:
  this.kill = kill;

  // Read the current hash:
  _checkHash(_stored);
};


// Expose private methods for unit testing:
BaobabRouter.__doesHashMatch = __doesHashMatch;
BaobabRouter.__doesStateMatch = __doesStateMatch;
BaobabRouter.__extractPaths = __extractPaths;
BaobabRouter.__makeRoutes = __makeRoutes;
BaobabRouter.__deepMerge = __deepMerge;
BaobabRouter.__compareArrays = __compareArrays;
BaobabRouter.__resolveURL = __resolveURL;
BaobabRouter.__concatenatePaths = __concatenatePaths;

// Expose private attributes for unit testing:
BaobabRouter.__defaultSolver = __defaultSolver;


/****************
 * EXPORT MODULE:
 * **************
 */
module.exports = BaobabRouter;
