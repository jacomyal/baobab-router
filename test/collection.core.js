import Baobab from "baobab";
import assert from "assert";
import BaobabRouter from "../baobab-router.js";

const state = {
  view: null,
  projectId: null,
  projectData: null
};
const routes = {
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
};

function _newTree(obj) {
  return new Baobab(obj || state);
}

function _newRouter(tree) {
  return new BaobabRouter(tree || _newTree(), routes);
}

describe("Basic example (from the documentation)", () => {
  let tree;
  let router;

  beforeEach(done => {
    window.location.hash = "";
    tree = _newTree();
    router = _newRouter(tree);

    setTimeout(done, 0);
  });

  afterEach(done => {
    router.kill();
    window.location.hash = "";
    router = null;

    setTimeout(done, 0);
  });

  it("should start on the default route when instanciated", done => {
    setTimeout(() => {
      assert.equal(window.location.hash, "#/home");
      assert.equal(tree.get("view"), "home");
      assert.equal(tree.get("projectId"), null);

      done();
    }, 0);
  });

  it("should work with a recognized state (first level)", done => {
    tree.set("view", "settings");
    tree.set("projectId", null);
    tree.commit();

    setTimeout(() => {
      assert.equal(window.location.hash, "#/settings");
      done();
    }, 0);
  });

  it("should work with a recognized state (deep)", done => {
    tree.set("view", "project.settings");
    tree.set("projectId", "123456");
    tree.commit();

    setTimeout(() => {
      assert.equal(window.location.hash, "#/project/123456/settings");
      done();
    }, 0);
  });

  it("should work with a recognized URL (first level)", done => {
    window.location.hash = "/settings";

    setTimeout(() => {
      assert.equal(tree.get("view"), "settings");
      assert.equal(tree.get("projectId"), null);
      done();
    }, 0);
  });

  it("should work with a recognized URL (deep)", done => {
    window.location.hash = "/project/123456/dashboard";

    setTimeout(() => {
      assert.equal(tree.get("view"), "project.dashboard");
      assert.equal(tree.get("projectId"), "123456");
      done();
    }, 0);
  });

  it("should fallback on default route when state is not recognized (first level)", done => {
    tree.set("view", "something irrelevant");
    tree.set("projectId", null);
    tree.commit();

    setTimeout(() => {
      assert.equal(window.location.hash, "#/home");
      assert.equal(tree.get("view"), "home");
      assert.equal(tree.get("projectId"), null);
      done();
    }, 0);
  });

  it("should fallback on default route when state is not recognized (deep)", done => {
    tree.set("view", "something irrelevant");
    tree.set("projectId", 123456);
    tree.commit();

    setTimeout(() => {
      assert.equal(window.location.hash, "#/project/123456/dashboard");
      assert.equal(tree.get("view"), "project.dashboard");
      assert.equal(tree.get("projectId"), 123456);
      done();
    }, 0);
  });

  it("should fallback on default route when URL is not recognized (first level)", done => {
    window.location.hash = "/something/irrelevant";

    setTimeout(() => {
      assert.equal(window.location.hash, "#/home");
      assert.equal(tree.get("view"), "home");
      assert.equal(tree.get("projectId"), null);
      done();
    }, 0);
  });

  it("should fallback on default route when URL is not recognized (deep)", done => {
    window.location.hash = "/project/123456/irrelevant";

    setTimeout(() => {
      assert.equal(window.location.hash, "#/project/123456/dashboard");
      assert.equal(tree.get("view"), "project.dashboard");
      assert.equal(tree.get("projectId"), 123456);
      done();
    }, 0);
  });
});
