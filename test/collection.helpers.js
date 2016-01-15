import assert from 'assert';
import BaobabRouter from '../baobab-router.js';

describe('BaobabRouter.__doesHashMatch', () => {
  it('should work with basic cases', () => {
    assert.equal(BaobabRouter.__doesHashMatch('/a/b/c', '/a/b/c'), true);
    assert.equal(BaobabRouter.__doesHashMatch('/a/b', '/a/b/c'), true);

    assert.equal(BaobabRouter.__doesHashMatch('/a/b/c', '/a/c/b'), false);
    assert.equal(BaobabRouter.__doesHashMatch('/a/b/c/d', '/a/c/b'), false);
  });

  it('should work with dynamic attributes', () => {
    assert.equal(BaobabRouter.__doesHashMatch('/a/:b/c', '/a/123/c'), true);
    assert.equal(BaobabRouter.__doesHashMatch('/a/:b', '/a/123/c'), true);

    // Empty strings are not valid values for matching dynamic values:
    assert.equal(BaobabRouter.__doesHashMatch('/a/:b', '/a/'), false);
    assert.equal(BaobabRouter.__doesHashMatch('/a/:b/c', '/a//c'), false);

    assert.equal(BaobabRouter.__doesHashMatch('/a/:b/c', '/a/123/d'), false);
    assert.equal(BaobabRouter.__doesHashMatch('/a/:b/c', '/a/123'), false);
  });

  it('should work with custom solvers', () => {
    assert.equal(BaobabRouter.__doesHashMatch('/a/:b', '/a/b/c', /:([^\/:]*)/g), true);
    assert.equal(BaobabRouter.__doesHashMatch('/a/{b}', '/a/b/c', /\{([^\/\}]*)\}/g), true);
    assert.equal(BaobabRouter.__doesHashMatch('/a/:b', '/a/b/c', /\{([^\/\}]*)\}/g), false);
  });
});

describe('BaobabRouter.__doesStateMatch', () => {
  it('should work with basic cases', () => {
    assert.deepEqual(BaobabRouter.__doesStateMatch(
      123,
      123
    ), {});
    assert.deepEqual(BaobabRouter.__doesStateMatch(
      { a: 'abc', b: null },
      { a: 'abc' }
    ), {});
    assert.deepEqual(BaobabRouter.__doesStateMatch(
      { a: 'abc' },
      { a: 'abc', b: 123 }
    ), {});

    assert.deepEqual(BaobabRouter.__doesStateMatch(
      { a: 'abc' },
      { a: 'def' }
    ), null);
    assert.deepEqual(BaobabRouter.__doesStateMatch(
      { a: 'abc' },
      {}
    ), null);
  });

  it('should work with dynamic attributes', () => {
    assert.deepEqual(BaobabRouter.__doesStateMatch(
      { a: { b: ':d1' } },
      { a: { b: 'abc' } },
      [':d1']
    ), { ':d1': 'abc' });

    assert.deepEqual(BaobabRouter.__doesStateMatch(
      { a: { b: ':d1' } },
      { a: { b: null } },
      [':d1']
    ), null);
  });
});

describe('BaobabRouter.__extractPaths', () => {
  it('should work with basic cases', () => {
    assert.deepEqual(BaobabRouter.__extractPaths(
      { a: 'abc' },
      []
    ), [{ value: 'abc', path: ['a'], dynamic: false }]);
    assert.deepEqual(BaobabRouter.__extractPaths(
      { a: 'abc', b: { c: 'def', d: null } },
      []
    ), [
      { value: 'abc', path: ['a'], dynamic: false },
      { value: 'def', path: ['b', 'c'], dynamic: false },
      { value: null, path: ['b', 'd'], dynamic: false },
    ]);
  });

  it('should work with dynamic attributes', () => {
    assert.deepEqual(BaobabRouter.__extractPaths(
      { a: ':d1' },
      [':d1']
    ), [{ value: ':d1', path: ['a'], dynamic: true }]);
    assert.deepEqual(BaobabRouter.__extractPaths(
      { a: ':d1', b: { c: ':d2', d: null } },
      [':d1', ':d2']
    ), [
      { value: ':d1', path: ['a'], dynamic: true },
      { value: ':d2', path: ['b', 'c'], dynamic: true },
      { value: null, path: ['b', 'd'], dynamic: false },
    ]);
  });
});

describe('BaobabRouter.__resolveURL', () => {
  it('should work with basic cases', () => {
    assert.equal(
      BaobabRouter.__resolveURL('a/b/c'),
      'a/b/c'
    );

    assert.equal(
      BaobabRouter.__resolveURL('a/b/c', {}),
      'a/b/c'
    );

    assert.equal(
      BaobabRouter.__resolveURL('a/:b/c/:d', { ':b': 'B', ':d': 'D' }),
      'a/B/c/D'
    );
  });

  it('should work with edge cases', () => {
    assert.equal(
      BaobabRouter.__resolveURL('a/:b/:b', { ':b': 'B' }),
      'a/B/B'
    );

    assert.equal(
      BaobabRouter.__resolveURL('a/:b/:c', { ':c': 'C', ':d': 'D' }),
      'a/:b/C'
    );
  });
});

