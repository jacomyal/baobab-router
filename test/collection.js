'use strict';

// Reinitialize the URL hash:
window.location.hash = '';

var Baobab = require('baobab'),
    assert = require('assert'),
    BaobabRouter = require('../baobab-router.js');



// Instanciate a Baobab tree and its related router:
var tree = new Baobab({
      logged: false,
      view: 'home',
      data: {
        pid: null
      }
    }),
    router = new BaobabRouter(tree, [
      {
        route: '/login',
        state: { logged: false }
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
      },
      {
        route: '/home'
      },
    ]);



// Modifying the state should update the URL:
describe('Initialisation', function() {
  it('should not have impacted the hash yet', function() {
    assert.equal(window.location.hash, '');
  });

  // Start the router:
  it('should update the URL when .run() is called', function() {
    router.run();
    assert.equal(window.location.hash, '#/login');
  });
});

// Modifying the state should update the URL:
describe('Ascending communication', function() {
  it('should stop on the first matching case', function(done) {
    tree.set('view', 'settings').commit();
    setTimeout(function() {
      assert.equal(window.location.hash, '#/settings');
      assert.equal(tree.get('view'), 'settings');
      assert.equal(tree.get(['data', 'pid']), null);
      done();
    }, 0);
  });

  it('should check all cases until one matches', function(done) {
    tree.set('view', 'home').commit();
    setTimeout(function() {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get(['data', 'pid']), null);
      done();
    }, 0);
  });

  it('should not match cases where some dynamic attributes are missing', function(done) {
    tree.set('view', 'project').commit();
    setTimeout(function() {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'project');
      assert.equal(tree.get(['data', 'pid']), null);
      done();
    }, 0);
  });

  it('should work with dynamics attributes', function(done) {
    tree.set('view', 'project').set(['data', 'pid'], '123456').commit();
    setTimeout(function() {
      assert.equal(window.location.hash, '#/project/123456');
      assert.equal(tree.get('view'), 'project');
      assert.equal(tree.get(['data', 'pid']), '123456');
      done();
    }, 0);
  });

  it('should work with dynamics attributes - bis', function(done) {
    tree.set('view', 'project.settings').set('pid', '123456').commit();
    setTimeout(function() {
      assert.equal(window.location.hash, '#/project/123456/settings');
      assert.equal(tree.get('view'), 'project.settings');
      assert.equal(tree.get(['data', 'pid']), '123456');
      done();
    }, 0);
  });
});



// Modifying the URL should update the state, and eventually reupdate the URL:
describe('Descending communication', function() {
  tree.set('view', 'home')
      .set('pid', null);

  it('should fallback to the default route when no route matches', function(done) {
    window.location.hash = '#/invalid/route';
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

  it('should work fine when a route does match - ter', function(done) {
    window.location.hash = '#/project';
    setTimeout(function() {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get(['data', 'pid']), null);
      done();
    }, 0);
  });

  it('should work fine when a route does match with dynamic attribute', function(done) {
    window.location.hash = '#/project/123456';
    setTimeout(function() {
      assert.equal(window.location.hash, '#/project/123456');
      assert.equal(tree.get('view'), 'home');
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

  it('should throw an error when a router is bound to a tree that already has a router', function() {
    assert.throws(
      function() {
        var router = new BaobabRouter(tree, [ { route: '/' } ]);
      },
      /A router has already been bound to this tree/
    );
  });
});
