'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/**
 * ***********************
 * PRIVATE STATIC METHODS:
 * ***********************
 */
var __defaultSolver = /:([^\/:]*)/g;

/**
 * This function compares two arrays (usually two paths for Baobab), and returns
 * true if they have the same length and equals elements in the same order.
 *
 * @param  {array}   a1 The first array.
 * @param  {array}   a2 The second array.
 * @return {boolean}    True if the values are equals, false else.
 */
function __compareArrays(a1, a2) {
  var l = a1.length;

  if (!Array.isArray(a1) || !Array.isArray(a2) || l !== a2.length) {
    return false;
  }

  for (var i = 0; i < l; i++) {
    if (a1[i] !== a2[i]) {
      return false;
    }
  }

  return true;
}

/**
 * This function takes a well formed URL from any BaobabRouter instance's route,
 * with potentially dynamic and query attributes to resolve, and an object with
 * the related values, and returns the URL with the query, and with the values
 * inserted instead of the dynamics.
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
 * > __resolveURL('a/:b/:c', { ':c': 'C', ':d': 'D' }, { e: 'E', f: 'F' });
 * > // 'a/:b/C?e=E&f=F'
 *
 * @param  {string}  url The URL to resolve.
 * @param  {?object} dyn An optional object with the dynamic values to insert.
 * @param  {?object} qry An optional object with the query values to insert.
 * @return {string}      The resolved URL.
 */
