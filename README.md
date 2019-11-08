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
import Baobab from "baobab";
import Router from "baobab-router";

// Instanciate Baobab tree:
const tree = new Baobab({
  view: null,
  projectId: null,
  projectData: null
});

// Instanciate router:
const router = new Router(tree, {
  defaultRoute: "/home",
  routes: [
    {
      path: "/home",
      state: {
        view: "home",
        projectId: null
      }
    },
    {
      path: "/settings",
      state: {
        view: "settings",
        projectId: null
      }
    },
    {
      path: "/project/:pid",
      defaultRoute: "/dashboard",
      state: {
        projectId: ":pid"
      },
      routes: [
        {
          path: "/settings",
          state: {
            view: "project.settings"
          }
        },
        {
          path: "/dashboard",
          state: {
            view: "project.dashboard"
          }
        }
      ]
    }
  ]
});
```

Once the router is instanciated, it will check the hash to update the state:

```javascript
console.log(window.location.hash === "#/home");
console.log(tree.get("view") === "home");
console.log(tree.get("projectId") === null);
```

In the following examples, the state does exactly match a route:

```javascript
// 1.
tree.set("view", "settings");
tree.set("projectId", null);
tree.commit();

setTimeout(() => console.log(window.location.hash === "#/settings"), 0);

// 2.
tree.set("view", "project.settings");
tree.set("projectId", "123456");
tree.commit();

setTimeout(
  () => console.log(window.location.hash === "#/project/123456/settings"),
  0
);

// 3.
window.location.hash = "/settings";

setTimeout(() => {
  console.log(tree.get("view") === "settings");
  console.log(tree.get("projectId") === null);
}, 0);

// 4.
window.location.hash = "/project/123456/dashboard";

setTimeout(() => {
  console.log(tree.get("view") === "project.dashboard");
  console.log(tree.get("projectId") === "123456");
}, 0);
```

In the following examples, the state does not match any route, so the router will fallback on the default route, and update the state in consequence:

```javascript
// 1.
tree.set("view", "something irrelevant");
tree.set("projectId", null);
tree.commit();

setTimeout(() => {
  console.log(window.location.hash === "#/home");
  console.log(tree.get("view") === "home");
  console.log(tree.get("projectId") === null);
}, 0);

// 2.
tree.set("view", "something irrelevant");
tree.set("projectId", 123456);
tree.commit();

setTimeout(() => {
  console.log(window.location.hash === "#/project/123456/dashboard");
  console.log(tree.get("view") === "project.dashboard");
  console.log(tree.get("projectId") === 123456);
}, 0);

// 3.
window.location.hash = "/something/irrelevant";

setTimeout(() => {
  console.log(window.location.hash === "#/home");
  console.log(tree.get("view") === "home");
  console.log(tree.get("projectId") === null);
}, 0);

// 4.
window.location.hash = "/project/123456/irrelevant";

setTimeout(() => {
  console.log(window.location.hash === "#/project/123456/dashboard");
  console.log(tree.get("view") === "project.dashboard");
  console.log(tree.get("projectId") === 123456);
}, 0);
```

## Advanced example

Let's take the exact same application, but with a `logged` flag in the state tree, specifying whether the user is logged in or not. To prevent any user to land on a page with the flag as `true` and receive some 403 errors or some similar undesired effects, the router will be forbidden to update the `logged` flag, using the `readOnly` root property:

```javascript
import Baobab from "baobab";
import Router from "baobab-router";

// Instanciate Baobab tree:
const tree = new Baobab({
  logged: false,
  view: null,
  projectId: null,
  projectData: null
});

// Instanciate router:
const router = new Router(tree, {
  defaultRoute: "/home",
  // The readOnly property is an array of paths:
  readOnly: [["logged"]],
  routes: [
    {
      path: "/login",
      state: {
        logged: false,
        view: "logged",
        projectId: null
      }
    },
    {
      path: "/home",
      state: {
        logged: true,
        view: "home",
        projectId: null
      }
    },
    {
      path: "/settings",
      state: {
        logged: true,
        view: "settings",
        projectId: null
      }
    },
    {
      path: "/project/:pid",
      defaultRoute: "/dashboard",
      state: {
        logged: true,
        projectId: ":pid"
      },
      routes: [
        {
          path: "/settings",
          state: {
            view: "project.settings"
          }
        },
        {
          path: "/dashboard",
          state: {
            view: "project.dashboard"
          }
        }
      ]
    }
  ]
});
```

Once the router is instanciated, it will check the hash to update the state.
Since the router cannot write the `logged` flag, it will search for the first route that matches all and only the `readOnly` sub-state.
The only route that matches is the `/login` route, so it will update the URL and the state in consequence:

```javascript
console.log(window.location.hash === "#/login");
console.log(tree.get("logged") === false);
console.log(tree.get("view") === "login");
console.log(tree.get("projectId") === null);
```

So basically, the `readOnly` paths are here to apply some more constraints to the state.
Here is how the updated application behaves on some specific cases:

```javascript
// 1.
tree.set("logged", false);
tree.set("view", "project.settings");
tree.set("projectId", "123456");
tree.commit();

