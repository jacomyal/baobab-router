'use strict';

// Reinitialize the URL hash:
window.location.hash = '';

var Baobab = require('baobab'),
    assert = require('assert'),
    BaobabRouter = require('../baobab-router.js');



// Instanciate a Baobab tree and its related router:
var unloggedState = {
      logged: false,
      view: null,
      data: {
        pid: null
      }
    },
    loggedState = {
      logged: true,
      view: 'home',
      data: {
        pid: null
      }
    },
    routes = {
      defaultRoute: '/login',
      readOnly: [['logged']],
      routes: [
        {
          path: '/login',
          state: { view: 'login',
                   logged: false,
                   data: { pid: null } }
        },
        {
          path: '',
          state: { logged: true,
                   data: { pid: null } },
          defaultRoute: '/home',
          routes: [
            {
              path: '/home',
              state: { view: 'home' }
            },
            {
              path: '/settings',
              state: { view: 'settings', }
            },
            {
              path: '/project/:pid',
              state: { view: 'project',
                       data: { pid: ':pid' } },
              routes: [
                {
                  path: '/settings',
                  state: { view: 'project.settings' }
                },
                {
                  path: '/dashboard',
                  state: { view: 'project.dashboard' }
                }
              ]
            }
          ]
        }
      ]
    };



function _newTree(state) {
  return new Baobab(state || loggedState);
}

function _newRouter(tree) {
  return new BaobabRouter(tree || _newTree(), routes);
}



describe('Instanciation and destruction:', function() {
  var tree,
      router;

  afterEach(function(done) {
    router.kill();
    window.location.hash = '';
    router = null;

    setInterval(done, 0);
  });

  it('it should update the URL when the router is instanciated', function(done) {
    assert.equal(window.location.hash, '');
    tree = _newTree();
    router = _newRouter(tree);

    setTimeout(function() {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get('data', 'pid'), null);
      done();
    }, 0);
  });
});



describe('Ascending communication', function() {
  var tree,
      router;

  beforeEach(function(done) {
    window.location.hash = '';
    tree = _newTree();
    router = _newRouter(tree);

    setInterval(done, 0);
  });

  afterEach(function(done) {
    router.kill();
    window.location.hash = '';
    router = null;

    setInterval(done, 0);
  });

  it('should stop on the first matching case', function(done) {
    tree.set('logged', true)
        .set('view', 'settings')
        .set(['data', 'pid'], null)
        .commit();

    assert.equal(window.location.hash, '#/settings');
    assert.equal(tree.get('view'), 'settings');
    assert.equal(tree.get('data', 'pid'), null);

    setTimeout(function() {
      done();
    }, 0);
  });

  it('should check all cases until one matches', function(done) {
    tree.set('logged', true)
        .set('view', 'home')
        .set(['data', 'pid'], null)
        .commit();

    assert.equal(window.location.hash, '#/home');
    assert.equal(tree.get('view'), 'home');
    assert.equal(tree.get('data', 'pid'), null);

    setTimeout(function() {
      done();
    }, 0);
  });

  it('should work with dynamics attributes', function(done) {
    tree.set('logged', true)
        .set('view', 'project')
        .set(['data', 'pid'], '123456')
        .commit();

    assert.equal(window.location.hash, '#/project/123456');
    assert.equal(tree.get('view'), 'project');
    assert.equal(tree.get('data', 'pid'), '123456');

    setTimeout(function() {
      done();
    }, 0);
  });

  it('should work with children overriding values', function(done) {
    tree.set('logged', true)
        .set('view', 'project.settings')
        .set(['data', 'pid'], '123456')
        .commit();

    assert.equal(window.location.hash, '#/project/123456/settings');
    assert.equal(tree.get('view'), 'project.settings');
    assert.equal(tree.get('data', 'pid'), '123456');

    setTimeout(function() {
      done();
    }, 0);
  });

  it('should not match cases where some dynamic attributes are missing', function(done) {
    tree.set('logged', true)
        .set('view', 'project')
        .set(['data', 'pid'], null)
        .commit();

    assert.equal(window.location.hash, '#/home');
    assert.equal(tree.get('view'), 'home');
    assert.equal(tree.get('data', 'pid'), null);

    setTimeout(function() {
      done();
    }, 0);
  });
});



