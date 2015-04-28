# Baobab-router

**Baobab-router** is a JavaScript router for [Baobab](https://github.com/Yomguithereal/baobab), that binds the URL of a page to the application's state. It is released under the [MIT license](./LICENSE).

## How it works

First, baobab-router has to be instanciated with a baobab instance and a tree of routes. A route is mainly a pair of some state constraints and a path string.

A route can also have children routes, and possibly can specify a default path, when the route's path matches but none of its children does.

When the router is instanciated, it will listen to hash and state updates:

 - When the state of the tree is changed, baobab-router will search for a route with matching state constraints, and fallback on the default route if none is found.
 - When the hash is changed, baobab-router will search for a route with a matching hash, and fallback on the default route if none is found. It will then apply the state constraints of the selected route to the tree.

## Basic example

Assume we have a very small application, with two generic pages (a homepage and a settings page), and two project specific pages. A project is identified by the `"projectId"` value in the state, and the view is described by the value `"view"` in the state.

Here is how to instanciate the state tree and the related router:

```javascript
var Baobab = require('baobab'),
    Router = require('baobab-router');

    // Instanciate Baobab tree:
var tree = new Baobab({
      view: null,
      projectId: null,
      projectData: null
    }),

    // Instanciate router:
    router = new Router(tree, {
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
          } },
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
    });
```

Once the router is instanciated, it will check the hash to update the state:

```javascript
console.log(window.location.hash === '#/home');
console.log(tree.get('view') === 'home');
console.log(tree.get('projectId') === null);
```

In the following examples, the state does exactly match a route:

```javascript
function() {
  tree.set('view', 'settings')
      .set('projectId', null)
      .commit();

  setTimeout(function() {
    console.log(window.location.hash === '#/settings');
  }, 0);
}

function() {
  tree.set('view', 'project.settings')
      .set('projectId', '123456')
      .commit();

  setTimeout(function() {
    console.log(window.location.hash === '#/project/123456/settings');
  }, 0);
}

function() {
  window.location.hash = '/settings';

  setTimeout(function() {
    console.log(tree.get('view') === 'settings');
    console.log(tree.get('projectId') === null);
  }, 0);
}

function() {
  window.location.hash = '/project/123456/dashboard';

  setTimeout(function() {
    console.log(tree.get('view') === 'project.dashboard');
    console.log(tree.get('projectId') === '123456');
  }, 0);
}
```

In the three following examples, the state does not match any route, so the router will fallback on the default route, and update the state in consequence:

```javascript
function() {
  tree.set('view', 'something irrelevant')
      .set('projectId', null)
      .commit();

  setTimeout(function() {
    console.log(window.location.hash === '#/home');
    console.log(tree.get('view') === 'home');
    console.log(tree.get('projectId') === null);
  }, 0);
});

function() {
  tree.set('view', 'something irrelevant')
      .set('projectId', 123456)
      .commit();

  setTimeout(function() {
    console.log(window.location.hash === '#/project/123456/dashboard');
    console.log(tree.get('view') === 'dashboard');
    console.log(tree.get('projectId') === 123456);
  }, 0);
});

function() {
  window.location.hash = '/something/irrelevant';

  setTimeout(function() {
    console.log(window.location.hash === '#/home');
    console.log(tree.get('view') === 'home');
    console.log(tree.get('projectId') === null);
  }, 0);
}

function() {
  window.location.hash = '/project/123456/irrelevant';

  setTimeout(function() {
    console.log(window.location.hash === '#/project/123456/dashboard');
    console.log(tree.get('view') === 'dashboard');
    console.log(tree.get('projectId') === 123456);
  }, 0);
}
```

## Contributions

This project is currently in an experimental state, and feedbacks, advice and pull requests are very welcome. Be sure to check code linting and to add unit tests if relevant and pass them all before submitting your pull request.

```bash
# Installing the dev environment
git clone git@github.com:jacomyal/baobab-router
cd baobab-router
npm install

# Running the tests
npm test

# Linting
gulp lint
```
