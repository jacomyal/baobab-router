'use strict';

var Baobab = require('baobab'),
    assert = require('assert'),
    BaobabRouter = require('../baobab-router.js');



var state = {
      view: null,
      projectId: null,
      projectData: null
    },

    routes = {
      defaultRoute: '/home',
      routes: [
        { path: '/home',
          state: {
            view: 'home',
            projectId: null
          } },
        { path: '/settings',
          state: {
            view: 'settings',
            projectId: null
          } },
        { path: '/project/:pid',
          defaultRoute: '/dashboard',
          state: {
            projectId: ':pid'
          },
          routes: [
            { path: '/settings',
              state: {
                view: 'project.settings'
              } },
            { path: '/dashboard',
              state: {
                view: 'project.dashboard'
              } }
          ] }
      ]
    };



function _newTree(obj) {
  return new Baobab(obj || state);
}

function _newRouter(tree) {
  return new BaobabRouter(tree || _newTree(), routes);
}



describe('Basic example (from the documentation)', function() {
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

  it('should start on the default route when instanciated', function(done) {
    setTimeout(function() {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get('projectId'), null);

      done();
    }, 0);
  });

  it('should work with a recognized state (first level)', function(done) {
    tree.set('view', 'settings')
        .set('projectId', null)
        .commit();

    setTimeout(function() {
      assert.equal(window.location.hash, '#/settings');

      done();
    }, 0);
  });

  it('should work with a recognized state (deep)', function(done) {
    tree.set('view', 'project.settings')
        .set('projectId', '123456')
        .commit();

    setTimeout(function() {
      assert.equal(window.location.hash, '#/project/123456/settings');

      done();
    }, 0);
  });

  it('should work with a recognized URL (first level)', function(done) {
    window.location.hash = '/settings';

    setTimeout(function() {
      assert.equal(tree.get('view'), 'settings');
      assert.equal(tree.get('projectId'), null);

      done();
    }, 0);
  });

  it('should work with a recognized URL (deep)', function(done) {
    window.location.hash = '/project/123456/dashboard';

    setTimeout(function() {
      assert.equal(tree.get('view'), 'project.dashboard');
      assert.equal(tree.get('projectId'), '123456');

      done();
    }, 0);
  });

  it('should fallback on default route when state is not recognized (first level)', function(done) {
    tree.set('view', 'something irrelevant')
        .set('projectId', null)
        .commit();

    setTimeout(function() {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get('projectId'), null);

      done();
    }, 0);
  });

  it('should fallback on default route when state is not recognized (deep)', function(done) {
    tree.set('view', 'something irrelevant')
        .set('projectId', 123456)
        .commit();

    setTimeout(function() {
      assert.equal(window.location.hash, '#/project/123456/dashboard');
      assert.equal(tree.get('view'), 'dashboard');
      assert.equal(tree.get('projectId'), 123456);

      done();
    }, 0);
  });

  it('should fallback on default route when URL is not recognized (first level)', function(done) {
    window.location.hash = '/something/irrelevant';

    setTimeout(function() {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get('projectId'), null);

      done();
    }, 0);
  });

  it('should fallback on default route when URL is not recognized (deep)', function(done) {
    window.location.hash = '/project/123456/irrelevant';

    setTimeout(function() {
      assert.equal(window.location.hash, '#/project/123456/dashboard');
      assert.equal(tree.get('view'), 'dashboard');
      assert.equal(tree.get('projectId'), 123456);

      done();
    }, 0);
  });
});
