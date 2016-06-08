'use strict'

/* global Symbol */

/**
 * TODO
 *   shorten
 *   deduplicate
 *   make more declarative
 */

/**
 * Dependencies
 */

const {eq, deq, neq, ndeq, test, throws} = require('./utils')

const {
  // Misc
  deepEqual, copy,
  // Reading
  get, scan, getIn, getAt,
  // Merging
  put, patch, putAt, patchAt
} = require('../lib/emerge')

/**
 * Test
 */

// Testing this first because other tests rely on deepEqual.
deepEqual: {
  const one = {
    one: {two: {three: NaN}},
    four: [4, 4],
    five: 'five'
  }

  const other0 = {
    one: {two: {three: NaN}},
    four: [4, 4],
    five: 'five'
  }

  const other1 = {
    one: {two: {three: NaN}},
    four: [4, 4],
    five: 'five',
    six: 6
  }

  test(deepEqual,
    {0: one, 1: other0, $: true},
    {0: one, 1: other1, $: false}
  )
}

copy: {
  const prev = {
    one: {two: NaN},
    three: {four: [4]}
  }

  const tree = copy(prev)

  // Must be a non-referential copy.
  deq(tree, prev)
  neq(tree, prev)

  throws(function mutateTree () {tree.one = 3})
  throws(function mutateDeep () {tree.three.four.push(5)})

  // Must drop keys with nil values.
  nil: {
    const prev = {
      one: 1,
      two: null,
      three: undefined
    }

    deq(copy(prev), {one: 1})
  }

  // Must act as identity function for immutable objects, trusting them to be
  // deep-frozen.
  frozen: {
    const prev = Object.freeze({one: 1})
    deq(copy(prev), prev)
  }
}

get: {
  test(get,
    {0: undefined, 1: undefined,       $: undefined},
    {0: {one: 1},  1: 'one',           $: 1},
    {0: {one: 1},  1: 'one', 2: 'two', $: 1}
  )
}

scan: {
  const tree = {
    one: 1,
    two: {three: {four: [4, 5]}}
  }

  test(scan,
    {0: undefined,                                          $: undefined},
    {0: undefined, 1: 'one',                                $: undefined},
    {0: tree,                                               $: tree},
    {0: tree,      1: 'two',                                $: tree.two},
    {0: tree,      1: 'one',                                $: 1},
    {0: tree,      1: 'two', 2: 'three', 3: 'four', 4: '0', $: 4},
    {0: tree,      1: Symbol(),                             $: undefined}
  )
}

getIn: {
  const tree = {
    one: 1,
    two: {three: {four: [4, 5]}}
  }

  test(getIn,
    {0: undefined, 1: [],                            $: undefined},
    {0: tree,      1: [],                            $: tree},
    {0: tree,      1: [],                            $: tree},
    {0: tree,      1: ['two'],                       $: tree.two},
    {0: tree,      1: ['one'],                       $: 1},
    {0: tree,      1: ['two', 'three', 'four', '0'], $: 4},
    {0: tree,      1: [Symbol()],                    $: undefined}
  )
}

getAt: {
  const tree = {
    one: 1,
    two: {three: {four: [4, 5]}}
  }

  test(getAt,
    {0: [],                            1: undefined, $: undefined},
    {0: [],                            1: tree,      $: tree},
    {0: [],                            1: tree,      $: tree},
    {0: ['two'],                       1: tree,      $: tree.two},
    {0: ['one'],                       1: tree,      $: 1},
    {0: ['two', 'three', 'four', '0'], 1: tree,      $: 4},
    {0: [Symbol()],                    1: tree,      $: undefined}
  )
}

put: {
  const prev = copy({
    one: {two: NaN},
    three: {four: 4},
    five: [5]
  })

  const next = {
    one: {two: NaN},
    three: {four: [4]},
    six: 6
  }

  const tree = put(prev, next)

  // Must be a non-referential copy of the next tree.
  deq(tree, next)
  neq(tree, prev)
  neq(tree, next)

  // Referential equality: keep old references if values are deep equal.
  eq(tree.one, prev.one)

  // The new tree must be immutable.
  throws(function mutateTree () {tree.mutated = true})

  // The new values must be immutable.
  throws(function mutateDeep () {tree.three.four.push(5)})

  // Must ignore or unset keys with nil values.
  nil: {
    const next = {
      one: {two: undefined},
      three: {four: null},
      six: null
    }

    const tree0 = put(prev, next)
    deq(tree0, {one: {}, three: {}})

    const tree1 = put(undefined, next)
    deq(tree1, {one: {}, three: {}})
  }

  // Must return the same reference if the result would be deep equal.
  equal: {
    const next = {
      one: {two: NaN},
      three: {four: 4},
      five: [5],
      twelve: null
    }
    const tree = put(prev, next)
    eq(tree, prev)
  }
}

