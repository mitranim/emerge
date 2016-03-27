'use strict'

/* eslint-disable no-multi-spaces, no-empty-label, no-label-var, no-labels, block-spacing */

/**
 * TODO
 *   shorten
 *   deduplicate
 *   make more declarative
 */

/**
 * Dependencies
 */

const utils = require('./utils')
const eq = utils.eq
const deq = utils.deq
const neq = utils.neq
const ndeq = utils.ndeq
const test = utils.test
const throws = utils.throws

const emerge = require('../lib/emerge')

// Misc.
const deepEqual = emerge.deepEqual
const immutableClone = emerge.immutableClone

// Reading.
const read = emerge.read
const readAt = emerge.readAt

// Merging.
const merge = emerge.merge
const replace = emerge.replace
const mergeAt = emerge.mergeAt
const replaceAt = emerge.replaceAt

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

  test(
    deepEqual,

    {0: one,
     1: other0,
     $: true},

    {0: one,
     1: other1,
     $: false}
  )
}

immutableClone: {
  const prev = {
    one: {two: NaN},
    three: {four: [4]}
  }

  const tree = immutableClone(prev)

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

    deq(immutableClone(prev), {one: 1})
  }

  // Must act as identity function for immutable objects, trusting them to be
  // deep-frozen.
  frozen: {
    const prev = Object.freeze({one: 1})
    deq(immutableClone(prev), prev)
  }
}

readAt: {
  const tree = {
    one: 1,
    two: {three: {four: [4, 5]}}
  }

  test(
    readAt,

    {0: [],
     1: tree,
     $: tree},

    {0: [],
     1: tree,
     $: tree},

    {0: ['two'],
     1: tree,
     $: tree.two},

    {0: ['one'],
     1: tree,
     $: 1},

    {0: ['two', 'three', 'four', '0'],
     1: tree,
     $: 4},

    {0: [Symbol()],
     1: tree,
     $: undefined}
  )
}

read: {
  const tree = {
    one: 1,
    two: {three: {four: [4, 5]}}
  }

  test(
    read,

    {0: tree,
     $: tree},

    {0: tree,
     1: 'two',
     $: tree.two},

    {0: tree,
     1: 'one',
     $: 1},

    {0: tree,
     1: 'two',
     2: 'three',
     3: 'four',
     4: '0',
     $: 4},

    {0: tree,
     1: Symbol(),
     $: undefined}
  )
}

replace: {
  const prev = immutableClone({
    one: {two: NaN},
    three: {four: 4},
    five: [5]
  })

  const next = immutableClone({
    one: {two: NaN},
    three: {four: [4]},
    six: 6
  })

  const tree = replace(prev, next)

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
    const next = immutableClone({
      one: {two: undefined},
      three: {four: null},
      six: null
    })

    const tree0 = replace(prev, next)
    deq(tree0, {one: {}, three: {}})

    const tree1 = replace(undefined, next)
    deq(tree1, {one: {}, three: {}})
  }

  // Must return the same reference if the result would be deep equal.
  equal: {
    const next = immutableClone({
      one: {two: NaN},
      three: {four: 4},
      five: [5]
    })
    const tree = replace(prev, next)
    eq(tree, prev)
  }
}

merge: {
  const prev = immutableClone({
    one: {two: NaN},
    three: {four: [4]},
    six: undefined,
    eight: {nine: 9},
    ten: {eleven: 11, twelve: [12]}
  })

  const next = immutableClone({
    three: {five: 5},
    six: [6],
    seven: 7,
    eight: {nine: 9},
    ten: {eleven: 'eleven', twelve: [12]}
  })

  const tree = merge(prev, next)

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

    const tree0 = merge(prev, next)
    deq(tree0.ten, {eleven: 'eleven'})

    const tree1 = merge(undefined, next)
    deq(tree1.ten, {eleven: 'eleven'})
  }

  // Must return the same reference if the result would be deep equal.
  equal: {
    const next = immutableClone({
      one: {two: NaN}
    })
    const tree = merge(prev, next)
    eq(tree, prev)
  }
}

replaceAt: {
  const prev = immutableClone({
    one: {two: NaN},
    three: {four: {six: [6]}, five: 5}
  })

  const next = immutableClone({six: 6})

  const tree = replaceAt(['three', 'four'], prev, next)

  // Must differ from both source trees.
  neq(tree, prev)
  neq(tree, next)

  // Must deep-patch the new value in.
  deq(tree.three.four, next)

  // Must retain unaffected values without changing their references.
  eq(tree.three.five, prev.three.five)

  // The new tree must be immutable.
  throws(function mutateTree () {tree.mutated = true})

  // The patched value must be immutable.
  throws(function mutateDeep () {tree.three.four.six = 7})

  // Must ignore or unset keys with nil values.
  nil: {
    const next = immutableClone({
      four: {six: undefined, seven: null}, five: 5
    })
    const tree = replaceAt(['three'], prev, next)
    deq(tree.three, {four: {}, five: 5})
  }

  // Must return the same reference if the result would be deep equal.
  equal: {
    const next = immutableClone({
      six: [6]
    })
    const tree = replaceAt(['three', 'four'], prev, next)
    eq(tree, prev)
  }

  // Must discriminate similar-looking plain objects and arrays.
  arrays: {
    const prev = immutableClone({one: {0: 'two', length: 1}})
    const next = immutableClone(['two'])
    const tree = replaceAt(['one'], prev, next)
    deq(tree, {one: ['two']})
  }
}

mergeAt: {
  const prev = immutableClone({
    one: {two: 2, three: [3]},
    five: NaN
  })

  const next = immutableClone({
    two: [2],
    four: 4
  })

  const tree = mergeAt(['one'], prev, next)

  // Must differ from both source trees.
  neq(tree, prev)
  neq(tree, next)

  // Must deep-patch the new value in.
  deq(tree.one.two, next.two)
  eq(tree.one.four, next.four)

  // Must retain unaffected values without changing their references.
  eq(tree.one.three, prev.one.three)
  deq(tree.five, prev.five)

  // The new tree must be immutable.
  throws(function mutateTree () {tree.mutated = true})

  // The patched value must be immutable.
  throws(function mutateDeep () {tree.one.two.push(3)})

  // Must ignore or unset keys with nil values.
  nil: {
    const next = {three: undefined, six: null}
    const tree = mergeAt(['one'], prev, next)
    deq(tree.one, {two: 2})
  }

  // Must return the same reference if the result would be deep equal.
  equal: {
    const next = immutableClone({
      one: {three: [3]}
    })
    const tree = mergeAt([], prev, next)
    eq(tree, prev)
  }

  // Must discriminate similar-looking plain objects and arrays.
  arrays: {
    const prev = immutableClone({one: {0: 'two', length: 1}})
    const next = immutableClone(['two'])
    const tree = mergeAt(['one'], prev, next)
    deq(tree, {one: ['two']})
  }
}
