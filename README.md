# Baobab-router - v0.1.0

**Baobab-router** is a JavaScript router for [Baobab](https://github.com/Yomguithereal/baobab), that binds the URL of a page to the application's state. It is released under the [MIT license](./LICENSE).

## How it works

First, baobab-router has to be instanciated with a baobab instance and a list of routes. A route is a pair of some state contraints and a hash string. One route has to be the default route. At this point:

 - When the state of the tree is changed, baobab-router will search for a route with matching state constraints, and fallback on the default route if none is found.
 - When the hash is changed, baobab-router will search for a route with a matching hash, and fallback on the default route if none is found. It will then apply the state constraints of the selected route to the tree.

## Example
```javascript
var Baobab = require('baobab'),
    BaobabRouter = require('baobab-router');

    // Instanciate Baobab tree:
var tree = new Baobab({
      view: 'home',
      projectId: null,
      projectData: null
    }),

    // Instanciate router:
    router = new BaobabRouter(tree, [
      { route: '/home',
        defaultRoute: true,
        state: {
          view: 'home',
          projectId: null
        } },
      { route: '/settings',
        state: {
          view: 'settings',
          projectId: null
        } },
      { route: '/project/:pid',
        state: {
          view: 'project.home',
          projectId: ':pid'
        } },
      { route: '/project/:pid/settings',
        state: {
          view: 'project.settings',
          projectId: ':pid'
        } },
      { route: '/project/:pid/dashboard',
        state: {
          view: 'project.dashboard',
          projectId: ':pid'
        } }
    ]);

// Once the router is instanciated, it will check the state to find the route:
console.log(window.location.hash === '#/home');

// In the three following examples, the state does exactly match a route:
function example1() {
  tree.set('view', 'settings')
      .set('projectId', null)
      .commit();

  console.log(window.location.hash === '#/settings');
}
function example2() {
  tree.set('view', 'project.home')
      .set('projectId', '123456')
      .commit();

  console.log(window.location.hash === '#/project/123456');
}
function example3() {
  tree.set('view', 'project.dashboard')
      .set('projectId', '123456')
      .commit();

  console.log(window.location.hash === '#/project/123456/dashboard');
}

// In the two following examples, the state does not match any route, so the
// router will fallback on the default route, and update the state in
// consequence:
function example4() {
  tree.set('view', 'something irrelevant')
      .set('projectId', '123456')
      .commit();

  setTimeout(function() {
    console.log(window.location.hash === '#/home');
    console.log(tree.get('view') === 'home');
    console.log(tree.get('projectId') === null);
  }, 0);
}
function example5() {
  tree.set('view', 'home')
      .set('projectId', '123456')
      .commit();

  setTimeout(function() {
    console.log(window.location.hash === '#/home');
    console.log(tree.get('view') === 'home');
    console.log(tree.get('projectId') === null);
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