setTimeout(() => {
  console.log(window.location.hash === "#/login");
  console.log(tree.get("view") === "login");
  console.log(tree.get("projectId") === null);
}, 0);

// 2.
tree.set("logged", true);
tree.set("view", "project.settings");
tree.set("projectId", "123456");
tree.commit();

setTimeout(() => {
  console.log(window.location.hash === "#/project/123456/settings");
  console.log(tree.get("view") === "project.settings");
  console.log(tree.get("projectId") === 123456);
}, 0);

// 3.
tree.set("logged", false);
tree.commit();

setTimeout(() => {
  window.location.hash = "/project/123456/settings";

  setTimeout(() => {
    console.log(window.location.hash === "#/login");
    console.log(tree.get("view") === "login");
    console.log(tree.get("projectId") === null);
  }, 0);
}, 0);

// 4.
tree.set("logged", true);
tree.commit();

setTimeout(() => {
  window.location.hash = "/project/123456/settings";

  setTimeout(() => {
    console.log(window.location.hash === "#/project/123456/settings");
    console.log(tree.get("view") === "project.settings");
    console.log(tree.get("projectId") === 123456);
  }, 0);
}, 0);
```

## API specifications

### Instanciation

The router has to be instanciated with a Baobab instance and the routes tree definition:

The tree's root must respect the following schema:

```javascript
const root = {
  routes: "Array<Route>",
  defaultRoute: "string",
  readOnly: "?Array<BaobabPath>"
};
```

Each other route must respect the following schema:

```javascript
const route = {
  path: "?string",
  state: "object",
  defaultRoute: "?string",
  routes: "?Array<Route>"
};
```

Also, here are some rules each route must respect:

1. A route without a `defaultRoute` value must have a `path` value.
2. The `defaultRoute` value must match a child's route if provided.
3. The `state` object must have at least one constraint.

Finally, two baobab-router instances cannot be bound to the same baobab instance.

### Destruction

It is possible to kill a baobab-router instance, by using its `baobabInstance.kill` method. This will remove the state and URL listeners, and unbind the instance from the related baobab tree, to allow an eventual reinstanciation with the same tree.

## Advanced features

### Constructor optional settings

It is possible to give the router's constructor an object of specific settings as a third argument. Currently, the only recognized key is `"solver"`, to give the instance a custom RegExp to solve dynamic values from paths.

For instance, giving `{ "solver": /\{([^\/\}]*)\}/g }` will find dynamic values shaped as `"a/{b}/c"` instead of `"a/:b/c"`.

### State constraints overriding

If a child has some state constraints that are overriding its parent's, the router will detect it and anytime the parent will not match the actual state, then the children will have to be checked as well, which will decrease the router's efficiency.

### Read-only paths

As previously introduced in the advanced use case, it is possible to prevent the router to update some specified paths in the state tree, by using the `readOnly` key on the routes tree's root node. This feature has been developed especially thinking about the case presented in the advanced example, and should remain to be used with caution:

- If a read-only path will store a non-boolean variable and at some point there are no route matching the current value associated to the path, the tree and the URL will be out of sync.
- The same issue might happen if multiple read-only paths are used, and all the different values combinations are not represented in the routes.
- **Baobab v2+'s monkeys have to be declared as `readOnly` if used by the router**

### Default routes

A route with children can have a `defaultRoute` path. If the route matches but none of its child does, then it will fallback on the default path, and recheck everything. If the default route does not match any of the children paths, then an error will be throws at the instanciation.

Also, it is noticeable that a route with a `defaultRoute` value will never be the selected node of the tree, while a route with children and no default route can be selected as the end node.

Finally, since routes with a valid `defaultRoute` value are never selected as the end node, it is not necessary to specify a path, and they can be used just to group other routes under some common state constraints, for instance.

## Contributions

This project is currently quite stable, but feedbacks, advice and pull requests are still welcome. Be sure to use `prettier` and to add unit tests if relevant and pass them all before submitting your pull request.

```bash
# Install the dev environment
git clone git@github.com:jacomyal/baobab-router
cd baobab-router
npm install

# Check the code and run the tests
npm test
```
