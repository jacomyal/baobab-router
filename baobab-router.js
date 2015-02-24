'use strict';





/*************************
 * PRIVATE STATIC METHODS:
 * ***********************
 */
var __solver = /^:([^\/:]*)$/g;

/**
 * This function takes a route's hash (that might have some expression to solve,
 * such as /toto/:tutu/tata or so), and an actual hash. It will then compare
 * them to find if the hash does match.
 *
 * @param  {string} routeHash The route's hash.
 * @param  {string} hash      The current hash.
 * @return {boolean}          Returns true if the has does match the path, and
 *                            false else.
 */
function __doesHashMatch(routeHash, hash) {
  var i,
      l,
      match,
      routeArray = routeHash.split('/'),
      hashArray = hash.split('/');

  // Check lengths:
  if (routeArray.length !== hashArray.length)
    return false;

  for (i = 0, l = routeArray.length; i < l; i++) {
    match = routeArray[i].match(__solver);

    if (
      (!match && (routeArray[i] !== hashArray[i])) ||
      (match && !hashArray[i])
    )
      return false;
  }

  return true;
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
 * The baobab-router constructor. In its current state, the baobab-router does
 * not expose anything to its public API.
 *
 * @param {Baobab}  tree     The Baobab instance to connect the router to.
 * @param {Array}   routes   An array of routes. A route is an object with a
 *                           string hash and an object that describes the state
 *                           constraints of the route.
 * @param {?Object} settings An optional object of settings. There are currently
 *                           no recognized setting.
 */
var BaobabRouter = function(tree, routes, settings) {
  /*********************
   * PRIVATE ATTRIBUTES:
   * *******************
   */
  var _cursor,
      _stored,
      _tree = tree,
      _stateMasc = {},
      _settings = settings || {},
      _defaultRoute,
      _routes = routes.map(function(obj) {
        var route = {
          route: obj.route,
          dynamics: obj.route.split('/').filter(function(str) {
            return str.match(__solver);
          })
        };

        if (obj.defaultRoute) {
          if (_defaultRoute)
            throw (new Error('There should be only one default route.'));
          _defaultRoute = route;
        }

        if (obj.state) {
          route.state = obj.state;
          route.updates = __extractPaths(
            obj.state,
            route.dynamics
          );
          route.dynamicUpdates = route.updates.reduce(function(res, obj) {
            if (obj.dynamic)
              res[obj.value] = obj.path;
            return res;
          }, {});
          route.updates.forEach(function(obj) {
            obj.path.reduce(function(context, key) {
              return (key in context) ?
                context[key] :
                (context[key] = {});
            }, _stateMasc);
          });

        } else
          throw (new Error('Each route should have some state restrictions.'));

        return route;
      });





  /******************
   * PRIVATE METHODS:
   * ****************
   */

  /**
   * This function will check the hash to find a route that matches. If none is
   * found, then the default route will be used instead.
   *
   * Then, the state will be updated to match the selected route's state
   * constraints.
   */
  function _checkHash() {
    var i,
        l,
        route,
        updates,
        updated,
        hash = _stored;

    // Find which route matches:
    for (i = 0, l = _routes.length; i < l; i++)
      if (__doesHashMatch(_routes[i].route, hash)) {
        route = _routes[i];
        break;
      }

    // Fallback on default route if not found:
    if (!route) {
      route = _defaultRoute;
      _stored = null;
    }

    // Find updates to apply:
    updates = route.updates.map(function(obj) {
      var result = {
        path: obj.path,
        value: obj.value
      };

      if (obj.dynamic)
        result.value = hash.split('/')[
          route.route.split('/').indexOf(result.value)
        ];

      return result;
    });

    // Apply updates:
    for (i = 0, l = updates.length; i < l; i++) {
      updated = true;
      _tree.select(updates[i].path).edit(updates[i].value);
    }

    // Commit only if something has actually been updated:
    if (updated)
      _tree.commit();
  }

  /**
   * This function will check the state to find a route with matching state
   * constraints. If none is found, then the default route will be used instead.
   *
   * Then, the hash will be updated to match the selected route's one.
   */
  function _checkState() {
    var i,
        l,
        route,
        match;

    // Find which route matches:
    function everyCallback(obj) {
      return obj.dynamic ?
        !!_tree.get(obj.path) :
        (_tree.get(obj.path) === obj.value);
    }

    for (i = 0, l = _routes.length; i < l; i++) {
      if (_routes[i].updates.every(everyCallback)) {
        route = _routes[i];
        break;
      }
    }

    // Fallback on default route if not found:
    if (!route) {
      route = _defaultRoute;
      _stored = null;
    }

    // Shape the hash:
    _updateHash(
      route.dynamics.length ?
        route.route.split('/').map(function(str, i) {
          return str.match(__solver) ?
            _tree.get(route.dynamicUpdates[str]) :
            str;
        }).join('/') :
        route.route
    );
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
        _checkHash();
      }
    }
  }





  /*****************
   * INITIALIZATION:
   * ***************
   */

  // Check that there is no router already bound to this tree:
  if (_tree.router)
    throw (new Error('A router has already been bound to this tree.'));
  _tree.router = this;

  // Check that there is a default route:
  if (!_defaultRoute)
    throw (new Error('The default route is missing.'));

  // Listen to the hash changes:
  if ('onhashchange' in window) {
    var _formerHandler = window.onhashchange;
    window.onhashchange = function() {
      if (typeof _formerHandler === 'function')
        _formerHandler.apply(this, arguments);

      var hash = window.location.hash.replace(/^#/, '');
      if (hash !== _stored) {
        _stored = hash;
        _checkHash();
      }
    };
  } else {
    _stored = window.location.hash;
    window.setInterval(function() {
      var hash = window.location.hash.replace(/^#/, '');
      if (hash !== _stored) {
        _stored = hash;
        _checkHash();
      }
    }, 100);
  }

  // Listen to the state changes:
  _cursor = __extractPaths(_stateMasc, []).reduce(function(cursor, obj, i) {
    return cursor ?
      cursor.or(tree.select(obj.path)) :
      _tree.select(obj.path);
  }, null);
  _cursor.on('update', _checkState);

  // Read the current state:
  _checkState();
};





/****************
 * EXPORT MODULE:
 * **************
 */
module.exports = BaobabRouter;
