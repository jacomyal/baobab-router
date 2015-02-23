'use strict';

var __solver = /^:([^\/:]*)$/g;

function __checkHash(path, hash) {
  var i,
      l,
      match,
      pathArray = path.split('/'),
      hashArray = hash.split('/');

  // Check lengths:
  if (pathArray.length !== hashArray.length)
    return false;

  for (i = 0, l = pathArray.length; i < l; i++) {
    match = pathArray[i].match(__solver);

    if (
      (!match && (pathArray[i] !== hashArray[i])) ||
      (match && !hashArray[i])
    )
      return false;
  }

  return true;
}

function __extractUpdates(obj, dynamics, results, path) {
  results = results || [];
  var i,
      l,
      result;

  for (i in obj) {
    if (
      obj[i] &&
      (typeof obj[i] === 'object') &&
      Object.keys(obj[i]).length
    )
      __extractUpdates(
        obj[i],
        dynamics,
        results,
        (path || []).concat(i)
      );
    else
      results.push({
        path: (path || []).concat(i),
        value: obj[i],
        dynamic: !!~dynamics.indexOf(obj[i])
      });
  }

  return results;
}

var BaobabRouter = function(tree, routes, settings) {
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
            throw(new Error('There should be only one default route.'));
          _defaultRoute = route;
        }

        if (obj.state) {
          route.state = obj.state;
          route.updates = __extractUpdates(
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
          throw(new Error('Each route should have some state restrictions.'));

        return route;
      });

  // Check that there is no router already bound to this tree:
  if (_tree.router)
    throw(new Error('A router has already been bound to this tree.'));
  _tree.router = this;

  // Check that there is a default route:
  if (!_defaultRoute)
    throw(new Error('The default route is missing.'));

  function _onHashChange() {
    var i,
        l,
        route,
        updates,
        updated,
        hash = _stored;

    // Find which route matches:
    for (i = 0, l = _routes.length; i < l; i++)
      if (__checkHash(_routes[i].route, hash)) {
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

  function _onStateChange() {
    var i,
        l,
        route,
        match;

    // Find which route matches:
    for (i = 0, l = _routes.length; i < l; i++) {
      if (_routes[i].updates.every(function(obj) {
        return obj.dynamic ?
          !!_tree.get(obj.path) :
          (_tree.get(obj.path) === obj.value);
      })) {
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

  function _updateHash(hash) {
    if (_stored !== hash) {
      window.location.hash = hash;

      // Force execute _onHashChange:
      if (hash !== _stored) {
        _stored = hash;
        _onHashChange();
      }
    }
  }

  // Listen to the hash changes:
  if ('onhashchange' in window) {
    var _formerHandler = window.onhashchange;
    window.onhashchange = function() {
      if (typeof _formerHandler === 'function')
        _formerHandler.apply(this, arguments);

      var hash = window.location.hash.replace(/^#/, '');
      if (hash !== _stored) {
        _stored = hash;
        _onHashChange();
      }
    };
  } else {
    _stored = window.location.hash;
    window.setInterval(function() {
      var hash = window.location.hash.replace(/^#/, '');
      if (hash !== _stored) {
        _stored = hash;
        _onHashChange();
      }
    }, 100);
  }

  // Listen to the state changes:
  _cursor = __extractUpdates(_stateMasc, []).reduce(function(cursor, obj, i) {
    return cursor ?
      cursor.or(tree.select(obj.path)) :
      _tree.select(obj.path);
  }, null);
  _cursor.on('update', _onStateChange);

  // Read the current state:
  _onStateChange();
};

module.exports = BaobabRouter;