describe('Descending communication', function() {
  var tree,
      router;

  beforeEach(function(done) {
    window.location.hash = '';
    tree = _newTree();
    router = _newRouter(tree);

    setInterval(done, 0);
  });

  afterEach(function(done) {
    router.kill();
    window.location.hash = '';
    router = null;

    setInterval(done, 0);
  });

  it('should fallback to the default route when no route matches', function(done) {
    window.location.hash = '#/invalid/route';

    setTimeout(function() {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get('data', 'pid'), null);
      done();
    }, 0);
  });

  it('should fallback to the default route when no route matches - bis', function(done) {
    window.location.hash = '#/project';

    setTimeout(function() {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get('data', 'pid'), null);
      done();
    }, 0);
  });

  it('should work fine when a route does match', function(done) {
    window.location.hash = '#/home';

    setTimeout(function() {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get('data', 'pid'), null);
      done();
    }, 0);
  });

  it('should work fine when a route does match - bis', function(done) {
    window.location.hash = '#/settings';

    setTimeout(function() {
      assert.equal(window.location.hash, '#/settings');
      assert.equal(tree.get('view'), 'settings');
      assert.equal(tree.get('data', 'pid'), null);
      done();
    }, 0);
  });

  it('should work fine when a route does match with dynamic attribute', function(done) {
    window.location.hash = '#/project/123456';

    setTimeout(function() {
      assert.equal(window.location.hash, '#/project/123456');
      assert.equal(tree.get('view'), 'project');
      assert.equal(tree.get('data', 'pid'), '123456');
      done();
    }, 0);
  });

  it('should work fine when a route does match with dynamic attribute - bis', function(done) {
    window.location.hash = '#/project/123456/settings';

    setTimeout(function() {
      assert.equal(window.location.hash, '#/project/123456/settings');
      assert.equal(tree.get('view'), 'project.settings');
      assert.equal(tree.get('data', 'pid'), '123456');
      done();
    }, 0);
  });
});



describe('Read-only state constraints', function() {
  var tree,
      router;

  beforeEach(function(done) {
    window.location.hash = '';
    tree = _newTree(unloggedState);
    router = _newRouter(tree);

    setInterval(done, 0);
  });

  afterEach(function(done) {
    router.kill();
    window.location.hash = '';
    router = null;

    setInterval(done, 0);
  });

  it('should fallback on a route with the good values for read-only constraints (ascending)', function(done) {
    tree.set('logged', false)
        .set('view', 'home')
        .set(['data', 'pid'], null)
        .commit();

    setTimeout(function() {
      assert.equal(window.location.hash, '#/login');
      assert.equal(tree.get('logged'), false);
      assert.equal(tree.get('view'), 'login');
      assert.equal(tree.get('data', 'pid'), null);
      done();
    }, 0);
  });

  it('should fallback on a route with the good values for read-only constraints (descending)', function(done) {
    window.location.hash = '#/home';

    setTimeout(function() {
      assert.equal(window.location.hash, '#/login');
      assert.equal(tree.get('logged'), false);
      assert.equal(tree.get('view'), 'login');
      assert.equal(tree.get('data', 'pid'), null);
      done();
    }, 0);
  });
});



describe('API and errors', function() {
  it('should throw an error when a router is initialized without default route', function() {
    assert.throws(
      function() {
        var router = new BaobabRouter(
          new Baobab({ toto: null }),
          { routes: [ { path: '/toto', state: { toto: true } } ] }
        );
      },
      /The root must have a default route/
    );
  });

  it('should throw an error when a route does not have any state restriction', function() {
    assert.throws(
      function() {
        var router = new BaobabRouter(
          new Baobab({ toto: null }),
          { routes: [ { path: 'app' } ], defaultRoute: 'app' }
        );
      },
      /Each route should have some state restrictions/
    );
  });

  it('should throw an error when the default route does not match any existing route', function() {
    assert.throws(
      function() {
        var router = new BaobabRouter(
          new Baobab({ toto: null }),
          { defaultRoute: 'somethingElse' }
        );
      },
      /The default route "somethingElse" does not match any registered route/
    );

    assert.throws(
      function() {
        var router = new BaobabRouter(
          new Baobab({ toto: null }),
          { routes: [ { path: 'app', state: { key: 'value' } } ], defaultRoute: 'somethingElse' }
        );
      },
      /The default route "somethingElse" does not match any registered route/
    );
  });

  it('should throw an error when a route does not have any path nor defaultRoute', function() {
    assert.throws(
      function() {
        var router = new BaobabRouter(
          new Baobab({ toto: null }),
          { routes: [ { state: { key: 'value' } } ] }
        );
      },
      /A route must have either a path or a default route/
    );

    assert.throws(
      function() {
        var router = new BaobabRouter(
          new Baobab({ toto: null }),
          { routes: [ { state: { key: 'value' }, routes: [ { path: '/somePath', state: { key2: 'value2' } } ] } ] }
        );
      },
      /A route must have either a path or a default route/
    );
  });

  it('should throw an error when a router is bound to a tree that already has a router', function() {
    var tree = _newTree(),
        router1 = _newRouter(tree);

    assert.throws(
      function() { _newRouter(tree); },
      /A router has already been bound to this tree/
    );
  });
});
