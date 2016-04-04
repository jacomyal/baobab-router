import Baobab from 'baobab';
import assert from 'assert';
import BaobabRouter from '../baobab-router.js';

// Reinitialize the URL hash:
window.location.hash = '';

// Instanciate a Baobab tree and its related router:
const unloggedState = {
  logged: false,
  view: null,
  data: {
    pid: null,
  },
};
const loggedState = {
  logged: true,
  view: 'home',
  data: {
    pid: null,
    user: { name: 'John' },
  },
  settings: {
    edit: false,
    from: null,
    size: null,
    sort: null,
    query: null,
  },
};
const routes = {
  defaultRoute: '/login',
  readOnly: [['logged']],
  routes: [
    {
      path: '/login',
      state: {
        view: 'login',
        logged: false,
        data: { pid: null, user: null },
      },
    },
    {
      state: {
        logged: true,
        data: { pid: null },
      },
      defaultRoute: '/home',
      routes: [
        {
          path: '/home',
          state: { view: 'home' },
        },
        {
          path: '/settings',
          state: { view: 'settings' },
        },
        {
          path: '/project/:pid',
          state: {
            view: 'project',
            data: { pid: ':pid' },
            settings: { edit: false },
          },
          routes: [
            {
              path: '/settings',
              state: { view: 'project.settings' },
            },
            {
              path: '/data',
              query: {
                q: { match: ':query', cast: 'json' },
                f: { match: ':from', cast: 'number' },
                sz: { match: ':size', cast: 'number' },
                st: ':sort',
              },
              state: {
                view: 'project.data',
                settings: {
                  query: ':query',
                  from: ':from',
                  size: ':size',
                  sort: ':sort',
                },
              },
            },
            {
              path: '/dashboard/:did',
              query: {
                q: { match: ':query', cast: 'json' },
                f: { match: ':from', cast: 'number' },
                sz: { match: ':size', cast: 'number' },
                st: ':sort',
              },
              state: {
                view: 'project.dashboard',
                data: {
                  did: ':did',
                },
                settings: {
                  query: ':query',
                },
              },
              routes: [
                {
                  path: '/edit',
                  state: {
                    settings: { edit: true },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

function _newTree(state) {
  return new Baobab(state || loggedState);
}

function _newRouter(tree) {
  return new BaobabRouter(tree || _newTree(), routes);
}

describe('Instanciation and destruction:', () => {
  let tree;
  let router;

  afterEach(done => {
    router.kill();
    window.location.hash = '';
    router = null;

    setTimeout(done, 0);
  });

  it('it should update the URL when the router is instanciated', done => {
    assert.equal(window.location.hash, '');
    tree = _newTree();
    router = _newRouter(tree);

    setTimeout(() => {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get('data', 'pid'), null);
      done();
    }, 0);
  });
});

describe('Ascending communication', () => {
  let tree;
  let router;

  beforeEach(done => {
    window.location.hash = '';
    tree = _newTree();
    router = _newRouter(tree);

    setTimeout(done, 0);
  });

  afterEach(done => {
    router.kill();
    window.location.hash = '';
    router = null;

    setTimeout(done, 0);
  });

  it('should stop on the first matching case', done => {
    tree.set('logged', true);
    tree.set('view', 'settings');
    tree.set(['data', 'pid'], null);
    tree.commit();

    assert.equal(window.location.hash, '#/settings');
    assert.equal(tree.get('view'), 'settings');
    assert.equal(tree.get('data', 'pid'), null);

    setTimeout(done, 0);
  });

  it('should check all cases until one matches', done => {
    tree.set('logged', true);
    tree.set('view', 'home');
    tree.set(['data', 'pid'], null);
    tree.commit();

    assert.equal(window.location.hash, '#/home');
    assert.equal(tree.get('view'), 'home');
    assert.equal(tree.get('data', 'pid'), null);

    setTimeout(done, 0);
  });

  it('should work with dynamics attributes', done => {
    tree.set('logged', true);
    tree.set('view', 'project');
    tree.set(['data', 'pid'], '123456');
    tree.commit();

    assert.equal(window.location.hash, '#/project/123456');
    assert.equal(tree.get('view'), 'project');
    assert.equal(tree.get('data', 'pid'), '123456');

    setTimeout(done, 0);
  });

  it('should work with children overriding values', done => {
    tree.set('logged', true);
    tree.set('view', 'project.settings');
    tree.set(['data', 'pid'], '123456');
    tree.commit();

    assert.equal(window.location.hash, '#/project/123456/settings');
    assert.equal(tree.get('view'), 'project.settings');
    assert.equal(tree.get('data', 'pid'), '123456');

    setTimeout(done, 0);
  });

  it('should not match cases where some dynamic attributes are missing', done => {
    tree.set('logged', true);
    tree.set('view', 'project');
    tree.set(['data', 'pid'], null);
    tree.commit();

    assert.equal(window.location.hash, '#/home');
    assert.equal(tree.get('view'), 'home');
    assert.equal(tree.get('data', 'pid'), null);

    setTimeout(done, 0);
  });

  it('should work with routes with queries - and no query parameters', done => {
    tree.set('logged', true);
    tree.set('view', 'project.data');
    tree.set(['data', 'pid'], '123456');
    tree.set('settings', {
      edit: false,
      from: null,
      size: null,
      sort: null,
      query: null,
    });
    tree.commit();

    assert.equal(window.location.hash, '#/project/123456/data');
    assert.equal(tree.get('view'), 'project.data');
    assert.equal(tree.get('data', 'pid'), '123456');
    assert.deepEqual(tree.get('settings'), {
      edit: false,
      from: null,
      size: null,
      sort: null,
      query: null,
    });

    setTimeout(done, 0);
  });

  it('should work with routes with queries - and some query parameters', done => {
    tree.set('logged', true);
    tree.set('view', 'project.data');
    tree.set(['data', 'pid'], '123456');
    tree.set('settings', {
      edit: false,
      from: 0,
      size: 1000,
      sort: null,
      query: { search: 'toto' },
    });
    tree.commit();

    assert.equal(
      window.location.hash,
      '#/project/123456/data?q=%7B%22search%22%3A%22toto%22%7D&f=0&sz=1000'
    );
    assert.equal(tree.get('view'), 'project.data');
    assert.equal(tree.get('data', 'pid'), '123456');
    assert.deepEqual(tree.get('settings'), {
      edit: false,
      from: 0,
      size: 1000,
      sort: null,
      query: { search: 'toto' },
    });

    setTimeout(done, 0);
  });

  it('should work with routes with queries following a dynamic', done => {
    tree.set('logged', true);
    tree.set('view', 'project.dashboard');
    tree.set(['data', 'pid'], '123456');
    tree.set(['data', 'did'], '123456');
    tree.set('settings', {
      edit: false,
      query: { search: 'toto' },
    });
    tree.commit();

    assert.equal(
      window.location.hash,
      '#/project/123456/dashboard/123456?q=%7B%22search%22%3A%22toto%22%7D'
    );
    assert.equal(tree.get('view'), 'project.dashboard');
    assert.equal(tree.get('data', 'pid'), '123456');
    assert.deepEqual(tree.get('settings'), {
      edit: false,
      query: { search: 'toto' },
    });

    setTimeout(done, 0);
  });

  it('should work with routes inheritating queries from a parent', done => {
    tree.set('logged', true);
    tree.set('view', 'project.dashboard');
    tree.set(['data', 'pid'], '123456');
    tree.set(['data', 'did'], '123456');
    tree.set('settings', {
      edit: true,
      query: { search: 'toto' },
    });
    tree.commit();

    assert.equal(
      window.location.hash,
      '#/project/123456/dashboard/123456/edit?q=%7B%22search%22%3A%22toto%22%7D'
    );
    assert.equal(tree.get('view'), 'project.dashboard');
    assert.equal(tree.get('data', 'pid'), '123456');
    assert.deepEqual(tree.get('settings'), {
      edit: true,
      query: { search: 'toto' },
    });

    setTimeout(done, 0);
  });

  it('should compare JSON query objects before setting them', done => {
    let updated = false;

    tree.set('logged', true);
    tree.set('view', 'project.data');
    tree.set(['data', 'pid'], '123456');
    tree.set('settings', {
      edit: false,
      from: 0,
      size: 1000,
      sort: null,
      query: { search: 'toto' },
    });
    tree.commit();

    tree.select(
      ['settings', 'query']
    ).on(
      'update',
      () => { updated = true; }
    );

    window.location.hash =
      '#/project/123456/data?q=%7B%22search%22%3A%22toto%22%7D&f=0&sz=1100';

    setTimeout(
      () => {
        assert.equal(updated, false);
        setTimeout(done, 0);
      },
      0
    );
  });
});

describe('Descending communication', () => {
  let tree;
  let router;

  beforeEach(done => {
    window.location.hash = '';
    tree = _newTree();
    router = _newRouter(tree);

    setTimeout(done, 0);
  });

  afterEach(done => {
    router.kill();
    window.location.hash = '';
    router = null;

    setTimeout(done, 0);
  });

  it('should fallback to the default route when no route matches', done => {
    window.location.hash = '#/invalid/route';

    setTimeout(() => {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get('data', 'pid'), null);
      assert.equal(tree.get('data', 'user', 'name'), 'John');
      done();
    }, 0);
  });

  it('should fallback to the default route when no route matches - bis', done => {
    window.location.hash = '#/project';

    setTimeout(() => {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get('data', 'pid'), null);
      assert.equal(tree.get('data', 'user', 'name'), 'John');
      done();
    }, 0);
  });

  /**
   * Note:
   * *****
   * The following unit test has been disabled, because baobab-router cannot give the
   * expected result in its current implementation. Since the usecase is somehow a
   * problem, I prefer to let it here, because it represent pretty well the mess it
   * can cause.
   * Basically, when the router will be able to solve the stable pair state / hash
   * without having to actually impact them until it's stable, then this case will
   * no longer be a problem
   */

  /*
  it('should fallback to the default route when no route matches - ter', done => {
    window.location.hash = '#/login';

    setTimeout(() => {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get('data', 'pid'), null);
      assert.equal(tree.get('data', 'user', 'name'), 'John');
      done();
    }, 0);
  });
  */

  it('should work fine when a route does match', done => {
    window.location.hash = '#/home';

    setTimeout(() => {
      assert.equal(window.location.hash, '#/home');
      assert.equal(tree.get('view'), 'home');
      assert.equal(tree.get('data', 'pid'), null);
      assert.equal(tree.get('data', 'user', 'name'), 'John');
      done();
    }, 0);
  });

  it('should work fine when a route does match - bis', done => {
    window.location.hash = '#/settings';

    setTimeout(() => {
      assert.equal(window.location.hash, '#/settings');
      assert.equal(tree.get('view'), 'settings');
      assert.equal(tree.get('data', 'pid'), null);
      done();
    }, 0);
  });

  it('should work fine when a route does match with dynamic attribute', done => {
    window.location.hash = '#/project/123456';

    setTimeout(() => {
      assert.equal(window.location.hash, '#/project/123456');
      assert.equal(tree.get('view'), 'project');
      assert.equal(tree.get('data', 'pid'), '123456');
      done();
    }, 0);
  });

  it('should work fine when a route does match with dynamic attribute - bis', done => {
    window.location.hash = '#/project/123456/settings';

    setTimeout(() => {
      assert.equal(window.location.hash, '#/project/123456/settings');
      assert.equal(tree.get('view'), 'project.settings');
      assert.equal(tree.get('data', 'pid'), '123456');
      done();
    }, 0);
  });

  it('should work fine with a proper query', done => {
    window.location.hash = '#/project/123456/data?st=abc';

    setTimeout(() => {
      assert.equal(window.location.hash, '#/project/123456/data?st=abc');
      assert.equal(tree.get('view'), 'project.data');
      assert.equal(tree.get('data', 'pid'), '123456');
      assert.deepEqual(tree.get('settings'), {
        edit: false,
        from: null,
        size: null,
        sort: 'abc',
        query: null,
      });
      done();
    }, 0);
  });

  it('should work fine with no query', done => {
    window.location.hash = '#/project/123456/data';

    setTimeout(() => {
      assert.equal(window.location.hash, '#/project/123456/data');
      assert.equal(tree.get('view'), 'project.data');
      assert.equal(tree.get('data', 'pid'), '123456');
      assert.deepEqual(tree.get('settings'), {
        edit: false,
        from: null,
        size: null,
        sort: null,
        query: null,
      });
      done();
    }, 0);
  });

  it('should work fine with JSON query parameters', done => {
    window.location.hash = '#/project/123456/data?q=%7B%22search%22%3A%22toto%22%7D';

    setTimeout(() => {
      assert.equal(window.location.hash, '#/project/123456/data?q=%7B%22search%22%3A%22toto%22%7D');
      assert.equal(tree.get('view'), 'project.data');
      assert.equal(tree.get('data', 'pid'), '123456');
      assert.deepEqual(tree.get('settings'), {
        edit: false,
        from: null,
        size: null,
        sort: null,
        query: { search: 'toto' },
      });
      done();
    }, 0);
  });

  it('should remove unrecognized query parameters', done => {
    window.location.hash = '#/project/123456/data?st=abc&irrelevant=true';

    setTimeout(() => {
      assert.equal(window.location.hash, '#/project/123456/data?st=abc');
      assert.equal(tree.get('view'), 'project.data');
      assert.equal(tree.get('data', 'pid'), '123456');
      assert.deepEqual(tree.get('settings'), {
        edit: false,
        from: null,
        size: null,
        sort: 'abc',
        query: null,
      });
      done();
    }, 0);
  });

  it('should work with routes inheritating queries from a parent', done => {
    window.location.hash =
      '#/project/123456/dashboard/123456/edit?q=%7B%22search%22%3A%22toto%22%7D';

    setTimeout(() => {
      assert.equal(
        window.location.hash,
        '#/project/123456/dashboard/123456/edit?q=%7B%22search%22%3A%22toto%22%7D'
      );
      assert.equal(tree.get('view'), 'project.dashboard');
      assert.equal(tree.get('data', 'pid'), '123456');
      assert.deepEqual(tree.get('settings'), {
        edit: true,
        from: null,
        size: null,
        sort: null,
        query: { search: 'toto' },
      });

      done();
    }, 0);
  });
});

describe('Read-only state constraints', () => {
  let tree;
  let router;

  beforeEach(done => {
    window.location.hash = '';
    tree = _newTree(unloggedState);
    router = _newRouter(tree);

    setTimeout(done, 0);
  });

  afterEach(done => {
    router.kill();
    window.location.hash = '';
    router = null;

    setTimeout(done, 0);
  });

  it(
    'should fallback on a route with the good values for read-only ' +
    'constraints (ascending)',
    done => {
      tree.set('logged', false);
      tree.set('view', 'home');
      tree.set(['data', 'pid'], null);
      tree.commit();

      setTimeout(() => {
        assert.equal(window.location.hash, '#/login');
        assert.equal(tree.get('logged'), false);
        assert.equal(tree.get('view'), 'login');
        assert.equal(tree.get('data', 'pid'), null);
        done();
      }, 0);
    }
  );

  it(
    'should fallback on a route with the good values for read-only ' +
    'constraints (descending)',
    done => {
      window.location.hash = '#/home';

      setTimeout(() => {
        assert.equal(window.location.hash, '#/login');
        assert.equal(tree.get('logged'), false);
        assert.equal(tree.get('view'), 'login');
        assert.equal(tree.get('data', 'pid'), null);
        done();
      }, 0);
    }
  );
});

describe('API and errors', () => {
  let router;

  afterEach(done => {
    if (router && router.kill) {
      router.kill();
      window.location.hash = '';
      router = null;
    }

    setTimeout(done, 0);
  });

  it('should throw an error when a router is initialized without default route', () => {
    assert.throws(
      () => {
        router = new BaobabRouter(
          new Baobab({ toto: null }),
          { routes: [{ path: '/toto', state: { toto: true } }] }
        );
      },
      /The root must have a default route/
    );
  });

  it('should throw an error when a route does not have any state restriction', () => {
    assert.throws(
      () => {
        router = new BaobabRouter(
          new Baobab({ toto: null }),
          { routes: [{ path: 'app' }], defaultRoute: 'app' }
        );
      },
      /Each route should have some state restrictions/
    );
  });

  it('should throw an error when the default route does not match any existing route', () => {
    assert.throws(
      () => {
        router = new BaobabRouter(
          new Baobab({ toto: null }),
          { defaultRoute: 'somethingElse' }
        );
      },
      /The default route "somethingElse" does not match any registered route/
    );

    assert.throws(
      () => {
        router = new BaobabRouter(
          new Baobab({ toto: null }),
          { routes: [{ path: 'app', state: { key: 'value' } }], defaultRoute: 'somethingElse' }
        );
      },
      /The default route "somethingElse" does not match any registered route/
    );
  });

  it('should throw an error when a route does not have any path nor defaultRoute', () => {
    assert.throws(
      () => {
        router = new BaobabRouter(
          new Baobab({ toto: null }),
          { routes: [{ state: { key: 'value' } }] }
        );
      },
      /A route must have either a path or a default route/
    );

    assert.throws(
      () => {
        router = new BaobabRouter(
          new Baobab({ toto: null }),
          {
            routes: [
              {
                state: { key: 'value' },
                routes: [{ path: '/somePath', state: { key2: 'value2' } }],
              },
            ],
          }
        );
      },
      /A route must have either a path or a default route/
    );
  });

  it('should throw an error when a router is bound to a tree that already has a router', () => {
    const tree = _newTree();
    let router2;

    router = _newRouter(tree);

    assert.throws(
      () => { router2 = _newRouter(tree); },
      /A router has already been bound to this tree/
    );

    if (router2 && router2.kill) {
      router2.kill();
    }
  });
});