patch: {
  const prev = copy({
    one: {two: NaN},
    three: {four: [4]},
    six: undefined,
    eight: {nine: 9},
    ten: {eleven: 11, twelve: [12]}
  })

  const next = {
    three: {five: 5},
    six: [6],
    seven: 7,
    eight: {nine: 9},
    ten: {eleven: 'eleven', twelve: [12]}
  }

  const tree = patch(prev, next)

  // Must differ from both source trees.
  ndeq(tree, prev)
  ndeq(tree, next)

  // Must retain unaffected values without changing their references.
  eq(tree.one, prev.one)
  eq(tree.three.four, prev.three.four)
  eq(tree.eight, prev.eight)
  eq(tree.ten.twelve, prev.ten.twelve)

  // Must deep-patch new paths and values in.
  eq(tree.three.five, next.three.five)
  deq(tree.six, next.six)
  eq(tree.seven, next.seven)
  eq(tree.ten.eleven, next.ten.eleven)

  // The new tree must be immutable.
  throws(function mutateTree () {tree.mutated = true})

  // The new values must be immutable.
  throws(function mutateDeep () {tree.six.push(7)})

  // Must ignore or unset keys with nil values.
  nil: {
    const next = {
      ten: {eleven: 'eleven', twelve: undefined, thirteen: null}
    }

    const tree0 = patch(prev, next)
    deq(tree0.ten, {eleven: 'eleven'})

    const tree1 = patch(undefined, next)
    deq(tree1.ten, {eleven: 'eleven'})
  }

  // Must return the same reference if the result would be deep equal.
  equal: {
    const next = {
      one: {two: NaN},
      twelve: null
    }
    const tree = patch(prev, next)
    eq(tree, prev)
  }
}

putAt: {
  const prev = copy({
    one: {two: NaN},
    three: {four: {six: [6]}, five: 5}
  })

  const next = {six: [6], seven: 7}

  const tree = putAt(['three', 'four'], prev, next)

  // Must differ from both source trees.
  ndeq(tree, prev)
  ndeq(tree, next)

  // Must deep-patch the new value in.
  deq(tree.three.four, next)

  // Must retain unaffected values without changing their references.
  eq(tree.three.five, prev.three.five)

  // Must retain unchanged values inside the patch without changing their references.
  eq(tree.three.four.six, prev.three.four.six)

  // The new tree must be immutable.
  throws(function mutateTree () {tree.mutated = true})

  // The patched value must be immutable.
  throws(function mutateDeep () {tree.three.four.six.push(7)})

  // Must ignore or unset keys with nil values.
  nil: {
    const next = {
      four: {six: undefined, seven: null}, five: 5
    }
    const tree = putAt(['three'], prev, next)
    deq(tree.three, {four: {}, five: 5})
  }

  // Must return the same reference if the result would be deep equal.
  equal: {
    const next = {
      six: [6],
      twelve: null
    }
    const tree = putAt(['three', 'four'], prev, next)
    eq(tree, prev)
  }

  // Must discriminate similar-looking plain objects and arrays.
  arrays: {
    const prev = copy({one: {0: 'two', length: 1}})
    const next = ['two']
    const tree = putAt(['one'], prev, next)
    deq(tree, {one: ['two']})
  }
}

patchAt: {
  const prev = copy({
    one: {two: [2], three: [3]},
    five: NaN
  })

  const next = {
    two: [2],
    four: 4
  }

  const tree = patchAt(['one'], prev, next)

  // Must differ from both source trees.
  ndeq(tree, prev)
  ndeq(tree, next)

  // Must deep-patch the new value in.
  deq(tree.one.two, next.two)
  eq(tree.one.four, next.four)

  // Must retain unaffected values without changing their references.
  eq(tree.one.three, prev.one.three)
  deq(tree.five, prev.five)

  // Must retain unchanged values inside the patch without changing their references.
  eq(tree.one.two, prev.one.two)

  // The new tree must be immutable.
  throws(function mutateTree () {tree.mutated = true})

  // The patched value must be immutable.
  throws(function mutateDeep () {tree.one.two.push(3)})

  // Must ignore or unset keys with nil values.
  nil: {
    const next = {three: undefined, six: null}
    const tree = patchAt(['one'], prev, next)
    deq(tree.one, {two: [2]})
  }

  // Must return the same reference if the result would be deep equal.
  equal: {
    const next = {
      one: {three: [3]},
      twelve: null
    }
    const tree = patchAt([], prev, next)
    eq(tree, prev)
  }

  // Must discriminate similar-looking plain objects and arrays.
  arrays: {
    const prev = copy({one: {0: 'two', length: 1}})
    const next = ['two']
    const tree = patchAt(['one'], prev, next)
    deq(tree, {one: ['two']})
  }
}