describe('BaobabRouter.__compareArrays', () => {
  it('should work with basic cases', () => {
    assert.equal(BaobabRouter.__compareArrays(
      ['abc', 123, null, false],
      ['abc', 123, null, false]
    ), true);

    assert.equal(BaobabRouter.__compareArrays([123], ['123']), false);
    assert.equal(BaobabRouter.__compareArrays([null], [undefined]), false);
    assert.equal(BaobabRouter.__compareArrays(['abc', 'def'], ['abc']), false);
    assert.equal(BaobabRouter.__compareArrays(['abc'], ['abc', 'def']), false);
  });
});

describe('BaobabRouter.__makeRoutes', () => {
  it('should work with basic cases', () => {
    const routes = {
      defaultRoute: '/route_A1',
      readOnly: [['state_a1', 'state_b1']],
      routes: [
        // Simple route:
        {
          path: '/route_A1',
          state: {
            state_a1: { state_b1: 'A1, a1.b1' },
            state_a2: 'A1, a2',
          },
        },

        // Complex route:
        {
          path: '/route_A2',
          state: { state_a2: 'A2, a2' },
          routes: [
            {
              path: '/route_B1',
              state: { state_a1: { state_b1: 'A2.B1, a1.b1' } },
            },
            {
              path: '/:route_dyn_B2',
              state: { state_a1: { state_b1: ':route_dyn_B2' } },
              routes: [
                {
                  path: '/route_dyn_C1',
                  state: { state_a3: 'A2.B2.C1, a3' },
                },
              ],
            },
          ],
        },
      ],
    };
    const routesExpected = {
      defaultRoute: '/route_A1',
      readOnly: [
        ['state', 'state_a1', 'state_b1'],
      ],

      // ADDED:
      updates: [],
      dynamics: [],
      fullTree: {},
      overrides: false,
      fullPath: '',
      fullDefaultPath: '/route_A1',

      routes: [
        // Simple route:
        { path: '/route_A1',
          state:
            { state_a1: { state_b1: 'A1, a1.b1' },
              state_a2: 'A1, a2' },

          // ADDED:
          dynamics: [],
          fullPath: '/route_A1',
          overrides: false,
          fullTree: {
            state: {
              state_a1: { state_b1: 'A1, a1.b1' },
              state_a2: 'A1, a2',
            },
          },
          updates: [
            {
              dynamic: false,
              path: ['state', 'state_a1', 'state_b1'],
              value: 'A1, a1.b1',
            },
            {
              dynamic: false,
              path: ['state', 'state_a2'],
              value: 'A1, a2',
            },
          ],
        },

        // Complex route with no default child:
        { path: '/route_A2',
          state: { state_a2: 'A2, a2' },

          // ADDED:
          dynamics: [],
          fullPath: '/route_A2',
          overrides: false,
          fullTree: { state: { state_a2: 'A2, a2' } },
          updates: [
            {
              dynamic: false,
              path: ['state', 'state_a2'],
              value: 'A2, a2',
            },
          ],

          routes: [
            {
              path: '/route_B1',
              state: { state_a1: { state_b1: 'A2.B1, a1.b1' } },

              // ADDED:
              dynamics: [],
              fullPath: '/route_A2/route_B1',
              overrides: false,
              fullTree: {
                state: {
                  state_a1: { state_b1: 'A2.B1, a1.b1' },
                  state_a2: 'A2, a2',
                },
              },
              updates: [
                {
                  dynamic: false,
                  path: ['state', 'state_a2'],
                  value: 'A2, a2',
                },
                {
                  dynamic: false,
                  path: ['state', 'state_a1', 'state_b1'],
                  value: 'A2.B1, a1.b1',
                },
              ],
            },
            {
              path: '/:route_dyn_B2',
              state: { state_a1: { state_b1: ':route_dyn_B2' } },

              // ADDED:
              overrides: false,
              fullPath: '/route_A2/:route_dyn_B2',
              dynamics: [':route_dyn_B2'],
              fullTree: {
                state: {
                  state_a1: { state_b1: ':route_dyn_B2' },
                  state_a2: 'A2, a2',
                },
              },
              updates: [
                {
                  dynamic: false,
                  path: ['state', 'state_a2'],
                  value: 'A2, a2',
                },
                {
                  dynamic: true,
                  path: ['state', 'state_a1', 'state_b1'],
                  value: ':route_dyn_B2',
                },
              ],
              routes: [
                {
                  path: '/route_dyn_C1',
                  state: { state_a3: 'A2.B2.C1, a3' },

                  // ADDED:
                  overrides: false,
                  fullPath: '/route_A2/:route_dyn_B2/route_dyn_C1',
                  dynamics: [':route_dyn_B2'],
                  fullTree: {
                    state: {
                      state_a1: { state_b1: ':route_dyn_B2' },
                      state_a2: 'A2, a2',
                      state_a3: 'A2.B2.C1, a3',
                    },
                  },
                  updates: [
                    {
                      dynamic: false,
                      path: ['state', 'state_a2'],
                      value: 'A2, a2',
                    },
                    {
                      dynamic: true,
                      path: ['state', 'state_a1', 'state_b1'],
                      value: ':route_dyn_B2',
                    },
                    {
                      dynamic: false,
                      path: ['state', 'state_a3'],
                      value: 'A2.B2.C1, a3',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const routesBuilt = BaobabRouter.__makeRoutes(routes, BaobabRouter.__defaultSolver);

    assert.deepEqual(routesBuilt, routesExpected);
  });
});

describe('BaobabRouter.__deepMerge', () => {
  it('should work with two arguments and no conflicts', () => {
    const a = { a: 1 };
    const b = { b: 1 };
    const c = BaobabRouter.__deepMerge(a, b);

    // Check that arguments have not been mutated:
    assert.deepEqual(a, { a: 1 });
    assert.deepEqual(b, { b: 1 });

    // Check the result:
    assert.deepEqual(c, { value: { a: 1, b: 1 }, conflicts: false });
  });

  it('should work with three arguments and no conflicts', () => {
    const a = { a: 1 };
    const b = { b: 1 };
    const c = { c: 1 };
    const d = BaobabRouter.__deepMerge(a, b, c);

    // Check that arguments have not been mutated:
    assert.deepEqual(a, { a: 1 });
    assert.deepEqual(b, { b: 1 });
    assert.deepEqual(c, { c: 1 });

    // Check the result:
    assert.deepEqual(d, { value: { a: 1, b: 1, c: 1 }, conflicts: false });
  });

  it(
    'should find no conflict when different objects have the same value for ' +
    'the same simple path',
    () => {
      const a = { a: 1, c: 1 };
      const b = { b: 1, c: 1 };
      const c = BaobabRouter.__deepMerge(a, b);

      // Check that arguments have not been mutated:
      assert.deepEqual(a, { a: 1, c: 1 });
      assert.deepEqual(b, { b: 1, c: 1 });

      // Check the result:
      assert.deepEqual(c, { value: { a: 1, b: 1, c: 1 }, conflicts: false });
    }
  );

  it(
    'should find no conflict when different objects have the same value for ' +
    'the same deep path',
    () => {
      const a = { a: 1, c: { d: 1 } };
      const b = { b: 1, c: { d: 1 } };
      const c = BaobabRouter.__deepMerge(a, b);

      // Check that arguments have not been mutated:
      assert.deepEqual(a, { a: 1, c: { d: 1 } });
      assert.deepEqual(b, { b: 1, c: { d: 1 } });

      // Check the result:
      assert.deepEqual(c, { value: { a: 1, b: 1, c: { d: 1 } }, conflicts: false });
    }
  );

  it(
    'should find some conflict when different objects different values for ' +
    'the same simple path',
    () => {
      const a = { a: 1, c: 1 };
      const b = { b: 1, c: 2 };
      const c = BaobabRouter.__deepMerge(a, b);

      // Check that arguments have not been mutated:
      assert.deepEqual(a, { a: 1, c: 1 });
      assert.deepEqual(b, { b: 1, c: 2 });

      // Check the result:
      assert.deepEqual(c, { value: { a: 1, b: 1, c: 2 }, conflicts: true });
    }
  );

  it(
    'should find some conflict when different objects different values for ' +
    'the same deep path',
    () => {
      const a = { a: 1, c: { d: 1 } };
      const b = { b: 1, c: { d: 2 } };
      const c = BaobabRouter.__deepMerge(a, b);

      // Check that arguments have not been mutated:
      assert.deepEqual(a, { a: 1, c: { d: 1 } });
      assert.deepEqual(b, { b: 1, c: { d: 2 } });

      // Check the result:
      assert.deepEqual(c, { value: { a: 1, b: 1, c: { d: 2 } }, conflicts: true });
    }
  );
});

describe('BaobabRouter.__concatenatePath', () => {
  it('should work with one argument', () => {
    assert.equal(BaobabRouter.__concatenatePaths('a'), '/a');
    assert.equal(BaobabRouter.__concatenatePaths('/a'), '/a');
  });

  it('should work with two argument', () => {
    assert.equal(BaobabRouter.__concatenatePaths('a', ''), '/a');
    assert.equal(BaobabRouter.__concatenatePaths('', 'b'), '/b');
    assert.equal(BaobabRouter.__concatenatePaths('a', 'b'), '/a/b');
    assert.equal(BaobabRouter.__concatenatePaths('a', '/b'), '/a/b');
    assert.equal(BaobabRouter.__concatenatePaths('a/', '/b'), '/a/b');
    assert.equal(BaobabRouter.__concatenatePaths('a/', 'b'), '/a/b');
    assert.equal(BaobabRouter.__concatenatePaths('/a', '/b'), '/a/b');
  });
});
