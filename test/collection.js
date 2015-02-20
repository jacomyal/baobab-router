'use strict';

// Reinitialize the URL hash:
window.location.hash = '';

var Baobab = require('baobab'),
    assert = require('assert'),
    BaobabRouter = require('../baobab-router.js');



// Instanciate a Baobab tree and its related router:
var router,
    tree = new Baobab({
      logged: true,
      view: 'home',
      data: {
        pid: null
      }
    }),
    routes = [
      {
        route: '/login',
        state: { logged: false }
      },
      {
        route: '/home',
        defaultRoute: true,
        state: { view: 'home',
                 data: { pid: null } }
      },
      {
        route: '/settings',
        state: { view: 'settings',
                 data: { pid: null } }
      },
      {
        route: '/projects',
        state: { view: 'projects',
                 data: { pid: null } }
      },
      {
        route: '/project/:pid/settings',
        state: { view: 'project.settings',
                 data: { pid: ':pid' } }
      },
      {
        route: '/project/:pid/dashboard',
        state: { view: 'project.dashboard',
                 data: { pid: ':pid' } }
      },
      {
        route: '/project/:pid',
        state: { view: 'project',
                 data: { pid: ':pid' } }
      }
    ];



// Modifying the state should update the URL:
describe('Initialisation', function() {
  // Instanciate the router:
  it('should update the URL when the router is instanciated', function(done) {
    assert.equal(window.location.hash, '');
    router = new BaobabRouter(tree, routes);

    setTimeout(function() {
      assert.equal(window.location.hash, '#/home');
      done();
    }, 0);
  });
});



// Modifying the state should update the URL:
describe('Ascending communication', function() {
  beforeEach(function(done) {
    window.location.hash = '';
    setInterval(done, 0);
  });

  it('should not match cases where some dynamic attributes are missing', function(done) {
    tree.set('view', 'project')
        .select(['data', 'pid']).edit(null);
    tree.commit();

    assert.equal(window.location.hash, '#/home');
    assert.equal(tree.get('view'), 'home');
    assert.equal(tree.get(['data', 'pid']), null);

    setTimeout(function() {
      done();
    }, 0);
  });

  it('should stop on the first matching case', function(done) {
    tree.set('view', 'settings')
        .commit();

    assert.equal(window.location.hash, '#/settings');
    assert.equal(tree.get('view'), 'settings');
    assert.equal(tree.get(['data', 'pid']), null);

    setTimeout(function() {
      done();
    }, 0);
  });

  it('should check all cases until one matches', function(done) {
    tree.set('view', 'home')
        .commit();

    assert.equal(window.location.hash, '#/home');
    assert.equal(tree.get('view'), 'home');
    assert.equal(tree.get(['data', 'pid']), null);

    setTimeout(function() {
      done();
    }, 0);
  });

  it('should work with dynamics attributes', function(done) {
    tree.set('view', 'project')
        .select(['data', 'pid']).edit('123456')
    tree.commit();

    assert.equal(window.location.hash, '#/project/123456');
    assert.equal(tree.get('view'), 'project');
    assert.equal(tree.get(['data', 'pid']), '123456');

    setTimeout(function() {
      done();
    }, 0);
  });

  it('should work with dynamics attributes - bis', function(done) {
    tree.set('view', 'project.settings')
        .select(['data', 'pid']).edit('123456')
    tree.commit();

    assert.equal(window.location.hash, '#/project/123456/settings');
    assert.equal(tree.get('view'), 'project.settings');
    assert.equal(tree.get(['data', 'pid']), '123456');

    setTimeout(function() {
      done();
    }, 0);
  });
});



// Modifying the URL should update the state, and eventually reupdate the URL:
describe('Descending communication', function() {
  beforeEach(function(done) {
    window.location.hash = '';
    setInterval(function() {
      done();
    }, 0);
  });

  it('should fallback to the default route when no route matches', function(done) {
    window.location.hash = '#/invalid/route';
    setTimeout(function() {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get(['data', 'pid']), null);
      done();
    }, 0);
  });

  it('should fallback to the default route when no route matches - bis', function(done) {
    window.location.hash = '#/project';
    setTimeout(function() {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get(['data', 'pid']), null);
      done();
    }, 0);
  });

  it('should work fine when a route does match', function(done) {
    window.location.hash = '#/home';
    setTimeout(function() {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get(['data', 'pid']), null);
      done();
    }, 0);
  });

  it('should work fine when a route does match - bis', function(done) {
    window.location.hash = '#/settings';
    setTimeout(function() {
      assert.equal(window.location.hash, '#/settings');
      assert.equal(tree.get('view'), 'settings');
      assert.equal(tree.get(['data', 'pid']), null);
      done();
    }, 0);
  });

  it('should work fine when a route does match with dynamic attribute', function(done) {
    window.location.hash = '#/project/123456';
    setTimeout(function() {
      assert.equal(window.location.hash, '#/project/123456');
      assert.equal(tree.get('view'), 'project');
      assert.equal(tree.get(['data', 'pid']), '123456');
      done();
    }, 0);
  });

  it('should work fine when a route does match with dynamic attribute - bis', function(done) {
    window.location.hash = '#/project/123456/settings';
    setTimeout(function() {
      assert.equal(window.location.hash, '#/project/123456/settings');
      assert.equal(tree.get('view'), 'project.settings');
      assert.equal(tree.get(['data', 'pid']), '123456');
      done();
    }, 0);
  });
});



// API and errors:
describe('API and errors', function() {
  it('should throw an error when a router is initialized without default route', function() {
    assert.throws(
      function() {
        var router = new BaobabRouter(
          new Baobab({ toto: null }),
          [ { route: '/toto', state: { toto: true } } ]
        );
      },
      /The default route is missing/
    );
  });

  it('should throw an error when a router is initialized with several default routes', function() {
    assert.throws(
      function() {
        var router = new BaobabRouter(
          new Baobab({ toto: null }),
          [ { route: '/toto', state: { toto: true }, defaultRoute: true },
            { route: '/toto', state: { toto: true }, defaultRoute: true } ]
        );
      },
      /There should be only one default route/
    );
  });

  it('should throw an error when a route does not have any state restriction', function() {
    assert.throws(
      function() {
        var router = new BaobabRouter(
          new Baobab({ toto: null }),
          [ { route: '/', defaultRoute: true } ]
        );
      },
      /Each route should have some state restrictions/
    );
  });

  it('should throw an error when a router is bound to a tree that already has a router', function() {
    assert.throws(
      function() {
        var router = new BaobabRouter(
          tree,
          [ { route: '/', state: {}, defaultRoute: true } ]
        );
      },
      /A router has already been bound to this tree/
    );
  });
});