function __resolveURL(url) {
  var dyn = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
  var qry = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  var hash = url.split('/').map(function (s) {
    return s in dyn ? escape(dyn[s]) : s;
  }).join('/');
  var query = Object.keys(qry).filter(function (k) {
    return qry[k] !== null && qry[k] !== undefined;
  }).map(function (k) {
    return escape(k) + '=' + escape(qry[k]);
  }).join('&');

  return query ? hash + '?' + query : hash;
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
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return ('/' + args.map(function (str) {
    return str || '';
  }).join('/')).replace(/\/+/g, '/').replace(/\/+$/g, '');
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
  var res = undefined;
  var merged = undefined;
  var conflicts = false;

  for (var i = 0, l = arguments.length; i < l; i++) {
    var obj = arguments[i];

    if (obj && (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object') {
      if (!res) {
        res = Array.isArray(obj) ? [] : {};
      }

      for (var k in obj) {
        if (obj.hasOwnProperty(k)) {
          merged = __deepMerge(res[k], obj[k]);
          conflicts = conflicts || merged.conflicts;
          res[k] = merged.value;
        }
      }
    } else {
      if (res !== undefined && res !== obj) {
        conflicts = true;
      }
      res = obj;
    }
  }

  return {
    conflicts: conflicts,
    value: res
  };
}

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
  var routeArray = routeHash.split('/');
  var hashArray = hash.replace(/\?.*$/, '').split('/');

  // Check lengths:
  if (routeArray.length > hashArray.length) {
    return false;
  }

  for (var i = 0, l = routeArray.length; i < l; i++) {
    var match = routeArray[i].match(solver || __defaultSolver);

    if (!match && routeArray[i] !== hashArray[i] || match && !hashArray[i]) {
      return false;
    }
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
 * The difference between the query and the dynamic values is that null dynamic
 * values are not allowed, while null query parameters are valid.
 *
 * @param  {object}  routeState The route's state constraints.
 * @param  {object}  hash       The current state.
 * @param  {array}   dynamics   The array of the dynamic values.
 * @param  {array}   query      The array of the query values.
 * @return {?object}            Returns an object with the dynamic values if the
 *                              state does match the constraints, and null else.
 */
function __doesStateMatch(routeState, state, dynamics, query) {
  var results = {};

  function searchRoutes(val, i) {
    var localResults = __doesStateMatch(val, state[i], dynamics, query);
    if (localResults) {
      results = __deepMerge(results, localResults);
      return true;
    }
  }

  // Arrays:
  if (Array.isArray(routeState)) {
    if (!Array.isArray(state) || routeState.length !== state.length) {
      return null;
    }

    if (routeState.every(searchRoutes)) {
      return results;
    }

    return null;

    // Objects:
  } else if (routeState && (typeof routeState === 'undefined' ? 'undefined' : _typeof(routeState)) === 'object') {
      if (!state || (typeof state === 'undefined' ? 'undefined' : _typeof(state)) !== 'object') {
        return null;
      }

      for (var k in routeState) {
        if (routeState.hasOwnProperty(k)) {
          var localResults = __doesStateMatch(routeState[k], state[k], dynamics, query);
          if (localResults) {
            results = __deepMerge(results, localResults).value;
          } else {
            return null;
          }
        }
      }

      return results;

      // Dynamics:
    } else if (~(dynamics || []).indexOf(routeState) && state) {
        results[routeState] = state;
        return results;

        // Query:
      } else if (~(query || []).indexOf(routeState) && ! ~(dynamics || []).indexOf(routeState)) {
          results[routeState] = state;
          return results;

          // Null / undefined cases:
        } else if ((routeState === undefined || routeState === null) && (state === undefined || state === null)) {
            return results;

            // Other scalars:
          } else if (routeState === state) {
              return results;
            }

  return null;
}

/**
 * This function will extract from a state constraints object and a list of
 * dynamic value names a list of paths, with the related values. The goal is to
 * transform state contraints object into baobab compliant paths for later
 * updates.
 *
 * @param  {route}  state    The state constraints to extract the paths from.
 * @param  {?array} dynamics The array of the dynamic values names (like ":toto"
 *                           for instance).
 * @param  {?array} results  The results array to push the newly found paths
 *                           into. Only used in the recursion.
 * @param  {?array} path     The current path to use as paths prefix. Only used
 *                           in the recursion.
 * @return {array}           The array of every paths found, with the related
 *                           found values and a flag specifying wether the paths
 *                           are related to a dynamic value or not.
 */
function __extractPaths(state) {
  var dynamics = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
  var results = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];
  var path = arguments.length <= 3 || arguments[3] === undefined ? [] : arguments[3];

  for (var i in state) {
    if (state.hasOwnProperty(i) && state[i] && _typeof(state[i]) === 'object' && Object.keys(state[i]).length) {
      __extractPaths(state[i], dynamics, results, path.concat(i));
    } else {
      results.push({
        path: path.concat(i),
        value: state[i],
        dynamic: !! ~dynamics.indexOf(state[i])
      });
    }
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
function __makeRoutes(route, solver, baseTree) {
  var basePath = arguments.length <= 3 || arguments[3] === undefined ? '' : arguments[3];

  var _deepMerge = __deepMerge(baseTree || {}, route.state ? { state: route.state } : {});

  var value = _deepMerge.value;
  var conflicts = _deepMerge.conflicts;


  route.fullPath = __concatenatePaths(basePath, route.path);
  route.fullTree = value;
  route.overrides = conflicts;
  route.dynamics = route.fullPath.match(solver) || [];

  route.queryValues = [];
  for (var k in route.query || {}) {
    if (route.query.hasOwnProperty(k)) {
      if (typeof route.query[k] === 'string') {
        route.query[k] = {
          match: route.query[k]
        };
      }

      route.queryValues.push(route.query[k].match);
    }
  }

  route.updates = __extractPaths(route.fullTree, route.dynamics.concat(route.queryValues));

  if (route.defaultRoute) {
    route.fullDefaultPath = __concatenatePaths(route.fullPath, route.defaultRoute);
  }

  if (route.routes) {
    route.routes = route.routes.map(function (child) {
      return __makeRoutes(child, solver, route.fullTree, route.fullPath);
    });
  }

  route.overrides = route.overrides || (route.routes || []).some(function (child) {
    return child.overrides;
  });

  // Some root-specific verifications:
  if (arguments.length <= 2) {
    // Check read-only paths:
    route.readOnly = (route.readOnly || []).map(function (path) {
      return ['state'].concat(path);
    });

    // The root must have a default route:
    if (!route.defaultRoute) {
      throw new Error('BaobabRouter.__makeRoutes: ' + 'The root must have a default route.');
    }
  }

  // Check that default route is valid:
  if (route.defaultRoute && !(route.routes || []).some(function (child) {
    return __doesHashMatch(child.path, route.defaultRoute);
  })) {
    throw new Error('BaobabRouter.__makeRoutes: ' + 'The default route "' + route.defaultRoute + '" does not match any ' + 'registered route.');
  }

  if (!('path' in route) && !route.defaultRoute) {
    throw new Error('BaobabRouter.__makeRoutes: ' + 'A route must have either a path or a default route.');
  }

  // Each route must have some state restriction (except for the root):
  if (arguments.length > 2 && !route.updates.length) {
    throw new Error('BaobabRouter.__makeRoutes: ' + 'Each route should have some state restrictions.');
  }

  return route;
}

/**
 * The baobab-router constructor. In its current state, the baobab-router does
 * not expose anything to its public API.
 *
 * Recognized settings:
 * ********************
 * - {?RegExp} solver A custom solver to identify dynamic values in paths.
 *
 * @param {Baobab}  baobab The Baobab instance to connect the router to.
 * @param {Object}  routes   The routes tree. It must have a defaultRoute string
 *                           and a routes array.
 * @param {?Object} settings An optional object of settings. The list of
 *                           recognized settings is described up here.
 */
var BaobabRouter = function BaobabRouterConstr(baobab, routes, settings) {
  /* *******************
   * PRIVATE ATTRIBUTES:
   * *******************
   */
  var _tree = baobab;
  var _settings = settings || {};
  var _solver = _settings.solver || __defaultSolver;
  var _routesTree = __makeRoutes(__deepMerge(routes).value, _solver);

  var _watcher = undefined;
  var _hashInterval = undefined;
  var _hashListener = undefined;
  var _watcherListener = undefined;
  var _stored = window.location.hash.replace(/^#/, '');

  /* ****************
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
  function _checkHash(baseHash, basePath, baseRoute) {
    var route = baseRoute || _routesTree;
    var match = __doesHashMatch(route.fullPath, baseHash);

    var doCommit = undefined;
    var doForceCommit = undefined;
    var hash = baseHash;
    var path = basePath || '';

    if (!match) {
      return false;
    }

    // Check if a child does match (without using default values):
    if (route.routes && route.routes.some(function (child) {
      return _checkHash(hash, route.fullPath, child);
    })) {
      return true;
    }

    // If there is a default route, check which route it does match:
    if (match && route.defaultRoute) {
      hash = (hash || '').split('/');
      path = route.fullDefaultPath.split('/').map(function (str, i) {
        return str.match(_solver) ? hash[i] || str : str;
      }).join('/');

      // The following line is no more linted, because of some circular deps on
      // the two functions:
      _updateHash(path); //eslint-disable-line
      return true;
    }

    // If the route matched and has no default route:
    if (match && !route.defaultRoute) {
      var _ret = function () {
        var queryValues = hash.replace(/^[^\?]*\??/, '').split('&').reduce(function (res, str) {
          var arr = str.split('=');
          var query = (route.query || {})[arr[0]] || {};
          var value = undefined;

          switch (query.cast) {
            case 'number':
              value = +arr[1];
              break;
            case 'boolean':
              value = arr[1] === 'true' ? true : false;
              break;
            default:
              value = arr[1];
          }

          res[query.match] = value;
          return res;
        }, {});

        // Apply updates:
        route.updates.map(function (obj) {
          var update = {
            path: obj.path,
            value: obj.value
          };

          if (obj.dynamic) {
            update.value = hash.split('/')[route.fullPath.split('/').indexOf(update.value)] || queryValues[update.value];
          }

          if (_routesTree.readOnly.every(function (str) {
            return !__compareArrays(update.path, str);
          }) && update.path.length > 1) {
            if (_tree.get(update.path.slice(1)) !== update.value) {
              _tree.set(update.path.slice(1), update.value);
              doCommit = true;
            } else {
              doForceCommit = true;
            }
          }
        });

        // Commit only if something has actually been updated:
        if (doCommit) {
          _tree.commit();
        } else if (doForceCommit) {
          _checkState(); //eslint-disable-line
        }

        return {
          v: true
        };
      }();

      if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
    }
  }

  /**
   * This function will update the hash, and execute the _checkHash method
   * if the new hash is different from the stored one.
   *
   * @param  {string} hash The new hash.
   */
  function _updateHash(hash) {
    var force = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    if (_stored !== hash || force) {
      window.location.hash = hash;

      _stored = hash;
      _checkHash(_stored);
    }
  }

  /**
   * This function will recursively check the state to find a route with
   * matching state constraints. If none is found, then the default route will
   * be used instead.
   *
   * Then, the hash will be updated to match the selected route's one.
   */
  function _checkState(basePath, baseRoute, baseTree) {
    var tree = baseTree || {
      state: _tree.get()
    };
    var route = baseRoute || _routesTree;

    // Check if route match:
    var match = baseTree ? __doesStateMatch(tree, route.fullTree, route.dynamics, route.queryValues) : __doesStateMatch(route.fullTree, tree, route.dynamics, route.queryValues);

    if (!match && arguments.length > 0 && !route.overrides) {
      return false;
    }

    // Check if a child does match:
    if (route.routes && route.routes.some(function (child) {
      return _checkState(route.fullPath, child);
    })) {
      return true;
    }

    // If the root route did not find any match, let's compare the tree with
    // only the read-only restrictions:
    if (!arguments.length) {
      var _ret2 = function () {
        _stored = null;

        var restrictedTree = __extractPaths(tree).filter(function (obj) {
          return _routesTree.readOnly.some(function (path) {
            return __compareArrays(obj.path, path);
          });
        }).reduce(function (res, obj) {
          obj.path.reduce(function (localTree, string, i) {
            if (i === obj.path.length - 1) {
              localTree[string] = obj.value;
            } else {
              localTree[string] = localTree[string] || (typeof obj.path[i + 1] === 'number' ? [] : {});
            }

            return localTree[string];
          }, res);
          return res;
        }, {});

        if (route.routes.some(function (child) {
          return _checkState(route.fullPath, child, restrictedTree);
        })) {
          return {
            v: true
          };
        }
      }();

      if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
    }

    if (match) {
      var query = {};

      for (var k in route.query) {
        if (route.query.hasOwnProperty(k)) {
          query[k] = match[route.query[k].match];
        }
      }

      _updateHash(__resolveURL(route.defaultRoute ? route.fullDefaultPath : route.fullPath, match, query),
      // If updating to a default route, then it might come from an invalid
      // state. And if the same route is already set, then forcing the hash
      // update is necessary to trigger the _checkHash to go back to a valid
      // state:
      !!route.defaultRoute);

      return true;
    }
  }

  /* ***************
   * PUBLIC METHODS:
   * ***************
   */
  function kill() {
    // Hash update capture:
    if (_hashListener) {
      window.removeEventListener('hashchange', _hashListener, false);
    } else if (_hashInterval) {
      window.clearInterval(_hashInterval);
    }

    // Unbind the tree:
    _watcher.release();
    _tree.router = null;
  }

  /* ***************
   * INITIALIZATION:
   * ***************
   */
  // Check that there is no router already bound to this tree:
  if (_tree.router) {
    throw new Error('BaobabRouter (constructor): ' + 'A router has already been bound to this tree.');
  }
  _tree.router = this;

  // Listen to the hash changes:
  if ('onhashchange' in window) {
    _hashListener = function _hashListener() {
      var hash = window.location.hash.replace(/^#/, '');
      if (hash !== _stored) {
        _stored = hash;
        _checkHash(_stored);
      }
    };

    window.addEventListener('hashchange', _hashListener, false);
  } else {
    _stored = window.location.hash;
    _hashInterval = window.setInterval(function () {
      var hash = window.location.hash.replace(/^#/, '');
      if (hash !== _stored) {
        _stored = hash;
        _checkHash(_stored);
      }
    }, 100);
  }

  // Listen to the state changes:
  _watcherListener = function _watcherListener() {
    return _checkState();
  };

  _watcher = _tree.watch(__extractPaths(_routesTree.routes.reduce(function _extract(arr, child) {
    return (child.routes || []).reduce(_extract, arr.concat(child.updates.map(function (obj) {
      return obj.path.slice(1);
    })));
  }, []).filter(function (path) {
    return path && path.length;
  }).reduce(function (context, path) {
    path.reduce(function (localContext, key) {
      return key in localContext ? localContext[key] : localContext[key] = {};
    }, context);

    return context;
  }, {}), []).reduce(function (result, obj, i) {
    result['path_' + i] = obj.path;
    return result;
  }, {}));

  _watcher.on('update', _watcherListener);

  // Export publics:
  this.kill = kill;

  // Read the current hash:
  _checkHash(_stored);
};

// Baobab-Router version:
BaobabRouter.version = '2.1.0';

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

/* **************
 * EXPORT MODULE:
 * **************
 */
exports.default = BaobabRouter;
module.exports = exports['default'];
